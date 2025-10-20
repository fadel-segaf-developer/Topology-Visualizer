#!/usr/bin/env node
/**
 * Build topology JSON slices for the UE_FDS3 repository using the minimal
 * RepoExtractor exports. The output keeps each JSON file under 600 lines by
 * chunking milestone/backlog data into separate slices.
 */
import fs from "fs/promises";
import path from "path";

const minimalRoot = path.resolve("RepoExtractor/exports/minimal");
const outputDir = path.resolve("data/fds-topology");
const MAX_LINES = 600;
const DOM_WORK_ID = "dom-work";

async function main() {
  const exportData = await loadLatestMinimalExport();
  if (!exportData) {
    throw new Error(
      `No minimal export found under ${minimalRoot}. Run scripts/export-gitea-minimal.mjs first.`
    );
  }

  const topology = buildTopology(exportData);
  await fs.mkdir(outputDir, { recursive: true });

  const manifestEntries = [];

  // Overview slice (high + medium level only)
  const overviewPath = path.join(outputDir, "work.overview.json");
  const overviewStats = await writeSlice(overviewPath, topology.meta, topology.overviewNodes, []);
  manifestEntries.push({
    id: "overview",
    label: "Overview (Milestones)",
    kind: "overview",
    nodes: overviewStats.nodes,
    edges: overviewStats.edges,
    lines: overviewStats.lines,
    path: path.relative(outputDir, overviewPath)
  });

  // Bucket slices (medium + low)
  for (const bucket of topology.buckets) {
    const baseName = `work.${bucket.slug}`;
    const entries = await writeBucketSlices(baseName, topology.meta, bucket);
    manifestEntries.push(...entries);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: {
      base: exportData.manifest.base ?? null,
      owner: exportData.manifest.owner ?? null,
      repo: exportData.manifest.repo ?? null,
      exportDir: path.relative(process.cwd(), exportData.baseDir)
    },
    stats: topology.stats,
    slices: manifestEntries
  };

  const manifestPath = path.join(outputDir, "work.manifest.json");
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`Topology slices written to ${path.relative(process.cwd(), outputDir)}`);
  console.log(`Overview: ${path.relative(process.cwd(), overviewPath)}`);
  console.log(`Manifest: ${path.relative(process.cwd(), manifestPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function loadLatestMinimalExport() {
  let dirEntries;
  try {
    dirEntries = await fs.readdir(minimalRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  const directories = dirEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  if (!directories.length) return null;
  directories.sort();
  const latest = directories[directories.length - 1];
  const baseDir = path.join(minimalRoot, latest);
  const manifestPath = path.join(baseDir, "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const issues = [];
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  for (const relative of files) {
    const filePath = path.join(baseDir, relative);
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) issues.push(...parsed);
    } catch (error) {
      console.warn(`Unable to read ${relative}: ${error.message}`);
    }
  }
  return { baseDir, manifest, issues };
}

function buildTopology(exportData) {
  const { issues, manifest } = exportData;
  if (!Array.isArray(issues) || !issues.length) {
    throw new Error("Minimal export does not contain issues or pull requests.");
  }

  const baseUrl = normalizeBase(manifest.base || "https://git.frys.co.id");
  const owner = sanitize(manifest.owner || "FRYS-DEV");
  const repo = sanitize(manifest.repo || "UE_FDS3");
  const exportedAt = isoOrNull(manifest.exported_at) || new Date().toISOString();
  const repoUrl = `${baseUrl}/${owner}/${repo}`;
  const repoFullName = `${owner}/${repo}`;

  const stats = {
    issuesTotal: 0,
    issuesOpen: 0,
    prsTotal: 0,
    prsOpen: 0,
    milestoneCount: 0
  };

  const buckets = new Map();

  for (const item of issues) {
    const normalized = normalizeWorkItem(item, repoFullName);
    const bucketKey = normalized.milestone ? `ms-${normalized.milestone.id}` : "ms-unplanned";
    if (!buckets.has(bucketKey)) {
      buckets.set(
        bucketKey,
        createBucket(bucketKey, normalized.milestone, baseUrl, owner, repo)
      );
    }
    const bucket = buckets.get(bucketKey);
    bucket.items.push(createLowNode(normalized, bucket.id));
    if (normalized.type === "issue") {
      bucket.stats.issuesTotal += 1;
      if (normalized.state === "open") bucket.stats.issuesOpen += 1;
      stats.issuesTotal += 1;
      if (normalized.state === "open") stats.issuesOpen += 1;
    } else {
      bucket.stats.prsTotal += 1;
      if (normalized.state === "open") bucket.stats.prsOpen += 1;
      stats.prsTotal += 1;
      if (normalized.state === "open") stats.prsOpen += 1;
    }
  }

  const bucketList = [...buckets.values()];
  stats.milestoneCount = bucketList.filter((bucket) => bucket.kind === "milestone").length;

  const domWork = buildDomWorkNode(stats);

  const overviewNodes = [domWork];

  const preparedBuckets = bucketList
    .map((bucket) => finalizeBucket(bucket, domWork))
    .sort((a, b) => compareBuckets(a, b));

  overviewNodes.push(...preparedBuckets.map((bucket) => bucket.mediumNode));

  const meta = {
    name: `${repo} Work Topology`,
    owner,
    description: `Milestones, issues, and pull requests for ${repoFullName}.`,
    version: exportedAt,
    viewModes: ["high", "medium", "low"],
    defaultView: "high",
    guides: [
      {
        label: "Repository",
        url: repoUrl,
        description: `${repoFullName} on Gitea`
      }
    ],
    intents: {
      "relates-to": { label: "Relates To", color: "#38bdf8" },
      blocking: { label: "Blocking", color: "#f97316" }
    },
    repository: {
      provider: "gitea",
      owner,
      name: repo,
      url: repoUrl
    },
    lastSyncedAt: exportedAt
  };

  return { meta, buckets: preparedBuckets, overviewNodes, stats };
}

function buildDomWorkNode(stats) {
  const summaryParts = [];
  summaryParts.push(
    `Issues ${stats.issuesOpen}/${stats.issuesTotal} open`,
    `PRs ${stats.prsOpen}/${stats.prsTotal} open`
  );
  if (stats.milestoneCount) {
    summaryParts.push(`${stats.milestoneCount} milestone${stats.milestoneCount > 1 ? "s" : ""}`);
  }
  return {
    id: DOM_WORK_ID,
    label: "Work Streams",
    type: "portfolio",
    group: "Work",
    level: "high",
    summary: summaryParts.join(" | "),
    tags: ["work"]
  };
}

function createBucket(id, milestone, baseUrl, owner, repo) {
  const isMilestone = Boolean(milestone);
  const label = isMilestone
    ? `Milestone: ${milestone.title}`
    : "Unplanned / Backlog";
  const slug = isMilestone
    ? `milestone-${milestone.id}-${slugify(milestone.title)}`
    : "backlog";
  const mediumNode = {
    id,
    label,
    type: isMilestone ? "milestone" : "backlog",
    group: "Work",
    level: "medium",
    parent: DOM_WORK_ID,
    summary: "",
    tags: isMilestone && milestone.state ? [milestone.state] : []
  };

  if (isMilestone) {
    mediumNode.work = {
      milestones: [
        {
          id: milestone.id,
          number: milestone.id,
          title: milestone.title,
          url: `${baseUrl}/${owner}/${repo}/milestone/${milestone.id}`,
          state: milestone.state,
          dueOn: milestone.dueOn
        }
      ]
    };
  }

  return {
    id,
    slug,
    label,
    kind: isMilestone ? "milestone" : "backlog",
    milestone,
    mediumNode,
    items: [],
    stats: {
      issuesTotal: 0,
      issuesOpen: 0,
      prsTotal: 0,
      prsOpen: 0
    }
  };
}

function finalizeBucket(bucket, domWorkNode) {
  bucket.mediumNode.summary = buildBucketSummary(bucket);
  const sortedItems = bucket.items
    .sort((a, b) => {
      if (a.state !== b.state) return a.state === "open" ? -1 : 1;
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    })
    .map((entry) => entry.node);

  return {
    id: bucket.id,
    slug: bucket.slug,
    label: bucket.label,
    kind: bucket.kind,
    mediumNode: bucket.mediumNode,
    lowNodes: sortedItems,
    highNode: domWorkNode,
    stats: bucket.stats,
    milestone: bucket.milestone
  };
}

function buildBucketSummary(bucket) {
  const parts = [];
  const { stats, milestone } = bucket;
  if (stats.issuesTotal) {
    parts.push(`Issues ${stats.issuesOpen}/${stats.issuesTotal} open`);
  }
  if (stats.prsTotal) {
    parts.push(`PRs ${stats.prsOpen}/${stats.prsTotal} open`);
  }
  if (milestone?.dueOn) {
    parts.push(`Due ${formatDate(milestone.dueOn)}`);
  }
  if (!parts.length) {
    return "No items recorded.";
  }
  return parts.join(" | ");
}

async function writeBucketSlices(baseName, meta, bucket) {
  const entries = [];
  const baseNodes = [bucket.highNode, bucket.mediumNode];

  const chunks = planBucketChunks(meta, baseNodes, bucket.lowNodes);
  const multiPart = chunks.length > 1;

  let index = 0;
  for (const chunk of chunks) {
    const suffix = multiPart ? `.part${String(index + 1).padStart(2, "0")}` : "";
    const filename = `${baseName}${suffix}.json`;
    const filePath = path.join(outputDir, filename);
    await fs.writeFile(filePath, chunk.json, "utf8");
    entries.push({
      id: multiPart ? `${bucket.id}${suffix}` : bucket.id,
      label: multiPart ? `${bucket.label} (part ${index + 1})` : bucket.label,
      kind: bucket.kind,
      nodes: chunk.nodeCount,
      lowNodes: chunk.lowCount,
      edges: 0,
      lines: chunk.lines,
      path: path.relative(outputDir, filePath)
    });
    index += 1;
  }

  return entries;
}

function planBucketChunks(meta, baseNodes, lowNodes) {
  if (!lowNodes.length) {
    const serialized = serialize(meta, baseNodes, []);
    if (serialized.lines > MAX_LINES) {
      throw new Error(
        `Bucket base nodes exceed ${MAX_LINES} lines (${serialized.lines}).`
      );
    }
    return [
      {
        json: serialized.json,
        lines: serialized.lines,
        lowCount: 0,
        nodeCount: baseNodes.length
      }
    ];
  }

  const chunks = [];
  let start = 0;

  while (start < lowNodes.length) {
    let best = null;
    for (let end = start + 1; end <= lowNodes.length; end += 1) {
      const candidateNodes = baseNodes.concat(lowNodes.slice(start, end));
      const serialized = serialize(meta, candidateNodes, []);
      if (serialized.lines <= MAX_LINES) {
        best = {
          json: serialized.json,
          lines: serialized.lines,
          lowCount: end - start,
          nodeCount: candidateNodes.length
        };
      } else {
        break;
      }
    }

    if (!best) {
      const candidateNodes = baseNodes.concat(lowNodes.slice(start, start + 1));
      const serialized = serialize(meta, candidateNodes, []);
      best = {
        json: serialized.json,
        lines: serialized.lines,
        lowCount: 1,
        nodeCount: candidateNodes.length
      };
      console.warn(
        `[warn] Slice exceeded ${MAX_LINES} lines; wrote single-item chunk (${serialized.lines} lines).`
      );
    }

    chunks.push(best);
    start += best.lowCount;
  }

  return chunks;
}

async function writeSlice(filePath, meta, nodes, edges) {
  const serialized = serialize(meta, nodes, edges);
  if (serialized.lines > MAX_LINES) {
    throw new Error(
      `Slice ${path.relative(process.cwd(), filePath)} exceeds ${MAX_LINES} lines (${serialized.lines}).`
    );
  }
  await fs.writeFile(filePath, serialized.json, "utf8");
  return { lines: serialized.lines, nodes: nodes.length, edges: edges.length };
}

function serialize(meta, nodes, edges) {
  const payload = { meta, nodes, edges };
  const json = JSON.stringify(payload, null, 2);
  const lines = json.split(/\r?\n/).length;
  return { json: `${json}\n`, lines };
}

function normalizeWorkItem(item, repoFullName) {
  const number = Number.parseInt(item?.number, 10);
  if (!Number.isInteger(number)) {
    throw new Error("Work item is missing a valid number.");
  }
  const type = detectType(item);
  const state = normalizeState(item?.state);
  const title = truncate(sanitize(item?.title || `#${number}`), 120);
  const author =
    sanitize(item?.author?.login) ||
    sanitize(item?.author?.username) ||
    sanitize(item?.author?.name) ||
    "";
  const assignee =
    Array.isArray(item?.assignees) && item.assignees.length
      ? sanitize(item.assignees[0].login || item.assignees[0].username || "")
      : "";

  const milestoneRaw = item?.milestone;
  let milestone = null;
  if (milestoneRaw) {
    const milestoneId = Number.parseInt(milestoneRaw.id, 10);
    if (Number.isInteger(milestoneId) && milestoneId >= 0) {
      const rawTitle = sanitize(milestoneRaw.title || "");
      const title = truncate(rawTitle || `Milestone ${milestoneId}`, 80);
      milestone = {
        id: milestoneId,
        title,
        state: normalizeState(milestoneRaw.state),
        dueOn: isoOrNull(milestoneRaw.due_on)
      };
    }
  }

  return {
    number,
    type,
    state,
    title,
    author,
    assignee,
    repo: repoFullName,
    url: item?.html_url || "",
    createdAt: isoOrNull(item?.created_at),
    updatedAt: isoOrNull(item?.updated_at) || isoOrNull(item?.created_at),
    closedAt: isoOrNull(item?.closed_at),
    milestone
  };
}

