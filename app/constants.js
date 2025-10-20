export const NODE_SIZE = { width: 260, height: 120 };

export const DEFAULT_INTENTS = {
  link: { label: 'Relationship', color: '#94a3b8' },
  'depends-on': { label: 'Depends On', color: '#38bdf8' },
  publishes: { label: 'Publishes Events', color: '#f472b6' },
  controls: { label: 'Controls / Commands', color: '#f97316' },
  synchronizes: { label: 'Synchronizes', color: '#a855f7' },
  bridge: { label: 'Bridge / Integration', color: '#fbbf24' },
  external: { label: 'External Plugin', color: '#fb7185' }
};

export const TYPE_STYLES = {
  core: { label: 'Core', accent: '#38bdf8', border: 'rgba(56,189,248,0.45)', background: 'linear-gradient(135deg, rgba(12,74,110,0.35), rgba(8,47,73,0.65))' },
  runtime: { label: 'Runtime', accent: '#34d399', border: 'rgba(34,197,94,0.45)', background: 'linear-gradient(135deg, rgba(15,118,110,0.28), rgba(5,46,38,0.75))' },
  subsystem: { label: 'Subsystem', accent: '#38bdf8', border: 'rgba(59,130,246,0.35)', background: 'linear-gradient(135deg, rgba(12,74,110,0.2), rgba(15,23,42,0.7))' },
  controller: { label: 'Controller', accent: '#f97316', border: 'rgba(249,115,22,0.45)', background: 'linear-gradient(135deg, rgba(100,44,8,0.25), rgba(30,19,10,0.7))' },
  component: { label: 'Component', accent: '#a855f7', border: 'rgba(168,85,247,0.45)', background: 'linear-gradient(135deg, rgba(91,33,182,0.25), rgba(35,16,53,0.72))' },
  bridge: { label: 'Bridge', accent: '#fbbf24', border: 'rgba(251,191,36,0.45)', background: 'linear-gradient(135deg, rgba(120,53,15,0.25), rgba(39,29,10,0.7))' },
  interface: { label: 'Interface', accent: '#67e8f9', border: 'rgba(103,232,249,0.45)', background: 'linear-gradient(135deg, rgba(22,78,99,0.22), rgba(8,47,73,0.6))' },
  tooling: { label: 'Tooling', accent: '#38bdf8', border: 'rgba(56,189,248,0.4)', background: 'linear-gradient(135deg, rgba(12,74,110,0.24), rgba(12,18,32,0.7))' },
  external: { label: 'External', accent: '#fb7185', border: 'rgba(251,113,133,0.45)', background: 'linear-gradient(135deg, rgba(127,29,29,0.24), rgba(40,11,11,0.75))' },
  service: { label: 'Service', accent: '#34d399', border: 'rgba(34,197,94,0.35)', background: 'linear-gradient(135deg, rgba(12,74,110,0.2), rgba(13,42,44,0.7))' },
  asset: { label: 'Asset', accent: '#f472b6', border: 'rgba(244,114,182,0.45)', background: 'linear-gradient(135deg, rgba(109,40,217,0.22), rgba(57,24,94,0.7))' },
  repository: { label: 'Repository', accent: '#facc15', border: 'rgba(250,204,21,0.55)', background: 'linear-gradient(135deg, rgba(120,53,15,0.28), rgba(30,41,59,0.75))' },
  project: { label: 'Project', accent: '#38bdf8', border: 'rgba(56,189,248,0.5)', background: 'linear-gradient(135deg, rgba(30,64,175,0.24), rgba(15,23,42,0.78))' },
  milestone: { label: 'Milestone', accent: '#a855f7', border: 'rgba(168,85,247,0.5)', background: 'linear-gradient(135deg, rgba(91,33,182,0.24), rgba(49,46,129,0.78))' },
  issue: { label: 'Issue', accent: '#fb7185', border: 'rgba(251,113,133,0.5)', background: 'linear-gradient(135deg, rgba(127,29,29,0.22), rgba(56,28,36,0.78))' },
  'pull-request': { label: 'Pull Request', accent: '#34d399', border: 'rgba(34,197,94,0.5)', background: 'linear-gradient(135deg, rgba(6,95,70,0.24), rgba(12,83,62,0.78))' }
};

export const STATUS_TONES = {
  success: 'status-success',
  warning: 'status-warning',
  info: 'status-info',
  danger: 'status-danger',
  neutral: 'status-neutral'
};

export const ICON_SVGS = {
  chip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="2"></rect><path d="M11 3v2M15 3v2M11 19v2M15 19v2M3 11h2M3 15h2M19 11h2M19 15h2"></path></svg>',
  runtime: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M4.93 4.93l2.12 2.12M17 3h4v4M20 17h-4v4M4 7H0V3h4M4 17v4H0v-4M19.07 4.93l-2.12 2.12M7.05 17l-2.12 2.12"></path></svg>',
  controller: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9h4v6H5zM15 5h4v6h-4zM15 13h4v6h-4zM9 5h4v4H9z"></path></svg>',
  signal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l-2 6h2l-4 12h-4l-4-12h2zM12 3v6"></path></svg>',
  bridge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18"></path><path d="M5 10v6a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6"></path><path d="M9 10v6"></path><path d="M15 10v6"></path></svg>',
  external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9v6h6"></path><path d="M15 9h5v5"></path><path d="M21 3h-6"></path><path d="M21 3v6"></path><path d="M3 12a9 9 0 0 1 9-9"></path></svg>',
  tool: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10H7z"></path><path d="M3 3l4 4"></path><path d="M17 17l4 4"></path></svg>',
  gauge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15l3-3"></path><path d="M17.7 7.7a8 8 0 1 1-11.4 0"></path></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l10 5-10 5L2 7z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13a4 4 0 1 1 8 0"></path><path d="M2 21a6 6 0 0 1 12 0"></path><path d="M16 19a6 6 0 0 1 6 0"></path><path d="M18 13a4 4 0 0 0-3-3.87"></path></svg>',
  asset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"></path><path d="M4 10h16"></path><path d="M10 4v16"></path></svg>',
  interface: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"></rect><path d="M7 7h.01M12 7h5"></path><path d="M7 12h10"></path><path d="M7 17h6"></path></svg>'
};
