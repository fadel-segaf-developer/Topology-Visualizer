import { NODE_SIZE, DEFAULT_INTENTS } from './constants.js';
import { cloneDeep } from './utils.js';

export const state = {
  data: null,
  selectedNodeId: null,
  hoverNodeId: null,
  searchTerm: '',
  filters: { type: 'all', tag: 'all', intent: 'all' },
  layout: { width: 1400, height: 900 },
  lookup: { nodeById: new Map(), outgoing: new Map(), incoming: new Map(), children: new Map() },
  dom: { nodes: new Map(), edges: new Map() },
  visibility: null,
  activeLevel: 'high',
  drilldown: { medium: null, low: null }
};

export function setData(topology) {
  state.data = normalizeTopology(topology);
  state.selectedNodeId = null;
  state.hoverNodeId = null;
  state.searchTerm = '';
  state.filters = { type: 'all', tag: 'all', intent: 'all' };
  state.layout = { width: 1400, height: 900 };
  state.dom = { nodes: new Map(), edges: new Map() };
  state.visibility = null;
  state.activeLevel = state.data?.meta?.defaultView || 'high';
  state.drilldown = { medium: null, low: null };
  buildLookup();
}

export function setSearchTerm(value) {
  state.searchTerm = value;
}

export function setFilters(next) {
  state.filters = { ...state.filters, ...next };
}

export function setSelectedNode(nodeId) {
  state.selectedNodeId = nodeId;
}

export function setHoverNode(nodeId) {
  state.hoverNodeId = nodeId;
}

export function setLayout(layout) {
  state.layout = layout;
}

export function setDom(dom) {
  state.dom = dom;
}

export function setVisibility(cache) {
  state.visibility = cache;
}

export function resetVisibility() {
  state.visibility = null;
}

export function getActiveLevel() {
  return state.activeLevel;
}

export function setActiveLevel(level) {
  const modes = state.data?.meta?.viewModes ?? ['high', 'medium', 'low'];
  if (!modes.includes(level)) return;
  state.activeLevel = level;
  resetVisibility();
}

export function getDrilldown() {
  return { ...state.drilldown };
}

export function getDrilldownPath() {
  const path = [];
  if (state.drilldown.medium) {
    const mid = state.lookup.nodeById.get(state.drilldown.medium);
    if (mid) path.push(mid);
  }
  if (state.drilldown.low) {
    const low = state.lookup.nodeById.get(state.drilldown.low);
    if (low) path.push(low);
  }
  return path;
}

export function setDrilldown(level, value) {
  if (level === 'medium') {
    state.drilldown.medium = value || null;
    if (!value) {
      state.drilldown.low = null;
    }
    resetVisibility();
    return;
  }
  if (level === 'low') {
    state.drilldown.low = value || null;
    resetVisibility();
  }
}

export function resetDrilldown(level) {
  if (!level) {
    state.drilldown = { medium: null, low: null };
    resetVisibility();
    return;
  }
  if (level === 'medium') {
    state.drilldown.medium = null;
    state.drilldown.low = null;
  } else if (level === 'low') {
    state.drilldown.low = null;
  }
  resetVisibility();
}

export function getChildren(nodeId) {
  const list = state.lookup.children.get(nodeId);
  return Array.isArray(list) ? [...list] : [];
}

export function getIntents() {
  return state.data?.meta?.intents ?? DEFAULT_INTENTS;
}

export function getIntentColor(intent) {
  const intents = getIntents();
  return intents[intent]?.color || DEFAULT_INTENTS[intent]?.color || '#94a3b8';
}

export function getLookup() {
  return state.lookup;
}

export function buildLookup() {
  const nodeById = new Map();
  const outgoing = new Map();
  const incoming = new Map();
  const children = new Map();
  (state.data?.nodes ?? []).forEach((node) => nodeById.set(node.id, node));
  (state.data?.nodes ?? []).forEach((node) => {
    if (!node.parent) return;
    if (!children.has(node.parent)) children.set(node.parent, []);
    children.get(node.parent).push(node);
  });
  (state.data?.edges ?? []).forEach((edge) => {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);
  });
  state.lookup = { nodeById, outgoing, incoming, children };
}

