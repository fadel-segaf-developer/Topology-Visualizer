import { TYPE_STYLES, STATUS_TONES, ICON_SVGS } from './constants.js';
import {
  state,
  getLookup,
  getIntentColor,
  setDom,
  setVisibility,
  resetVisibility
} from './state.js';
import { escapeHtml, titleCase } from './utils.js';

export function renderScene(ctx) {
  renderMeta(ctx);
  renderFilters(ctx);
  renderLegend(ctx);
  renderNotes(ctx);
  renderGraph(ctx);
  renderInspector(ctx);
}

export function renderGraph(ctx) {
  const { elements } = ctx;
  const width = state.layout.width + 160;
  const height = state.layout.height + 160;

  elements.panLayer.style.width = `${width}px`;
  elements.panLayer.style.height = `${height}px`;
  elements.graphSvg.setAttribute('width', width);
  elements.graphSvg.setAttribute('height', height);
  elements.nodeLayer.style.width = `${width}px`;
  elements.nodeLayer.style.height = `${height}px`;

  elements.edgeLayer.innerHTML = '';
  elements.nodeLayer.innerHTML = '';
  const nodeDom = new Map();
  const edgeDom = new Map();

  const nodes = state.data?.nodes ?? [];
  const edges = state.data?.edges ?? [];

  edges.forEach((edge, index) => {
    const source = getLookup().nodeById.get(edge.from);
    const target = getLookup().nodeById.get(edge.to);
    if (!source?.position || !target?.position) return;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const key = edge.id || `${edge.from}__${edge.to}__${index}`;
    path.setAttribute('d', buildEdgePath(source, target));
    path.setAttribute('stroke', getIntentColor(edge.intent));
    path.setAttribute('marker-end', 'url(#edge-arrow)');
    path.dataset.key = key;
    path.dataset.intent = edge.intent || 'link';
    path.classList.add('graph-edge');
    elements.edgeLayer.appendChild(path);
    edgeDom.set(key, { element: path, edge });
  });

  nodes.forEach((node) => {
    if (!node.position) return;
    const typeStyle = TYPE_STYLES[node.type] || TYPE_STYLES.component;
    const div = document.createElement('div');
    div.className = 'graph-node';
    div.dataset.id = node.id;
    div.dataset.type = node.type || 'component';
    div.dataset.group = node.group || '';
    div.style.transform = `translate(${node.position.x}px, ${node.position.y}px)`;
    div.style.width = `${node.size?.width ?? 260}px`;
    div.style.minHeight = `${node.size?.height ?? 120}px`;
    div.style.borderColor = typeStyle.border;
    div.style.background = typeStyle.background;
    div.style.setProperty('--node-accent', typeStyle.accent);
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.innerHTML = buildNodeHtml(node, typeStyle);
    elements.nodeLayer.appendChild(div);
    nodeDom.set(node.id, { element: div, node });

    setupTooltip(ctx, div, node);
    div.addEventListener('mouseenter', () => ctx.handlers.hoverNode(node.id));
    div.addEventListener('mouseleave', () => ctx.handlers.hoverNode(null));
    div.addEventListener('click', (event) => {
      event.stopPropagation();
      ctx.handlers.selectNode(node.id, true);
    });
    div.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        ctx.handlers.selectNode(node.id, true);
      }
    });

    attachDragHandlers(ctx, div, node);
  });

  setDom({ nodes: nodeDom, edges: edgeDom });
  const visibility = computeVisibility();
  setVisibility(visibility);
  applyStyles(ctx, visibility);
  updateMinimap(ctx, visibility);
}