function createLowNode(item, parentId) {
  const label = truncate(`#${item.number} ${item.title}`, 80);
  const summaryParts = [item.state === "open" ? "Open" : "Closed"];
  if (item.updatedAt) summaryParts.push(`updated ${item.updatedAt.slice(0, 10)}`);
  if (item.author) summaryParts.push(`by ${item.author}`);
  if (item.assignee) summaryParts.push(`owner ${item.assignee}`);

  const workKey = item.type === "pr" ? "prs" : "issues";
  const workItem = {
    provider: "gitea",
    repo: item.repo,
    number: item.number,
    url: item.url,
    state: item.state
  };
  if (item.createdAt) workItem.createdAt = item.createdAt;
  if (item.updatedAt) workItem.updatedAt = item.updatedAt;
  if (item.closedAt) workItem.closedAt = item.closedAt;

  const node = {
    id: `${item.type}-${item.number}`,
    label,
    type: item.type === "pr" ? "pull-request" : "issue",
    group: item.type === "pr" ? "Pull Requests" : "Issues",
    level: "low",
    parent: parentId,
    summary: summaryParts.join(" | "),
    tags: [item.state],
    work: {
      [workKey]: [workItem]
    }
  };

  return { node, state: item.state, updatedAt: item.updatedAt || "" };
}

function detectType(item) {
  const url = typeof item?.html_url === "string" ? item.html_url : "";
  if (url.includes("/pull/") || url.includes("/pulls/")) {
    return "pr";
  }
  return "issue";
}

function normalizeState(value) {
  const state = sanitize(value || "").toLowerCase();
  return state === "closed" ? "closed" : "open";
}

function isoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatDate(value) {
  const iso = isoOrNull(value);
  if (!iso) return null;
  return iso.slice(0, 10);
}

function sanitize(value) {
  if (!value || typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, max) {
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

function slugify(value) {
  const base = sanitize(value || "");
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "bucket";
}

function normalizeBase(value) {
  const sanitized = sanitize(value || "");
  if (!sanitized) return "https://git.frys.co.id";
  return sanitized.endsWith("/") ? sanitized.slice(0, -1) : sanitized;
}

function compareBuckets(a, b) {
  const aDue = a.milestone?.dueOn || "";
  const bDue = b.milestone?.dueOn || "";
  if (aDue && bDue && aDue !== bDue) return aDue.localeCompare(bDue);
  if (aDue) return -1;
  if (bDue) return 1;
  return a.label.localeCompare(b.label);
}
