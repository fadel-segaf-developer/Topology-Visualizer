import {
  state,
  setData,
  setSearchTerm,
  setFilters,
  setSelectedNode,
  setHoverNode,
  setVisibility,
  initializeDefaultData
} from './state.js';
import { NODE_SIZE } from './constants.js';
import { cloneDeep, slugify } from './utils.js';
import {
  renderScene,
  renderGraph,
  renderInspector,
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
  toastTimer: null
};

init();

async function init() {
  try {
    await loadLibraries();
    setupPanzoom();
    applyStoredTheme(ctx);
    initializeDefaultData();
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
    { marked }
  ] = await Promise.all([
    import('https://esm.run/@panzoom/panzoom@4.5.1'),
    import('https://esm.run/tippy.js@6'),
    import('https://esm.run/elkjs@0.9.0'),
    import('https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js')
  ]);
  ctx.libs = { Panzoom, tippy, marked };
  ctx.elk = new ELK();
  ctx.libs.marked.setOptions({ mangle: false, headerIds: false });
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
      showToast('Failed to read topology JSON', 'danger');
    }
  };

  ctx.handlers.selectNode = (nodeId, focus) => {
    setSelectedNode(nodeId);
    renderInspector(ctx);
    refreshVisibility();
    if (focus && nodeId) focusNode(nodeId, true);
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

  ctx.handlers.focusNode = (nodeId) => focusNode(nodeId, true);
  ctx.handlers.pinNode = (node) => {
    node.layout = {
      ...(node.layout || {}),
      fixed: true,
      x: Math.round(node.position?.x ?? 0),
      y: Math.round(node.position?.y ?? 0),
      width: Math.round(node.size?.width ?? NODE_SIZE.width),
      height: Math.round(node.size?.height ?? NODE_SIZE.height)
    };
    renderInspector(ctx);
    showToast(`Pinned ${node.label}`, 'info');
  };
  ctx.handlers.unpinNode = (node) => {
    if (node.layout) node.layout.fixed = false;
    renderInspector(ctx);
    showToast(`Unpinned ${node.label}`, 'info');
  };

  ctx.handlers.onThemeChange = () => {
    renderGraph(ctx);
    renderInspector(ctx);
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