function normalizeTopology(raw) {
  const clone = cloneDeep(raw ?? {});
  const meta = clone.meta ?? {};
  clone.meta = {
    name: meta.name || 'Untitled Topology',
    version: meta.version || '',
    owner: meta.owner || '',
    description: meta.description || '',
    intents: { ...DEFAULT_INTENTS, ...(meta.intents || {}) },
    guides: Array.isArray(meta.guides) ? meta.guides : [],
    viewModes: Array.isArray(meta.viewModes) && meta.viewModes.length
      ? Array.from(new Set(meta.viewModes))
      : ['high', 'medium', 'low'],
    defaultView: ['high', 'medium', 'low'].includes(meta.defaultView) ? meta.defaultView : 'high',
    insightPlaybook: Array.isArray(meta.insightPlaybook) ? meta.insightPlaybook : [],
    viewCaps: normalizeViewCaps(meta.viewCaps),
    overrides: normalizeOverrides(meta.overrides),
    insights: normalizeInsights(meta.insights)
  };
  clone.nodes = Array.isArray(clone.nodes) ? clone.nodes.map(normalizeNode) : [];
  clone.edges = Array.isArray(clone.edges) ? clone.edges.map(normalizeEdge) : [];

  const nodeMap = new Map(clone.nodes.map((node) => [node.id, node]));
  const levelOrder = { high: 0, medium: 1, low: 2 };

  clone.nodes.forEach((node) => {
    if (node.parent && (!nodeMap.has(node.parent) || node.parent === node.id)) {
      node.parent = null;
    }
    node.children = node.children
      .filter((childId) => childId !== node.id && nodeMap.has(childId))
      .filter((childId, index, arr) => arr.indexOf(childId) === index);
  });

  clone.nodes.forEach((node) => {
    node.children.forEach((childId) => {
      const child = nodeMap.get(childId);
      if (child && !child.parent) {
        child.parent = node.id;
      }
    });
  });

  const edges = clone.edges ?? [];
  clone.nodes.forEach((node) => {
    const order = levelOrder[node.level || 'high'];
    if (!Number.isFinite(order) || order <= 0 || node.parent) return;
    const candidate = edges.find((edge) => {
      if (edge.from !== node.id && edge.to !== node.id) return false;
      const otherId = edge.from === node.id ? edge.to : edge.from;
      const other = nodeMap.get(otherId);
      if (!other) return false;
      const otherOrder = levelOrder[other.level || 'high'];
      return Number.isFinite(otherOrder) && otherOrder === order - 1;
    });
    if (candidate) {
      const otherId = candidate.from === node.id ? candidate.to : candidate.from;
      const parent = nodeMap.get(otherId);
      if (parent) {
        node.parent = parent.id;
        if (!parent.children.includes(node.id)) {
          parent.children.push(node.id);
        }
      }
    }
  });

  return clone;
}

export function isNodeInActiveLevel(node) {
  if (!node) return false;
  const nodeLevel = node.level || 'high';
  if (state.activeLevel === nodeLevel) {
    return matchesDrilldown(node);
  }
  if (!node.level && state.activeLevel === 'high') {
    return matchesDrilldown(node);
  }
  return false;
}

export function isEdgeInActiveLevel(edge) {
  if (!edge) return false;
  const fromNode = state.lookup.nodeById.get(edge.from);
  const toNode = state.lookup.nodeById.get(edge.to);
  if (!fromNode || !toNode) return false;
  if (edge.level) {
    if (edge.level !== state.activeLevel) return false;
    return isNodeInActiveLevel(fromNode) && isNodeInActiveLevel(toNode);
  }
  return isNodeInActiveLevel(fromNode) && isNodeInActiveLevel(toNode);
}

function normalizeNode(node) {
  const metrics = Array.isArray(node.metrics)
    ? node.metrics
    : Object.entries(node.metrics || {}).map(([label, value]) => ({ label, value }));
  const parent = typeof node.parent === 'string' && node.parent.trim().length ? node.parent.trim() : null;
  const children = Array.isArray(node.children)
    ? node.children.filter((child) => typeof child === 'string' && child.trim().length)
    : [];
  return {
    ...node,
    level: normalizeLevel(node.level),
    type: node.type || 'component',
    tags: Array.isArray(node.tags) ? [...new Set(node.tags)] : [],
    metrics,
    parent,
    children: [...new Set(children)],
    links: Array.isArray(node.links) ? node.links : [],
    status: node.status ? { ...node.status } : null,
    layout: node.layout ? { ...node.layout } : {},
    position: node.position ? { ...node.position } : null,
    size: node.size ? { ...node.size } : null,
    source: normalizeSource(node.source),
    work: normalizeWork(node.work),
    insights: normalizeInsights(node.insights)
  };
}

