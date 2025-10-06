<!--<template #node-block="{ data }">-->
<!--  <div-->
<!--      :title="data.tooltip"-->
<!--      class="p-3 w-full h-full border rounded-xl shadow hover:shadow-md transition-all text-white"-->
<!--      :style="getNodeStyle(data.type)"-->
<!--      @mouseenter="showTooltip(data)"-->
<!--      @mouseleave="hideTooltip"-->
<!--  >-->
<!--    <div class="font-semibold text-sm">{{ data.label }}</div>-->
<!--    <div class="text-xs opacity-80">{{ data.metric ?? '—' }}</div>-->
<!--    <NodeResizer :min-width="140" :min-height="70" />-->
<!--  </div>-->


<!--  &lt;!&ndash; legend &ndash;&gt;-->
<!--  <div class="absolute bottom-4 right-4 bg-white/80 p-3 rounded shadow text-sm">-->
<!--    <div class="font-semibold mb-1">Legend</div>-->
<!--    <div class="flex flex-col gap-1">-->
<!--      <div><span class="inline-block w-3 h-3 bg-green-500 mr-1"></span>Infra</div>-->
<!--      <div><span class="inline-block w-3 h-3 bg-blue-500 mr-1"></span>Backend /API</div>-->
<!--      <div><span class="inline-block w-3 h-3 bg-purple-500 mr-1"></span>Monitoring</div>-->
<!--      <div><span class="inline-block w-3 h-3 bg-orange-500 mr-1"></span>Frontend /UI</div>-->
<!--    </div>-->
<!--  </div>-->

<!--  &lt;!&ndash; tooltip &ndash;&gt;-->
<!--  <div-->
<!--      v-if="tooltip.visible"-->
<!--      class="fixed z-50 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow"-->
<!--      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"-->
<!--  >-->
<!--    {{ tooltip.text }}-->
<!--  </div>-->
<!--</template>-->



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

    <!-- legend -->
    <div class="absolute bottom-4 right-4 bg-white/80 p-3 rounded shadow text-sm">
      <div class="font-semibold mb-1">Legend</div>
      <div class="flex flex-col gap-1">
        <div><span class="inline-block w-3 h-3 bg-green-500 mr-1"></span>Infra</div>
        <div><span class="inline-block w-3 h-3 bg-blue-500 mr-1"></span>Backend /API</div>
        <div><span class="inline-block w-3 h-3 bg-purple-500 mr-1"></span>Monitoring</div>
        <div><span class="inline-block w-3 h-3 bg-orange-500 mr-1"></span>Frontend /UI</div>
      </div>
    </div>

    <!-- tooltip -->
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
import '@vue-flow/core/dist/style.css'

/* --- UI Enhancements --- */
function getNodeStyle(type?: string) {
  const colors: Record<string,string> = {
    infra: '#22c55e',      // green-500
    backend: '#3b82f6',    // blue-500
    monitoring: '#a855f7', // purple-500
    frontend: '#f97316',   // orange-500
    default: '#6b7280'     // gray-500
  }
  const color = colors[type ?? 'default']
  return { backgroundColor: color, color: 'white' }
}

/* Tooltip reactive state */
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

/* --- initial nodes/edges from config --- */
const initialNodes = diagramConfig.nodes.map((n: any) => ({
  id: n.id,
  type: 'block',
  position: { x: n.x, y: n.y },
  data: { label: n.label, tooltip: n.tooltip, type: n.type },
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
