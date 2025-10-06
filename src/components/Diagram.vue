<template>
  <div style="flex:1; width:100%; height:100%;" class="w-full h-full flex flex-col">
    <!-- ▪ Toolbar -->
    <div class="p-3 flex items-center gap-2 bg-white border-b">
      <button @click="saveLayout" class="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
      <button @click="loadLayout" class="px-3 py-1 bg-gray-200 rounded">Load</button>

      <select v-model="selectedDiagram" class="border rounded px-2 py-1">
        <option disabled value="">-- Select Diagram --</option>
        <option v-for="d in diagramsList" :key="d.id" :value="d.id">{{ d.name }}</option>
      </select>
      <button @click="saveToCloud" class="text-blue-600">Save to Cloud</button>
      <button @click="loadFromCloud" class="text-blue-600">Load from Cloud</button>

      <button @click="exportLayout" class="px-3 py-1 bg-green-600 text-white rounded">Export JSON</button>
      <button @click="triggerImport" class="px-3 py-1 bg-yellow-500 text-white rounded">Import JSON</button>
      <button @click="resetToDefault" class="px-3 py-1 bg-red-500 text-white rounded">Reset</button>

      <div class="ml-auto text-sm text-gray-500">Autosave: on (1s debounce)</div>
      <input ref="fileInput" type="file" accept="application/json" @change="onFileSelected" style="display:none" />
    </div>

    <!-- ▪ Diagram Area -->
    <div style="flex:1; width:100%; height:100%;">
      <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          fit-view
          style="width:100%; height:100%;"
          class="w-full h-full"
      >
        <Background />
        <MiniMap />
        <Controls />

        <!-- ▪ Custom Node Template -->
        <!-- Extend this block to include icons, dynamic badges, etc. -->
        <template #node-block="{ data }">
          <div
              :title="data.tooltip"
              class="p-3 w-full h-full border rounded-xl shadow hover:shadow-md transition-all text-white"
              :style="getNodeStyle(data.type)"
              @mouseenter="showTooltip(data)"
              @mouseleave="hideTooltip"
          >
            <div class="font-semibold text-sm">{{ data.label }}</div>
            <div class="text-xs opacity-80">{{ data.metric ?? '—' }}</div>
            <NodeResizer :min-width="140" :min-height="70" />
          </div>
        </template>
      </VueFlow>
    </div>

    <!-- ▪ Legend -->
    <div class="absolute bottom-4 right-4 bg-white/80 p-3 rounded shadow text-sm">
      <div class="font-semibold mb-1">Legend</div>
      <div class="flex flex-col gap-1">
        <div><span class="inline-block w-3 h-3 bg-green-500 mr-1"></span>Infra</div>
        <div><span class="inline-block w-3 h-3 bg-blue-500 mr-1"></span>Backend /API</div>
        <div><span class="inline-block w-3 h-3 bg-purple-500 mr-1"></span>Monitoring</div>
        <div><span class="inline-block w-3 h-3 bg-orange-500 mr-1"></span>Frontend /UI</div>
      </div>
    </div>

    <!-- ▪ Tooltip -->
    <div
        v-if="tooltip.visible"
        class="fixed z-50 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      {{ tooltip.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * -------------------------------------------------------------
 * Diagram.vue — Interactive Infrastructure Diagram
 * -------------------------------------------------------------
 * Features:
 *  • Drag-and-drop nodes, resize blocks, zoom/pan
 *  • Local + cloud save (Supabase)
 *  • Mock metric auto-refresh (5s)
 *  • Tooltip hover interactivity
 *  • Config-based node/edge definition
 *
 * 🔧 Developer Notes:
 *  - To add new node types → see getNodeStyle() and diagramConfig.json
 *  - To integrate real data → replace generateRandomMetrics()
 *  - To modify autosave behavior → see watch([nodes, edges])
 */

import { ref, onMounted, watch } from 'vue'
import diagramConfig from '../data/diagramConfig.json'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { NodeResizer } from '@vue-flow/node-resizer'
import type { Node, Edge } from '@vue-flow/core'
import { supabase } from '@/lib/supabase'
import '@vue-flow/core/dist/style.css'

/* ──────────────────────────────────────────────
   📦 Reactive State
───────────────────────────────────────────────*/
const diagramsList = ref<any[]>([])
const selectedDiagram = ref<string>('')

/* ──────────────────────────────────────────────
   🎨 Node Appearance Mapping
───────────────────────────────────────────────*/
/**
 * Add new node type colors here.
 * Example: { type: 'cache', color: '#0ea5e9' }
 */
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

