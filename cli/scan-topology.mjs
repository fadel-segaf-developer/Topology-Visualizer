#!/usr/bin/env node
/**
 * Topology Visualizer repo scanner.
 *
 * Produces deterministic JSON artifacts that feed the visualizer agent:
 *  - tree.json: repository structure + language hints
 *  - build.json: build graph signals (package managers, project files)
 *  - docs.json: README/markdown digest
 *  - symbols.json: placeholder for symbol extraction (per language adapters)
 *  - work.json: issues/PR references (offline cache or GitHub API)
 *  - correlation.json: placeholder mapping work items to source paths
 *  - artifacts.json: summary manifest pointing at generated files
 *
 * This is a light-weight scaffold. Language and symbol adapters can plug into
 * the helpers exported here without rewriting the CLI plumbing.
 */

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_EXCLUDES = new Set([
  '.git',
  '.hg',
  '.svn',
  'node_modules',
  '.yarn',
  '.pnpm',
  'vendor',
  'dist',
  'build',
  'out'
]);

const EXTENSION_LANG_MAP = new Map([
  ['.ts', 'TypeScript'],
  ['.tsx', 'TypeScript'],
  ['.js', 'JavaScript'],
  ['.jsx', 'JavaScript'],
  ['.mjs', 'JavaScript'],
  ['.cjs', 'JavaScript'],
  ['.py', 'Python'],
  ['.cs', 'C#'],
  ['.cpp', 'C++'],
  ['.cxx', 'C++'],
  ['.cc', 'C++'],
  ['.c', 'C'],
  ['.hpp', 'C++ Header'],
  ['.hxx', 'C++ Header'],
  ['.h', 'C Header'],
  ['.java', 'Java'],
  ['.kt', 'Kotlin'],
  ['.swift', 'Swift'],
  ['.go', 'Go'],
  ['.rb', 'Ruby'],
  ['.php', 'PHP'],
  ['.rs', 'Rust'],
  ['.lua', 'Lua'],
  ['.uasset', 'Unreal Asset'],
  ['.umap', 'Unreal Map'],
  ['.Build.cs', 'Unreal Module']
]);

const DOC_FILENAMES = [
  'readme.md',
  'readme',
  'readme.txt',
  'README.md',
  'README',
  'README.txt'
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const repoRoot = path.resolve(options.repo ?? process.cwd());
  const outputDir = path.resolve(options.out ?? path.join(repoRoot, 'topology-artifacts'));
  await mkdir(outputDir, { recursive: true });

  const tree = await collectTree(repoRoot, { maxDepth: options.maxDepth });
  const build = await collectBuildSignals(repoRoot);
  const docs = await collectDocs(repoRoot);
  const symbols = await collectSymbols(repoRoot);
  const work = await collectWork({ options, repoRoot });
  const correlation = correlateWork(work, tree);

  const writes = [
    writeJson(path.join(outputDir, 'tree.json'), tree),
    writeJson(path.join(outputDir, 'build.json'), build),
    writeJson(path.join(outputDir, 'docs.json'), docs),
    writeJson(path.join(outputDir, 'symbols.json'), symbols),
    writeJson(path.join(outputDir, 'work.json'), work),
    writeJson(path.join(outputDir, 'correlation.json'), correlation)
  ];
  await Promise.all(writes);

  const manifest = {
    repo: repoRoot,
    generatedAt: new Date().toISOString(),
    options: {
      maxDepth: options.maxDepth,
      githubRepo: options.githubRepo ?? null,
      offline: options.offline ?? false
    },
    artifacts: {
      tree: 'tree.json',
      build: 'build.json',
      docs: 'docs.json',
      symbols: 'symbols.json',
      work: 'work.json',
      correlation: 'correlation.json'
    }
  };

  await writeJson(path.join(outputDir, 'artifacts.json'), manifest);

  if (!options.quiet) {
    process.stdout.write(
      `Topology artifacts generated in ${path.relative(process.cwd(), outputDir) || '.'}${process.platform === 'win32' ? '\\n' : '\n'}`
    );
  }
}

function parseArgs(argv) {
  const options = {
    maxDepth: 5,
    offline: false,
    quiet: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--repo':
      case '-r':
        options.repo = argv[++i];
        break;
      case '--out':
      case '-o':
        options.out = argv[++i];
        break;
      case '--max-depth':
        options.maxDepth = Number.parseInt(argv[++i], 10);
        break;
      case '--github-repo':
        options.githubRepo = argv[++i];
        break;
      case '--github-token':
        options.githubToken = argv[++i];
        break;
      case '--work-cache':
        options.workCache = argv[++i];
        break;
      case '--offline':
        options.offline = true;
        break;
      case '--quiet':
        options.quiet = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (!arg.startsWith('-')) {
          options.repo = arg;
        } else {
          throw new Error(`Unknown option: ${arg}`);
        }
    }
  }
  return options;
}

