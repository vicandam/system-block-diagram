# Interactive System Block Diagram

This project visualizes interactive infrastructure diagrams with Vue 3, Vue Flow, and Tailwind CSS.
It supports local autosave, Supabase cloud sync, JSON import/export, and live metric updates.

## 🧩 Features

- Drag-and-drop interactive nodes
- Cloud sync via Supabase
- JSON import/export support
- Live metric updates
- Tailwind CSS styling
- Zoom, pan, and fit view controls

## 🧠 Usage

Run locally:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```


## 🧩 Interactivity

The diagram now supports full interactive features as described in the original requirements:

### 🔹 Drag & Drop
All nodes can be freely moved around the canvas. Positions are saved automatically (autosave every 1 second).

### 🔹 Resize
Each block is resizable using the node resizer handles on its corners. Dimensions are preserved during local save, export, and cloud sync.

### 🔹 Hover Tooltips
Hovering over any block displays a tooltip with its description, powered by reactive Vue state.

### 🔹 Live Metric Overlay
Each node shows a dynamic metric (e.g., “req/s”, “logs/min”, “ms avg”) that updates every 5 seconds via a randomized polling simulation.

### 🔹 Zoom, Pan & Fit View
- **Zoom:** Use the mouse scroll wheel to zoom in/out.  
- **Pan:** Click and drag on empty canvas space to move around.  
- **Fit View:** Re-centers and scales the entire layout within view (available in the control panel).

### 🔹 Autosave
Layout changes trigger a 1-second debounced autosave to `localStorage`. Manual Save, Load, Export, and Import options remain available in the toolbar.


## 🌐 Embedding & Read-Only Mode

The diagram can be embedded into any external web page or documentation site using an `<iframe>`.  
This mode is **read-only**, meaning users can view but not drag, resize, or edit nodes.

### 🧩 Usage

To embed the diagram:
```html
<iframe
  src="https://your-deployed-domain.com/?readonly=true"
  width="100%"
  height="600"
  style="border:none;"
></iframe>
```

Or test locally:
```html
<iframe
  src="http://localhost:5173/?readonly=true"
  width="100%"
  height="600"
  style="border:none;"
></iframe>
```

### ⚙️ Implementation

Add this logic to your `Diagram.vue`:
```ts
// Detect if ?readonly=true is in the URL
const urlParams = new URLSearchParams(window.location.search)
const readonlyMode = urlParams.get('readonly') === 'true'
```

Then apply it to your `<VueFlow>` instance:
```vue
<VueFlow
  v-model:nodes="nodes"
  v-model:edges="edges"
  :nodes-draggable="!readonlyMode"
  :nodes-connectable="!readonlyMode"
  :elements-selectable="!readonlyMode"
  :zoom-on-scroll="!readonlyMode"
  :zoom-on-pinching="!readonlyMode"
  :pan-on-drag="!readonlyMode"
  fit-view
  class="w-full h-full"
>
```

Optional UI indicator:
```vue
<div
  v-if="readonlyMode"
  class="absolute top-2 right-2 bg-gray-200 text-xs px-2 py-1 rounded shadow"
>
  Read-Only Mode
</div>
```

### ✅ Behavior Summary
| Action                | Editable Mode | Read-Only Mode |
|-----------------------|---------------|----------------|
| Drag / Drop Nodes     | ✅ Yes         | ❌ No          |
| Resize Nodes          | ✅ Yes         | ❌ No          |
| Pan / Zoom            | ✅ Yes         | ❌ No          |
| View Tooltips / Legend| ✅ Yes         | ✅ Yes         |
| Save / Export / Cloud | ✅ Yes         | ❌ Disabled    |


> 💡 For developers: see [src/docs/README_DEV.md](./src/docs/README_DEV.md) for internal details.
