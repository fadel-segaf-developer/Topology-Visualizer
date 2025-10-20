# FDS TMS Topology Designer

An interactive, JSON-driven topology visualiser for the FDS Traffic Management Suite. The tool is intentionally framework-free, relying on Tailwind, ES modules, and a few lightweight libraries (Panzoom, ELK, Tippy, Marked) loaded from CDN.

## Quick start

1. Start a lightweight dev server (examples below).
2. Visit http://localhost:5500/index.html (or the host/port you chose).
3. Pan with drag, zoom with mouse-wheel (or buttons).
4. Load custom data via **Load JSON** or drag-and-drop onto the canvas (try `fds_topology.json` for the full architecture map).
5. Export the current topology -- including adjusted node positions -- via **Export JSON**.

All styling lives in `styles.css`. Core behaviour is organised under `app/` with separate modules for constants, state management, layout, rendering, interactions, and the bootstrapper (`main.js`). Sample data lives in `data/defaultTopology.js`.

## Progress Log

- **2025-10-20**
  - Added inspector-driven drilldown: breadcrumb trail, child chips, and an "Inspect" action keep context stable while switching High -> Medium -> Low.
  - Localised Tailwind build in `serve-topology.bat`; running the batch file now rebuilds CSS before launching the dev server (no CDN warnings).
  - Authored `scripts/export-gitea.mjs` to pull issues, PRs, milestones, comments, and reviews from Gitea (skips endpoints that 404).
  - Authored `scripts/build-fds-topology.mjs` to blend repo stats + Gitea data and emit domain slices under `data/fds-topology/`.
- **2025-10-21**
  - Refocused the viewer on the Fazza Driving Simulator architecture: high level covers the FDS system and major plugins, medium breaks modules down, and low level links to classes/functions.
  - Documented the agent workflow for deriving that architecture from the repo mirror while keeping detailed text in the inspector and reserving insights for high/medium tiers only.
  - Restored `tms_full.json` as an interactive reference map and refreshed the context docs for the new scope.
## Features

- Multi-level view toggle (High / Medium / Low) with keyboard and mouse support.
- Hierarchical drilldown: click high-level nodes to reveal nested medium/low views with breadcrumb navigation and quick child links.
- Inline schema validation via AJV using `schema/topology.schema.json`.
- Inspector surfaces linked work items, source locations, and AI-grounded insights.
- Auto-layout using ELK with manual drag, pinning, and exportable positions.
- Minimap, search, and layered filters for type, tag, and relationship intent.
- Adaptive node sizing keeps tag-heavy or long-title cards readable.
- Framework-free stack (ES modules + Tailwind) for zero-build iteration.
## Topology schema

Every topology you load is validated against `schema/topology.schema.json`. The schema mirrors the multi-level data model described in `context.md` and powers the AJV validation step in the UI.

### `meta`
- `viewModes` (`["high","medium","low"]`) and `defaultView` control the view toggle.
- `insightPlaybook`, `viewCaps`, `overrides`, and `insights` configure agent guidance and presentation.
- `intents` and `guides` continue to extend relationship styling and documentation links.
- Optional `repository` block captures GitHub metadata (projects, milestones, language mix, etc.) and `lastSyncedAt` timestamps third-party refreshes.

### `nodes`
- `level` identifies the rendering tier (`high`, `medium`, or `low`).
- `source` can capture repo location (`path`, `lang`, optional `symbol`, and `git` data).
- `work` links issues/PRs/projects/milestones (`provider`, `number`, `url`, plus optional metadata and `confidence`).
- Optional `parent`/`children` relationships unlock the drilldown focus state; the GitHub exporter auto-populates these based on milestones and edges.
- `insights` provide grounded recommendations with `kind`, `actions` (optional), `confidence`, and supporting `sources`.
- Existing structural fields (`type`, `group`, `summary`, `metrics`, `tags`, etc.) remain unchanged.