function normalizeEdge(edge) {
  return {
    ...edge,
    intent: edge.intent || 'link',
    description: edge.description || '',
    level: normalizeLevel(edge.level),
    source: normalizeSource(edge.source),
    work: normalizeWork(edge.work),
    insights: normalizeInsights(edge.insights)
  };
}

export function ensureNodeLayout(node) {
  if (!node.size) node.size = {};
  if (!Number.isFinite(node.size.width)) {
    node.size.width = computeAutoNodeWidth(node);
  }
  if (!Number.isFinite(node.size.height)) {
    node.size.height = node.layout?.height || NODE_SIZE.height;
  }
  if (!node.position) {
    node.position = {
      x: node.layout?.x ?? 0,
      y: node.layout?.y ?? 0
    };
  }
}

function normalizeLevel(level) {
  return level === 'low' || level === 'medium' || level === 'high' ? level : 'high';
}

function normalizeSource(value) {
  if (!value || typeof value !== 'object') return null;
  const source = { ...value };
  if (source.git && typeof source.git === 'object') {
    source.git = { ...source.git };
  }
  return source;
}

function normalizeWork(value) {
  if (!value || typeof value !== 'object') return null;
  const issues = Array.isArray(value.issues) ? value.issues : [];
  const prs = Array.isArray(value.prs) ? value.prs : [];
  if (!issues.length && !prs.length) return null;
  return { issues, prs };
}

function normalizeInsights(value) {
  if (!Array.isArray(value)) return [];
  return value.map((insight) => {
    if (!insight || typeof insight !== 'object') return null;
    const copy = { ...insight };
    copy.level = normalizeLevel(copy.level);
    copy.sources = Array.isArray(copy.sources) ? copy.sources : [];
    if (Array.isArray(copy.actions) && !copy.actions.length) {
      delete copy.actions;
    }
    return copy;
  }).filter(Boolean);
}

function normalizeViewCaps(value) {
  if (!value || typeof value !== 'object') return null;
  const result = {};
  ['high', 'medium', 'low'].forEach((level) => {
    if (Number.isFinite(value[level])) result[level] = Number(value[level]);
  });
  return Object.keys(result).length ? result : null;
}

function normalizeOverrides(value) {
  if (!value || typeof value !== 'object') return null;
  const overrides = {};
  if (Array.isArray(value.pin)) overrides.pin = [...new Set(value.pin)];
  if (Array.isArray(value.hide)) overrides.hide = [...new Set(value.hide)];
  if (value.rename && typeof value.rename === 'object') overrides.rename = { ...value.rename };
  return Object.keys(overrides).length ? overrides : null;
}

function matchesDrilldown(node) {
  if (!node) return false;
  const level = node.level || 'high';
  if (level === 'medium') {
    const focus = state.drilldown.medium;
    return !focus || node.parent === focus;
  }
  if (level === 'low') {
    if (state.drilldown.low) {
      return node.parent === state.drilldown.low;
    }
    if (state.drilldown.medium) {
      if (node.parent === state.drilldown.medium) return true;
      const mediumNode = state.lookup.nodeById.get(node.parent);
      if (!mediumNode) return false;
      return mediumNode.parent === state.drilldown.medium;
    }
  }
  return true;
}

function computeAutoNodeWidth(node) {
  const explicit = node.layout?.width ?? node.size?.width;
  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }
  let width = NODE_SIZE.width;
  const labelLength = typeof node.label === 'string' ? node.label.length : 0;
  if (labelLength > 22) {
    width += Math.min(80, (labelLength - 22) * 3);
  }
  const summaryLength = typeof node.summary === 'string' ? node.summary.length : 0;
  if (summaryLength > 90) width += 40;
  if (summaryLength > 140) width += 40;
  const tags = Array.isArray(node.tags) ? node.tags : [];
  if (tags.length > 3) {
    width += Math.min(180, (tags.length - 3) * 36);
  }
  const longestTag = tags.reduce((max, tag) => Math.max(max, (tag || '').length), 0);
  if (longestTag > 14) {
    width += Math.min(140, (longestTag - 14) * 6);
  }
  const metrics = Array.isArray(node.metrics) ? node.metrics.length : 0;
  if (metrics > 2) {
    width += Math.min(120, (metrics - 2) * 24);
  }
  const insights = Array.isArray(node.insights) ? node.insights.length : 0;
  if (insights > 1) {
    width += Math.min(100, (insights - 1) * 24);
  }
  return Math.min(520, Math.max(width, NODE_SIZE.width));
}
