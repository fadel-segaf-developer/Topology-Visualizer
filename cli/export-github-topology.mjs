#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_LIMIT = 50;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoSlug = args.repo ?? deriveRepoFromGit();
  if (!repoSlug) {
    console.error('Error: repository slug missing. Pass --repo owner/name or run inside a git repo with remote origin.');
    process.exit(1);
  }

  const limit = Number.isFinite(args.limit) ? args.limit : DEFAULT_LIMIT;
  const token = args.token ?? process.env.GITHUB_TOKEN ?? null;

  const github = createGitHubClient({ token });

  console.error(`Fetching GitHub metadata for ${repoSlug}...`);
  const repo = await github.get(`/repos/${repoSlug}`, { preview: 'nebula' });
  if (!repo) {
    console.error(`Error: repository ${repoSlug} not found or API request failed.`);
    process.exit(1);
  }

  const languages = await github.get(`/repos/${repoSlug}/languages`).catch(() => ({}));
  const projects = await github.paginated(`/repos/${repoSlug}/projects`, {
    params: { per_page: 100, state: 'all' },
    limit,
    preview: 'inertia'
  }).catch(() => []);
  const milestones = await github.paginated(`/repos/${repoSlug}/milestones`, {
    params: { per_page: 100, state: 'all' },
    limit
  }).catch(() => []);
  const issuesPayload = await github.paginated(`/repos/${repoSlug}/issues`, {
    params: { state: 'all', per_page: 100, sort: 'updated', direction: 'desc' },
    limit
  }).catch(() => []);
  const pulls = await github.paginated(`/repos/${repoSlug}/pulls`, {
    params: { state: 'all', per_page: 100 },
    limit
  }).catch(() => []);

  const issues = issuesPayload.filter((item) => !item.pull_request);
  const now = new Date().toISOString();

  const meta = buildMeta(repo, { languages, projects, milestones, fetchedAt: now });
  const nodes = [];
  const nodesById = new Map();
  const edges = [];

  const createNode = (node) => {
    const record = { ...node };
    if (!Array.isArray(record.children)) record.children = [];
    nodes.push(record);
    nodesById.set(record.id, record);
    return record;
  };

  const addChild = (parentId, childId) => {
    if (!parentId || !childId) return;
    const parent = nodesById.get(parentId);
    if (!parent) return;
    if (!Array.isArray(parent.children)) parent.children = [];
    if (!parent.children.includes(childId)) parent.children.push(childId);
  };

  const repoNodeId = `repo-${repo.id}`;
  createNode({
    id: repoNodeId,
    label: repo.full_name,
    type: 'repository',
    group: repo.owner?.login ?? 'repository',
    level: 'high',
    summary: repo.description ?? 'Git repository',
    tags: buildRepoTags(repo),
    metrics: buildRepoMetrics(repo),
    links: buildLinks([{ label: 'Repository', url: repo.html_url }, ...(repo.homepage ? [{ label: 'Homepage', url: repo.homepage }] : [])]),
    status: {
      label: repo.archived ? 'Archived' : repo.private ? 'Private' : 'Active',
      tone: repo.archived ? 'warning' : 'success'
    },
    work: {
      projects: projects.slice(0, limit).map((project) => ({
        provider: 'github',
        id: project.id,
        name: project.name,
        url: project.html_url,
        state: project.state,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      })),
      milestones: milestones.slice(0, limit).map((milestone) => ({
        provider: 'github',
        id: milestone.id,
        number: milestone.number,
        title: milestone.title,
        url: milestone.html_url,
        state: milestone.state,
        dueOn: milestone.due_on,
        createdAt: milestone.created_at,
        updatedAt: milestone.updated_at
      }))
    },
    children: []
  });

  projects.forEach((project) => {
    const nodeId = `project-${project.id}`;
    createNode({
      id: nodeId,
      label: project.name,
      type: 'project',
      group: 'projects',
      level: 'medium',
      parent: repoNodeId,
      summary: project.body ?? 'GitHub project',
      tags: [project.state ?? 'active'],
      links: buildLinks([{ label: 'Project', url: project.html_url }]),
      metrics: [
        { label: 'Columns', value: project.columns_url ? 'N/A' : '—' }
      ]
    });
    addChild(repoNodeId, nodeId);
    edges.push({
      id: `${repoNodeId}->${nodeId}`,
      from: repoNodeId,
      to: nodeId,
      intent: 'controls',
      level: 'medium'
    });
  });

  milestones.forEach((milestone) => {
    const nodeId = `milestone-${milestone.id}`;
    createNode({
      id: nodeId,
      label: milestone.title,
      type: 'milestone',
      group: 'milestones',
      level: 'medium',
      parent: repoNodeId,
      summary: milestone.description ?? 'Repository milestone',
      tags: [
        milestone.state,
        milestone.due_on ? `Due ${milestone.due_on.slice(0, 10)}` : 'No due date'
      ],
      metrics: [
        { label: 'Open', value: milestone.open_issues },
        { label: 'Closed', value: milestone.closed_issues }
      ],
      links: buildLinks([{ label: 'Milestone', url: milestone.html_url }])
    });
    addChild(repoNodeId, nodeId);
    edges.push({
      id: `${repoNodeId}->${nodeId}`,
      from: repoNodeId,
      to: nodeId,
      intent: 'controls',
      level: 'medium'
    });
  });

  issues.slice(0, limit).forEach((issue) => {
    const nodeId = `issue-${issue.id}`;
    const milestoneId = issue.milestone ? `milestone-${issue.milestone.id}` : null;
    const parentId = milestoneId ?? repoNodeId;
    createNode({
      id: nodeId,
      label: `#${issue.number} ${issue.title}`,
      type: 'issue',
      group: milestoneId ? issue.milestone.title : 'issues',
      level: 'low',
      parent: parentId,
      summary: trim(issue.body ?? '', 220),
      tags: [
        issue.state,
        ...issue.labels
          .map((label) => (typeof label === 'string' ? label : label.name))
          .filter(Boolean)
          .slice(0, 6)
      ],
      links: buildLinks([{ label: 'Issue', url: issue.html_url }]),
      status: {
        label: issue.state === 'open' ? 'Open' : 'Closed',
        tone: issue.state === 'open' ? 'warning' : 'success'
      },
      work: {
        issues: [{
          provider: 'github',
          repo: repo.full_name,
          number: issue.number,
          url: issue.html_url,
          state: issue.state,
          title: issue.title,
          labels: issue.labels.map((label) => (typeof label === 'string' ? label : label.name)).filter(Boolean),
          assignees: (issue.assignees || []).map((user) => user.login),
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          closedAt: issue.closed_at ?? undefined,
          comments: issue.comments,
          milestone: issue.milestone?.title ?? null
        }]
      }
    });
    addChild(parentId, nodeId);
    edges.push({
      id: `${parentId}->${nodeId}`,
      from: parentId,
      to: nodeId,
      intent: 'depends-on',
      level: 'low'
    });
  });

  pulls.slice(0, limit).forEach((pr) => {
    const nodeId = `pr-${pr.id}`;
    const milestoneId = pr.milestone ? `milestone-${pr.milestone.id}` : null;
    const parentId = milestoneId ?? repoNodeId;
    createNode({
      id: nodeId,
      label: `PR #${pr.number} ${pr.title}`,
      type: 'pull-request',
      group: pr.head?.ref ?? 'pulls',
      level: 'low',
      parent: parentId,
      summary: trim(pr.body ?? '', 220),
      tags: [
        pr.state,
        pr.merged_at ? 'merged' : pr.draft ? 'draft' : 'ready',
        pr.base?.ref ? `Base ${pr.base.ref}` : null
      ].filter(Boolean),
      links: buildLinks([{ label: 'Pull Request', url: pr.html_url }]),
      status: {
        label: pr.merged_at ? 'Merged' : pr.state === 'open' ? 'Open' : 'Closed',
        tone: pr.merged_at ? 'success' : pr.state === 'open' ? 'info' : 'warning'
      },
      work: {
        prs: [{
          provider: 'github',
          repo: repo.full_name,
          number: pr.number,
          url: pr.html_url,
          state: pr.state,
          title: pr.title,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          mergedAt: pr.merged_at ?? undefined,
          labels: (pr.labels ?? []).map((label) => (typeof label === 'string' ? label : label.name)).filter(Boolean),
          milestone: pr.milestone?.title ?? null
        }]
      }
    });
    addChild(parentId, nodeId);
    edges.push({
      id: `${parentId}->${nodeId}`,
      from: parentId,
      to: nodeId,
      intent: 'controls',
      level: 'low'
    });
  });

  const topology = {
    meta,
    nodes,
    edges
  };

  const outPath = path.resolve(args.out ?? 'data/github-topology.json');
  await writeFile(outPath, JSON.stringify(topology, null, 2), 'utf8');
  console.log(outPath);
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--repo' && argv[i + 1]) {
      opts.repo = argv[i + 1];
      i += 1;
    } else if (arg === '--out' && argv[i + 1]) {
      opts.out = argv[i + 1];
      i += 1;
    } else if (arg === '--token' && argv[i + 1]) {
      opts.token = argv[i + 1];
      i += 1;
    } else if (arg === '--limit' && argv[i + 1]) {
      const value = Number(argv[i + 1]);
      if (!Number.isNaN(value)) opts.limit = value;
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`Usage: export-github-topology [options]

Options:
  --repo   owner/name repository slug (defaults to current git remote)
  --out    output path for topology JSON (defaults to data/github-topology.json)
  --limit  maximum number of issues and pull requests to include (default ${DEFAULT_LIMIT})
  --token  GitHub token (or set GITHUB_TOKEN env) for increased rate limits
`);
}