function printHelp() {
  const text = `
Usage: node cli/scan-topology.mjs [options]

Options:
  --repo, -r <path>          Root directory of the repository (default: cwd)
  --out, -o <dir>            Output directory for artifacts (default: <repo>/topology-artifacts)
  --max-depth <n>            Directory traversal depth for tree.json (default: 5)
  --github-repo <owner/name> Repository slug for issue/PR lookup
  --github-token <token>     Personal access token for authenticated GitHub calls
  --work-cache <path>        Path to offline work cache JSON (skips GitHub fetch)
  --offline                  Disable network calls; produce empty work.json
  --quiet                    Reduce console output
  --help, -h                 Show this help message
`;
  process.stdout.write(text);
}

async function collectTree(repoRoot, { maxDepth = 5 } = {}) {
  async function walk(current, depth) {
    const entries = await readdir(current, { withFileTypes: true });
    const result = {
      path: path.relative(repoRoot, current) || '.',
      depth,
      files: [],
      dirs: []
    };
    for (const entry of entries) {
      if (DEFAULT_EXCLUDES.has(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (depth >= maxDepth) continue;
        result.dirs.push(await walk(fullPath, depth + 1));
      } else if (entry.isFile()) {
        const ext = getExtension(entry.name);
        result.files.push({
          name: entry.name,
          extension: ext,
          language: EXTENSION_LANG_MAP.get(ext) ?? null
        });
      }
    }
    result.files.sort((a, b) => a.name.localeCompare(b.name));
    result.dirs.sort((a, b) => a.path.localeCompare(b.path));
    return result;
  }
  return walk(repoRoot, 0);
}

async function collectBuildSignals(repoRoot) {
  const signals = {
    packageManagers: [],
    buildFiles: [],
    unrealModules: []
  };

  const searchEntries = await readdir(repoRoot, { withFileTypes: true });
  for (const entry of searchEntries) {
    if (entry.isFile()) {
      const name = entry.name.toLowerCase();
      const resolved = path.join(repoRoot, entry.name);
      if (name === 'package.json') {
        const pkg = JSON.parse(await readFile(resolved, 'utf8'));
        const workspaces = pkg.workspaces ?? [];
        signals.packageManagers.push({
          kind: 'npm',
          root: '.',
          workspaces
        });
      }
      if (name === 'pnpm-workspace.yaml' || name === 'yarn.lock') {
        signals.packageManagers.push({ kind: name.replace('.yaml', ''), root: '.' });
      }
      if (name === 'cmakelists.txt') {
        signals.buildFiles.push({ kind: 'cmake', path: entry.name });
      }
      if (name.endsWith('.uproject')) {
        signals.buildFiles.push({ kind: 'unreal-project', path: entry.name });
      }
    } else if (entry.isDirectory() && !DEFAULT_EXCLUDES.has(entry.name)) {
      const subdir = path.join(repoRoot, entry.name);
      const nested = await collectBuildSignals(subdir);
      mergeSignals(signals, nested, entry.name);
    }
  }

  return signals;
}

function mergeSignals(target, source, prefix) {
  for (const pkg of source.packageManagers) {
    target.packageManagers.push({
      ...pkg,
      root: path.join(prefix, pkg.root).replace(/\\/g, '/')
    });
  }
  for (const build of source.buildFiles) {
    target.buildFiles.push({
      ...build,
      path: path.join(prefix, build.path).replace(/\\/g, '/')
    });
  }
  target.unrealModules.push(...source.unrealModules.map((item) => ({
    ...item,
    path: path.join(prefix, item.path).replace(/\\/g, '/')
  })));
}

async function collectDocs(repoRoot) {
  const readmePath = await findReadme(repoRoot);
  if (!readmePath) {
    return { readme: null, headings: [], sections: [] };
  }
  const content = await readFile(readmePath, 'utf8');
  const headings = [];
  const sections = [];
  const lines = content.split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      headings.push({ level, title });
      if (current) sections.push(current);
      current = { heading: title, body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);
  sections.forEach((section) => {
    section.body = section.body.join('\n').trim();
  });
  return {
    readme: path.relative(repoRoot, readmePath).replace(/\\/g, '/'),
    headings,
    sections
  };
}

async function findReadme(repoRoot) {
  for (const name of DOC_FILENAMES) {
    const full = path.join(repoRoot, name);
    try {
      const stats = await stat(full);
      if (stats.isFile()) return full;
    } catch {
      // ignore
    }
  }
  return null;
}

async function collectSymbols(repoRoot) {
  // Placeholder for future language adapters. For now, return skeleton.
  return {
    repo: repoRoot,
    adapters: [],
    summary: 'Symbol extraction not yet implemented.'
  };
}

async function collectWork({ options, repoRoot }) {
  if (options.workCache) {
    const cachePath = path.resolve(options.workCache);
    const raw = await readFile(cachePath, 'utf8');
    const cached = JSON.parse(raw);
    return normalizeWork(cached);
  }
  if (options.offline || !options.githubRepo) {
    return { issues: [], prs: [] };
  }
  try {
    return await fetchGitHubWork(options.githubRepo, options.githubToken);
  } catch (error) {
    if (!options.quiet) {
      process.stderr.write(`Failed to fetch GitHub data: ${error.message}\n`);
    }
    return { issues: [], prs: [] };
  }
}

async function fetchGitHubWork(repo, token) {
  const headers = {
    'User-Agent': 'topology-visualizer-cli',
    Accept: 'application/vnd.github+json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const [issues, prs] = await Promise.all([
    pagedGitHubFetch(`https://api.github.com/repos/${repo}/issues?state=all&per_page=100`, headers, (item) => !item.pull_request),
    pagedGitHubFetch(`https://api.github.com/repos/${repo}/pulls?state=all&per_page=100`, headers)
  ]);

  const mappedIssues = issues.map((issue) => ({
    provider: 'github',
    repo,
    number: issue.number,
    url: issue.html_url,
    state: issue.state,
    title: issue.title,
    labels: issue.labels?.map((label) => label.name) ?? [],
    assignees: issue.assignees?.map((person) => person.login) ?? [],
    createdAt: issue.created_at,
    updatedAt: issue.updated_at
  }));

  const mappedPrs = prs.map((pr) => ({
    provider: 'github',
    repo,
    number: pr.number,
    url: pr.html_url,
    state: pr.state,
    title: pr.title,
    labels: pr.labels?.map((label) => label.name) ?? [],
    createdAt: pr.created_at,
    mergedAt: pr.merged_at
  }));

  mappedIssues.sort((a, b) => a.number - b.number);
  mappedPrs.sort((a, b) => a.number - b.number);

  return { issues: mappedIssues, prs: mappedPrs };
}

