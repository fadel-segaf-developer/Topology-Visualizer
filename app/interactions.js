import { debounce } from './utils.js';

const THEME_KEY = 'tms-topology-theme';

export function bindInteractions(ctx) {
  const { elements, handlers } = ctx;

  elements.searchInput.addEventListener('input', debounce((event) => {
    handlers.onSearch(event.target.value || '');
  }, 120));

  elements.typeFilter.addEventListener('change', (event) => {
    handlers.onFilter('type', event.target.value);
  });
  elements.tagFilter.addEventListener('change', (event) => {
    handlers.onFilter('tag', event.target.value);
  });
  elements.intentFilter.addEventListener('change', (event) => {
    handlers.onFilter('intent', event.target.value);
  });

  elements.viewSwitcher.addEventListener('click', (event) => {
    const target = event.target.closest('[data-level]');
    if (!target) return;
    handlers.onLevelChange(target.dataset.level);
  });
  elements.viewSwitcher.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target.closest('[data-level]');
    if (!target) return;
    event.preventDefault();
    handlers.onLevelChange(target.dataset.level);
  });

  elements.themeToggle.addEventListener('click', () => {
    const theme = toggleTheme(ctx);
    handlers.onThemeChange(theme);
  });

  elements.layoutBtn.addEventListener('click', () => handlers.onLayout());
  elements.fitButton.addEventListener('click', () => handlers.onFit());
  elements.resetBtn.addEventListener('click', () => handlers.onReset());
  elements.loadBtn.addEventListener('click', () => elements.fileInput.click());
  elements.exportBtn.addEventListener('click', () => handlers.onExport());

  elements.fileInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (file) await handlers.onFileSelect(file);
    event.target.value = '';
  });

  elements.graphHost.addEventListener('click', (event) => {
    if (event.target.closest('.graph-node') || event.target.closest('.neighbor-link')) return;
    handlers.selectNode(null, false);
  });

  ['dragenter', 'dragover'].forEach((type) => {
    elements.graphHost.addEventListener(type, (event) => {
      event.preventDefault();
      elements.dropHint.classList.remove('hidden');
    });
  });
  ['dragleave', 'drop'].forEach((type) => {
    elements.graphHost.addEventListener(type, (event) => {
      event.preventDefault();
      elements.dropHint.classList.add('hidden');
    });
  });
  elements.graphHost.addEventListener('drop', async (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) await handlers.onFileSelect(file);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      handlers.selectNode(null, false);
      return;
    }
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    const target = event.target;
    const tagName = target?.tagName || '';
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tagName) || target?.isContentEditable) return;
    if (!ctx.panzoom) return;
    const { x, y } = ctx.panzoom.getPan();
    const scale = ctx.panzoom.getScale();
    const PAN_STEP = 80;
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        ctx.panzoom.pan(x, y + PAN_STEP, { animate: true });
        break;
      case 'ArrowDown':
        event.preventDefault();
        ctx.panzoom.pan(x, y - PAN_STEP, { animate: true });
        break;
      case 'ArrowLeft':
        event.preventDefault();
        ctx.panzoom.pan(x + PAN_STEP, y, { animate: true });
        break;
      case 'ArrowRight':
        event.preventDefault();
        ctx.panzoom.pan(x - PAN_STEP, y, { animate: true });
        break;
      case '+':
      case '=':
        event.preventDefault();
        ctx.panzoom.zoom(Math.min(scale * 1.12, 2.8), { animate: true });
        break;
      case '-':
        event.preventDefault();
        ctx.panzoom.zoom(Math.max(scale / 1.12, 0.25), { animate: true });
        break;
      default:
        break;
    }
  });

  window.addEventListener('resize', debounce(() => handlers.onResize(), 180));
}

export function applyStoredTheme(ctx) {
  const stored = localStorage.getItem(THEME_KEY);
  const theme = stored === 'light' ? 'light' : 'dark';
  applyTheme(ctx, theme);
  return theme;
}

export function toggleTheme(ctx) {
  const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(ctx, next);
  localStorage.setItem(THEME_KEY, next);
  return next;
}

function applyTheme(ctx, theme) {
  document.documentElement.dataset.theme = theme;
  document.body.classList.toggle('theme-light', theme === 'light');
  ctx.elements.themeToggle.textContent = theme === 'light' ? 'Dark Mode' : 'Light Mode';
}
