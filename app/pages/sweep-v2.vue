<script setup>
import { computed, ref } from 'vue'

useHead({ title: 'Parameter Sweep V2 · Atlas Pola' })

const m = ref(0.45)
const Db = ref(0.05)
const kMax = ref(3.0)
const aMin = 0.6
const aMax = 3.5

const ratioMin = 5
const ratioMax = 80
const nx = 42
const ny = 22

function classifyCell(a, ratio) {
  const Dw = ratio * Db.value
  const disc = a * a - 4 * m.value * m.value
  if (disc < 0) return 'desert'

  const B = (a + Math.sqrt(disc)) / (2 * m.value)
  if (B <= 0) return 'desert'

  const j11 = m.value
  const j12 = B * B
  const j21 = -2 * m.value
  const j22 = -1 - B * B

  const tr0 = j11 + j22
  const det0 = j11 * j22 - j12 * j21
  const stableNoDiff = tr0 < 0 && det0 > 0

  let maxLam = -1e9
  for (let k = 0; k <= kMax.value; k += 0.05) {
    const k2 = k * k
    const a11 = j11 - Db.value * k2
    const a22 = j22 - Dw * k2
    const tr = a11 + a22
    const det = a11 * a22 - j12 * j21
    const discK = tr * tr - 4 * det
    const lam = discK >= 0 ? 0.5 * (tr + Math.sqrt(discK)) : 0.5 * tr
    if (lam > maxLam) maxLam = lam
  }

  if (stableNoDiff && maxLam > 0) return 'pattern'
  return stableNoDiff ? 'uniform' : 'unstable'
}

const grid = computed(() => {
  const cells = []
  for (let j = 0; j < ny; j++) {
    const r = ratioMin + (j / (ny - 1)) * (ratioMax - ratioMin)
    for (let i = 0; i < nx; i++) {
      const a = aMin + (i / (nx - 1)) * (aMax - aMin)
      cells.push({ i, j, a, r, cls: classifyCell(a, r) })
    }
  }
  return cells
})

const legend = {
  pattern: '#3fd08a',
  uniform: '#5f86d2',
  desert: '#d06f6f',
  unstable: '#e4c260'
}

const W = 860
const H = 420
const cw = computed(() => W / nx)
const ch = computed(() => H / ny)

const selectedA = ref(2.0)
const selectedR = ref(30)

const selectedInfo = computed(() => {
  const a = Math.min(aMax, Math.max(aMin, selectedA.value))
  const r = Math.min(ratioMax, Math.max(ratioMin, selectedR.value))
  return { a, r, cls: classifyCell(a, r) }
})

const markerX = computed(() => ((selectedInfo.value.a - aMin) / (aMax - aMin)) * W)
const markerY = computed(() => H - ((selectedInfo.value.r - ratioMin) / (ratioMax - ratioMin)) * H)
</script>

