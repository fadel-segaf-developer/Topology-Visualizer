# FDS TMS Topology Designer

An interactive, JSON-driven topology visualiser for the FDS Traffic Management Suite. The tool is intentionally framework-free, relying on Tailwind, ES modules, and a few lightweight libraries (Panzoom, ELK, Tippy, Marked) loaded from CDN.

## Quick start

1. Start a lightweight dev server (examples below).
2. Visit http://localhost:5500/index.html (or the host/port you chose).
3. Pan with drag, zoom with mouse-wheel (or buttons).
4. Load custom data via **Load JSON** or drag-and-drop onto the canvas.
5. Export the current topology -- including adjusted node positions -- via **Export JSON**.

All styling lives in `styles.css`. Core behaviour is organised under `app/` with separate modules for constants, state management, layout, rendering, interactions, and the bootstrapper (`main.js`). Sample data lives in `data/defaultTopology.js`.

## Features

- Auto-layout using ELK with a manual fallback grid.
- Pan/zoom canvas with minimap overview.
- Search box plus type/tag/relationship filters.
- Drag nodes directly on the canvas to refine layout (positions are saved on export).
- Hover tooltips and rich inspector panel (markdown supported for node details).
- Pin/unpin nodes to lock manual positions (preserved on export).
- Dark/light theme toggle (persisted in `localStorage`).
- Drag-and-drop JSON loader and export with layout annotations.
- Toast feedback for major actions.

## JSON schema

The application expects a JSON object with the following shape:

```jsonc
{
  "meta": { ... },
  "nodes": [ ... ],
  "edges": [ ... ]
}
```

### `meta`

| Field        | Type                | Notes                                                                 |
|--------------|--------------------|-----------------------------------------------------------------------|
| `name`       | string             | Display name of the topology.                                         |
| `version`    | string             | Optional version label.                                               |
| `owner`      | string             | Team or owner displayed in the header.                                |
| `description`| string             | Shown in the sidebar.                                                 |
| `intents`    | object             | Override/add relationship intents (`key -> { label, color }`).        |
| `guides`     | array\<Guide\>     | Optional resources (`{ label, url, description }`).                   |

### `nodes`

Each node is an object with:

| Field        | Type                | Notes                                                                  |
|--------------|--------------------|------------------------------------------------------------------------|
| `id`         | string (required)  | Unique identifier used by edges.                                       |
| `label`      | string             | Heading displayed on the card.                                         |
| `type`       | string             | Styling bucket (`core`, `runtime`, `controller`, etc.).                |
| `group`      | string             | Optional grouping label.                                               |
| `summary`    | string             | Short description shown on the card and tooltip.                       |
| `details`    | string (markdown)  | Rendered in the inspector – supports GitHub-flavoured markdown.        |
| `status`     | `{ label, tone }`  | Tone is one of `success`, `info`, `warning`, `danger`, `neutral`.      |
| `metrics`    | array              | `{ label, value }` pairs shown as pills in inspector/tooltips.         |
| `tags`       | array              | Displayed as chips on the card and usable as filters.                  |
| `icon`       | string             | Optional icon key (`chip`, `runtime`, `controller`, etc.).             |
| `links`      | array              | `{ label, url }` entries rendered as external links.                   |
| `layout`     | object             | Optional layout hint: `{ x, y, width, height, fixed }`.                |

During export, the current `position` and `size` are folded back into `layout`.

### `edges`

| Field        | Type                | Notes                                                                  |
|--------------|--------------------|------------------------------------------------------------------------|
| `from`       | string (required)  | Source node ID.                                                        |
| `to`         | string (required)  | Target node ID.                                                        |
| `intent`     | string             | Relationship type. When omitted defaults to `link`.                    |
| `description`| string             | Displayed in inspector neighbour lists.                               |

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

Run the command from `d:\FDS\UE_FDS3\Docs\TMS`, then open the reported URL.

If you need a stricter module system or bundling, the current structure is ready to drop into a Vite/Webpack setup without major rewrites.
