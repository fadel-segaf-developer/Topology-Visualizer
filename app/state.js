import { NODE_SIZE, DEFAULT_INTENTS } from './constants.js';
import { cloneDeep } from './utils.js';
import { defaultTopology } from '../data/defaultTopology.js';

export const state = {
  data: null,
  selectedNodeId: null,
  hoverNodeId: null,
  searchTerm: '',
  filters: { type: 'all', tag: 'all', intent: 'all' },
  layout: { width: 1400, height: 900 },
  lookup: { nodeById: new Map(), outgoing: new Map(), incoming: new Map() },
  dom: { nodes: new Map(), edges: new Map() },
  visibility: null
};

export function initializeDefaultData() {
  setData(defaultTopology);
}

export function setData(topology) {
  state.data = normalizeTopology(topology);
  state.selectedNodeId = null;
  state.hoverNodeId = null;
  state.searchTerm = '';
  state.filters = { type: 'all', tag: 'all', intent: 'all' };
  state.layout = { width: 1400, height: 900 };
  state.dom = { nodes: new Map(), edges: new Map() };
  state.visibility = null;
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
  (state.data?.nodes ?? []).forEach((node) => nodeById.set(node.id, node));
  (state.data?.edges ?? []).forEach((edge) => {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);
  });
  state.lookup = { nodeById, outgoing, incoming };
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
    guides: Array.isArray(meta.guides) ? meta.guides : []
  };
  clone.nodes = Array.isArray(clone.nodes) ? clone.nodes.map(normalizeNode) : [];
  clone.edges = Array.isArray(clone.edges) ? clone.edges.map(normalizeEdge) : [];
  return clone;
}

function normalizeNode(node) {
  const metrics = Array.isArray(node.metrics)
    ? node.metrics
    : Object.entries(node.metrics || {}).map(([label, value]) => ({ label, value }));
  return {
    ...node,
    type: node.type || 'component',
    tags: Array.isArray(node.tags) ? [...new Set(node.tags)] : [],
    metrics,
    links: Array.isArray(node.links) ? node.links : [],
    status: node.status ? { ...node.status } : null,
    layout: node.layout ? { ...node.layout } : {},
    position: node.position ? { ...node.position } : null,
    size: node.size ? { ...node.size } : null
  };
}

function normalizeEdge(edge) {
  return {
    ...edge,
    intent: edge.intent || 'link',
    description: edge.description || ''
  };
}

export function ensureNodeLayout(node) {
  if (!node.size) {
    node.size = {
      width: node.layout?.width || NODE_SIZE.width,
      height: node.layout?.height || NODE_SIZE.height
    };
  }
  if (!node.position) {
    node.position = {
      x: node.layout?.x ?? 0,
      y: node.layout?.y ?? 0
    };
  }
}
