# 🧭 Interactive System Block Diagram (Vue + Supabase + Vue Flow)

This project is an **interactive system diagram builder** built with **Vue 3**, **Vue Flow**, **Tailwind CSS**, and **Supabase** for cloud sync.  
It allows users to visually model infrastructure components, drag and resize nodes, save and load layouts locally or from the cloud, and visualize live system metrics in real time.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | Vue 3 + Vite |
| Diagram Engine | Vue Flow (v1.40) |
| Styling | Tailwind CSS 3.4 |
| Cloud Storage | Supabase (PostgreSQL + Row-Level Security) |
| Hosting | (optional) DigitalOcean / Vercel demo |

---

## ⚙️ Key Features

✅ Interactive drag, drop, resize nodes  
✅ Autosave + manual save/load (local + Supabase)  
✅ Cloud diagram management (multiple diagrams)  
✅ Live metric overlay (req/s, latency, etc.)  
✅ Tooltips and visual node types (infra, backend, frontend, etc.)  
✅ JSON import/export and reset options  
✅ Built-in Tailwind UI and responsive layout  

---

## 🧱 Developer Documentation

See the full guide below for extending node types, styling, and integrating live data feeds.  
(Originally provided as Deliverable #4.)

---

# 🧱 Developer Guide — Extending Nodes and Diagram Behavior

This guide explains how to customize and extend the interactive system diagram built with Vue Flow and Supabase.

---

## 🧩 Component Overview

The interactive diagram is powered by **Vue Flow**, located at:

```
src/components/Diagram.vue
```

Features include:

- Drag & Drop, Resize
- Hover tooltips
- Local and Cloud (Supabase) save/load
- Autosave with debounce
- Live metric polling (simulated every 5 seconds)
- Config-based layout via `diagramConfig.json`

---

## 🎨 Node Customization

Node visuals and color styles are defined in the `getNodeStyle()` function:

```ts
function getNodeStyle(type?: string) {
  const colors: Record<string, string> = {
    infra: '#22c55e',
    backend: '#3b82f6',
    monitoring: '#a855f7',
    frontend: '#f97316',
    default: '#6b7280',
  }
  const color = colors[type ?? 'default']
  return { backgroundColor: color, color: 'white' }
}
```

### ➕ Add a new node type

To add a custom type (e.g., cache):

```ts
function getNodeStyle(type?: string) {
  const colors: Record<string, string> = {
    ...,
    cache: '#0ea5e9',   // New node type
  }
  ...
}
```

Then declare it in your `diagramConfig.json`:

```json
{
  "id": "redis",
  "x": 500,
  "y": 200,
  "width": 180,
  "height": 100,
  "label": "Redis Cache",
  "tooltip": "Session and data cache",
  "type": "cache"
}
```

---

## ⚙️ Node Configuration Schema

Example from `diagramConfig.json`:

```json
{
  "id": "auth",
  "x": 60,
  "y": 60,
  "width": 200,
  "height": 100,
  "label": "Auth Proxy",
  "tooltip": "Traefik + oauth2-proxy",
  "type": "infra"
}
```

Edges simply define the connections:

```json
{ "id": "e1-2", "source": "auth", "target": "bff" }
```

---

## 📊 Mock Metrics & Live Updates

Metrics are currently simulated by:

```ts
function generateRandomMetrics() {
  const samples = [
    () => `${Math.floor(Math.random() * 150)} req/s`,
    () => `${(Math.random() * 500).toFixed(0)} ms avg`,
    () => `${Math.floor(Math.random() * 50)} sessions`,
  ]
  return samples[Math.floor(Math.random() * samples.length)]()
}
```

### 🔄 Replace with real data

To use live data from your backend or Supabase function:

```ts
const response = await fetch('/api/metrics')
const metrics = await response.json()

nodes.value = nodes.value.map(n => ({
  ...n,
  data: { ...n.data, metric: metrics[n.id] }
}))
```

---

## 🎨 Styling (Tailwind)

The app uses **Tailwind CSS 3.4** for all UI and layout styling.  
You can extend your theme:

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      cache: '#0ea5e9',
    },
  },
}
```

---

## ☁️ Supabase Integration

Diagrams are saved/loaded from the Supabase `diagrams` table.

**Schema:**

```sql
create table diagrams (
  id uuid primary key default gen_random_uuid(),
  name text,
  json jsonb,
  created_at timestamp default now(),
  updated_at timestamp
);
```

**Functions:**

- `saveToCloud()` → insert/update JSON layout
- `loadFromCloud()` → retrieve diagram layout by ID

---

## 🚀 Future Enhancements

- Add icons inside nodes
- Animated status indicators
- Real-time WebSocket metrics
- Edge colorization for load status

---

✅ Deliverable #4 Complete  
Documentation ready for contributors to extend node visuals, types, and live metric feeds.