function deriveRepoFromGit() {
  try {
    const remote = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    if (!remote) return null;
    return parseRepoFromRemote(remote);
  } catch {
    return null;
  }
}

function parseRepoFromRemote(remote) {
  if (remote.startsWith('git@')) {
    const match = remote.match(/git@[^:]+:([^/]+\/[^/.]+)(\.git)?$/);
    return match ? match[1] : null;
  }
  if (remote.startsWith('https://') || remote.startsWith('http://')) {
    const url = remote.replace(/\.git$/, '');
    const parts = url.split('/');
    return parts.slice(-2).join('/');
  }
  return null;
}

function createGitHubClient({ token }) {
  const baseHeaders = {
    'User-Agent': 'topology-exporter',
    Accept: 'application/vnd.github+json'
  };
  if (token) {
    baseHeaders.Authorization = `Bearer ${token}`;
  }
  async function request(url, { params, preview } = {}) {
    const endpoint = new URL(`https://api.github.com${url}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) endpoint.searchParams.set(key, String(value));
      });
    }
    const headers = { ...baseHeaders };
    if (preview === 'inertia') {
      headers.Accept = 'application/vnd.github.inertia-preview+json';
    } else if (preview === 'nebula') {
      headers.Accept = 'application/vnd.github+json';
    }
    const response = await fetch(endpoint, { headers });
    if (response.status === 401 || response.status === 403) {
      throw new Error(`GitHub API returned ${response.status} for ${url}. Provide a personal access token via --token or GITHUB_TOKEN.`);
    }
    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText} (${url})`);
    }
    return { data: await response.json(), headers: response.headers };
  }
  return {
    async get(url, options) {
      const { data } = await request(url, options);
      return data;
    },
    async paginated(url, options = {}) {
      const results = [];
      let nextUrl = url;
      let remaining = typeof options.limit === 'number' && options.limit > 0 ? options.limit : Infinity;

      while (nextUrl && remaining > 0) {
        const pageOptions = { ...options };
        pageOptions.params = { ...(options.params || {}) };
        if (Number.isFinite(options.limit)) {
          pageOptions.params.per_page = Math.min(options.params?.per_page ?? 100, remaining);
        }
        const { data, headers } = await request(nextUrl, pageOptions);
        if (Array.isArray(data)) {
          results.push(...data);
          remaining -= data.length;
        } else {
          return data;
        }
        nextUrl = parseNext(headers.get('link'));
      }
      return results;
    }
  };
}