async function pagedGitHubFetch(url, headers, filterFn = null) {
  const results = [];
  let next = url;
  while (next) {
    const response = await fetch(next, { headers });
    if (!response.ok) {
      throw new Error(`GitHub request failed with ${response.status}`);
    }
    const data = await response.json();
    for (const item of data) {
      if (filterFn && !filterFn(item)) continue;
      results.push(item);
    }
    next = parseNextLink(response.headers.get('link'));
  }
  return results;
}

function parseNextLink(linkHeader) {
  if (!linkHeader) return null;
  const links = linkHeader.split(',').map((part) => part.trim());
  for (const link of links) {
    const match = /<([^>]+)>;\s*rel="([^"]+)"/.exec(link);
    if (!match) continue;
    if (match[2] === 'next') return match[1];
  }
  return null;
}

function normalizeWork(value) {
  const issues = Array.isArray(value.issues) ? value.issues : [];
  const prs = Array.isArray(value.prs) ? value.prs : [];
  return { issues, prs };
}

function correlateWork(work, tree) {
  // Placeholder for smarter correlation logic.
  const files = [];
  traverseTree(tree, (entry) => {
    if (entry.files) {
      for (const file of entry.files) {
        files.push(path.posix.join(entry.path === '.' ? '' : entry.path, file.name));
      }
    }
  });
  return {
    summary: 'Correlation requires language adapters. Entries pre-populated for future enrichment.',
    files,
    links: []
  };
}

function traverseTree(node, visitor) {
  visitor(node);
  for (const child of node.dirs ?? []) traverseTree(child, visitor);
}

async function writeJson(filePath, value) {
  const json = JSON.stringify(value, null, 2);
  await writeFile(filePath, `${json}\n`, 'utf8');
}

function getExtension(filename) {
  const ext = filename.endsWith('.Build.cs') ? '.Build.cs' : path.extname(filename);
  return ext;
}

await main();
