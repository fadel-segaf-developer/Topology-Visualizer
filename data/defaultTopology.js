export const defaultTopology = {
  meta: {
    name: 'Traffic Management Suite Reference',
    version: '2025.11',
    owner: 'Traffic Simulation Platform Group',
    description: 'Layered view of the Traffic Management Suite highlighting how control, experience, operations, and platform capabilities interact across high, medium, and low levels.',
    viewModes: ['high', 'medium', 'low'],
    defaultView: 'high',
    guides: [
      {
        label: 'Architecture Overview',
        url: 'https://example.com/tms/architecture',
        description: 'High-level diagrams, contract maps, and RACI for the suite.'
      },
      {
        label: 'Operations Runbook',
        url: 'https://example.com/tms/runbooks',
        description: 'Incident response flows, dashboards, and escalation policies.'
      }
    ],
    intents: {
      'depends-on': { label: 'Depends On', color: '#38bdf8' },
      controls: { label: 'Controls', color: '#f97316' },
      publishes: { label: 'Publishes Events', color: '#f472b6' },
      synchronizes: { label: 'Synchronizes', color: '#a855f7' },
      bridge: { label: 'Bridge / Integration', color: '#fbbf24' },
      external: { label: 'External Plugin', color: '#fb7185' }
    },
    insightPlaybook: [
      { rule: 'high-latency-hotspot', level: 'medium', kind: 'risk' },
      { rule: 'stale-runbook', level: 'high', kind: 'warning' }
    ],
    viewCaps: { high: 6, medium: 18, low: 48 },
    overrides: {
      pin: ['dom-simulation', 'dom-platform'],
      hide: [],
      rename: {}
    },
    insights: [
      {
        level: 'high',
        kind: 'priority',
        text: 'Stagger scenario authoring deployments whenever the Simulation Control Plane enters maintenance mode to avoid tick backlog.',
        confidence: 0.76,
        sources: [
          { type: 'issue', id: 'CoreModule#231' },
          { type: 'metric', id: 'deployment/overlap' }
        ]
      },
      {
        level: 'medium',
        kind: 'observation',
        text: 'CI pipeline reroute decreased build wait time by 18% week-over-week.',
        confidence: 0.68,
        sources: [
          { type: 'metric', id: 'ci/build-wait' }
        ]
      }
    ],
    repository: {
      provider: 'github',
      owner: 'fadel-segaf-developer',
      name: 'CoreModule',
      id: 0,
      url: 'https://github.com/fadel-segaf-developer/CoreModule',
      description: 'Authoritative reference implementation for the simulation control plane and supporting services.',
      visibility: 'public',
      defaultBranch: 'main',
      topics: ['simulation', 'traffic', 'digital-twin'],
      license: 'MIT',
      homepage: 'https://example.com/tms',
      stars: 128,
      forks: 19,
      watchers: 24,
      openIssues: 12,
      createdAt: '2023-02-18T10:14:00Z',
      updatedAt: '2025-09-28T08:23:00Z',
      pushedAt: '2025-10-02T17:55:00Z',
      projects: [
        {
          id: 501,
          name: 'Scalability FY25',
          url: 'https://github.com/orgs/fadel-segaf-developer/projects/1',
          body: 'Track FY25 capacity and resiliency workstreams.',
          state: 'open',
          createdAt: '2025-03-01T09:00:00Z',
          updatedAt: '2025-09-10T13:44:00Z'
        }
      ],
      milestones: [
        {
          id: 3001,
          number: 14,
          title: 'Q4 Launch Readiness',
          url: 'https://github.com/fadel-segaf-developer/CoreModule/milestone/14',
          state: 'open',
          description: 'Stabilise the next major drop.',
          dueOn: '2025-12-15T00:00:00Z',
          openIssues: 7,
          closedIssues: 12,
          createdAt: '2025-08-01T12:12:00Z',
          updatedAt: '2025-10-05T16:20:00Z'
        }
      ],
      languages: {
        TypeScript: 278940,
        'C++': 192380,
        Python: 85420,
        'C#': 50210
      }
    },
    lastSyncedAt: '2025-10-05T18:42:00Z'
  },
  nodes: [
    {
      id: 'dom-simulation',
      label: 'Simulation Control Plane',
      type: 'core',
      group: 'Simulation',
      level: 'high',
      summary: 'Coordinates deterministic ticks and orchestrates the compute pods that run the digital twin.',
      details: 'Ensures tick determinism, schedules workloads, and exposes orchestration APIs. Provides back-pressure signals to downstream consumers and integrates with operations telemetry.',
      metrics: [
        { label: 'Tick Budget', value: '5 ms' },
        { label: 'Regions', value: '3 active' }
      ],
      tags: ['stateful', 'critical'],
      icon: 'chip',
      children: ['mod-sim-scheduler', 'mod-vehicle-ai', 'mod-environment-feed'],
      links: [
        {
          label: 'Control Plane Runbook',
          url: 'https://example.com/tms/runbooks/control-plane',
          description: 'Operational runbook for the control plane.'
        }
      ],
      work: {
        issues: [
          {
            provider: 'github',
            repo: 'fadel-segaf-developer/CoreModule',
            number: 231,
            url: 'https://github.com/fadel-segaf-developer/CoreModule/issues/231',
            state: 'open',
            title: 'Refine tick arbitration during surge mode',
            labels: ['performance', 'simulation'],
            assignees: ['alex-hart'],
            createdAt: '2025-09-02T09:18:00Z',
            updatedAt: '2025-10-03T15:41:00Z'
          }
        ],
        prs: [
          {
            provider: 'github',
            repo: 'fadel-segaf-developer/CoreModule',
            number: 412,
            url: 'https://github.com/fadel-segaf-developer/CoreModule/pull/412',
            state: 'merged',
            title: 'Introduce orchestrator health gates',
            mergedAt: '2025-09-21T11:04:00Z',
            labels: ['observability']
          }
        ]
      },
      source: {
        path: 'docs/control-plane.md',
        lang: 'md',
        git: {
          repo: 'fadel-segaf-developer/CoreModule',
          commit: 'e3c2a8e52f0148c8b4d8972ad8f0b23fcb17da2f'
        }
      }
    },
    {
      id: 'dom-experience',
      label: 'Experience Enablement',
      type: 'runtime',
      group: 'Experience',
      level: 'high',
      summary: 'Authoring, review, and notification flows that keep scenario builders aligned with the live simulation.',
      details: 'Provides collaborative authoring tools, review dashboards, and outbound communication pipelines that react to simulation events.',
      metrics: [
        { label: 'Active Authors', value: '46' },
        { label: 'Reviews/Day', value: '18' }
      ],
      tags: ['experience', 'collaboration'],
      icon: 'interface',
      children: ['mod-scenario-authoring', 'mod-review-console', 'mod-notification-hub'],
      links: [
        {
          label: 'Experience Strategy',
          url: 'https://example.com/tms/experience/strategy',
          description: 'Vision and KPIs for user-facing workflows.'
        }
      ],
      work: {
        issues: [
          {
            provider: 'github',
            repo: 'fadel-segaf-developer/ExperienceModule',
            number: 88,
            url: 'https://github.com/fadel-segaf-developer/ExperienceModule/issues/88',
            state: 'open',
            title: 'Streamline review dashboard filters',
            labels: ['ux', 'dashboard'],
            assignees: ['nina-ramirez'],
            createdAt: '2025-09-18T10:00:00Z',
            updatedAt: '2025-10-04T12:32:00Z'
          }
        ],
        prs: [
          {
            provider: 'github',
            repo: 'fadel-segaf-developer/ExperienceModule',
            number: 205,
            url: 'https://github.com/fadel-segaf-developer/ExperienceModule/pull/205',
            state: 'open',
            title: 'Add authoring presence indicators',
            createdAt: '2025-10-03T09:42:00Z'
          }
        ]
      },
      source: {
        path: 'docs/experience/index.md',
        lang: 'md'
      }
    },
    {
      id: 'dom-operations',
      label: 'Operations & Reliability',
      type: 'tooling',
      group: 'Operations',
      level: 'high',
      summary: 'Keeps the suite healthy with CI, observability, and incident tooling.',
      details: 'Owns build pipelines, telemetry, and incident response. Partners closely with platform services to ensure predictable delivery.',
      metrics: [
        { label: 'Mean Build', value: '11 min' },
        { label: 'MTTR', value: '22 min' }
      ],
      tags: ['ops', 'reliability'],
      icon: 'tool',
      children: ['mod-ci-pipeline', 'mod-observability', 'mod-incident-response'],
      links: [
        {
          label: 'SRE Handbook',
          url: 'https://example.com/tms/ops/sre-handbook',
          description: 'Alerts, dashboards, and runbooks.'
        }
      ],
      work: {
        issues: [
          {
            provider: 'github',
            repo: 'fadel-segaf-developer/OpsModule',
            number: 64,
            url: 'https://github.com/fadel-segaf-developer/OpsModule/issues/64',
            state: 'open',
            title: 'Add synthetic probes for metric store',
            labels: ['observability'],
            createdAt: '2025-09-08T08:11:00Z'
          }
        ],
        prs: []
      },
      source: {
        path: 'docs/ops/overview.md',
        lang: 'md'
      }
    },
    {
      id: 'dom-platform',
      label: 'Platform Services',
      type: 'service',
      group: 'Platform',
      level: 'high',
      summary: 'Edge gateway, asset catalog, and identity services powering every other domain.',
      details: 'Provides secure ingress, asset storage, and authentication. Exposes platform APIs consumed by experience and simulation domains.',
      metrics: [
        { label: 'Requests/min', value: '185k' },
        { label: 'Latency P95', value: '84 ms' }
      ],
      tags: ['platform', 'shared'],
      icon: 'bridge',
      children: ['mod-api-gateway', 'mod-asset-catalog', 'mod-identity-service'],
      links: [
        {
          label: 'Platform Service Catalog',
          url: 'https://example.com/tms/platform/catalog',
          description: 'API contracts and SLAs for platform capabilities.'
        }
      ],
      work: {
        issues: [
          {
            provider: 'github',
            repo: 'fadel-segaf-developer/CoreModule',
            number: 305,
            url: 'https://github.com/fadel-segaf-developer/CoreModule/issues/305',
            state: 'open',
            title: 'Audit token rotation for partner traffic',
            labels: ['security'],
            createdAt: '2025-09-25T14:28:00Z',
            updatedAt: '2025-10-01T09:47:00Z'
          }
        ],
        prs: []
      },
      source: {
        path: 'docs/platform/index.md',
        lang: 'md'
      }
    },

    /* Medium-level nodes */
    {
      id: 'mod-sim-scheduler',
      label: 'Simulation Scheduler',
      type: 'controller',
      group: 'Simulation',
      level: 'medium',
      parent: 'dom-simulation',
      children: ['cmp-tick-arbiter', 'cmp-load-balancer'],
      summary: 'Queues tick batches, enforces budgets, and coordinates workload placement.',
      details: 'Owns surge handling rules, feeds metrics back into the control plane, and triggers scale-out based on backlog depth.',
      metrics: [
        { label: 'Queue Depth', value: 'avg 42' },
        { label: 'Surge Mode', value: '3 / day' }
      ],
      tags: ['orchestration', 'scalability'],
      icon: 'controller',
      status: { label: 'Stable', tone: 'success' },
      links: [
        { label: 'Scheduler Spec', url: 'https://example.com/tms/specs/scheduler' }
      ],
      source: {
        path: 'services/simulation/scheduler/README.md',
        lang: 'md'
      }
    },
    {
      id: 'mod-vehicle-ai',
      label: 'Vehicle AI Runtime',
      type: 'runtime',
      group: 'Simulation',
      level: 'medium',
      parent: 'dom-simulation',
      children: ['cmp-pathfinder', 'cmp-behavior-tree'],
      summary: 'Executes maneuver planning and dynamic behavior trees for simulated agents.',
      details: 'Streams telemetry to the experience layer and relies on platform services for asset retrieval.',
      metrics: [
        { label: 'Agents/Tick', value: '~18k' },
        { label: 'Mean Latency', value: '4.8 ms' }
      ],
      tags: ['ai', 'simulation'],
      icon: 'runtime',
      status: { label: 'Scaling', tone: 'info' },
      links: [
        { label: 'AI Design Notes', url: 'https://example.com/tms/sim/vehicle-ai' }
      ],
      source: {
        path: 'services/simulation/vehicle-ai/README.md',
        lang: 'md'
      }
    },
    {
      id: 'mod-environment-feed',
      label: 'Environment Feed Service',
      type: 'service',
      group: 'Simulation',
      level: 'medium',
      parent: 'dom-simulation',
      children: ['svc-weather-ingest', 'svc-traffic-analytics'],
      summary: 'Enriches the simulation with real-time signals, weather data, and analytics.',
      details: 'Pulls from external providers, normalises data, and synchronises with the control plane every tick.',
      metrics: [
        { label: 'Providers', value: '5' },
        { label: 'Data Freshness', value: '12 s' }
      ],
      tags: ['integration', 'data'],
      icon: 'bridge',
      status: { label: 'Attention', tone: 'warning' },
      links: [
        { label: 'Feed Mapping', url: 'https://example.com/tms/data/environment' }
      ],
      source: {
        path: 'services/data/environment-feed/README.md',
        lang: 'md'
      }
    },
    {
      id: 'mod-scenario-authoring',
      label: 'Scenario Authoring Studio',
      type: 'tooling',
      group: 'Experience',
      level: 'medium',
      parent: 'dom-experience',
      children: ['cmp-template-editor', 'cmp-validation-worker'],
      summary: 'Collaborative editing studio for creating and validating traffic scenarios.',
      details: 'Manages drafts, templates, and validations. Integrates with simulation scheduler for preview builds.',
      metrics: [
        { label: 'Active Drafts', value: '62' },
        { label: 'Validation Success', value: '92%' }
      ],
      tags: ['authoring', 'collaboration'],
      icon: 'tool',
      status: { label: 'Stable', tone: 'success' },
      links: [
        { label: 'Authoring UX Guidelines', url: 'https://example.com/tms/experience/authoring' }
      ],
      source: {
        path: 'clients/authoring-studio/README.md',
        lang: 'md'
      }
    },
    {
      id: 'mod-review-console',
      label: 'Review Console',
      type: 'interface',
      group: 'Experience',
      level: 'medium',
      parent: 'dom-experience',
      children: ['cmp-dashboard-ui', 'svc-reporting-api'],
      summary: 'Dashboards and tooling for reviewers to triage simulation outcomes.',
      details: 'Combines metrics, video feeds, and annotations. Publishes alerts to the notification hub.',
      metrics: [
        { label: 'Reviewers', value: '14' },
        { label: 'Median Session', value: '26 min' }
      ],
      tags: ['dashboard', 'analytics'],
      icon: 'interface',
      status: { label: 'Observing', tone: 'info' },
      links: [
        { label: 'Review Console Walkthrough', url: 'https://example.com/tms/experience/review-console' }
      ],
      source: {
        path: 'clients/review-console/README.md',
        lang: 'md'
      }
    },
    {
      id: 'mod-notification-hub',
      label: 'Notification Hub',
      type: 'service',
      group: 'Experience',
      level: 'medium',
      parent: 'dom-experience',
      children: ['svc-notify-dispatch', 'cmp-websocket-gateway'],
      summary: 'Central dispatch for email, chat, and in-app notifications triggered by the suite.',
      details: 'Routes outbound alerts, handles delivery receipts, and synchronises with identity service for preferences.',
      metrics: [
        { label: 'Messages/hr', value: '4.5k' },
        { label: 'Delivery P95', value: '28 s' }
      ],
      tags: ['notifications', 'communications'],
      icon: 'bridge',
      status: { label: 'Scaling', tone: 'info' },
      links: [
        { label: 'Notification Playbook', url: 'https://example.com/tms/experience/notifications' }
      ],
      source: {
        path: 'services/communications/notification-hub/README.md',
        lang: 'md'
      }
    },
    {
      id: 'mod-ci-pipeline',
      label: 'Continuous Integration Pipeline',
      type: 'tooling',
      group: 'Operations',
      level: 'medium',
      parent: 'dom-operations',
      children: ['svc-build-coordinator', 'cmp-artifact-cache'],
      summary: 'Orchestrates builds, testing, and artifact promotion for the suite.',
      details: 'Provides context-aware gating, integrates with observability for traceability, and exposes status to experience tooling.',
      metrics: [
        { label: 'Build Success', value: '94%' },
        { label: 'Parallel Jobs', value: '22' }
      ],
      tags: ['ci', 'automation'],
      icon: 'tool',
      status: { label: 'Degraded', tone: 'warning' },
      links: [
        { label: 'Pipeline Blueprint', url: 'https://example.com/tms/ops/ci' }
      ],
      source: {
        path: 'ops/ci-pipeline/README.md',
        lang: 'md'
      }
    },
    {
      id: 'mod-observability',
      label: 'Observability Stack',
      type: 'service',
      group: 'Operations',
      level: 'medium',
      parent: 'dom-operations',
      children: ['svc-log-router', 'svc-metric-store'],
      summary: 'Aggregates logs, traces, and metrics from every domain.',
      details: 'Provides dashboards, alerts, and telemetry retention policies. Synchronises with notification hub for alert routing.',
      metrics: [
        { label: 'Log Ingest', value: '1.2 TB/day' },
        { label: 'Trace Sampling', value: '35%' }
      ],
      tags: ['telemetry', 'observability'],
      icon: 'bridge',
      status: { label: 'Stable', tone: 'success' },
      links: [
        { label: 'Telemetry Charter', url: 'https://example.com/tms/ops/observability' }
      ],
      source: {
        path: 'ops/observability/README.md',
        lang: 'md'
      }
    },
    {
      id: 'mod-incident-response',
      label: 'Incident Response Engine',
      type: 'tooling',
      group: 'Operations',
      level: 'medium',
      parent: 'dom-operations',
      children: ['cmp-runbook-engine', 'svc-pager-adapter'],
      summary: 'Automates incident workflows and stakeholder communication.',
      details: 'Integrates with observability stack, executes runbooks, and drives post-incident reporting into review console.',
      metrics: [
        { label: 'Active Runbooks', value: '28' },
        { label: 'MTTA', value: '6 min' }
      ],
      tags: ['incident', 'automation'],
      icon: 'tool',
      status: { label: 'Improving', tone: 'info' },
      links: [
        { label: 'Incident Process', url: 'https://example.com/tms/ops/incidents' }
      ],
      source: {
        path: 'ops/incident-response/README.md',
        lang: 'md'
      }
    },
    {
      id: 'mod-api-gateway',
      label: 'API Gateway',
      type: 'service',
      group: 'Platform',
      level: 'medium',
      parent: 'dom-platform',
      children: ['svc-edge-proxy', 'cmp-rate-limiter'],
      summary: 'Edge entry point handling request routing, throttling, and auth pre-checks.',
      details: 'Provides WAF, rate-limits, and request shaping for every downstream service. Publishes access analytics to observability.',
      metrics: [
        { label: 'Peak RPS', value: '12.4k' },
        { label: 'Error Rate', value: '0.18%' }
      ],
      tags: ['edge', 'security'],
      icon: 'bridge',
      status: { label: 'Stable', tone: 'success' },
      links: [
        { label: 'Gateway Guide', url: 'https://example.com/tms/platform/api-gateway' }
      ],
      source: {
        path: 'platform/api-gateway/README.md',
        lang: 'md'
      }
    },
    {
      id: 'mod-asset-catalog',
      label: 'Asset Catalog Service',
      type: 'service',
      group: 'Platform',
      level: 'medium',
      parent: 'dom-platform',
      children: ['svc-asset-indexer', 'cmp-schema-validator'],
      summary: 'Stores scenario assets, maps, and metadata with lifecycle tracking.',
      details: 'Synchronises with CI pipeline to fetch new artifacts, exposes query APIs to experience layer, and replicates to simulation clusters.',
      metrics: [
        { label: 'Assets', value: '14.2k' },
        { label: 'Replication Lag', value: '9 s' }
      ],
      tags: ['storage', 'metadata'],
      icon: 'asset',
      status: { label: 'Attention', tone: 'warning' },
      links: [
        { label: 'Catalog Schema', url: 'https://example.com/tms/platform/assets' }
      ],
      source: {
        path: 'platform/asset-catalog/README.md',
        lang: 'md'
      }
    },
    {
      id: 'mod-identity-service',
      label: 'Identity Service',
      type: 'service',
      group: 'Platform',
      level: 'medium',
      parent: 'dom-platform',
      children: ['svc-auth-core', 'cmp-token-rotator'],
      summary: 'Authentication, authorisation, and token rotation for internal and partner clients.',
      details: 'Provides OAuth-compatible flows, manages secrets rotation, and publishes events to notification hub for login anomalies.',
      metrics: [
        { label: 'Sign-ins/hr', value: '9.8k' },
        { label: 'Anomaly Rate', value: '0.04%' }
      ],
      tags: ['security', 'auth'],
      icon: 'controller',
      status: { label: 'Stable', tone: 'success' },
      links: [
        { label: 'Identity Architecture', url: 'https://example.com/tms/platform/identity' }
      ],
      source: {
        path: 'platform/identity-service/README.md',
        lang: 'md'
      }
    },

    /* Low-level nodes */
    { id: 'cmp-tick-arbiter', label: 'Tick Arbiter Worker', type: 'component', group: 'Simulation', level: 'low', parent: 'mod-sim-scheduler', children: [], summary: 'Distributes tick batches across worker pods, applying fairness rules.', details: 'Tracks backlog health and emits surge signals to the scheduler.', metrics: [{ label: 'Pods', value: '24' }], tags: ['scaling'], source: { path: 'services/simulation/scheduler/tick-arbiter.cpp', lang: 'cpp' } },
    { id: 'cmp-load-balancer', label: 'Load Balancer Agent', type: 'component', group: 'Simulation', level: 'low', parent: 'mod-sim-scheduler', children: [], summary: 'Moves workloads between compute pools based on queue depth.', details: 'Feeds heatmaps into observability and supports manual overrides.', metrics: [{ label: 'Rebalance', value: '8 / hr' }], tags: ['balancing'], source: { path: 'services/simulation/scheduler/load-balancer.ts', lang: 'ts' } },
    { id: 'cmp-pathfinder', label: 'Pathfinder Service', type: 'component', group: 'Simulation', level: 'low', parent: 'mod-vehicle-ai', children: [], summary: 'Calculates routes respecting traffic models and restrictions.', details: 'Consumes asset catalog data and caches frequently used paths.', metrics: [{ label: 'Cache Hit', value: '86%' }], tags: ['navigation'], source: { path: 'services/simulation/vehicle-ai/pathfinder.py', lang: 'py' } },
    { id: 'cmp-behavior-tree', label: 'Behavior Tree Engine', type: 'component', group: 'Simulation', level: 'low', parent: 'mod-vehicle-ai', children: [], summary: 'Executes driver behavior trees and resolves conflicts.', details: 'Publishes driver signals to review console for QA playback.', metrics: [{ label: 'BT Variants', value: '128' }], tags: ['ai'], source: { path: 'services/simulation/vehicle-ai/behavior-tree.cpp', lang: 'cpp' } },
    { id: 'svc-weather-ingest', label: 'Weather Ingestor', type: 'service', group: 'Simulation', level: 'low', parent: 'mod-environment-feed', children: [], summary: 'Pulls weather feeds, normalises formats, and caches deltas.', details: 'Supports failover providers and notifies observability when lagging.', metrics: [{ label: 'Providers', value: '3' }], tags: ['integration'], source: { path: 'services/data/environment-feed/weather-ingest.ts', lang: 'ts' } },
    { id: 'svc-traffic-analytics', label: 'Traffic Analytics Processor', type: 'service', group: 'Simulation', level: 'low', parent: 'mod-environment-feed', children: [], summary: 'Aggregates telemetry to derive live traffic density signals.', details: 'Feeds analytics to vehicle AI runtime and dashboard overlays.', metrics: [{ label: 'Window', value: '30 s' }], tags: ['analytics'], source: { path: 'services/data/environment-feed/traffic-analytics.py', lang: 'py' } },
    { id: 'cmp-template-editor', label: 'Template Editor', type: 'component', group: 'Experience', level: 'low', parent: 'mod-scenario-authoring', children: [], summary: 'Rich text and map editing components powering the authoring studio.', details: 'Supports multiplayer edits and integrates with validation worker for lint hints.', metrics: [{ label: 'Latency', value: '38 ms' }], tags: ['authoring'], source: { path: 'clients/authoring-studio/template-editor.tsx', lang: 'tsx' } },
    { id: 'cmp-validation-worker', label: 'Validation Worker', type: 'component', group: 'Experience', level: 'low', parent: 'mod-scenario-authoring', children: [], summary: 'Runs schema and simulation pre-checks on draft scenarios.', details: 'Executes in CI as well as in authoring, sharing rule packs.', metrics: [{ label: 'Checks', value: '84' }], tags: ['validation'], source: { path: 'clients/authoring-studio/validation-worker.ts', lang: 'ts' } },
    { id: 'cmp-dashboard-ui', label: 'Dashboard UI Shell', type: 'component', group: 'Experience', level: 'low', parent: 'mod-review-console', children: [], summary: 'Main React shell for review dashboards and video playback.', details: 'Integrates with review API and supports offline caching for remote reviewers.', metrics: [{ label: 'Bundle', value: '1.4 MB' }], tags: ['dashboard'], source: { path: 'clients/review-console/app.tsx', lang: 'tsx' } },
    { id: 'svc-reporting-api', label: 'Reporting API', type: 'service', group: 'Experience', level: 'low', parent: 'mod-review-console', children: [], summary: 'Serves reviewer annotations, attachments, and timeline data.', details: 'Feeds summary data back into notification hub for stakeholder emails.', metrics: [{ label: 'Requests/min', value: '4.2k' }], tags: ['api'], source: { path: 'services/experience/reporting-api/main.ts', lang: 'ts' } },
    { id: 'svc-notify-dispatch', label: 'Notification Dispatcher', type: 'service', group: 'Experience', level: 'low', parent: 'mod-notification-hub', children: [], summary: 'Sends email, Slack, and SMS notifications with delivery tracking.', details: 'Supports templating, locale fallbacks, and integrates with identity preferences.', metrics: [{ label: 'Delivery P95', value: '24 s' }], tags: ['notifications'], source: { path: 'services/communications/dispatcher/README.md', lang: 'md' } },
    { id: 'cmp-websocket-gateway', label: 'WebSocket Gateway', type: 'component', group: 'Experience', level: 'low', parent: 'mod-notification-hub', children: [], summary: 'Pushes real-time alerts to in-app clients and review console overlays.', details: 'Handles multiplexing and backpressure against notification queue lengths.', metrics: [{ label: 'Connections', value: '3.6k' }], tags: ['realtime'], source: { path: 'services/communications/websocket-gateway/server.ts', lang: 'ts' } },
    { id: 'svc-build-coordinator', label: 'Build Coordinator', type: 'service', group: 'Operations', level: 'low', parent: 'mod-ci-pipeline', children: [], summary: 'Coordinates build graph execution and handles retry semantics.', details: 'Integrates with artifact cache for warm builds and emits telemetry to observability.', metrics: [{ label: 'Build/hr', value: '42' }], tags: ['ci'], source: { path: 'ops/ci-pipeline/coordinator/main.ts', lang: 'ts' } },
    { id: 'cmp-artifact-cache', label: 'Artifact Cache', type: 'component', group: 'Operations', level: 'low', parent: 'mod-ci-pipeline', children: [], summary: 'Stores reusable build layers and fetches from remote mirrors.', details: 'Supports content-addressable storage and pushes eviction metrics.', metrics: [{ label: 'Hit Rate', value: '79%' }], tags: ['cache'], source: { path: 'ops/ci-pipeline/cache/README.md', lang: 'md' } },
    { id: 'svc-log-router', label: 'Log Router', type: 'service', group: 'Operations', level: 'low', parent: 'mod-observability', children: [], summary: 'Aggregates logs, applies filters, and ships to cold storage.', details: 'Supports dynamic routing rules and integrates with runbook engine for anomaly detection.', metrics: [{ label: 'Throughput', value: '380 MB/s' }], tags: ['logging'], source: { path: 'ops/observability/log-router/main.rs', lang: 'rs' } },
    { id: 'svc-metric-store', label: 'Metric Store', type: 'service', group: 'Operations', level: 'low', parent: 'mod-observability', children: [], summary: 'Stores and queries time-series metrics with multi-region replication.', details: 'Feeds anomaly alerts into notification hub and offers API access for dashboards.', metrics: [{ label: 'Retention', value: '45 days' }], tags: ['metrics'], source: { path: 'ops/observability/metric-store/README.md', lang: 'md' } },
    { id: 'cmp-runbook-engine', label: 'Runbook Engine', type: 'component', group: 'Operations', level: 'low', parent: 'mod-incident-response', children: [], summary: 'Executes scripted incident responses and tracks state machine progress.', details: 'Integrates with pager adapter and review console for incident summaries.', metrics: [{ label: 'Playbooks', value: '37' }], tags: ['incident'], source: { path: 'ops/incident-response/runbook-engine.ts', lang: 'ts' } },
    { id: 'svc-pager-adapter', label: 'Pager Adapter', type: 'service', group: 'Operations', level: 'low', parent: 'mod-incident-response', children: [], summary: 'Connects to paging providers, handles escalation policies, and confirms acknowledgements.', details: 'Publishes ack metrics to observability and triggers fallback channels.', metrics: [{ label: 'Escalations', value: '3%' }], tags: ['incident'], source: { path: 'ops/incident-response/pager-adapter/main.ts', lang: 'ts' } },
    { id: 'svc-edge-proxy', label: 'Edge Proxy', type: 'service', group: 'Platform', level: 'low', parent: 'mod-api-gateway', children: [], summary: 'Envoy-based proxy terminating TLS and enforcing WAF policies.', details: 'Distributes config via control plane and exposes metrics to observability.', metrics: [{ label: 'Clusters', value: '6' }], tags: ['edge'], source: { path: 'platform/api-gateway/edge-proxy.yaml', lang: 'yaml' } },
    { id: 'cmp-rate-limiter', label: 'Adaptive Rate Limiter', type: 'component', group: 'Platform', level: 'low', parent: 'mod-api-gateway', children: [], summary: 'Applies token-bucket limits with dynamic backoff for partner traffic.', details: 'Synchronises limits via identity service and exposes override APIs.', metrics: [{ label: 'Rules', value: '142' }], tags: ['security'], source: { path: 'platform/api-gateway/rate-limiter.ts', lang: 'ts' } },
    { id: 'svc-asset-indexer', label: 'Asset Indexer', type: 'service', group: 'Platform', level: 'low', parent: 'mod-asset-catalog', children: [], summary: 'Indexes new assets, builds metadata, and replicates to regional stores.', details: 'Triggers validations and pushes events to notification hub when replication lags.', metrics: [{ label: 'Index Lag', value: '6 s' }], tags: ['storage'], source: { path: 'platform/asset-catalog/indexer/main.go', lang: 'go' } },
    { id: 'cmp-schema-validator', label: 'Schema Validator', type: 'component', group: 'Platform', level: 'low', parent: 'mod-asset-catalog', children: [], summary: 'Validates asset schemas during ingest and upgrade.', details: 'Shares rule sets with validation worker and surfaces metrics to observability.', metrics: [{ label: 'Rules', value: '58' }], tags: ['validation'], source: { path: 'platform/asset-catalog/schema-validator.ts', lang: 'ts' } },
    { id: 'svc-auth-core', label: 'Auth Core Service', type: 'service', group: 'Platform', level: 'low', parent: 'mod-identity-service', children: [], summary: 'Handles sign-in flows, multi-factor challenges, and token minting.', details: 'Publishes anomalous login events to notification hub and operations telemetry.', metrics: [{ label: 'Latency P95', value: '72 ms' }], tags: ['auth'], source: { path: 'platform/identity/auth-core/README.md', lang: 'md' } },
    { id: 'cmp-token-rotator', label: 'Token Rotator', type: 'component', group: 'Platform', level: 'low', parent: 'mod-identity-service', children: [], summary: 'Automates refresh token rotation and secret distribution.', details: 'Integrates with CI pipeline for key rollout and updates downstream config stores.', metrics: [{ label: 'Rotations/day', value: '240' }], tags: ['security'], source: { path: 'platform/identity/token-rotator.ts', lang: 'ts' } }
  ],
  edges: [
    { from: 'dom-simulation', to: 'dom-platform', intent: 'depends-on', level: 'high', description: 'Relies on platform services for asset retrieval, identity, and ingress.' },
    { from: 'dom-experience', to: 'dom-simulation', intent: 'controls', level: 'high', description: 'Initiates scenario previews and requests simulation status updates.' },
    { from: 'dom-experience', to: 'dom-platform', intent: 'depends-on', level: 'high', description: 'Uses platform APIs for identity, storage, and notifications.' },
    { from: 'dom-operations', to: 'dom-platform', intent: 'depends-on', level: 'high', description: 'Runs build artifacts through gateway and identity services.' },
    { from: 'dom-operations', to: 'dom-simulation', intent: 'publishes', level: 'high', description: 'Pushes deployment and telemetry signals into the control plane.' },
    { from: 'dom-platform', to: 'dom-operations', intent: 'synchronizes', level: 'high', description: 'Shares platform health metrics and audit logs.' },

    { from: 'mod-sim-scheduler', to: 'dom-simulation', intent: 'depends-on', level: 'medium', description: 'Reports backlog metrics and receives orchestrator directives.' },
    { from: 'mod-vehicle-ai', to: 'dom-simulation', intent: 'depends-on', level: 'medium', description: 'Consumes tick cadence and publishes agent telemetry.' },
    { from: 'mod-environment-feed', to: 'dom-simulation', intent: 'synchronizes', level: 'medium', description: 'Feeds environmental signals every tick to keep simulation fresh.' },
    { from: 'mod-scenario-authoring', to: 'dom-experience', intent: 'depends-on', level: 'medium', description: 'Anchors authoring experiences.' },
    { from: 'mod-review-console', to: 'dom-experience', intent: 'depends-on', level: 'medium', description: 'Renders data aggregated by experience domain.' },
    { from: 'mod-notification-hub', to: 'dom-experience', intent: 'depends-on', level: 'medium', description: 'Supports outbound communications across the experience domain.' },
    { from: 'mod-ci-pipeline', to: 'dom-operations', intent: 'depends-on', level: 'medium', description: 'Core automation pipeline inside operations.' },
    { from: 'mod-observability', to: 'dom-operations', intent: 'depends-on', level: 'medium', description: 'Central telemetry system for operations.' },
    { from: 'mod-incident-response', to: 'dom-operations', intent: 'depends-on', level: 'medium', description: 'Runs orchestrated incident workflows under the operations umbrella.' },
    { from: 'mod-api-gateway', to: 'dom-platform', intent: 'depends-on', level: 'medium', description: 'Edge component in platform.' },
    { from: 'mod-asset-catalog', to: 'dom-platform', intent: 'depends-on', level: 'medium', description: 'Stores and replicates shared assets.' },
    { from: 'mod-identity-service', to: 'dom-platform', intent: 'depends-on', level: 'medium', description: 'Handles authentication for all domains.' },

    { from: 'mod-scenario-authoring', to: 'mod-sim-scheduler', intent: 'controls', level: 'medium', description: 'Triggers preview builds and sees queue states.' },
    { from: 'mod-review-console', to: 'mod-vehicle-ai', intent: 'publishes', level: 'medium', description: 'Receives telemetry streams for replay.' },
    { from: 'mod-notification-hub', to: 'mod-incident-response', intent: 'depends-on', level: 'medium', description: 'Routes escalations triggered by incident engine.' },
    { from: 'mod-ci-pipeline', to: 'mod-asset-catalog', intent: 'publishes', level: 'medium', description: 'Publishes new build artifacts to catalog.' },
    { from: 'mod-observability', to: 'mod-notification-hub', intent: 'publishes', level: 'medium', description: 'Sends alert notifications to hub.' },
    { from: 'mod-api-gateway', to: 'mod-identity-service', intent: 'depends-on', level: 'medium', description: 'Delegates auth checks to identity service.' },

    { from: 'cmp-tick-arbiter', to: 'mod-sim-scheduler', intent: 'controls', level: 'low', description: 'Feeds backlog metrics back to scheduler.' },
    { from: 'cmp-load-balancer', to: 'mod-sim-scheduler', intent: 'depends-on', level: 'low', description: 'Receives placement directives from scheduler.' },
    { from: 'cmp-pathfinder', to: 'mod-vehicle-ai', intent: 'depends-on', level: 'low', description: 'Provides routing results to vehicle AI runtime.' },
    { from: 'cmp-behavior-tree', to: 'mod-vehicle-ai', intent: 'depends-on', level: 'low', description: 'Executes behavior trees provided by runtime.' },
    { from: 'svc-weather-ingest', to: 'mod-environment-feed', intent: 'depends-on', level: 'low', description: 'Supplies weather data to environment feed.' },
    { from: 'svc-traffic-analytics', to: 'mod-environment-feed', intent: 'depends-on', level: 'low', description: 'Provides traffic analytics to environment feed.' },
    { from: 'cmp-template-editor', to: 'mod-scenario-authoring', intent: 'depends-on', level: 'low', description: 'Editor components used inside authoring studio.' },
    { from: 'cmp-validation-worker', to: 'mod-scenario-authoring', intent: 'depends-on', level: 'low', description: 'Validates drafts for the authoring studio.' },
    { from: 'cmp-dashboard-ui', to: 'mod-review-console', intent: 'depends-on', level: 'low', description: 'UI shell for review console.' },
    { from: 'svc-reporting-api', to: 'mod-review-console', intent: 'depends-on', level: 'low', description: 'Serves data to review console UI.' },
    { from: 'svc-notify-dispatch', to: 'mod-notification-hub', intent: 'depends-on', level: 'low', description: 'Dispatches outbound notifications for hub.' },
    { from: 'cmp-websocket-gateway', to: 'mod-notification-hub', intent: 'depends-on', level: 'low', description: 'Provides realtime socket connections for hub.' },
    { from: 'svc-build-coordinator', to: 'mod-ci-pipeline', intent: 'depends-on', level: 'low', description: 'Coordinates build graph for CI pipeline.' },
    { from: 'cmp-artifact-cache', to: 'mod-ci-pipeline', intent: 'depends-on', level: 'low', description: 'Caches build artifacts for CI pipeline.' },
    { from: 'svc-log-router', to: 'mod-observability', intent: 'depends-on', level: 'low', description: 'Routes logs to observability stack.' },
    { from: 'svc-metric-store', to: 'mod-observability', intent: 'depends-on', level: 'low', description: 'Stores metrics for observability stack.' },
    { from: 'cmp-runbook-engine', to: 'mod-incident-response', intent: 'depends-on', level: 'low', description: 'Executes runbooks for incident response.' },
    { from: 'svc-pager-adapter', to: 'mod-incident-response', intent: 'depends-on', level: 'low', description: 'Handles paging for incident response.' },
    { from: 'svc-edge-proxy', to: 'mod-api-gateway', intent: 'depends-on', level: 'low', description: 'Edge proxy powering API gateway.' },
    { from: 'cmp-rate-limiter', to: 'mod-api-gateway', intent: 'depends-on', level: 'low', description: 'Rate limiting component for API gateway.' },
    { from: 'svc-asset-indexer', to: 'mod-asset-catalog', intent: 'depends-on', level: 'low', description: 'Indexes new assets into asset catalog.' },
    { from: 'cmp-schema-validator', to: 'mod-asset-catalog', intent: 'depends-on', level: 'low', description: 'Validates schemas for asset catalog.' },
    { from: 'svc-auth-core', to: 'mod-identity-service', intent: 'depends-on', level: 'low', description: 'Auth core service powering identity.' },
    { from: 'cmp-token-rotator', to: 'mod-identity-service', intent: 'depends-on', level: 'low', description: 'Rotates tokens for identity service.' },

    { from: 'svc-reporting-api', to: 'svc-notify-dispatch', intent: 'publishes', level: 'low', description: 'Sends summary notifications after reviews.' },
    { from: 'svc-log-router', to: 'svc-metric-store', intent: 'synchronizes', level: 'low', description: 'Shares anomaly signals to metric store.' },
    { from: 'svc-asset-indexer', to: 'svc-build-coordinator', intent: 'synchronizes', level: 'low', description: 'Notifies build pipeline when new assets replicate.' },
    { from: 'svc-auth-core', to: 'svc-notify-dispatch', intent: 'publishes', level: 'low', description: 'Emits anomaly alerts to notification hub.' },
    { from: 'cmp-template-editor', to: 'svc-weather-ingest', intent: 'depends-on', level: 'low', description: 'Pulls live conditions for authoring previews.' }
  ]
};