export function applyStyles(ctx, visibility = state.visibility ?? computeVisibility()) {
  const { nodes, edges } = state.dom;
  if (!nodes || !edges) return;

  const selectedId = state.selectedNodeId;
  const hoverId = state.hoverNodeId;
  const connections = computeConnections(visibility.edgeInfo, selectedId, hoverId);

  nodes.forEach(({ element, node }) => {
    const info = visibility.nodeInfo.get(node.id);
    const matches = info?.matches !== false;
    const isConnected = connections.has(node.id);
    element.classList.toggle('is-selected', node.id === selectedId);
    element.classList.toggle('is-hovered', node.id === hoverId);
    element.classList.toggle('is-connected', isConnected && node.id !== selectedId && node.id !== hoverId);
    const shouldDim = !matches || ((selectedId || hoverId) && !isConnected);
    element.classList.toggle('is-dimmed', shouldDim);
  });

  edges.forEach(({ element, edge }) => {
    const info = visibility.edgeInfo.get(element.dataset.key);
    const matches = info?.matches !== false;
    const connectsHover = hoverId && (edge.from === hoverId || edge.to === hoverId);
    const connectsSelected = selectedId && (edge.from === selectedId || edge.to === selectedId);
    element.classList.toggle('is-active', Boolean(connectsHover || connectsSelected));
    const shouldDim = !matches || ((selectedId || hoverId) && !(connectsHover || connectsSelected));
    element.classList.toggle('is-dimmed', shouldDim);
    element.classList.toggle('is-filtered', info?.matches === false);
  });
}

