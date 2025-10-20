#!/usr/bin/env node
/**
 * Minimal Gitea issue exporter tailored for topology ingestion.
 *
 * Keeps only the fields needed by the topology JSON (`html_url`, `number`,
 * `title`, `body`, state/timestamps, author + assignees, milestone, repository,
 * minimal comments) and splits the resulting array into chunks capped to ~700
 * lines per file so the visualiser can load them without exceeding file display
 * limits in the CLI.
 */
import fs from "fs/promises";
import path from "path";

const options = parseArgs(process.argv.slice(2));

const BASE = options.base || process.env.GITEA_BASE || "https://git.frys.co.id";
const OWNER = options.owner || process.env.GITEA_OWNER || "FRYS-DEV";
const REPO = options.repo || process.env.GITEA_REPO || "UE_FDS3";
const SOURCE = options.source || process.env.GITEA_SOURCE;
const TOKEN = options.token || process.env.GITEA_TOKEN;
const LIMIT = Number.parseInt(options.limit || process.env.GITEA_LIMIT || "50", 10);
const OUT_ROOT = path.resolve(
  options.outdir || process.env.GITEA_OUTDIR || path.join("RepoExtractor", "exports", "minimal")
);
const MAX_LINES = Number.parseInt(options.maxLines || process.env.GITEA_MAX_LINES || "700", 10);
const CHUNK_FALLBACK_SIZE = Number.parseInt(
  options.chunkFallback || process.env.GITEA_CHUNK_FALLBACK || "25",
  10
);

if (!SOURCE && !TOKEN) {
  console.error("Provide a Gitea token via GITEA_TOKEN/--token or a --source JSON file.");
  process.exit(1);
}

if (MAX_LINES < 100) {
  console.warn(`MAX_LINES (${MAX_LINES}) is very low; bumping to 100 to avoid infinite splitting.`);
}

const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
const outDir = path.join(OUT_ROOT, `${OWNER}_${REPO}_${timestamp}`);

const headers = TOKEN
  ? {
      Accept: "application/json",
      Authorization: `token ${TOKEN}`
    }
  : { Accept: "application/json" };

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fetchJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Request failed ${response.status} ${response.statusText}: ${url}\n${body.slice(0, 300)}`
    );
  }
  return response.json();
}

async function fetchPaged(apiPath, params = {}) {
  const aggregated = [];
  let page = 1;
  while (true) {
    const url = new URL(`${BASE}/api/v1${apiPath}`);
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(LIMIT));

    const data = await fetchJson(url);
    if (!Array.isArray(data)) {
      throw new Error(`Expected array from ${apiPath}, received ${typeof data}`);
    }
    aggregated.push(...data);

    if (data.length < LIMIT) {
      break;
    }
    page += 1;
  }
  return aggregated;
}

function minimalUser(user) {
  if (!user || typeof user !== "object") return null;
  const record = {
    login: user.login ?? null,
    username: user.username ?? null,
    html_url: user.html_url ?? null,
    id: typeof user.id === "number" ? user.id : null
  };
  return Object.values(record).every((value) => value === null) ? null : record;
}

function minimalIssue(issue, commentsByNumber) {
  if (typeof issue !== "object" || issue === null) {
    return null;
  }

  const assignees =
    Array.isArray(issue.assignees) && issue.assignees.length
      ? issue.assignees.map((entry) => minimalUser(entry)).filter((entry) => entry !== null)
      : [];

  const milestoneRaw = issue.milestone ?? null;
  const milestone =
    milestoneRaw && typeof milestoneRaw === "object"
      ? {
          id: typeof milestoneRaw.id === "number" ? milestoneRaw.id : null,
          title: milestoneRaw.title ?? null,
          due_on: milestoneRaw.due_on ?? null,
          state: milestoneRaw.state ?? null
        }
      : null;

  const repoFullName =
    issue.repository && typeof issue.repository.full_name === "string"
      ? issue.repository.full_name
      : `${OWNER}/${REPO}`;

  const number = issue.number ?? null;
  const comments = number !== null && commentsByNumber.has(number)
    ? commentsByNumber.get(number)
    : [];

  return {
    number,
    html_url: issue.html_url ?? null,
    title: issue.title ?? null,
    body: issue.body ?? null,
    state: issue.state ?? null,
    created_at: issue.created_at ?? null,
    updated_at: issue.updated_at ?? null,
    closed_at: issue.closed_at ?? null,
    author: minimalUser(issue.user),
    assignees,
    milestone,
    repository: repoFullName,
    comments
  };
}

async function writeChunkedJson(fileStem, array) {
  await ensureDir(path.dirname(fileStem));
  if (!Array.isArray(array) || array.length === 0) {
    await fs.writeFile(`${fileStem}.part01.json`, "[]\n", "utf8");
    return [];
  }

  const chunkFiles = [];
  let index = 0;
  let cursor = 0;
  const total = array.length;

  while (cursor < total) {
    let chunkSize = Math.min(CHUNK_FALLBACK_SIZE, total - cursor);
    if (chunkSize < 1) chunkSize = 1;
    let chunk = array.slice(cursor, cursor + chunkSize);
    let serialized = JSON.stringify(chunk, null, 2);
    let attemptGuard = 0;

    while (lineCount(serialized) > MAX_LINES && chunk.length > 1) {
      chunkSize = Math.max(1, Math.floor(chunkSize / 2));
      chunk = array.slice(cursor, cursor + chunkSize);
      serialized = JSON.stringify(chunk, null, 2);
      attemptGuard += 1;
      if (attemptGuard > 100) {
        throw new Error("Unable to split chunk below MAX_LINES threshold.");
      }
    }

    const partName = `${fileStem}.part${String(index + 1).padStart(2, "0")}.json`;
    await fs.writeFile(partName, `${serialized}\n`, "utf8");
    chunkFiles.push(path.relative(outDir, partName));

    cursor += chunk.length;
    index += 1;
  }

  return chunkFiles;
}

function lineCount(text) {
  return text.split(/\r?\n/).length;
}

async function loadIssues() {
  if (SOURCE) {
    const sourcePath = path.resolve(SOURCE);
    console.log(`Reading issues from ${path.relative(process.cwd(), sourcePath)}`);
    const raw = await fs.readFile(sourcePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`Source file ${sourcePath} does not contain an array.`);
    }
    return { issues: parsed, sourceRoot: path.dirname(sourcePath) };
  }

  if (!TOKEN) {
    throw new Error("Cannot fetch from API without a token.");
  }

  const issues = await fetchPaged(`/repos/${OWNER}/${REPO}/issues`, {
    state: "all",
    sort: "created",
    direction: "asc"
  });
  return { issues, sourceRoot: null };
}

async function loadComments(issues, sourceRoot) {
  const commentsByNumber = new Map();
  if (!Array.isArray(issues) || issues.length === 0) {
    return commentsByNumber;
  }

  if (SOURCE && sourceRoot) {
    const fromFs = await loadCommentsFromFilesystem(issues, sourceRoot);
    if (fromFs) {
      return fromFs;
    }
  }

  if (!TOKEN) {
    return commentsByNumber;
  }

  return loadCommentsFromApi(issues);
}

async function loadCommentsFromFilesystem(issues, sourceRoot) {
  const commentsDir = path.join(sourceRoot, "issue_comments");
  try {
    const stat = await fs.stat(commentsDir);
    if (!stat.isDirectory()) return null;
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Unable to read issue_comments directory: ${error.message}`);
    }
    return null;
  }

  const result = new Map();
  for (const issue of issues) {
    const number = issue?.number;
    if (typeof number !== "number") continue;
    const filePath = path.join(commentsDir, `issue_${number}_comments.json`);
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        result.set(number, parsed.map((comment) => minimalComment(comment)).filter(Boolean));
      } else {
        result.set(number, []);
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`Failed reading comments for #${number}: ${error.message}`);
      }
    }
  }
  return result;
}

