import {
  state,
  setData,
  setSearchTerm,
  setFilters,
  setSelectedNode,
  setHoverNode,
  setVisibility,
  setActiveLevel,
  setDrilldown,
  resetDrilldown,
  getChildren
} from './state.js';
import { NODE_SIZE } from './constants.js';
import { cloneDeep, slugify, titleCase } from './utils.js';
import {
  renderScene,
  renderGraph,
  renderInspector,
  renderFilters,
  renderViewSwitcher,
  computeVisibility,
  applyStyles,
  updateMinimap
} from './render.js';
import { applyLayout, fallbackLayout } from './layout.js';
import { bindInteractions, applyStoredTheme } from './interactions.js';
import { defaultTopology } from '../data/defaultTopology.js';

const elements = {
  graphHost: document.getElementById('graphHost'),
  panLayer: document.getElementById('panLayer'),
  graphSvg: document.getElementById('graphSvg'),
  nodeLayer: document.getElementById('nodeLayer'),
  edgeLayer: document.getElementById('edgeLayer'),
  dropHint: document.getElementById('dropHint'),
  layoutSpinner: document.getElementById('layoutSpinner'),
  minimap: document.getElementById('minimap'),
  metaTitle: document.getElementById('metaTitle'),
  metaVersion: document.getElementById('metaVersion'),
  metaOwner: document.getElementById('metaOwner'),
  metaDescription: document.getElementById('metaDescription'),
  fileName: document.getElementById('fileName'),
  viewSwitcher: document.getElementById('viewSwitcher'),
  legend: document.getElementById('legend'),
  notesPanel: document.getElementById('notesPanel'),
  searchInput: document.getElementById('searchInput'),
  typeFilter: document.getElementById('typeFilter'),
  tagFilter: document.getElementById('tagFilter'),
  intentFilter: document.getElementById('intentFilter'),
  themeToggle: document.getElementById('themeToggle'),
  layoutBtn: document.getElementById('layoutBtn'),
  fitButton: document.getElementById('fitButton'),
  resetBtn: document.getElementById('resetBtn'),
  loadBtn: document.getElementById('loadBtn'),
  exportBtn: document.getElementById('exportBtn'),
  fileInput: document.getElementById('fileInput'),
  inspectorTitle: document.getElementById('inspectorTitle'),
  inspectorBody: document.getElementById('inspectorBody'),
  toast: document.getElementById('toast')
};

const ctx = {
  elements,
  libs: {},
  handlers: {},
  panzoom: null,
  elk: null,
  toastTimer: null,
  validator: null,
  schema: null
};

init();

async function init() {
  try {
    await loadLibraries();
    await loadSchema();
    setupPanzoom();
    applyStoredTheme(ctx);
    await applyTopology(defaultTopology, 'Default');
    await runLayout({ fit: true, silent: true });
    renderScene(ctx);
    bindHandlers();
    bindInteractions(ctx);
    showToast('Loaded default topology', 'success');
  } catch (error) {
    console.error('Failed to initialise topology designer', error);
    showToast('Failed to initialise topology designer', 'danger');
  }
}

async function loadLibraries() {
  const [
    { default: Panzoom },
    { default: tippy },
    { default: ELK },
    { marked },
    { default: Ajv }
  ] = await Promise.all([
    import('https://esm.run/@panzoom/panzoom@4.5.1'),
    import('https://esm.run/tippy.js@6'),
    import('https://esm.run/elkjs@0.9.0'),
    import('https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js'),
    import('https://esm.run/ajv@8/dist/2020.js')
  ]);
  ctx.libs = { Panzoom, tippy, marked, Ajv };
  ctx.elk = new ELK();
  ctx.libs.marked.setOptions({ mangle: false, headerIds: false });
}

async function loadSchema() {
  const response = await fetch('../schema/topology.schema.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load topology schema (${response.status})`);
  }
  const schema = await response.json();
  const AjvClass = ctx.libs.Ajv;
  const ajv = new AjvClass({
    strictSchema: false,
    allErrors: true,
    allowUnionTypes: true
  });
  ajv.addFormat('uri', true);
  ajv.addFormat('date-time', true);
  ctx.schema = schema;
  ctx.validator = ajv.compile(schema);
}