<template>
  <div class="min-h-screen bg-transparent text-[#e8edf5] font-body">
    <div class="max-w-[1300px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div class="card">
        <h1 class="text-lg sm:text-xl font-heading font-bold">Parameter Sweep V2: Atlas Pola Kuantitatif</h1>
        <p class="text-xs text-[#9ab0a3] mt-1">Halaman ini menutup gap peta fase parameter (a vs rasio D_w / D_b) untuk indikasi pola spasial.</p>
      </div>

      <div class="card">
        <h2 class="section-title mb-3">Kontrol Sweep</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label>
            <span class="label">m: {{ m.toFixed(2) }}</span>
            <input v-model.number="m" type="range" min="0.1" max="1.0" step="0.01" class="slider slider-amber">
          </label>
          <label>
            <span class="label">D_b: {{ Db.toFixed(3) }}</span>
            <input v-model.number="Db" type="range" min="0.005" max="0.30" step="0.001" class="slider slider-slate">
          </label>
          <label>
            <span class="label">k_max untuk cek λ(k): {{ kMax.toFixed(2) }}</span>
            <input v-model.number="kMax" type="range" min="1.0" max="6.0" step="0.1" class="slider slider-slate">
          </label>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title mb-3">Atlas Warna: a vs D_w / D_b</h2>
        <svg :viewBox="`0 0 ${W} ${H + 34}`" class="w-full bg-[#0b1712] border border-[#21362b] rounded-lg" preserveAspectRatio="none">
          <rect v-for="cell in grid" :key="`${cell.i}-${cell.j}`"
            :x="cell.i * cw" :y="H - (cell.j + 1) * ch" :width="cw + 0.4" :height="ch + 0.4"
            :fill="legend[cell.cls]" opacity="0.78"/>

          <line v-for="i in 6" :key="`vx-${i}`" :x1="W * i / 6" :x2="W * i / 6" y1="0" :y2="H" stroke="#1d2d26" stroke-width="0.8"/>
          <line v-for="i in 6" :key="`vy-${i}`" x1="0" :x2="W" :y1="H * i / 6" :y2="H * i / 6" stroke="#1d2d26" stroke-width="0.8"/>

          <circle :cx="markerX" :cy="markerY" r="6" fill="#f5f7f6" stroke="#111" stroke-width="1.6"/>
          <text x="8" y="13" class="axis">Rasio D_w / D_b</text>
          <text :x="W / 2" :y="H + 24" class="axis" text-anchor="middle">Curah hujan a</text>
        </svg>

        <div class="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="legend-item"><span class="dot" :style="{ background: legend.pattern }"/> Pattern</div>
            <div class="legend-item"><span class="dot" :style="{ background: legend.uniform }"/> Uniform stabil</div>
            <div class="legend-item"><span class="dot" :style="{ background: legend.desert }"/> Desert only</div>
            <div class="legend-item"><span class="dot" :style="{ background: legend.unstable }"/> Unstable campuran</div>
          </div>

          <div class="space-y-2">
            <label>
              <span class="label">a uji: {{ selectedA.toFixed(2) }}</span>
              <input v-model.number="selectedA" type="range" :min="aMin" :max="aMax" step="0.01" class="slider slider-green">
            </label>
            <label>
              <span class="label">Rasio uji D_w / D_b: {{ selectedR.toFixed(1) }}</span>
              <input v-model.number="selectedR" type="range" :min="ratioMin" :max="ratioMax" step="0.5" class="slider slider-slate">
            </label>
            <p class="text-sm">Status titik uji: <span class="font-data" :style="{ color: legend[selectedInfo.cls] }">{{ selectedInfo.cls }}</span></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-heading { font-family: 'Space Grotesk', system-ui, sans-serif; }
.font-body { font-family: 'Space Grotesk', system-ui, sans-serif; }
.font-data { font-family: 'JetBrains Mono', monospace; }

.card { background: #0d1713; border-radius: 0.8rem; border: 1px solid #1f3229; padding: 1.15rem; box-shadow: 4px 4px 0 0 #08110d; }
.section-title { font-size: 0.68rem; font-weight: 700; color: #83a592; text-transform: uppercase; letter-spacing: 0.1em; }
.label { display: inline-block; margin-bottom: 6px; font-size: 11px; color: #a6bcb0; }
.axis { fill: #6f8a7a; font-size: 10px; font-family: 'JetBrains Mono', monospace; }
.legend-item { display: flex; align-items: center; gap: 8px; color: #bdd0c5; }
.dot { width: 12px; height: 12px; border-radius: 2px; display: inline-block; border: 1px solid #0f1814; }

.slider { width: 100%; height: 5px; border-radius: 999px; appearance: none; -webkit-appearance: none; cursor: pointer; background: #122019; }
.slider::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 16px; height: 16px; border-radius: 999px; border: 2px solid #08110d; }
.slider-green::-webkit-slider-thumb { background: #3fd08a; }
.slider-amber::-webkit-slider-thumb { background: #e4c260; }
.slider-slate::-webkit-slider-thumb { background: #7a8f85; }
</style>
