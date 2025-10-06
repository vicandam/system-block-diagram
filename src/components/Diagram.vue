<template>
  <div style="flex:1; width:100%; height:100%;" class="w-full h-full flex flex-col">
    <!-- Toolbar -->
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

    <!-- Diagram Area -->
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
        <Controls /> <!-- ✅ Fit View, Zoom In/Out, Lock -->

        <template #node-block="{ data }">
          <div
              :title="data.tooltip"
              class="p-3 w-full h-full border rounded-xl shadow hover:shadow-md transition-all text-white"
              :style="getNodeStyle(data.type)"
          >
            <div class="font-semibold text-sm">{{ data.label }}</div>
            <div class="text-xs opacity-80">{{ data.metric ?? '—' }}</div>
            <NodeResizer :min-width="140" :min-height="70" />
          </div>
        </template>
      </VueFlow>
    </div>

    <!-- Legend -->
    <div class="absolute bottom-24 right-4 bg-white/80 p-3 rounded shadow text-sm">
      <div class="font-semibold mb-1">Legend</div>
      <div class="flex flex-col gap-1">
        <div><span class="inline-block w-3 h-3 bg-green-500 mr-1"></span>Infra</div>
        <div><span class="inline-block w-3 h-3 bg-blue-500 mr-1"></span>Backend /API</div>
        <div><span class="inline-block w-3 h-3 bg-purple-500 mr-1"></span>Monitoring</div>
        <div><span class="inline-block w-3 h-3 bg-orange-500 mr-1"></span>Frontend /UI</div>
      </div>
    </div>

    <!-- Tooltip -->
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
import { ref, onMounted, watch } from 'vue'
import diagramConfig from '../data/diagramConfig.json'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { NodeResizer } from '@vue-flow/node-resizer'
import type { Node, Edge } from '@vue-flow/core'
import { supabase } from '@/lib/supabase'

// ✅ CSS imports for Vue Flow modules
import '@vue-flow/core/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import '@vue-flow/node-resizer/dist/style.css'

/* -------------------
   Diagram State Setup
------------------- */
const diagramsList = ref<any[]>([])
const selectedDiagram = ref<string>('')

/* --- Node Colors --- */
function getNodeStyle(type?: string) {
  const colors: Record<string,string> = {
    infra: '#22c55e',
    backend: '#3b82f6',
    monitoring: '#a855f7',
    frontend: '#f97316',
    default: '#6b7280'
  }
  const color = colors[type ?? 'default']
  return { backgroundColor: color, color: 'white' }
}

/* --- Tooltip logic --- */
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

/* --- Load initial config --- */
const initialNodes = diagramConfig.nodes.map((n: any) => ({
  id: n.id,
  type: 'block',
  position: { x: n.x, y: n.y },
  data: { label: n.label, tooltip: n.tooltip, type: n.type },
  style: { width: n.width, height: n.height }
})) as Node[]

const initialEdges = diagramConfig.edges as Edge[]

const nodes = ref<Node[]>(JSON.parse(JSON.stringify(initialNodes)))
const edges = ref<Edge[]>(JSON.parse(JSON.stringify(initialEdges)))

/* --- Local autosave setup --- */
const SAVE_KEY = 'diagram_layout_v1'
let autosaveTimer: number | null = null
let isApplyingLoad = false

watch([nodes, edges], () => {
  if (isApplyingLoad) return
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = window.setTimeout(() => {
    try {
      const payload = { nodes: nodes.value, edges: edges.value }
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
      console.log('[diagram] autosaved layout')
    } catch (e) {
      console.error('[diagram] autosave error', e)
    }
  }, 1000)
}, { deep: true })

/* --- Manual save/load --- */
function saveLayout() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ nodes: nodes.value, edges: edges.value }))
  alert('Layout saved to localStorage')
}

function loadLayout() {
  const raw = localStorage.getItem(SAVE_KEY)
  if (!raw) return alert('No saved layout found')
  const parsed = JSON.parse(raw)
  isApplyingLoad = true
  nodes.value = parsed.nodes
  edges.value = parsed.edges
  setTimeout(() => { isApplyingLoad = false }, 200)
  alert('Layout loaded')
}

/* --- Export layout as JSON file --- */
function exportLayout() {
  const data = JSON.stringify({ nodes: nodes.value, edges: edges.value }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'diagram-layout.json'
  a.click()
  URL.revokeObjectURL(url)
}

/* --- Import layout from JSON --- */
const fileInput = ref<HTMLInputElement | null>(null)
function triggerImport() { fileInput.value?.click() }

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result))
      if (parsed.nodes && parsed.edges) {
        isApplyingLoad = true
        nodes.value = parsed.nodes
        edges.value = parsed.edges
        setTimeout(() => { isApplyingLoad = false }, 200)
        alert('Layout imported ✅')
      } else alert('Invalid file: missing nodes/edges')
    } catch (err) {
      console.error(err)
      alert('Failed to parse JSON')
    }
    input.value = ''
  }
  reader.readAsText(file)
}

/* --- Reset layout --- */
function resetToDefault() {
  if (!confirm('Reset to original default layout?')) return
  isApplyingLoad = true
  nodes.value = JSON.parse(JSON.stringify(initialNodes))
  edges.value = JSON.parse(JSON.stringify(initialEdges))
  localStorage.removeItem(SAVE_KEY)
  setTimeout(() => { isApplyingLoad = false }, 200)
  alert('Layout reset')
}

/* --- Supabase Cloud Sync --- */
async function fetchDiagrams() {
  const { data, error } = await supabase.from('diagrams').select('id, name, created_at').order('created_at', { ascending: false })
  if (!error && data) diagramsList.value = data
}

async function saveToCloud() {
  const layout = { nodes: nodes.value, edges: edges.value }
  if (selectedDiagram.value) {
    const { error } = await supabase.from('diagrams').update({ json: layout, updated_at: new Date() }).eq('id', selectedDiagram.value)
    if (error) alert('Update failed: ' + error.message)
    else alert('Diagram updated ☁️')
  } else {
    const name = prompt('Enter diagram name:')
    if (!name) return
    const { data, error } = await supabase.from('diagrams').insert([{ name, json: layout }]).select()
    if (error) alert('Save failed: ' + error.message)
    else {
      alert('Diagram saved ☁️')
      await fetchDiagrams()
      selectedDiagram.value = data[0].id
    }
  }
}

async function loadFromCloud() {
  if (!selectedDiagram.value) return alert('Select a diagram first!')
  const { data, error } = await supabase.from('diagrams').select('json').eq('id', selectedDiagram.value).single()
  if (error) return alert('Load failed: ' + error.message)
  if (data?.json) {
    nodes.value = data.json.nodes
    edges.value = data.json.edges
    alert('Loaded from cloud ✅')
  }
}

/* --- Metric auto-refresh --- */
function generateRandomMetrics() {
  const metrics = [
    () => `${Math.floor(Math.random() * 150)} req/s`,
    () => `${(Math.random() * 500).toFixed(0)} ms avg`,
    () => `${Math.floor(Math.random() * 50)} sessions`,
    () => `${(Math.random() * 2).toFixed(1)}k logs/min`
  ]
  return metrics[Math.floor(Math.random() * metrics.length)]()
}

onMounted(() => {
  fetchDiagrams()
  setInterval(() => {
    nodes.value = nodes.value.map(n => ({
      ...n,
      data: { ...n.data, metric: generateRandomMetrics() }
    }))
  }, 5000)
})
</script>

<style scoped>
.vue-flow__controls {
  z-index: 50 !important;
}
</style>