function bindHandlers() {
  ctx.handlers.onSearch = (term) => {
    setSearchTerm(term);
    refreshVisibility();
  };

  ctx.handlers.onFilter = (key, value) => {
    setFilters({ [key]: value });
    renderGraph(ctx);
    renderInspector(ctx);
    updateMinimap(ctx);
  };

  ctx.handlers.onLayout = () => runLayout({ fit: false });
  ctx.handlers.onFit = () => fitGraph();
  ctx.handlers.onReset = () => resetToDefault();
  ctx.handlers.onExport = () => exportTopology();
  ctx.handlers.onFileSelect = async (file) => {
    try {
      const topology = await loadTopologyFromFile(file);
      await applyTopology(topology, file.name);
      showToast(`Loaded: ${file.name}`, 'info');
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'Failed to read topology JSON', 'danger');
    }
  };
  ctx.handlers.selectNode = (nodeId, focus) => {
    setSelectedNode(nodeId);
    renderInspector(ctx);
    refreshVisibility();
    if (focus && nodeId) focusNode(nodeId, true);
  };

  ctx.handlers.onDrillInto = (nodeId) => {
    const node = nodeId ? state.lookup.nodeById.get(nodeId) : null;
    if (!node) return;

    const level = node.level || 'high';
    let nextLevel = state.activeLevel;
    let announceLevel = null;
    let targetId = nodeId;

    if (level === 'high') {
      setDrilldown('medium', node.id);
      setDrilldown('low', null);
      const children = getChildren(node.id);
      if (children.length) {
        targetId = children[0].id;
      }
      nextLevel = 'medium';
    } else if (level === 'medium') {
      if (node.parent) {
        setDrilldown('medium', node.parent);
      }
      setDrilldown('low', node.id);
      const children = getChildren(node.id);
      if (children.length) {
        targetId = children[0].id;
      }
      nextLevel = 'low';
    } else if (level === 'low') {
      if (node.parent) {
        setDrilldown('low', node.parent);
        nextLevel = 'low';
      }
    }

    setSelectedNode(targetId);
    const levelChanged = nextLevel !== state.activeLevel;
    if (levelChanged) {
      setActiveLevel(nextLevel);
      announceLevel = nextLevel;
    }
    updateScene({ announceLevel });
    if (targetId) focusNode(targetId, true);
  };

  ctx.handlers.hoverNode = (nodeId) => {
    setHoverNode(nodeId);
    refreshVisibility();
  };

  ctx.handlers.onNodeMoved = (node) => {
    if (state.selectedNodeId === node.id) {
      renderInspector(ctx);
    }
  };

  ctx.handlers.onLevelChange = (level) => {
    if (!level || state.activeLevel === level) return;
    setActiveLevel(level);
    updateScene({ announceLevel: level });
  };

  ctx.handlers.onClearDrilldown = () => {
    resetDrilldown();
    updateScene();
  };

  ctx.handlers.focusNode = (nodeId) => focusNode(nodeId, true);

  ctx.handlers.pinNode = (node) => {
    if (!node) return;
    node.layout = node.layout || {};
    node.layout.fixed = true;
    node.layout.x = Math.round(node.position?.x ?? node.layout.x ?? 0);
    node.layout.y = Math.round(node.position?.y ?? node.layout.y ?? 0);
    node.layout.width = Math.round(node.size?.width ?? NODE_SIZE.width);
    node.layout.height = Math.round(node.size?.height ?? NODE_SIZE.height);
    renderInspector(ctx);
    showToast(`Pinned ${node.label}`, 'info');
  };

  ctx.handlers.unpinNode = (node) => {
    if (!node?.layout) return;
    node.layout.fixed = false;
    renderInspector(ctx);
    showToast(`Unpinned ${node.label}`, 'info');
  };

  ctx.handlers.onThemeChange = () => {
    renderGraph(ctx);
    renderInspector(ctx);
    renderViewSwitcher(ctx);
    updateMinimap(ctx);
  };

  ctx.handlers.onResize = () => updateMinimap(ctx);
}

async function runLayout({ fit = false, silent = false } = {}) {
  toggleSpinner(true);
  try {
    await applyLayout(ctx.elk);
  } catch (error) {
    console.error('Layout error, falling back to grid', error);
    fallbackLayout();
    if (!silent) showToast('Layout failed, using fallback positions', 'warning');
  } finally {
    toggleSpinner(false);
  }
  renderGraph(ctx);
  renderInspector(ctx);
  updateMinimap(ctx);
  if (fit) fitGraph();
}

function updateScene({ announceLevel } = {}) {
  renderViewSwitcher(ctx);
  renderFilters(ctx);
  renderGraph(ctx);
  renderInspector(ctx);
  updateMinimap(ctx);
  if (announceLevel) {
    showToast(`View: ${titleCase(announceLevel)}`, 'info');
  }
}

function refreshVisibility() {
  const cache = computeVisibility();
  setVisibility(cache);
  applyStyles(ctx, cache);
  updateMinimap(ctx, cache);
}

