<script setup>
import { computed, ref } from 'vue'

useHead({ title: 'Histeresis V2 · Forward-Backward Rainfall' })

const m = ref(0.45)
const aLow = ref(0.7)
const aHigh = ref(2.6)
const steps = ref(26)
const settleT = ref(28)
const dt = ref(0.03)

function rk4Step(B, R, a, mVal, h) {
  const fB = (b, r) => -mVal * b + r * b * b
  const fR = (b, r) => a - r - r * b * b

  const k1B = fB(B, R)
  const k1R = fR(B, R)
  const k2B = fB(B + 0.5 * h * k1B, R + 0.5 * h * k1R)
  const k2R = fR(B + 0.5 * h * k1B, R + 0.5 * h * k1R)
  const k3B = fB(B + 0.5 * h * k2B, R + 0.5 * h * k2R)
  const k3R = fR(B + 0.5 * h * k2B, R + 0.5 * h * k2R)
  const k4B = fB(B + h * k3B, R + h * k3R)
  const k4R = fR(B + h * k3B, R + h * k3R)

  return {
    B: Math.max(0, B + (h / 6) * (k1B + 2 * k2B + 2 * k3B + k4B)),
    R: Math.max(0, R + (h / 6) * (k1R + 2 * k2R + 2 * k3R + k4R))
  }
}

function settleAtA(B0, R0, aVal) {
  let B = B0
  let R = R0
  const n = Math.ceil(settleT.value / dt.value)
  for (let i = 0; i < n; i++) {
    const next = rk4Step(B, R, aVal, m.value, dt.value)
    B = next.B
    R = next.R
  }
  return { B, R }
}

const curves = computed(() => {
  const n = Math.max(6, steps.value)
  const aVals = []
  for (let i = 0; i < n; i++) {
    aVals.push(aHigh.value - (i / (n - 1)) * (aHigh.value - aLow.value))
  }

  let fState = { B: 2.2, R: 1.0 }
  const forward = []
  for (const aVal of aVals) {
    fState = settleAtA(fState.B, fState.R, aVal)
    forward.push({ a: aVal, B: fState.B })
  }

  const aValsBack = [...aVals].reverse()
  let bState = { B: forward[forward.length - 1].B, R: aValsBack[0] }
  const backward = []
  for (const aVal of aValsBack) {
    bState = settleAtA(bState.B, bState.R, aVal)
    backward.push({ a: aVal, B: bState.B })
  }

  return { forward, backward }
})

const hysteresisArea = computed(() => {
  const f = curves.value.forward
  const b = curves.value.backward
  let area = 0
  const n = Math.min(f.length, b.length)
  for (let i = 1; i < n; i++) {
    const da = Math.abs(f[i].a - f[i - 1].a)
    const gap = Math.abs((f[i].B + f[i - 1].B) / 2 - (b[n - i - 1].B + b[n - i].B) / 2)
    area += da * gap
  }
  return area
})

const Wsvg = 780
const Hsvg = 280

function toSvg(a, B, bMax) {
  const x = ((a - aLow.value) / (aHigh.value - aLow.value)) * Wsvg
  const y = Hsvg - (B / bMax) * (Hsvg - 8) - 4
  return { x, y }
}

const bMax = computed(() => {
  const vals = [...curves.value.forward.map(p => p.B), ...curves.value.backward.map(p => p.B)]
  return Math.max(1, ...vals) * 1.05
})

function pathFrom(points, maxB) {
  if (points.length < 2) return ''
  return 'M' + points.map((p) => {
    const c = toSvg(p.a, p.B, maxB)
    return `${c.x.toFixed(2)},${c.y.toFixed(2)}`
  }).join('L')
}

const forwardPath = computed(() => pathFrom(curves.value.forward, bMax.value))
const backwardPath = computed(() => pathFrom(curves.value.backward, bMax.value))
</script>

