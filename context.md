# Topology Visualiser Context

The viewer now targets the Fazza Driving Simulator (FDS) architecture. Everything revolves around producing a single `fds_topology.json` that explains the simulator from systems to classes.

## Source of truth
- `RepoExtractor/working/` holds the mirrored FDS Unreal project. Refresh with `RepoExtractor/export-gitea-repo.bat` before generating a new topology.
- `schema/topology.schema.json` defines the contract the viewer validates against.
- `tms_full.json` remains as a lightweight visual reference; `fds_topology.json` is the authoritative architecture map.

## Workflow
1. Analyse the repo tree to identify:
   - **High** level systems/plugins (e.g., UE_FDS3 core, FDS_TMS suite, vehicle input stack).
   - **Medium** modules/folders under each system (traffic runtime, FGear physics, input wrappers, tooling).
   - **Low** representative classes or blueprints that bring each module to life. Inspector text carries details; no insights at this tier.
2. Add insights only to high/medium nodes (architecture risks, coupling, TODOs).
3. Connect nodes with edges that reflect runtime or data dependencies (`depends-on`, `integrates`, `controls`, `publishes`).
4. Emit/minify `fds_topology.json` (pretty-print when editing; minify before shipping to keep files lightweight).
5. Load via **Load JSON** in the viewer to confirm AJV validation and inspect layout.

## Notes
- Keep the repo clean???legacy work slices are gone. Only `fds_topology.json` (and optional references) should sit beside the viewer.
- Use the agent playbook (`agent/topology-agent-playbook.md`) and prompt templates to automate topology regeneration.
- When the architecture evolves, update this file, the playbook, and the README so future contributors know the latest expectations.