function setupPanzoom() {
  ctx.panzoom = ctx.libs.Panzoom(elements.panLayer, {
    cursor: 'grab',
    maxScale: 2.8,
    minScale: 0.25,
    step: 0.22,
    animate: true,
    canvas: true
  });
  elements.graphHost.addEventListener('wheel', (event) => {
    if (!event.ctrlKey) {
      event.preventDefault();
      ctx.panzoom.zoomWithWheel(event);
    }
  }, { passive: false });
  elements.panLayer.addEventListener('panzoomchange', () => updateMinimap(ctx));
}

function fitGraph() {
  const host = elements.graphHost.getBoundingClientRect();
  const scale = Math.min(
    (host.width - 80) / Math.max(state.layout.width, 1),
    (host.height - 80) / Math.max(state.layout.height, 1)
  );
  const targetScale = Math.min(Math.max(scale * 0.9, 0.35), 2.2);
  const translateX = (host.width - state.layout.width * targetScale) / 2;
  const translateY = (host.height - state.layout.height * targetScale) / 2;
  ctx.panzoom.zoom(targetScale, { animate: true });
  ctx.panzoom.pan(translateX, translateY, { animate: true });
  updateMinimap(ctx);
}

function focusNode(nodeId, animate) {
  const node = state.lookup.nodeById.get(nodeId);
  if (!node?.position) return;
  const host = elements.graphHost.getBoundingClientRect();
  const currentScale = ctx.panzoom.getScale();
  const targetScale = Math.min(Math.max(currentScale, 1), 1.8);
  const width = node.size?.width ?? NODE_SIZE.width;
  const height = node.size?.height ?? NODE_SIZE.height;
  const centerX = node.position.x + width / 2;
  const centerY = node.position.y + height / 2;
  const translateX = host.width / 2 - centerX * targetScale;
  const translateY = host.height / 2 - centerY * targetScale;
  ctx.panzoom.zoom(targetScale, { animate });
  ctx.panzoom.pan(translateX, translateY, { animate });
  updateMinimap(ctx);
}

function toggleSpinner(visible) {
  elements.layoutSpinner.classList.toggle('hidden', !visible);
}

async function applyTopology(topology, name = '(inline)') {
  assertValidTopology(topology, name);
  setData(topology);
  elements.fileName.textContent = name ? `Loaded: ${name}` : '';
  elements.searchInput.value = '';
  elements.typeFilter.value = 'all';
  elements.tagFilter.value = 'all';
  elements.intentFilter.value = 'all';
  await runLayout({ fit: true, silent: true });
  renderScene(ctx);
}

async function resetToDefault() {
  await applyTopology(defaultTopology, 'Default');
  showToast('Reset to default', 'info');
}

async function exportTopology() {
  const snapshot = cloneDeep(state.data);
  snapshot.nodes.forEach((node) => {
    if (node.position) {
      node.layout = {
        ...(node.layout || {}),
        x: Math.round(node.position.x),
        y: Math.round(node.position.y),
        width: Math.round(node.size?.width ?? NODE_SIZE.width),
        height: Math.round(node.size?.height ?? NODE_SIZE.height)
      };
    }
    delete node.position;
    delete node.size;
  });
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${slugify(snapshot.meta?.name || 'topology') || 'topology'}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
  showToast('Exported topology JSON', 'success');
}

async function loadTopologyFromFile(file) {
  const text = await file.text();
  return JSON.parse(text);
}

function showToast(message, tone = 'info') {
  const palette = {
    success: '#16a34a',
    info: '#38bdf8',
    warning: '#facc15',
    danger: '#fb7185'
  };
  const color = palette[tone] || palette.info;
  elements.toast.textContent = message;
  elements.toast.style.borderColor = color;
  elements.toast.style.color = color;
  elements.toast.classList.remove('hidden');
  clearTimeout(ctx.toastTimer);
  ctx.toastTimer = setTimeout(() => elements.toast.classList.add('hidden'), 2200);
}

function assertValidTopology(topology, label = 'topology') {
  if (!ctx.validator) return;
  const valid = ctx.validator(topology);
  if (valid) return;
  const errors = ctx.validator.errors ?? [];
  const detail = errors.map(formatAjvError).join('\n');
  throw new Error(`Invalid ${label} JSON:\n${detail}`);
}

function formatAjvError(error) {
  const path = error.instancePath ? error.instancePath : '(root)';
  if (error.keyword === 'required') {
    return `${path}: missing required property "${error.params.missingProperty}"`;
  }
  return `${path}: ${error.message ?? error.keyword}`;
}