### `edges`
- `level` determines which view renders the relationship.
- Optional `source`, `work`, and `insights` mirror the node structure for interaction-level context.
- `intent` continues to drive colour and legend entries; defaults to `link` when omitted.

Validation errors surface as toasts in the UI with detailed AJV messages, so malformed files never render partially.

## CLI tooling

### Topology repo scanner

The repo includes `cli/scan-topology.mjs`, a zero-dependency Node.js script that emits the deterministic artefacts the topology agent expects (`tree.json`, `build.json`, `docs.json`, `symbols.json`, `work.json`, `correlation.json`).

```bash
node cli/scan-topology.mjs --repo . --out topology-artifacts --github-repo fdsteam/fds_tms
```

- Use `--offline` or `--work-cache` for air-gapped runs.
- Provide `--github-token` to hydrate issue/PR metadata from the GitHub API.
- Outputs are summarised in `artifacts.json` so the agent can locate them easily.

### Repository topology exporter (GitHub)

`cli/export-github-topology.mjs` connects directly to the GitHub REST API and produces a visualiser-ready topology JSON describing repositories, projects, milestones, issues, and pull requests.

```bash
# inside this repo
node cli/export-github-topology.mjs --limit 40

# or for any public repo
node cli/export-github-topology.mjs --repo owner/name --out data/github-topology.json --limit 60
```

- Provide a personal access token via `--token` or `GITHUB_TOKEN` to lift rate limits or access private repositories.
- The script automatically discovers the current git remote when `--repo` is omitted.
- Generated JSON conforms to `schema/topology.schema.json` (see the new `meta.repository` block and extended `work` references).

## Architecture generation workflow

The goal is to build a multi-level map of the Fazza Driving Simulator (FDS) codebase:

1. Mirror the repo (`RepoExtractor/export-gitea-repo.bat`) so `RepoExtractor/working/` reflects the latest source tree.
2. Use the agent playbook (`agent/topology-agent-playbook.md`) to:
   - Detect high-level systems (FDS runtime, plugins, major subsystems).
   - Break each system into medium-level modules (folders, feature packs, plugin areas).
   - Populate low-level nodes with classes or key functions. Detailed commentary lives in the inspector.
   - Generate insights only for high and medium tiers (architecture health, coupling, gaps).
   - Link nodes with edges based on include/use relationships, inheritance, or ownership.
3. Emit a single JSON (for example `tms_full.json` or a new `fds_topology.json`) that follows `schema/topology.schema.json`.
4. Load the JSON through the viewer (`Load JSON`) to confirm layout and inspector content.

The helper `scripts/build-fds-topology.mjs` can provide scaffolding stats, but the final topology should come from the agent following the rules above.

## Agent prompts & rules

- `agent/topology-agent-playbook.md` -- canonical workflow detailing required artefacts, heuristics, and validation checks for the architecture map.
- `agent/promptTemplates.js` -- production system/user prompts injected into the agent orchestration layer.
- `agent/rules.js` -- placeholder for deterministic insight helpers (extend `evaluate` when you need rule-based findings).

## Extending / customising

- **Styling tokens**: Update `app/constants.js` to add new node types, intents, or icon glyphs (SVG strings).
- **Default data**: Modify `data/defaultTopology.js` or point the loader at your own JSON file.
- **Validation**: The UI performs lightweight checks; consider adding schema validation upstream if required.
- **Tooltips/Inspector**: Node objects can include additional fields (e.g., `annotations`) and you can enrich the rendering logic inside `app/render.js`.

## Development workflow

Because everything runs in the browser you can iterate without a build step:

1. Edit source files in `app/`, `data/`, or `styles.css`.
2. Refresh the browser tab to see changes.
3. Use the **Re-run Layout** button to recompute auto-layout after structural edits.

### Quick dev server options

```bash
# Python 3
python -m http.server 5500

# Node.js
npx serve .
```

Run the command from the repository root (`d:\Topology-Visualizer`), then open the reported URL.

If you need a stricter module system or bundling, the current structure is ready to drop into a Vite/Webpack setup without major rewrites.