<template>
  <div class="min-h-screen bg-transparent text-[#e8edf5] font-body">
    <div class="max-w-[1260px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div class="card">
        <h1 class="text-lg sm:text-xl font-heading font-bold">Histeresis V2: Uji Forward-Backward Curah Hujan</h1>
        <p class="text-xs text-[#9ab0a3] mt-1">Halaman ini membuktikan multistability secara numerik dengan lintasan turun-naik parameter a.</p>
      </div>

      <div class="card">
        <h2 class="section-title mb-3">Parameter Eksperimen</h2>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <label>
            <span class="label">m: {{ m.toFixed(2) }}</span>
            <input v-model.number="m" type="range" min="0.1" max="1.0" step="0.01" class="slider slider-amber">
          </label>
          <label>
            <span class="label">a rendah: {{ aLow.toFixed(2) }}</span>
            <input v-model.number="aLow" type="range" min="0.5" max="2.0" step="0.01" class="slider slider-slate">
          </label>
          <label>
            <span class="label">a tinggi: {{ aHigh.toFixed(2) }}</span>
            <input v-model.number="aHigh" type="range" min="1.6" max="3.5" step="0.01" class="slider slider-green">
          </label>
          <label>
            <span class="label">Jumlah titik a: {{ steps }}</span>
            <input v-model.number="steps" type="range" min="12" max="60" step="1" class="slider slider-slate">
          </label>
          <label>
            <span class="label">Waktu settle per titik: {{ settleT }}</span>
            <input v-model.number="settleT" type="range" min="8" max="80" step="1" class="slider slider-slate">
          </label>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title mb-3">Kurva Histeresis (B terhadap a)</h2>
        <svg :viewBox="`0 0 ${Wsvg} ${Hsvg + 34}`" class="w-full bg-[#0b1712] border border-[#21362b] rounded-lg" preserveAspectRatio="none">
          <line v-for="i in 5" :key="`gh-${i}`" :x1="0" :x2="Wsvg" :y1="Hsvg * i / 6" :y2="Hsvg * i / 6" stroke="#1c2d25" stroke-width="0.8"/>
          <path :d="forwardPath" fill="none" stroke="#5f86d2" stroke-width="2.6"/>
          <path :d="backwardPath" fill="none" stroke="#e4c260" stroke-width="2.6"/>
          <text x="7" y="13" class="axis">B*</text>
          <text :x="Wsvg / 2" :y="Hsvg + 24" class="axis" text-anchor="middle">Parameter curah hujan a</text>
        </svg>

        <div class="mt-3 flex flex-wrap gap-4 text-sm">
          <span class="legend"><span class="line line-blue"/> Forward (a tinggi ke rendah)</span>
          <span class="legend"><span class="line line-amber"/> Backward (a rendah ke tinggi)</span>
          <span class="legend">Luas loop histeresis: <span class="font-data text-[#3fd08a]">{{ hysteresisArea.toFixed(6) }}</span></span>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title mb-2">Interpretasi Presentasi</h2>
        <p class="text-sm text-[#9ab0a3] leading-relaxed">Jika kurva forward dan backward tidak berimpit, maka sistem bergantung lintasan (path dependence). Ini adalah bukti numerik praktis untuk multistability dan mekanisme evade tipping point.</p>
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
.legend { color: #c5d5cc; display: inline-flex; align-items: center; gap: 8px; }
.line { width: 20px; height: 2px; display: inline-block; }
.line-blue { background: #5f86d2; }
.line-amber { background: #e4c260; }

.slider { width: 100%; height: 5px; border-radius: 999px; appearance: none; -webkit-appearance: none; cursor: pointer; background: #122019; }
.slider::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 16px; height: 16px; border-radius: 999px; border: 2px solid #08110d; }
.slider-green::-webkit-slider-thumb { background: #3fd08a; }
.slider-amber::-webkit-slider-thumb { background: #e4c260; }
.slider-slate::-webkit-slider-thumb { background: #7a8f85; }
</style>
