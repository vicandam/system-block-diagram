<template>
  <div class="flex flex-col w-full h-full" style="width:100%; height:100%;">
    <!-- Toolbar -->
    <div class="p-3 flex items-center gap-2 bg-white border-b">
<!--      <select v-model="selectedDiagram" class="border rounded px-2 py-1">-->
<!--        <option disabled value="">&#45;&#45; Select Diagram &#45;&#45;</option>-->
<!--        <option v-for="d in diagramsList" :key="d.id" :value="d.id">{{ d.name }}</option>-->
<!--      </select>-->
      <select
          v-model="selectedDiagram"
          class="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
      >
        <option disabled value="">-- Select Diagram --</option>
        <option v-for="d in diagramsList" :key="d.id" :value="d.id">{{ d.name }}</option>
      </select>

      <button @click="saveToCloud" class="px-3 py-1 bg-blue-600 text-white rounded">Save to Cloud</button>
      <button @click="loadFromCloud" class="px-3 py-1 bg-gray-200 rounded">Load from Cloud</button>
      <button @click="resetToDefault" class="px-3 py-1 bg-red-500 text-white rounded">Reset</button>
      <div class="ml-auto text-sm text-gray-500">Cloud persistence via Supabase</div>
    </div>

    <!-- Diagram -->
    <div class="flex-1 w-full h-full" style="width:100%; height:100%;">
      <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          fit-view
          style="width:100%; height:100%;"
          class="w-full h-full"
      >
        <Background />
<!--        <MiniMap />-->
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

    <!-- Legend -->
    <div class="absolute bottom-4 right-4 bg-white/80 p-3 rounded shadow text-sm">
      <div class="font-semibold mb-1">Legend</div>
      <div class="flex flex-col gap-1">
        <div><span class="inline-block w-3 h-3 bg-green-500 mr-1"></span>Infra</div>
        <div><span class="inline-block w-3 h-3 bg-blue-500 mr-1"></span>Backend / API</div>
        <div><span class="inline-block w-3 h-3 bg-purple-500 mr-1"></span>Monitoring</div>
        <div><span class="inline-block w-3 h-3 bg-orange-500 mr-1"></span>Frontend / UI</div>
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
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { NodeResizer } from '@vue-flow/node-resizer'
import '@vue-flow/core/dist/style.css'
import { supabase } from '@/lib/supabase'
import diagramConfig from '../data/diagramConfig.json'
import type { Node, Edge } from '@vue-flow/core'

// import { ref, onMounted } from 'vue'
// import diagramConfig from '../data/diagramConfig.json'
// import { VueFlow, type Node, type Edge } from '@vue-flow/core'
// import { Background } from '@vue-flow/background'
// import { Controls } from '@vue-flow/controls'
// import { MiniMap } from '@vue-flow/minimap'
// import { NodeResizer } from '@vue-flow/node-resizer'
// import { supabase } from '@/lib/supabase'
// import '@vue-flow/core/dist/style.css'

/* --- Tooltip --- */
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

/* --- Node Style --- */
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

/* --- Initial Diagram Data --- */
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

/* --- Supabase Cloud Persistence --- */
const diagramsList = ref<any[]>([])
const selectedDiagram = ref<string>('')

onMounted(() => fetchDiagrams())

async function fetchDiagrams() {
  const { data, error } = await supabase
      .from('diagrams')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
  if (!error && data) diagramsList.value = data
}

async function saveToCloud() {
  const layout = { nodes: nodes.value, edges: edges.value }
  if (selectedDiagram.value) {
    const { error } = await supabase
        .from('diagrams')
        .update({ json: layout, updated_at: new Date() })
        .eq('id', selectedDiagram.value)
    if (error) alert('Update failed: ' + error.message)
    else alert('Updated existing diagram ✅')
  } else {
    const name = prompt('Enter new diagram name:')
    if (!name) return
    const { data, error } = await supabase
        .from('diagrams')
        .insert([{ name, json: layout }])
        .select()
    if (error) alert('Save failed: ' + error.message)
    else {
      alert('Saved new diagram ✅')
      await fetchDiagrams()
      selectedDiagram.value = data[0].id
    }
  }
}

async function loadFromCloud() {
  if (!selectedDiagram.value) return alert('Select a diagram first!')
  const { data, error } = await supabase
      .from('diagrams')
      .select('json')
      .eq('id', selectedDiagram.value)
      .single()
  if (error) return alert('Load failed: ' + error.message)
  if (data?.json) {
    nodes.value = data.json.nodes
    edges.value = data.json.edges
    alert('Loaded from cloud ☁️')
  }
}

/* --- Reset Diagram --- */
function resetToDefault() {
  if (!confirm('Reset to original default layout?')) return
  nodes.value = JSON.parse(JSON.stringify(initialNodes))
  edges.value = JSON.parse(JSON.stringify(initialEdges))
  alert('Reset done')
}

/* --- Live Metric Auto-Refresh --- */
function generateRandomMetrics() {
  const metrics = [
    () => `${Math.floor(Math.random() * 150)} req/s`,
    () => `${(Math.random() * 500).toFixed(0)} ms avg`,
    () => `${Math.floor(Math.random() * 50)} sessions`,
    () => `${(Math.random() * 2).toFixed(1)} k logs/min`,
  ]
  return metrics[Math.floor(Math.random() * metrics.length)]()
}

onMounted(() => {
  setInterval(() => {
    nodes.value = nodes.value.map(node => ({
      ...node,
      data: {
        ...node.data,
        metric: generateRandomMetrics(),
      },
    }))
  }, 5000)
})
</script>

<style scoped>
/* optional custom styles */
</style>