function parseNext(linkHeader) {
  if (!linkHeader) return null;
  const links = linkHeader.split(',');
  for (const part of links) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match && match[2] === 'next') {
      const [, url] = match;
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}`;
    }
  }
  return null;
}

function buildRepoTags(repo) {
  const tags = [];
  if (repo.private) {
    tags.push('private');
  } else {
    tags.push('public');
  }
  if (repo.archived) tags.push('archived');
  if (Array.isArray(repo.topics)) {
    tags.push(...repo.topics.slice(0, 4));
  }
  return tags;
}

function buildRepoMetrics(repo) {
  return [
    { label: 'Stars', value: repo.stargazers_count },
    { label: 'Forks', value: repo.forks_count },
    { label: 'Watchers', value: repo.subscribers_count ?? repo.watchers_count ?? 0 },
    { label: 'Issues', value: repo.open_issues_count }
  ];
}

function buildLinks(entries) {
  return entries.map((entry) => ({
    label: entry.label,
    url: entry.url
  }));
}

function trim(value, max) {
  if (!value) return '';
  const normalized = value.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function buildMeta(repo, { languages, projects, milestones, fetchedAt }) {
  return {
    name: repo.name,
    description: repo.description ?? '',
    version: repo.default_branch ?? 'main',
    owner: repo.owner?.login ?? '',
    viewModes: ['high', 'medium', 'low'],
    defaultView: 'high',
    guides: buildLinks([
      repo.html_url ? { label: 'Repository', url: repo.html_url } : null,
      repo.homepage ? { label: 'Homepage', url: repo.homepage } : null
    ].filter(Boolean)),
    intents: {
      'depends-on': { label: 'Depends On', color: '#38bdf8' },
      controls: { label: 'Controls', color: '#f97316' },
      synchronizes: { label: 'Synchronizes', color: '#a855f7' }
    },
    repository: {
      provider: 'github',
      owner: repo.owner?.login ?? '',
      name: repo.name,
      id: repo.id,
      url: repo.html_url,
      description: repo.description ?? '',
      visibility: repo.private ? 'private' : 'public',
      defaultBranch: repo.default_branch,
      topics: repo.topics ?? [],
      license: repo.license?.spdx_id ?? null,
      homepage: repo.homepage ?? null,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.subscribers_count ?? repo.watchers_count ?? 0,
      openIssues: repo.open_issues_count,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        url: project.html_url,
        body: project.body ?? null,
        state: project.state ?? null,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      })),
      milestones: milestones.map((milestone) => ({
        id: milestone.id,
        number: milestone.number,
        title: milestone.title,
        url: milestone.html_url,
        state: milestone.state,
        description: milestone.description ?? null,
        dueOn: milestone.due_on,
        openIssues: milestone.open_issues,
        closedIssues: milestone.closed_issues,
        createdAt: milestone.created_at,
        updatedAt: milestone.updated_at
      })),
      languages
    },
    lastSyncedAt: fetchedAt
  };
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
