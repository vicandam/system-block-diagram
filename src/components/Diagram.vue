<template>
  <div style="flex:1; width:100%; height:100%;" class="w-full h-full flex flex-col" >
    <!-- toolbar -->
    <div class="p-3 flex items-center gap-2 bg-white border-b">
      <button @click="saveLayout" class="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
      <button @click="loadLayout" class="px-3 py-1 bg-gray-200 rounded">Load</button>
      <button @click="exportLayout" class="px-3 py-1 bg-green-600 text-white rounded">Export JSON</button>
      <button @click="triggerImport" class="px-3 py-1 bg-yellow-500 text-white rounded">Import JSON</button>
      <button @click="resetToDefault" class="px-3 py-1 bg-red-500 text-white rounded">Reset</button>
      <div class="ml-auto text-sm text-gray-500">Autosave: on (1s debounce)</div>
      <input ref="fileInput" type="file" accept="application/json" @change="onFileSelected" style="display:none" />
    </div>

    <!-- diagram area -->
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

        <template #node-block="{ data }">
          <div
              :title="data.tooltip"
              class="p-3 w-full h-full bg-white border rounded-xl shadow hover:shadow-md transition-all"
          >
            <div class="font-semibold text-sm">{{ data.label }}</div>
            <div class="text-xs text-gray-500">{{ data.metric ?? '—' }}</div>
            <NodeResizer :min-width="140" :min-height="70" />
          </div>
        </template>
      </VueFlow>
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
import '@vue-flow/core/dist/style.css'

/* --- initial nodes/edges from config --- */
const initialNodes = diagramConfig.nodes.map((n: any) => ({
  id: n.id,
  type: 'block',
  position: { x: n.x, y: n.y },
  data: { label: n.label, tooltip: n.tooltip },
  style: { width: n.width, height: n.height }
})) as Node[]

const initialEdges = diagramConfig.edges as Edge[]

/* reactive */
const nodes = ref<Node[]>(JSON.parse(JSON.stringify(initialNodes)))
const edges = ref<Edge[]>(JSON.parse(JSON.stringify(initialEdges)))

/* Save key + initial snapshot */
const SAVE_KEY = 'diagram_layout_v1'
const initialLayout = {
  nodes: JSON.parse(JSON.stringify(initialNodes)),
  edges: JSON.parse(JSON.stringify(initialEdges))
}

/* autosave debounce */
let autosaveTimer: number | null = null
let isApplyingLoad = false

watch([nodes, edges], () => {
  if (isApplyingLoad) return
  if (autosaveTimer) window.clearTimeout(autosaveTimer)
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

/* manual save */
function saveLayout() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ nodes: nodes.value, edges: edges.value }))
    alert('Layout saved to localStorage')
  } catch (e) {
    console.error(e); alert('Save failed')
  }
}

/* manual load */
function loadLayout() {
  const raw = localStorage.getItem(SAVE_KEY)
  if (!raw) {
    alert('No saved layout found in localStorage')
    return
  }
  try {
    const parsed = JSON.parse(raw)
    isApplyingLoad = true
    nodes.value = parsed.nodes
    edges.value = parsed.edges
    // small timeout to ensure watch doesn't trigger autosave immediately
    setTimeout(() => { isApplyingLoad = false }, 200)
    alert('Layout loaded from localStorage')
  } catch (e) {
    console.error(e); alert('Load failed: invalid data')
  }
}

/* export to file */
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

/* import from file */
const fileInput = ref<HTMLInputElement | null>(null)
function triggerImport() {
  fileInput.value?.click()
}
function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
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
        alert('Layout imported')
      } else {
        alert('Invalid layout file (missing nodes/edges)')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to parse JSON')
    }
    input.value = '' // reset
  }
  reader.readAsText(file)
}

/* reset to initial config */
function resetToDefault() {
  if (!confirm('Reset to original default layout?')) return
  isApplyingLoad = true
  nodes.value = JSON.parse(JSON.stringify(initialLayout.nodes))
  edges.value = JSON.parse(JSON.stringify(initialLayout.edges))
  localStorage.removeItem(SAVE_KEY)
  setTimeout(() => { isApplyingLoad = false }, 200)
  alert('Reset done')
}

/* example metrics updater (keep what you had) */
onMounted(() => {
  setInterval(() => {
    const m: Record<string,string> = {
      auth: '3 sessions',
      bff: '28 req/s',
      grafana: 'live',
      loki: '1.3k logs/min'
    }
    nodes.value = nodes.value.map(n => ({ ...n, data: { ...n.data, metric: m[n.id as keyof typeof m] } }))
  }, 5000)
})
</script>

<style scoped>
/* small tweaks if needed */
</style>
