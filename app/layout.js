import { NODE_SIZE } from './constants.js';
import { state, ensureNodeLayout, setLayout } from './state.js';

export async function applyLayout(elk) {
  const nodes = state.data?.nodes ?? [];
  if (!nodes.length) {
    setLayout({ width: 800, height: 600 });
    return;
  }

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.componentComponent': '120',
      'elk.spacing.nodeNode': '80',
      'elk.layered.spacing.nodeNodeBetweenLayers': '120',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX'
    },
    children: nodes.map((node) => {
      ensureNodeLayout(node);
      return {
        id: node.id,
        width: node.size.width || NODE_SIZE.width,
        height: node.size.height || NODE_SIZE.height
      };
    }),
    edges: (state.data?.edges ?? []).map((edge, index) => ({
      id: edge.id || `${edge.from}->${edge.to}-${index}`,
      sources: [edge.from],
      targets: [edge.to]
    }))
  };

  const layout = await elk.layout(graph);
  const margin = 120;
  const layoutWidth = (layout.width || 0) + margin * 2;
  const layoutHeight = (layout.height || 0) + margin * 2;

  const childMap = new Map();
  (layout.children || []).forEach((child) => childMap.set(child.id, child));

  nodes.forEach((node) => {
    const child = childMap.get(node.id);
    ensureNodeLayout(node);
    if (child) {
      node.position = {
        x: child.x + margin,
        y: child.y + margin
      };
      node.layout = {
        ...(node.layout || {}),
        x: child.x,
        y: child.y,
        width: child.width,
        height: child.height
      };
    }
  });

  setLayout({
    width: Math.max(layoutWidth, 800),
    height: Math.max(layoutHeight, 600)
  });
}

export function fallbackLayout() {
  const nodes = state.data?.nodes ?? [];
  if (!nodes.length) {
    setLayout({ width: 800, height: 600 });
    return;
  }
  const colGap = 320;
  const rowGap = 180;
  const perColumn = 4;
  nodes.forEach((node, index) => {
    ensureNodeLayout(node);
    const column = Math.floor(index / perColumn);
    const row = index % perColumn;
    node.position = {
      x: 120 + column * colGap,
      y: 120 + row * rowGap
    };
  });
  const columns = Math.ceil(nodes.length / perColumn);
  setLayout({
    width: columns * colGap + 400,
    height: perColumn * rowGap + 400
  });
}
