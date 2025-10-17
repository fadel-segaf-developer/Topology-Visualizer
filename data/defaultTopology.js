export const defaultTopology = {
  meta: {
    name: 'FDS_TMS Reference Topology',
    version: '2025.10',
    owner: 'Simulation Platform Team',
    description: 'Baseline topology for the FDS Traffic Management Suite. Nodes, edges, and copy all flow from this JSON so product teams can extend the UI without code edits.',
    intents: {
      'depends-on': { label: 'Depends On', color: '#38bdf8' },
      publishes: { label: 'Publishes Events', color: '#f472b6' },
      controls: { label: 'Controls / Commands', color: '#f97316' },
      synchronizes: { label: 'Synchronizes', color: '#a855f7' },
      bridge: { label: 'Bridge / Integration', color: '#fbbf24' },
      external: { label: 'External Plugin', color: '#fb7185' }
    },
    guides: [
      {
        label: 'Domain design doc',
        url: 'https://example.com/docs/fds_tms/domain',
        description: 'Contracts, data flows, and invariants for the traffic manager stack.'
      },
      {
        label: 'Runtime dashboards',
        url: 'https://example.com/monitoring/tms',
        description: 'Operational dashboards and log streams for live simulations.'
      }
    ]
  },
  nodes: [
    {
      id: 'core',
      label: 'FDS_TMS_Core',
      type: 'core',
      group: 'Core Services',
      summary: 'Authoritative simulation state and plugin orchestration.',
      details: 'Maintains canonical topology, issues tick budgets, and coordinates plugin lifecycle.',
      status: { label: 'Stable', tone: 'success' },
      metrics: [{ label: 'Tick Budget', value: '2 ms' }],
      tags: ['stateful', 'safety-critical'],
      icon: 'chip'
    },
    {
      id: 'registry',
      label: 'TrafficRegistrySubsystem',
      type: 'subsystem',
      group: 'Core Services',
      summary: 'Catalog of traffic assets, routes, and behaviors.',
      details: 'Provides lookup tables for scenario ingest and authoring validation.',
      status: { label: 'Stable', tone: 'success' },
      metrics: [{ label: 'Assets', value: '~1.2k' }],
      tags: ['catalog', 'stateful'],
      icon: 'layers'
    },
    {
      id: 'worldsub',
      label: 'WorldSubsystem',
      type: 'subsystem',
      group: 'Core Services',
      summary: 'Applies world-state deltas and level streaming.',
      details: 'Synchronizes map tiles and deterministic playback across clients.',
      status: { label: 'Stable', tone: 'success' },
      metrics: [{ label: 'Streaming Window', value: '500 m' }],
      tags: ['world', 'stateful'],
      icon: 'layers'
    },
    {
      id: 'runtime',
      label: 'FDS_TMS_TrafficRuntime',
      type: 'runtime',
      group: 'Simulation Loop',
      summary: 'Primary runtime orchestrating agent updates and network simulation.',
      details: 'Handles tick sequencing, AI agenda execution, and vehicle provider integration.',
      status: { label: 'Stable', tone: 'success' },
      metrics: [
        { label: 'Agents / Tick', value: '~18k' },
        { label: 'Mean Tick', value: '6.8 ms' }
      ],
      tags: ['runtime', 'safety-critical'],
      icon: 'runtime'
    },
    {
      id: 'manager',
      label: 'TrafficManager',
      type: 'controller',
      group: 'Simulation Loop',
      summary: 'Schedules AI tasks, lane selection, and conflict resolution.',
      details: 'Negotiates dynamic maneuvers and emits KPIs for scoring.',
      status: { label: 'Stable', tone: 'success' },
      metrics: [{ label: 'Adaptive Interval', value: '4 ticks' }],
      tags: ['orchestration'],
      icon: 'controller'
    },
    {
      id: 'laneChecker',
      label: 'LaneCheckerComponent',
      type: 'component',
      group: 'Simulation Loop',
      summary: 'Evaluates lane feasibility and maneuver safety.',
      details: 'Forecasts occupancy and verifies sightlines before commits.',
      status: { label: 'Stable', tone: 'success' },
      metrics: [{ label: 'Violations / hr', value: '<1%' }],
      tags: ['analysis', 'safety-critical'],
      icon: 'gauge'
    },
    {
      id: 'signals',
      label: 'FDS_TMS_SignalsRuntime',
      type: 'runtime',
      group: 'Simulation Loop',
      summary: 'Signal controller executing junction plans in real time.',
      details: 'Integrates pedestrian manager and publishes cycle telemetry.',
      status: { label: 'Stable', tone: 'success' },
      metrics: [
        { label: 'Junctions', value: '512' },
        { label: 'Latency', value: '4 ms p99' }
      ],
      tags: ['signals'],
      icon: 'signal'
    },
    {
      id: 'signalsCtrl',
      label: 'JunctionSignalController',
      type: 'controller',
      group: 'Simulation Loop',
      summary: 'Maintains signal phase plans, offsets, and coordination groups.',
      details: 'Supports editor overrides and exposes runtime metrics.',
      status: { label: 'Stable', tone: 'success' },
      metrics: [{ label: 'Offsets', value: 'Auto-optimised' }],
      tags: ['signals', 'control'],
      icon: 'controller'
    },
    {
      id: 'phaseAsset',
      label: 'SignalPhaseAsset',
      type: 'asset',
      group: 'Authoring',
      summary: 'Data asset for signal phase definitions.',
      details: 'Shared between editor and runtime pipelines for reproducible behaviour.',
      status: { label: 'Stable', tone: 'info' },
      tags: ['authoring'],
      icon: 'asset'
    },
    {
      id: 'providerIface',
      label: 'IFDS_TMS_VehicleProvider',
      type: 'interface',
      group: 'Integration',
      summary: 'Contract for external vehicle providers and telemetry bridges.',
      details: 'Defines callbacks for vehicle injection and telemetry export.',
      status: { label: 'Stable', tone: 'success' },
      tags: ['integration'],
      icon: 'interface'
    },
    {
      id: 'fgear',
      label: 'FDS_TMS_FGEARBridge',
      type: 'bridge',
      group: 'Integration',
      summary: 'Bridge to FGEAR telemetry provider for high fidelity playback.',
      details: 'Translates FGEAR packets into provider interface events.',
      status: { label: 'Stable', tone: 'success' },
      metrics: [{ label: 'Latency', value: '3.6 ms p95' }],
      tags: ['bridge'],
      icon: 'bridge'
    },
    {
      id: 'editor',
      label: 'FDS_TMS_Editor',
      type: 'tooling',
      group: 'Authoring',
      summary: 'Authoring UI for live topology edits and what-if analysis.',
      details: 'Supports collaborative sessions with change review.',
      status: { label: 'Beta', tone: 'warning' },
      metrics: [{ label: 'Active Users', value: '12' }],
      tags: ['editor', 'tooling'],
      icon: 'tool'
    },
    {
      id: 'scoringBridge',
      label: 'TMS_ScoringBridge',
      type: 'bridge',
      group: 'Integration',
      summary: 'Aggregates compliance events and forwards to scoring stack.',
      details: 'Applies filtering before emitting to external scoring plugin.',
      status: { label: 'Stable', tone: 'success' },
      tags: ['analytics'],
      icon: 'bridge'
    },
    {
      id: 'scoring',
      label: 'FDS_Scoring (External)',
      type: 'external',
      group: 'External',
      summary: 'External scoring plugin owned by evaluation team.',
      details: 'Consumes bridge events, persists violations, and triggers dashboards.',
      status: { label: 'External', tone: 'info' },
      tags: ['external'],
      icon: 'external'
    },
    {
      id: 'trafficLOD',
      label: 'Traffic LOD / Spawn-Despawn',
      type: 'service',
      group: 'Simulation Loop',
      summary: 'Manages level-of-detail budgets and agent streaming.',
      details: 'Guarantees warm starts and avoids spawn collisions under load.',
      status: { label: 'Stable', tone: 'success' },
      metrics: [{ label: 'LOD Bands', value: '3' }],
      tags: ['lod', 'runtime'],
      icon: 'gauge'
    },
    {
      id: 'peds',
      label: 'Pedestrian Manager',
      type: 'service',
      group: 'Simulation Loop',
      summary: 'Synchronises pedestrian crossings and animation states.',
      details: 'Feeds crossing requests into the signals runtime for phasing.',
      status: { label: 'Stable', tone: 'success' },
      tags: ['pedestrian'],
      icon: 'users'
    }
  ],
  edges: [
    { from: 'runtime', to: 'core', intent: 'depends-on', description: 'Pulls authoritative state and tick budgets.' },
    { from: 'signals', to: 'core', intent: 'depends-on', description: 'Requests cycle configuration and syncs signals.' },
    { from: 'editor', to: 'core', intent: 'publishes', description: 'Applies live topology edits and configuration changes.' },
    { from: 'manager', to: 'runtime', intent: 'controls', description: 'Schedules AI behaviour and flow control.' },
    { from: 'laneChecker', to: 'runtime', intent: 'publishes', description: 'Reports lane feasibility and safety metrics.' },
    { from: 'signalsCtrl', to: 'signals', intent: 'controls', description: 'Pushes junction plans and signal transitions.' },
    { from: 'signalsCtrl', to: 'phaseAsset', intent: 'publishes', description: 'Writes phase asset updates for persistence.' },
    { from: 'runtime', to: 'providerIface', intent: 'synchronizes', description: 'Exposes vehicle provider contract to integrations.' },
    { from: 'fgear', to: 'providerIface', intent: 'bridge', description: 'Bridges telemetry streams into the provider interface.' },
    { from: 'editor', to: 'runtime', intent: 'controls', description: 'Issues play-in-editor overrides and authoring commands.' },
    { from: 'laneChecker', to: 'scoringBridge', intent: 'publishes', description: 'Emits compliance metrics for scoring.' },
    { from: 'signalsCtrl', to: 'scoringBridge', intent: 'publishes', description: 'Streams signal infractions for scoring.' },
    { from: 'scoringBridge', to: 'scoring', intent: 'external', description: 'Feeds external scoring plugin.' },
    { from: 'registry', to: 'core', intent: 'depends-on', description: 'Registers assets and overlays into core.' },
    { from: 'worldsub', to: 'core', intent: 'depends-on', description: 'Supplies world diffs and level streaming updates.' },
    { from: 'trafficLOD', to: 'runtime', intent: 'synchronizes', description: 'Coordinates spawn and despawn windows with runtime.' },
    { from: 'peds', to: 'signals', intent: 'synchronizes', description: 'Aligns pedestrian crossings with signal timing.' },
    { from: 'runtime', to: 'scoringBridge', intent: 'publishes', description: 'Publishes runtime KPIs for scoring.' }
  ]
};
