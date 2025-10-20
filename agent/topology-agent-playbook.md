# FDS Topology Refinement Playbook

This playbook tells any autonomous agent (Codex, GPT, Gemini, etc.) how to transform the Fazza Driving Simulator repository into a multi-level topology JSON that mirrors the `tms_full.json` experience.

---

## 1. Goal
- Visualise the full FDS architecture: high level for systems/plugins, medium for modules, low for classes or pivotal functions.
- Insights are reserved for **high** and **medium** nodes only (architecture advice, risk flags, coupling notes). Low level nodes simply expose facts in the inspector.
- Output must conform to `schema/topology.schema.json` and should typically be stored as `tms_full.json` (or a date-stamped variant).

---

## 2. Required inputs
| Artefact | Purpose |
| --- | --- |
| `RepoExtractor/working/` | Mirror of the FDS Unreal project; derive systems, modules, and classes from this tree. |
| `schema/topology.schema.json` | Validation contract for the final JSON. |
| `data/defaultTopology.js` | Reference for intent naming, node styling hints, and viewer expectations. |
| (Optional) `scripts/build-fds-topology.mjs` | Collects folder statistics if you need quick metrics (file counts, sizes). Use for context only. |
| (Optional) `RepoExtractor/gitea-api/...` | Contains issue comments/reviews; useful if you want to surface inspector notes taken from discussions. |

---

## 3. High/Medium/Low definitions
- **High**: FDS runtime and top-level plugins (e.g., `UE_FDS3`, `FDS_TMS`, tooling, simulation services). Limit to 5–10 nodes to keep the canvas readable. Provide one or two insights per node (architecture health, outstanding refactors, coupling).
- **Medium**: Major modules or subsystems under each high node (folders, feature packs, managers). Summaries should describe responsibility and relationship to peers. Insights allowed here (coverage gaps, tight coupling, TODO debt).
- **Low**: Key classes, components, blueprints, or functions that define how each module works. Include single-sentence summaries, metrics (files, SLOC, complexity if known), and inspector links (e.g., source path). No insights at this tier.

---

## 4. Workflow
1. **Discover structure**
   - Walk `RepoExtractor/working/Source/` and `RepoExtractor/working/Plugins/` to identify candidate systems and modules.
   - Group files using Unreal conventions (e.g., `ModuleName/Public`, `Private`, plugin directories).
2. **Create node hierarchy**
   - Build high-level nodes (`level: "high"`) with summaries describing their scope and dependencies.
   - For each high node, enumerate child modules as medium nodes. Capture folder paths in `source.path` and tag with relevant technology (`C++`, `Blueprint`, etc.).
   - Generate low-level nodes by sampling representative classes/functions. Use `source.path` with file names. Keep lists focused—do not attempt to list every file; pick the elements that explain how the module works.
3. **Inspector data**
   - High/medium nodes: add `insights` array. Example triggers: module needs refactor, heavy coupling detected, missing test coverage, pending plugin migration.
   - Low nodes: populate `summary`, `metrics` (file size, compile time if known), and `details` for short context. No `insights` here.
4. **Edges**
   - Capture relationships via `edges` with intents such as `depends-on`, `publishes`, `controls`, `integrates`. Base these on include statements, subsystem usage, or explicit plugin dependencies.
   - Ensure edges reference existing node IDs and set `level` to match the highest level either node appears in (usually `medium` or `high`).
5. **Validation**
   - Assemble the topology object `{ meta, nodes, edges }`, then validate against the schema (the viewer runs AJV automatically, but local validation is encouraged).
   - Keep coordinates (`node.position`) optional; the viewer will lay out nodes automatically if positions are missing.
6. **Output**
   - Write the JSON to the repo root (e.g., overwrite `tms_full.json` or emit `fds_topology.json`).
   - Provide a short changelog noting new/removed nodes, modules, and major insights.

---

## 5. Prompt blueprint
**System prompt**
> You map the Fazza Driving Simulator codebase into a multi-level topology JSON that satisfies schema/topology.schema.json. Use the repo mirror to derive high (systems/plugins), medium (modules), and low (classes/functions) nodes. Insights belong only on high and medium nodes. Return raw JSON only.

**User prompt scaffold**
```
Repository mirror: RepoExtractor/working
Target output: tms_full.json
High-level expectations:
- High nodes = core systems/plugins
- Medium nodes = major modules under each system
- Low nodes = key classes/functions (details via inspector)
- Insights: architecture advice on high/medium only

Please emit a single JSON payload that conforms to schema/topology.schema.json.
```
Populate with additional context (e.g., list of discovered modules) before invoking the model.

---

## 6. Tips and open ideas
- Use naming heuristics (`*Subsystem`, `*Manager`, `*Runtime`) to classify modules quickly.
- When unsure of relationships, inspect include statements and constructor dependencies.
- For performance-sensitive modules, add metrics (tick rate, thread usage) in the inspector to aid planning discussions.
- Keep the canvas readable: cap low-level nodes per module or group them under synthetic aggregate nodes when necessary.

With this playbook, any agent can rebuild the FDS architecture topology without manual intervention while matching the interactive experience provided by `tms_full.json`.
