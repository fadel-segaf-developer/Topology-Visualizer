# Context for Next Agent

## Repository state (2025-10-21)
- `RepoExtractor/working/` contains the mirror clone of the Fazza Driving Simulator (Unreal) codebase. Refresh it with `RepoExtractor/export-gitea-repo.bat` before regenerating the topology.
- `fds_topology.json` at the repo root captures the latest high/medium/low architecture breakdown (superseding the historic `tms_full.json` sample).
- Viewer assets reside under `data/`; load the topology via **Load JSON** to verify layout and inspector output.
- Scripts for work item exports remain available, but the current mandate is to map architecture, not issue progress.

## Key scripts & docs
- `scripts/export-gitea-repo.bat` / `scripts/export-gitea.mjs` -- keep the mirror current and optionally fetch metadata for inspector context.
- `scripts/build-fds-topology.mjs` -- helper for gathering folder statistics (file counts, sizes); do not rely on its output as the final topology.
- `agent/topology-agent-playbook.md` -- describes how to analyse the repo tree, build high/medium/low hierarchy, and craft insights for architecture nodes.
- `agent/promptTemplates.js` -- system/user prompts that should be used when an LLM generates the JSON.
- `tms_full.json` -- reference topology showing how nodes and edges should appear once the map is complete.

## Working instructions for the next agent
1. Refresh `RepoExtractor/working/` so the Unreal project tree mirrors the latest FDS repository.
2. Identify **high-level** nodes: the FDS system itself and any major plugins or runtime segments (e.g., TMS, Simulation, Editor tooling). Insights belong here.
3. For each high node, extract **medium-level** modules (folders, feature packs, subsystems). Capture responsibilities in summaries; add insights where architectural risks or gaps exist.
4. Harvest **low-level** nodes from classes or primary functions that power each module. Keep detailed notes in the inspector; avoid insights at this tier.
5. Connect nodes with edges that represent runtime interactions (dependency, data flow, control) derived from includes, blueprint references, or naming conventions.
6. Emit a single topology JSON (update `tms_full.json` or create `fds_topology.json`) that satisfies `schema/topology.schema.json`. Validate locally or via the viewer (AJV errors show as toasts).
7. Provide a short changelog summarising new/updated nodes and edges when you hand off the result.

## Notes & open ideas
- Inspector data can include path references, key methods, or performance notes to keep the canvas clean.
- Optional: annotate high-level nodes with current module health (compile times, asset counts) if you discover reliable data sources.
- Consider scripting discovery of module boundaries (e.g., folder heuristics) to speed up future runs.

## Retrospective
- The long detour into issue-based slices distracted from the real goal (architecture mapping). We course-corrected by returning to a single `fds_topology.json` and cleaning out the slice UI/manifests. Next time, confirm the desired artefact before wiring features into the app.
- Generating the topology directly from the repo required a fresh mirror; cloning the bare Git mirror and checking it out locally (without LFS) was sufficient for structure. Future agents should script the checkout step so we do not repeat manual git plumbing.
- Minifying `fds_topology.json` keeps transfers light but makes diffs harder. A future improvement would be to keep a prettified source (`fds_topology.pretty.json`) and minify as part of a build step.
- The viewer still assumes manual load; consider adding a lightweight file picker history (localStorage) so switching between topology snapshots is faster.

## Suggested commit message notes
- add `fds_topology.json` with high/medium/low FDS architecture nodes, insights only at upper tiers
- strip slice manifest UI/logic from app and sidebar styles
- refresh README/context docs to describe the architecture workflow and new topology entry point
- restore repo mirror under `RepoExtractor/working/` for analysis (checkout from exported git mirror)
- document retrospective and next steps in `context-agent.md`