export function renderInspector(ctx) {
  const nodeId = state.selectedNodeId;
  if (!nodeId) {
    ctx.elements.inspectorTitle.textContent = 'Select a node';
    ctx.elements.inspectorBody.innerHTML = '<p class="text-sm text-slate-400 leading-relaxed">Hover nodes for quick context. Click to inspect, view metrics, and deep-link to documentation.</p>';
    return;
  }
  const node = getLookup().nodeById.get(nodeId);
  if (!node) return;
  const typeStyle = TYPE_STYLES[node.type] || TYPE_STYLES.component;
  const statusBadge = node.status?.label
    ? `<span class="status-badge ${STATUS_TONES[node.status.tone] || STATUS_TONES.neutral}">${escapeHtml(node.status.label)}</span>`
    : '';
  const metrics = node.metrics?.length
    ? `<div class="mt-4 grid grid-cols-1 gap-2">${node.metrics.map((metric) => `<div class="metric-pill"><strong>${escapeHtml(metric.value || '-')}</strong><span>${escapeHtml(metric.label || '')}</span></div>`).join('')}</div>`
    : '';
  const tags = node.tags?.length
    ? `<div class="mt-4 flex flex-wrap gap-2">${node.tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join('')}</div>`
    : '';
  const links = node.links?.length
    ? `<div class="mt-4 space-y-2">${node.links.map((link) => `<a class="neighbor-link panzoom-exclude" href="${link.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label || link.url)}</a>`).join('')}</div>`
    : '';
  const neighbors = buildNeighborMarkup(node.id);
  const detailHtml = node.details ? ctx.libs.marked.parse(node.details) : '<p class="text-sm text-slate-500 italic">No additional details documented.</p>';
  const pinButton = node.layout?.fixed
    ? '<button type="button" class="btn-ghost panzoom-exclude" data-action="unpin-node">Unpin</button>'
    : '<button type="button" class="btn-ghost panzoom-exclude" data-action="pin-node">Pin Position</button>';

  ctx.elements.inspectorTitle.textContent = node.label;
  ctx.elements.inspectorBody.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="type-chip" style="color:${typeStyle.accent};border-color:${typeStyle.border};">${escapeHtml(typeStyle.label)}</div>
      ${statusBadge}
    </div>
    <div class="mt-3 text-sm text-slate-300 leading-relaxed">${escapeHtml(node.summary || '')}</div>
    <div class="mt-3 prose prose-invert prose-sm">${detailHtml}</div>
    ${metrics}
    ${tags}
    ${neighbors}
    ${links}
    <div class="mt-5 flex flex-wrap gap-2">
      <button type="button" class="btn-secondary panzoom-exclude" data-action="focus-node">Focus</button>
      ${pinButton}
    </div>
  `;

  ctx.elements.inspectorBody.querySelectorAll('[data-node-ref]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const peer = event.currentTarget.dataset.nodeRef;
      ctx.handlers.selectNode(peer, true);
    });
  });
  const focusBtn = ctx.elements.inspectorBody.querySelector('[data-action="focus-node"]');
  focusBtn?.addEventListener('click', () => ctx.handlers.focusNode(node.id));
  const pinBtn = ctx.elements.inspectorBody.querySelector('[data-action="pin-node"]');
  pinBtn?.addEventListener('click', () => ctx.handlers.pinNode(node));
  const unpinBtn = ctx.elements.inspectorBody.querySelector('[data-action="unpin-node"]');
  unpinBtn?.addEventListener('click', () => ctx.handlers.unpinNode(node));
}

export function renderMeta(ctx) {
  const meta = state.data?.meta ?? {};
  ctx.elements.metaTitle.textContent = meta.name || 'Topology';
  ctx.elements.metaVersion.textContent = meta.version ? `Version ${meta.version}` : '';
  ctx.elements.metaOwner.textContent = meta.owner ? `Owner • ${meta.owner}` : '';
  ctx.elements.metaDescription.textContent = meta.description || '';
}

export function renderFilters(ctx) {
  const nodes = state.data?.nodes ?? [];
  const types = Array.from(new Set(nodes.map((node) => node.type))).sort();
  ctx.elements.typeFilter.innerHTML = `<option value="all">All types</option>${types.map((type) => `<option value="${type}">${escapeHtml(titleCase(type))}</option>`).join('')}`;
  ctx.elements.typeFilter.value = state.filters.type;

  const tags = Array.from(new Set(nodes.flatMap((node) => node.tags || []))).sort();
  ctx.elements.tagFilter.innerHTML = `<option value="all">All tags</option>${tags.map((tag) => `<option value="${tag}">${escapeHtml(tag)}</option>`).join('')}`;
  ctx.elements.tagFilter.value = state.filters.tag;

  const intents = getIntentsEntries();
  ctx.elements.intentFilter.innerHTML = `<option value="all">All relationships</option>${intents.map(([intent, cfg]) => `<option value="${intent}">${escapeHtml(cfg.label || titleCase(intent))}</option>`).join('')}`;
  ctx.elements.intentFilter.value = state.filters.intent;
}

export function renderLegend(ctx) {
  const items = getIntentsEntries()
    .map(([intent, cfg]) => `
      <div class="legend-item">
        <span class="flex items-center gap-2">
          <span class="legend-dot" style="background:${cfg.color || '#94a3b8'}"></span>
          <span>${escapeHtml(cfg.label || titleCase(intent))}</span>
        </span>
        <span class="text-[10px] uppercase tracking-[0.2em] text-slate-500">${escapeHtml(intent)}</span>
      </div>
    `).join('');
  ctx.elements.legend.innerHTML = `
    <div class="sidebar-section-title mb-3">Legend</div>
    <div class="space-y-2">${items}</div>
  `;
}

export function renderNotes(ctx) {
  const meta = state.data?.meta ?? {};
  const guides = Array.isArray(meta.guides) ? meta.guides : [];
  const links = guides.length
    ? `<div class="mt-5"><div class="sidebar-section-title mb-2">Guides</div><div class="space-y-3">${guides.map((guide) => `
          <a class="neighbor-link panzoom-exclude" href="${guide.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(guide.label || guide.url)}</a>
          <div class="text-xs text-slate-500 leading-snug ml-2">${escapeHtml(guide.description || '')}</div>
        `).join('')}</div></div>`
    : '';
  ctx.elements.notesPanel.innerHTML = `
    <div>
      <div class="sidebar-section-title mb-2">About</div>
      <p class="text-sm text-slate-300 leading-relaxed">${escapeHtml(meta.description || 'No description provided.')}</p>
    </div>
    ${links}
  `;
}

export function computeVisibility() {
  const term = (state.searchTerm || '').trim().toLowerCase();
  const { type, tag, intent } = state.filters;
  const nodeInfo = new Map();
  const edgeInfo = new Map();

  (state.data?.nodes ?? []).forEach((node) => {
    const matchesSearch = !term || [node.label, node.summary, node.group, ...(node.tags || [])]
      .some((value) => value && String(value).toLowerCase().includes(term));
    const matchesType = type === 'all' || node.type === type;
    const matchesTag = tag === 'all' || (node.tags || []).includes(tag);
    nodeInfo.set(node.id, { matches: matchesSearch && matchesType && matchesTag });
  });

  (state.data?.edges ?? []).forEach((edge, index) => {
    const key = edge.id || `${edge.from}__${edge.to}__${index}`;
    const matchesIntent = intent === 'all' || edge.intent === intent;
    edgeInfo.set(key, { matches: matchesIntent });
  });

  return { nodeInfo, edgeInfo };
}

export function updateMinimap(ctx, visibility = state.visibility ?? computeVisibility()) {
  const canvas = ctx.elements.minimap;
  if (!canvas) return;
  const ctx2d = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx2d.clearRect(0, 0, width, height);

  const padding = 16;
  const layoutWidth = Math.max(state.layout.width, 1);
  const layoutHeight = Math.max(state.layout.height, 1);
  const scale = Math.min((width - padding * 2) / layoutWidth, (height - padding * 2) / layoutHeight);
  const offsetX = (width - layoutWidth * scale) / 2;
  const offsetY = (height - layoutHeight * scale) / 2;

  ctx2d.save();
  ctx2d.translate(offsetX, offsetY);
  ctx2d.scale(scale, scale);
  ctx2d.lineCap = 'round';

  (state.data?.edges ?? []).forEach((edge, index) => {
    const source = getLookup().nodeById.get(edge.from);
    const target = getLookup().nodeById.get(edge.to);
    if (!source?.position || !target?.position) return;
    const key = edge.id || `${edge.from}__${edge.to}__${index}`;
    const matches = visibility.edgeInfo.get(key)?.matches !== false;
    ctx2d.strokeStyle = matches ? getIntentColor(edge.intent) : '#1e293b';
    ctx2d.globalAlpha = matches ? 0.85 : 0.15;
    ctx2d.lineWidth = matches ? 1.6 : 1;
    ctx2d.beginPath();
    const [start, c1, c2, end] = bezierPoints(source, target);
    ctx2d.moveTo(start.x, start.y);
    ctx2d.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
    ctx2d.stroke();
  });

  (state.data?.nodes ?? []).forEach((node) => {
    if (!node.position) return;
    const matches = visibility.nodeInfo.get(node.id)?.matches !== false;
    ctx2d.globalAlpha = matches ? 0.8 : 0.2;
    ctx2d.fillStyle = matches ? '#38bdf8' : '#1f2937';
    ctx2d.fillRect(node.position.x, node.position.y, node.size?.width ?? 260, node.size?.height ?? 120);
  });
  ctx2d.restore();

  if (ctx.panzoom) {
    ctx2d.save();
    const { x, y } = ctx.panzoom.getPan();
    const scaleVal = ctx.panzoom.getScale();
    const host = ctx.elements.graphHost.getBoundingClientRect();
    const viewWidth = host.width / scaleVal;
    const viewHeight = host.height / scaleVal;
    const viewX = -x / scaleVal;
    const viewY = -y / scaleVal;
    ctx2d.strokeStyle = '#38bdf8';
    ctx2d.lineWidth = 1.2;
    ctx2d.globalAlpha = 0.9;
    ctx2d.strokeRect(
      offsetX + viewX * scale,
      offsetY + viewY * scale,
      viewWidth * scale,
      viewHeight * scale
    );
    ctx2d.restore();
  }
}

function renderMetaPlaceholder(element, text) {
  element.textContent = text || '';
}

function buildNeighborMarkup(nodeId) {
  const incoming = getLookup().incoming.get(nodeId) || [];
  const outgoing = getLookup().outgoing.get(nodeId) || [];
  if (!incoming.length && !outgoing.length) return '';

  const renderSection = (edges, title, direction) => edges.length
    ? `<div>
        <div class="sidebar-section-title mb-2">${title}</div>
        <div class="flex flex-col gap-2">
          ${edges.map((edge) => {
            const peerId = direction === 'outgoing' ? edge.to : edge.from;
            const peer = getLookup().nodeById.get(peerId);
            const label = peer?.label || peerId;
            const intentLabel = getIntentsEntries().find(([intent]) => intent === edge.intent)?.[1]?.label || titleCase(edge.intent);
            return `
              <div class="flex items-center justify-between gap-2">
                <button type="button" class="neighbor-link panzoom-exclude" data-node-ref="${peerId}">${escapeHtml(label)}</button>
                <span class="text-[10px] uppercase tracking-[0.2em] text-slate-500">${escapeHtml(intentLabel)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>`
    : '';

  return `<div class="mt-5 space-y-4">
    ${renderSection(incoming, 'Inputs', 'incoming')}
    ${renderSection(outgoing, 'Outputs', 'outgoing')}
  </div>`;
}

function setupTooltip(ctx, element, node) {
  ctx.libs.tippy(element, {
    content: tooltipContent(node),
    allowHTML: true,
    theme: document.documentElement.dataset.theme === 'light' ? 'topology-light' : 'topology',
    interactive: false,
    placement: 'top',
    delay: [120, 40],
    animation: 'shift-away-subtle',
    maxWidth: 260
  });
}

function tooltipContent(node) {
  const metrics = (node.metrics || []).slice(0, 3)
    .map((metric) => `<div class="tooltip-metric"><span>${escapeHtml(metric.label || '')}</span><span>${escapeHtml(metric.value || '')}</span></div>`)
    .join('');
  return `
    <div class="tooltip-title">${escapeHtml(node.label)}</div>
    <div class="tooltip-summary">${escapeHtml(node.summary || '')}</div>
    ${metrics ? `<div class="mt-2">${metrics}</div>` : ''}
  `;
}

function buildNodeHtml(node, typeStyle) {
  const status = node.status?.label
    ? `<span class="status-badge ${STATUS_TONES[node.status.tone] || STATUS_TONES.neutral}">${escapeHtml(node.status.label)}</span>`
    : '';
  const icon = node.icon && ICON_SVGS[node.icon]
    ? `<span class="node-icon">${ICON_SVGS[node.icon]}</span>`
    : '';
  const tags = node.tags?.length
    ? `<div class="mt-3 flex flex-wrap gap-1">${node.tags.slice(0, 4).map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join('')}${node.tags.length > 4 ? `<span class="tag-chip extra">+${node.tags.length - 4}</span>` : ''}</div>`
    : '';
  return `
    <div class="node-header">
      <div class="node-header-left">
        ${icon}
        <span class="type-chip" style="color:${typeStyle.accent};border-color:${typeStyle.border};">${escapeHtml(typeStyle.label)}</span>
      </div>
      ${status}
    </div>
    <div class="node-title">${escapeHtml(node.label)}</div>
    <div class="node-summary">${escapeHtml(node.summary || '')}</div>
    ${tags}
  `;
}

function computeConnections(edgeInfo, selectedId, hoverId) {
  const set = new Set();
  (state.data?.edges ?? []).forEach((edge, index) => {
    const key = edge.id || `${edge.from}__${edge.to}__${index}`;
    const matches = edgeInfo.get(key)?.matches !== false;
    if (!matches) return;
    if (selectedId && (edge.from === selectedId || edge.to === selectedId)) {
      set.add(edge.from);
      set.add(edge.to);
    }
    if (hoverId && (edge.from === hoverId || edge.to === hoverId)) {
      set.add(edge.from);
      set.add(edge.to);
    }
  });
  if (selectedId) set.add(selectedId);
  if (hoverId) set.add(hoverId);
  return set;
}

function buildEdgePath(source, target) {
  const [start, c1, c2, end] = bezierPoints(source, target);
  return `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
}

function bezierPoints(source, target) {
  const width = source.size?.width ?? 260;
  const height = source.size?.height ?? 120;
  const targetHeight = target.size?.height ?? 120;
  const start = { x: source.position.x + width, y: source.position.y + height / 2 };
  const end = { x: target.position.x, y: target.position.y + targetHeight / 2 };
  const dx = Math.max((end.x - start.x) * 0.5, 90);
  const c1 = { x: start.x + dx, y: start.y };
  const c2 = { x: end.x - dx, y: end.y };
  return [start, c1, c2, end];
}

function getIntentsEntries() {
  const intents = state.data?.meta?.intents ?? {};
  return Object.entries(intents);
}

export function updateEdgesForNode(ctx, nodeId) {
  const { edges } = state.dom;
  if (!edges) return;
  edges.forEach(({ element, edge }) => {
    if (edge.from !== nodeId && edge.to !== nodeId) return;
    const source = getLookup().nodeById.get(edge.from);
    const target = getLookup().nodeById.get(edge.to);
    if (!source?.position || !target?.position) return;
    element.setAttribute('d', buildEdgePath(source, target));
  });
}

function attachDragHandlers(ctx, element, node) {
  element.style.touchAction = 'none';
  let pointerId = null;
  let start = null;

  const onPointerDown = (event) => {
    if (event.button !== 0 || pointerId !== null) return;
    pointerId = event.pointerId;
    const scale = ctx.panzoom?.getScale?.() ?? 1;
    start = {
      x: event.clientX,
      y: event.clientY,
      nodeX: node.position?.x ?? 0,
      nodeY: node.position?.y ?? 0,
      scale
    };
    element.setPointerCapture(pointerId);
    ctx.panzoom?.setOptions({ disablePan: true, disableZoom: true });
    ctx.elements.graphHost.classList.add('node-dragging');
    event.preventDefault();
  };

  const onPointerMove = (event) => {
    if (pointerId === null || event.pointerId !== pointerId || !start) return;
    const scale = start.scale || 1;
    const dx = (event.clientX - start.x) / scale;
    const dy = (event.clientY - start.y) / scale;
    const newX = start.nodeX + dx;
    const newY = start.nodeY + dy;
    if (!node.position) {
      node.position = { x: newX, y: newY };
    } else {
      node.position.x = newX;
      node.position.y = newY;
    }
    element.style.transform = `translate(${newX}px, ${newY}px)`;
    updateEdgesForNode(ctx, node.id);
    updateMinimap(ctx);
  };

  const finishDrag = () => {
    if (pointerId === null) return;
    element.releasePointerCapture(pointerId);
    pointerId = null;
    start = null;
    ctx.panzoom?.setOptions({ disablePan: false, disableZoom: false });
    ctx.elements.graphHost.classList.remove('node-dragging');
    node.layout = {
      ...(node.layout || {}),
      fixed: true,
      x: Math.round(node.position?.x ?? 0),
      y: Math.round(node.position?.y ?? 0),
      width: Math.round(node.size?.width ?? 260),
      height: Math.round(node.size?.height ?? 120)
    };
    ctx.handlers.onNodeMoved?.(node);
    updateEdgesForNode(ctx, node.id);
    updateMinimap(ctx);
  };

  const onPointerUp = (event) => {
    if (event.pointerId !== pointerId) return;
    finishDrag();
  };

  const onPointerCancel = () => {
    finishDrag();
  };

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerCancel);
}