async function loadCommentsFromApi(issues) {
  const result = new Map();
  for (const issue of issues) {
    const number = issue?.number;
    if (typeof number !== "number") continue;
    try {
      const comments = await fetchPaged(`/repos/${OWNER}/${REPO}/issues/${number}/comments`);
      if (Array.isArray(comments) && comments.length > 0) {
        result.set(number, comments.map((entry) => minimalComment(entry)).filter(Boolean));
      } else {
        result.set(number, []);
      }
    } catch (error) {
      console.warn(`Unable to fetch comments for issue #${number}: ${error.message}`);
    }
  }
  return result;
}

function minimalComment(comment) {
  if (!comment || typeof comment !== "object") return null;
  const author = minimalUser(comment.user);
  return {
    id: typeof comment.id === "number" ? comment.id : null,
    html_url: comment.html_url ?? null,
    body: comment.body ?? null,
    created_at: comment.created_at ?? null,
    updated_at: comment.updated_at ?? null,
    author
  };
}

async function exportMinimalIssues() {
  await ensureDir(outDir);
  const targetRel = path.relative(process.cwd(), outDir);
  console.log(`Writing minimal issues to ${targetRel}`);

  const { issues, sourceRoot } = await loadIssues();
  const commentsByNumber = await loadComments(issues, sourceRoot);
  const minimalIssues = issues
    .map((issue) => minimalIssue(issue, commentsByNumber))
    .filter((issue) => issue && issue.number !== null);

  const parts = await writeChunkedJson(path.join(outDir, "issues", "issues"), minimalIssues);

  const repoFullName = (minimalIssues[0] && minimalIssues[0].repository) || `${OWNER}/${REPO}`;
  const [manifestOwner, manifestRepo] = repoFullName.includes("/")
    ? repoFullName.split("/", 2)
    : [OWNER, REPO];

  const manifest = {
    exported_at: new Date().toISOString(),
    base: BASE,
    owner: manifestOwner,
    repo: manifestRepo,
    limit: LIMIT,
    max_lines: MAX_LINES,
    chunk_fallback_size: CHUNK_FALLBACK_SIZE,
    counts: {
      issues_total: minimalIssues.length,
      files: parts.length
    },
    source_file: SOURCE ? path.relative(outDir, path.resolve(SOURCE)) : null,
    comments: {
      issues_with_comments: Array.from(commentsByNumber.entries()).filter(
        ([, list]) => Array.isArray(list) && list.length > 0
      ).length,
      total_comments: Array.from(commentsByNumber.values()).reduce(
        (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
        0
      )
    },
    files: parts
  };

  await fs.writeFile(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  console.log(`Wrote ${parts.length} issue file(s).`);
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      i += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

exportMinimalIssues().catch((error) => {
  console.error(error);
  process.exit(1);
});