/* ──────────────────────────────────────────────
   💬 Tooltip System
───────────────────────────────────────────────*/
const tooltip = ref({ visible: false, text: '', x: 0, y: 0 })
function showTooltip(data: any) {
  tooltip.value.text = data.tooltip
  tooltip.value.visible = true
  document.addEventListener('mousemove', moveTooltip)
}
function hideTooltip() {
  tooltip.value.visible = false
  document.removeEventListener('mousemove', moveTooltip)
}
function moveTooltip(e: MouseEvent) {
  tooltip.value.x = e.pageX + 10
  tooltip.value.y = e.pageY + 10
}

/* ──────────────────────────────────────────────
   🧱 Base Node + Edge Configuration
   (from /data/diagramConfig.json)
───────────────────────────────────────────────*/
const initialNodes = diagramConfig.nodes.map((n: any) => ({
  id: n.id,
  type: 'block',
  position: { x: n.x, y: n.y },
  data: { label: n.label, tooltip: n.tooltip, type: n.type },
  style: { width: n.width, height: n.height },
})) as Node[]
const initialEdges = diagramConfig.edges as Edge[]

const nodes = ref<Node[]>(JSON.parse(JSON.stringify(initialNodes)))
const edges = ref<Edge[]>(JSON.parse(JSON.stringify(initialEdges)))

/* ──────────────────────────────────────────────
   💾 Local Storage Autosave
───────────────────────────────────────────────*/
const SAVE_KEY = 'diagram_layout_v1'
let autosaveTimer: number | null = null
let isApplyingLoad = false

watch([nodes, edges], () => {
  if (isApplyingLoad) return
  if (autosaveTimer) window.clearTimeout(autosaveTimer)
  autosaveTimer = window.setTimeout(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ nodes: nodes.value, edges: edges.value }))
    console.log('[diagram] autosaved layout')
  }, 1000)
}, { deep: true })

/* Manual Save + Load */
function saveLayout() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ nodes: nodes.value, edges: edges.value }))
  alert('Layout saved locally')
}
function loadLayout() {
  const raw = localStorage.getItem(SAVE_KEY)
  if (!raw) return alert('No saved layout found')
  const parsed = JSON.parse(raw)
  isApplyingLoad = true
  nodes.value = parsed.nodes
  edges.value = parsed.edges
  setTimeout(() => { isApplyingLoad = false }, 200)
  alert('Layout loaded from localStorage')
}

/* ──────────────────────────────────────────────
   ☁ Supabase Cloud Sync
───────────────────────────────────────────────*/
async function fetchDiagrams() {
  const { data } = await supabase.from('diagrams').select('id, name, created_at').order('created_at', { ascending: false })
  if (data) diagramsList.value = data
}

async function saveToCloud() {
  const layout = { nodes: nodes.value, edges: edges.value }
  if (selectedDiagram.value) {
    await supabase.from('diagrams').update({ json: layout, updated_at: new Date() }).eq('id', selectedDiagram.value)
    alert('Updated existing diagram ✅')
  } else {
    const name = prompt('Enter new diagram name:')
    if (!name) return
    const { data } = await supabase.from('diagrams').insert([{ name, json: layout }]).select()
    alert('Saved new diagram ☁️')
    await fetchDiagrams()
    selectedDiagram.value = data?.[0]?.id
  }
}

async function loadFromCloud() {
  if (!selectedDiagram.value) return alert('Select a diagram first!')
  const { data } = await supabase.from('diagrams').select('json').eq('id', selectedDiagram.value).single()
  if (data?.json) {
    nodes.value = data.json.nodes
    edges.value = data.json.edges
    alert('Loaded from cloud ☁️')
  }
}

/* ──────────────────────────────────────────────
   📈 Mock Metric Poller (every 5s)
───────────────────────────────────────────────*/
/**
 * Generates random mock metrics to simulate live performance data.
 * Replace this with real API/WebSocket feed for production.
 */
function generateRandomMetrics() {
  const samples = [
    () => `${Math.floor(Math.random() * 150)} req/s`,
    () => `${(Math.random() * 500).toFixed(0)} ms avg`,
    () => `${Math.floor(Math.random() * 50)} sessions`,
    () => `${(Math.random() * 2).toFixed(1)} k logs/min`,
  ]
  return samples[Math.floor(Math.random() * samples.length)]()
}

onMounted(() => {
  fetchDiagrams()
  setInterval(() => {
    nodes.value = nodes.value.map(node => ({
      ...node,
      data: { ...node.data, metric: generateRandomMetrics() },
    }))
  }, 5000)
})

/**
 * Example JSON structure for adding new nodes:
 *
 * {
 *   "nodes": [
 *     {
 *       "id": "api",
 *       "x": 300,
 *       "y": 100,
 *       "width": 200,
 *       "height": 100,
 *       "label": "API Gateway",
 *       "tooltip": "Handles requests",
 *       "type": "backend"
 *     }
 *   ],
 *   "edges": [
 *     { "id": "e1-2", "source": "auth", "target": "api" }
 *   ]
 * }
 */
</script>

<style scoped>
/* Reserved for minimal component tweaks */
</style>
