<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'

useHead({ title: 'Runge-Kutta V2 · Metodologi dan Validasi' })

const a = ref(2.0)
const m = ref(0.45)
const tEnd = ref(80)
const dt = ref(0.02)

const scenarios = ref([
  { name: 'IC-A (Vegetasi Tinggi)', B0: 2.2, R0: 0.9, color: '#3fd08a' },
  { name: 'IC-B (Vegetasi Rendah)', B0: 0.15, R0: 2.1, color: '#f1c35f' },
  { name: 'IC-C (Dekat Gurun)', B0: 0.05, R0: 1.4, color: '#74a0e8' }
])

const proofGrid = ref(5)
const proofT = ref(45)
const proofDt = ref(0.04)
const aSweepSpan = ref(0.9)
const aSweepSteps = ref(9)

const aVideoMin = ref(0.6)
const aVideoMax = ref(3.4)
const aVideoSteps = ref(60)
const videoT = ref(40)
const videoDt = ref(0.03)
const playSpeedMs = ref(180)
const playIndex = ref(0)
const isPlaying = ref(false)
const focusScenario = ref('IC-A (Vegetasi Tinggi)')
const videoMode = ref('continuation')
let playTimer = null

function eqAtA(av, mv) {
  const disc = av * av - 4 * mv * mv
  const eqs = [{ name: 'Eq1', B: 0, R: av }]
  if (disc >= 0) {
    const sq = Math.sqrt(disc)
    const b2 = (av - sq) / (2 * mv)
    const b3 = (av + sq) / (2 * mv)
    if (b2 > 0) eqs.push({ name: 'Eq2', B: b2, R: mv / b2 })
    if (b3 > 0) eqs.push({ name: 'Eq3', B: b3, R: mv / b3 })
  }
  return eqs
}

const eqValues = computed(() => {
  return eqAtA(a.value, m.value)
})

function rk4Step(B, R, av, mv, h) {
  const fB = (b, r) => -mv * b + r * b * b
  const fR = (b, r) => av - r - r * b * b

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

function simulate(ic) {
  const av = a.value
  const mv = m.value
  const h = dt.value
  const steps = Math.ceil(tEnd.value / h)
  const keep = Math.max(1, Math.floor(steps / 1200))

  const t = [0]
  const B = [ic.B0]
  const R = [ic.R0]

  let b = ic.B0
  let r = ic.R0

  for (let i = 1; i <= steps; i++) {
    const next = rk4Step(b, r, av, mv, h)
    b = next.B
    r = next.R
    if (i % keep === 0 || i === steps) {
      t.push(i * h)
      B.push(b)
      R.push(r)
    }
  }

  return { t, B, R, finalB: b, finalR: r }
}

function simulateWith(ic, av, mv, T, h) {
  const steps = Math.ceil(T / h)
  let b = ic.B0
  let r = ic.R0
  for (let i = 1; i <= steps; i++) {
    const next = rk4Step(b, r, av, mv, h)
    b = next.B
    r = next.R
  }
  return { finalB: b, finalR: r }
}

function nearestEq(finalB, finalR, eqs) {
  let nearest = eqs[0]
  let dist = Number.POSITIVE_INFINITY
  for (const eq of eqs) {
    const d = Math.hypot(finalB - eq.B, finalR - eq.R)
    if (d < dist) {
      dist = d
      nearest = eq
    }
  }
  return { nearest: nearest.name, dist }
}

function jacobianAt(B, R, mv, k2 = 0, db = 0, dr = 0) {
  const j11 = -mv + 2 * R * B - db * k2
  const j12 = B * B
  const j21 = -2 * R * B
  const j22 = -1 - B * B - dr * k2
  return { j11, j12, j21, j22 }
}

function stabilityLabel(j) {
  const tr = j.j11 + j.j22
  const det = j.j11 * j.j22 - j.j12 * j.j21
  const isStable = tr < 0 && det > 0
  return { trace: tr, det, label: isStable ? 'Stabil' : 'Tidak Stabil' }
}

const results = computed(() => {
  const eqs = eqValues.value
  return scenarios.value.map((s) => {
    const sim = simulate(s)
    const cls = nearestEq(sim.finalB, sim.finalR, eqs)
    return { ...s, ...sim, nearest: cls.nearest, dist: cls.dist }
  })
})

const basinProof = computed(() => {
  const eqs = eqValues.value
  const n = Math.max(3, proofGrid.value)
  const bMin = 0.02
  const bMaxLocal = 3.2
  const rMin = 0.2
  const rMaxLocal = 3.0

  const counts = { Eq1: 0, Eq2: 0, Eq3: 0 }
  const samples = []

  for (let i = 0; i < n; i++) {
    const b0 = bMin + (i / (n - 1)) * (bMaxLocal - bMin)
    for (let j = 0; j < n; j++) {
      const r0 = rMin + (j / (n - 1)) * (rMaxLocal - rMin)
      const out = simulateWith({ B0: b0, R0: r0 }, a.value, m.value, proofT.value, proofDt.value)
      const cls = nearestEq(out.finalB, out.finalR, eqs)
      if (counts[cls.nearest] !== undefined) counts[cls.nearest] += 1
      if (samples.length < 14) {
        samples.push({ B0: b0, R0: r0, target: cls.nearest, dist: cls.dist })
      }
    }
  }

  const total = n * n
  return { n, total, counts, samples }
})

const aShiftProof = computed(() => {
  const steps = Math.max(5, aSweepSteps.value)
  const half = Math.max(0.1, aSweepSpan.value)
  const start = Math.max(0.55, a.value - half)
  const end = Math.min(3.5, a.value + half)
  const rows = []

  for (let i = 0; i < steps; i++) {
    const av = start + (i / (steps - 1)) * (end - start)
    const eqs = eqAtA(av, m.value)

    const row = { a: av }
    for (const s of scenarios.value) {
      const out = simulateWith({ B0: s.B0, R0: s.R0 }, av, m.value, proofT.value, proofDt.value)
      const cls = nearestEq(out.finalB, out.finalR, eqs)
      row[s.name] = cls.nearest
    }
    rows.push(row)
  }

  return rows
})

const bifW = 760
const bifH = 280

const videoFrames = computed(() => {
  const steps = Math.max(20, aVideoSteps.value)
  const minA = Math.min(aVideoMin.value, aVideoMax.value)
  const maxA = Math.max(aVideoMin.value, aVideoMax.value)
  const frames = []
  const carry = scenarios.value.map((s) => ({ name: s.name, B: s.B0, R: s.R0 }))

  for (let i = 0; i < steps; i++) {
    const av = minA + (i / (steps - 1)) * (maxA - minA)
    const eqs = eqAtA(av, m.value)
    const endpoints = scenarios.value.map((s) => {
      const state = carry.find((c) => c.name === s.name)
      const ic = videoMode.value === 'continuation'
        ? { B0: state ? state.B : s.B0, R0: state ? state.R : s.R0 }
        : { B0: s.B0, R0: s.R0 }
      const out = simulateWith(ic, av, m.value, videoT.value, videoDt.value)
      if (videoMode.value === 'continuation' && state) {
        state.B = out.finalB
        state.R = out.finalR
      }
      const cls = nearestEq(out.finalB, out.finalR, eqs)
      return {
        name: s.name,
        color: s.color,
        B: out.finalB,
        R: out.finalR,
        target: cls.nearest,
        dist: cls.dist
      }
    })
    frames.push({ a: av, eqs, endpoints })
  }

  return frames
})

const currentEqStability = computed(() => {
  if (!currentFrame.value) return []
  return currentFrame.value.eqs.map((eq) => {
    const j = jacobianAt(eq.B, eq.R, m.value, 0, 0, 0)
    const s = stabilityLabel(j)
    return { name: eq.name, B: eq.B, R: eq.R, ...s }
  })
})

const maxBifB = computed(() => {
  let maxB = 1
  for (const f of videoFrames.value) {
    for (const e of f.eqs) maxB = Math.max(maxB, e.B)
    for (const ep of f.endpoints) maxB = Math.max(maxB, ep.B)
  }
  return maxB * 1.08
})

const bifEqPaths = computed(() => {
  const frames = videoFrames.value
  const maxB = maxBifB.value
  const names = ['Eq1', 'Eq2', 'Eq3']

  function toPoint(av, bv) {
    const minA = Math.min(aVideoMin.value, aVideoMax.value)
    const maxA = Math.max(aVideoMin.value, aVideoMax.value)
    const x = ((av - minA) / Math.max(1e-9, maxA - minA)) * bifW
    const y = bifH - (bv / maxB) * (bifH - 10) - 5
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }

  return names.map((eqName) => {
    const pts = []
    for (const f of frames) {
      const eq = f.eqs.find((e) => e.name === eqName)
      if (eq) pts.push(toPoint(f.a, eq.B))
    }
    return { name: eqName, d: pts.length > 1 ? `M${pts.join('L')}` : '' }
  })
})

const currentFrame = computed(() => {
  const frames = videoFrames.value
  if (frames.length === 0) return null
  const idx = Math.max(0, Math.min(playIndex.value, frames.length - 1))
  return frames[idx]
})

const focusRow = computed(() => {
  if (!currentFrame.value) return null
  return currentFrame.value.endpoints.find((e) => e.name === focusScenario.value) || currentFrame.value.endpoints[0]
})

function pointOnBif(av, bv) {
  const minA = Math.min(aVideoMin.value, aVideoMax.value)
  const maxA = Math.max(aVideoMin.value, aVideoMax.value)
  const x = ((av - minA) / Math.max(1e-9, maxA - minA)) * bifW
  const y = bifH - (bv / maxBifB.value) * (bifH - 10) - 5
  return { x, y }
}

const movingDots = computed(() => {
  if (!currentFrame.value) return []
  return currentFrame.value.endpoints.map((ep) => {
    const p = pointOnBif(currentFrame.value.a, ep.B)
    return { ...ep, x: p.x, y: p.y }
  })
})

function stopPlayback() {
  if (playTimer) {
    clearInterval(playTimer)
    playTimer = null
  }
  isPlaying.value = false
}

function startPlayback() {
  const frames = videoFrames.value
  if (frames.length < 2) return
  stopPlayback()
  isPlaying.value = true
  playTimer = setInterval(() => {
    if (playIndex.value >= frames.length - 1) {
      playIndex.value = 0
    } else {
      playIndex.value += 1
    }
  }, Math.max(50, playSpeedMs.value))
}

function togglePlayback() {
  if (isPlaying.value) stopPlayback()
  else startPlayback()
}

watch([aVideoMin, aVideoMax, aVideoSteps, videoT, videoDt, m, playSpeedMs, videoMode], () => {
  if (isPlaying.value) startPlayback()
  const maxIdx = Math.max(0, videoFrames.value.length - 1)
  if (playIndex.value > maxIdx) playIndex.value = maxIdx
})

onUnmounted(() => stopPlayback())

const chartW = 680
const chartH = 220

function makePath(t, y, yMax) {
  if (t.length < 2) return ''
  const pts = []
  for (let i = 0; i < t.length; i++) {
    const x = (t[i] / tEnd.value) * chartW
    const yy = chartH - (y[i] / yMax) * (chartH - 10) - 5
    pts.push(`${x.toFixed(1)},${yy.toFixed(1)}`)
  }
  return `M${pts.join('L')}`
}

const bMax = computed(() => {
  let v = 1
  for (const r of results.value) v = Math.max(v, ...r.B)
  return v * 1.05
})

const rMax = computed(() => {
  let v = 1
  for (const r of results.value) v = Math.max(v, ...r.R)
  return v * 1.05
})
</script>

<template>
  <div class="min-h-screen bg-transparent text-[#e8edf5] font-body">
    <div class="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div class="card">
        <h1 class="text-lg sm:text-xl font-heading font-bold tracking-tight">Runge-Kutta V2: Metodologi dan Validasi</h1>
        <p class="text-xs text-[#9ab0a3] mt-1">Halaman ini fokus ke kebutuhan laporan BAB 3.2.5: metode, parameter, grafik hasil, dan interpretasi konvergensi Eq1-Eq3.</p>
      </div>

      <div class="card">
        <h2 class="section-title mb-3">Parameter Simulasi</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label class="block">
            <span class="label">Curah Hujan a: {{ a.toFixed(2) }}</span>
            <input v-model.number="a" type="range" min="0.6" max="3.5" step="0.01" class="slider slider-green">
          </label>
          <label class="block">
            <span class="label">Kematian m: {{ m.toFixed(2) }}</span>
            <input v-model.number="m" type="range" min="0.1" max="1.0" step="0.01" class="slider slider-amber">
          </label>
          <label class="block">
            <span class="label">Waktu Akhir T: {{ tEnd }}</span>
            <input v-model.number="tEnd" type="range" min="20" max="180" step="5" class="slider slider-slate">
          </label>
          <label class="block">
            <span class="label">Langkah dt: {{ dt.toFixed(3) }}</span>
            <input v-model.number="dt" type="range" min="0.005" max="0.08" step="0.001" class="slider slider-slate">
          </label>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title mb-2">Formulasi V2 (PDE ke Linearisasi Mode-k)</h2>
        <div class="font-data text-xs leading-relaxed text-[#b8cbc2] space-y-1">
          <p>Model PDE:</p>
          <p class="ml-3">B_t = -mB + RB^2 + D_B B_xx</p>
          <p class="ml-3">R_t = a - R - RB^2 + D_R R_xx</p>
          <p class="mt-2">Gangguan kecil di sekitar equilibrium (B_e, R_e):</p>
          <p class="ml-3">B(x,t) = B_e + ξ₁ e^(λt+ikx), R(x,t) = R_e + ξ₂ e^(λt+ikx)</p>
          <p class="mt-2">Catatan: Gangguan (perturbation) dalam mode Fourier dideskripsikan dengan amplitude ξ yang tumbuh/menurun dengan laju λ (eigenvalue m<br/>atriks).</p>
          <p class="mt-2">Karena ∂²/∂x² menghasilkan -k² pada mode Fourier, matriks linear jadi:</p>
          <p class="ml-3">M(k) = J - k² diag(D_B, D_R)</p>
          <p class="ml-3">J11 = -m + 2R_eB_e, J12 = B_e², J21 = -2R_eB_e, J22 = -1 - B_e² (Jacobian matrik)sepanjang dengan difusi: -k²D_B dan -k²D_R)</p>
          <p class="mt-2">Catatan jujur: panel RK4 ini memvalidasi dinamika lokal (temporal/ODE). Validasi spasial mode-k ditunjukkan di modul Turing Linear V2.</p>
        </div>
      </div>

      <div class="card">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 class="section-title">Bukti Simulasi Utama: Bifurkasi Dinamis (Mode Video)</h2>
          <div class="flex items-center gap-2">
            <button @click="togglePlayback" class="px-3 py-1.5 text-xs rounded-md border border-[#294236] bg-[#0b1712] hover:bg-[#12231b] text-[#d8e7df]">
              {{ isPlaying ? 'Pause' : 'Play' }}
            </button>
            <button @click="playIndex = 0" class="px-3 py-1.5 text-xs rounded-md border border-[#294236] bg-[#0b1712] hover:bg-[#12231b] text-[#d8e7df]">Reset</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
          <label>
            <span class="label">Mode video</span>
            <select v-model="videoMode" class="w-full h-[30px] rounded-md border border-[#294236] bg-[#0b1712] px-2 text-xs text-[#d8e7df]">
              <option value="continuation">Continuation (state berlanjut)</option>
              <option value="snapshot">Snapshot (reset tiap frame)</option>
            </select>
          </label>
          <label>
            <span class="label">a min: {{ aVideoMin.toFixed(2) }}</span>
            <input v-model.number="aVideoMin" type="range" min="0.5" max="2.4" step="0.01" class="slider slider-slate">
          </label>
          <label>
            <span class="label">a max: {{ aVideoMax.toFixed(2) }}</span>
            <input v-model.number="aVideoMax" type="range" min="1.2" max="3.5" step="0.01" class="slider slider-slate">
          </label>
          <label>
            <span class="label">Frame a: {{ aVideoSteps }}</span>
            <input v-model.number="aVideoSteps" type="range" min="20" max="120" step="1" class="slider slider-amber">
          </label>
          <label>
            <span class="label">Speed (ms/frame): {{ playSpeedMs }}</span>
            <input v-model.number="playSpeedMs" type="range" min="70" max="420" step="10" class="slider slider-green">
          </label>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <label>
            <span class="label">Waktu integrasi per frame: {{ videoT }}</span>
            <input v-model.number="videoT" type="range" min="20" max="80" step="1" class="slider slider-slate">
          </label>
          <label>
            <span class="label">dt per frame: {{ videoDt.toFixed(3) }}</span>
            <input v-model.number="videoDt" type="range" min="0.02" max="0.08" step="0.001" class="slider slider-slate">
          </label>
          <label>
            <span class="label">Sorot skenario</span>
            <select v-model="focusScenario" class="w-full h-[30px] rounded-md border border-[#294236] bg-[#0b1712] px-2 text-xs text-[#d8e7df]">
              <option v-for="s in scenarios" :key="`focus-${s.name}`" :value="s.name">{{ s.name }}</option>
            </select>
          </label>
        </div>

        <svg :viewBox="`0 0 ${bifW} ${bifH + 36}`" class="w-full bg-[#0b1712] rounded-lg border border-[#21362b]" preserveAspectRatio="none">
          <line v-for="i in 5" :key="`bfh-${i}`" :x1="0" :x2="bifW" :y1="bifH * i / 6" :y2="bifH * i / 6" stroke="#1c2d25" stroke-width="0.8"/>

          <line
            v-if="currentFrame"
            :x1="pointOnBif(currentFrame.a, 0).x"
            :x2="pointOnBif(currentFrame.a, 0).x"
            y1="2"
            :y2="bifH - 2"
            stroke="#ef4444"
            stroke-width="1.8"
            stroke-dasharray="7 5"
          />

          <path v-for="eq in bifEqPaths" :key="`eqp-${eq.name}`" :d="eq.d" fill="none"
            :stroke="eq.name === 'Eq1' ? '#6ea2ff' : eq.name === 'Eq2' ? '#e4c260' : '#3fd08a'"
            :stroke-dasharray="eq.name === 'Eq2' ? '6 4' : '0'"
            stroke-width="2.3"/>

          <circle v-for="d in movingDots" :key="`dot-${d.name}`" :cx="d.x" :cy="d.y" r="5" :fill="d.color" stroke="#08110d" stroke-width="1.5"/>

          <text x="8" y="14" class="axis">B*</text>
          <text :x="bifW / 2" :y="bifH + 24" class="axis" text-anchor="middle">Parameter curah hujan a</text>
        </svg>

        <div class="mt-3 flex flex-wrap items-center gap-4 text-xs">
          <span class="legend"><span class="line line-blue"></span> Eq1</span>
          <span class="legend"><span class="line line-amber dashed"></span> Eq2</span>
          <span class="legend"><span class="line line-green"></span> Eq3</span>
          <span class="legend">Mode: <span class="font-data text-[#e4c260]">{{ videoMode }}</span></span>
          <span class="legend" v-if="currentFrame">Frame: <span class="font-data text-[#d8e7df]">{{ playIndex + 1 }}/{{ videoFrames.length }}</span></span>
          <span class="legend" v-if="currentFrame">a saat ini: <span class="font-data text-[#e4c260]">{{ currentFrame.a.toFixed(3) }}</span></span>
        </div>

        <div v-if="focusRow" class="mt-3 rounded-md border border-[#294236] bg-[#0b1712] p-3 text-xs">
          <p class="text-[#9ab0a3]">Narasi otomatis (siap presentasi):</p>
          <p class="mt-1 text-[#d8e7df] leading-relaxed">
            Pada frame ini, untuk <span class="font-data">{{ focusRow.name }}</span> dengan a =
            <span class="font-data text-[#e4c260]">{{ currentFrame ? currentFrame.a.toFixed(3) : '-' }}</span>,
            solusi numerik menuju <span class="font-data text-[#3fd08a]">{{ focusRow.target }}</span>
            dengan jarak akhir <span class="font-data">{{ focusRow.dist.toFixed(5) }}</span>.
          </p>
          <p class="mt-1 text-[#9ab0a3]" v-if="videoMode === 'continuation'">Pada mode continuation, state frame sebelumnya menjadi initial frame berikutnya, sehingga efek memori/histeresis terlihat.</p>
        </div>

        <div class="mt-3 rounded-md border border-[#294236] bg-[#0b1712] p-3 text-xs">
          <p class="text-[#9ab0a3] mb-2">Status kestabilan lokal equilibrium (k = 0, ODE):</p>
          <div class="overflow-x-auto">
            <table class="w-full text-xs font-data">
              <thead>
                <tr class="border-b border-[#264034] text-[#8ca69a]">
                  <th class="text-left py-1.5 px-2">Eq</th>
                  <th class="text-right py-1.5 px-2">B*</th>
                  <th class="text-right py-1.5 px-2">R*</th>
                  <th class="text-right py-1.5 px-2">trace(J)</th>
                  <th class="text-right py-1.5 px-2">det(J)</th>
                  <th class="text-center py-1.5 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in currentEqStability" :key="`stab-${row.name}`" class="border-b border-[#1b2c24]">
                  <td class="py-1.5 px-2">{{ row.name }}</td>
                  <td class="text-right py-1.5 px-2">{{ row.B.toFixed(4) }}</td>
                  <td class="text-right py-1.5 px-2">{{ row.R.toFixed(4) }}</td>
                  <td class="text-right py-1.5 px-2">{{ row.trace.toFixed(5) }}</td>
                  <td class="text-right py-1.5 px-2">{{ row.det.toFixed(5) }}</td>
                  <td class="text-center py-1.5 px-2" :class="row.label === 'Stabil' ? 'text-[#3fd08a]' : 'text-[#e4c260]'">{{ row.label }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title mb-3">Bukti Simulasi 1: Basin of Attraction (Grid IC)</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
          <label>
            <span class="label">Grid IC: {{ proofGrid }} x {{ proofGrid }}</span>
            <input v-model.number="proofGrid" type="range" min="3" max="9" step="1" class="slider slider-slate">
          </label>
          <label>
            <span class="label">Waktu bukti: {{ proofT }}</span>
            <input v-model.number="proofT" type="range" min="20" max="80" step="1" class="slider slider-slate">
          </label>
          <label>
            <span class="label">dt bukti: {{ proofDt.toFixed(3) }}</span>
            <input v-model.number="proofDt" type="range" min="0.02" max="0.08" step="0.001" class="slider slider-slate">
          </label>
          <div class="rounded-md border border-[#274136] bg-[#0b1712] p-3">
            <p class="text-[11px] text-[#9ab0a3]">Total percobaan: <span class="font-data text-[#d3e4db]">{{ basinProof.total }}</span></p>
            <p class="text-[11px] text-[#9ab0a3]">Eq1: <span class="font-data text-[#6ea2ff]">{{ basinProof.counts.Eq1 }}</span></p>
            <p class="text-[11px] text-[#9ab0a3]">Eq2: <span class="font-data text-[#e4c260]">{{ basinProof.counts.Eq2 }}</span></p>
            <p class="text-[11px] text-[#9ab0a3]">Eq3: <span class="font-data text-[#3fd08a]">{{ basinProof.counts.Eq3 }}</span></p>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs font-data">
            <thead>
              <tr class="border-b border-[#264034] text-[#8ca69a]">
                <th class="text-right py-2 px-2">B₀</th>
                <th class="text-right py-2 px-2">R₀</th>
                <th class="text-center py-2 px-2">Eq Tujuan</th>
                <th class="text-right py-2 px-2">Jarak</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, idx) in basinProof.samples" :key="`basin-${idx}`" class="border-b border-[#1b2c24]">
                <td class="text-right py-1.5 px-2">{{ s.B0.toFixed(3) }}</td>
                <td class="text-right py-1.5 px-2">{{ s.R0.toFixed(3) }}</td>
                <td class="text-center py-1.5 px-2">{{ s.target }}</td>
                <td class="text-right py-1.5 px-2">{{ s.dist.toFixed(5) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title mb-3">Bukti Simulasi 2: Eksperimen Geser Parameter a</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <label>
            <span class="label">Rentang geser a (+/-): {{ aSweepSpan.toFixed(2) }}</span>
            <input v-model.number="aSweepSpan" type="range" min="0.2" max="1.4" step="0.01" class="slider slider-amber">
          </label>
          <label>
            <span class="label">Jumlah titik a: {{ aSweepSteps }}</span>
            <input v-model.number="aSweepSteps" type="range" min="5" max="15" step="1" class="slider slider-slate">
          </label>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs font-data">
            <thead>
              <tr class="border-b border-[#264034] text-[#8ca69a]">
                <th class="text-right py-2 px-2">a</th>
                <th class="text-center py-2 px-2">IC-A</th>
                <th class="text-center py-2 px-2">IC-B</th>
                <th class="text-center py-2 px-2">IC-C</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in aShiftProof" :key="`ash-${idx}`" class="border-b border-[#1b2c24]">
                <td class="text-right py-1.5 px-2">{{ row.a.toFixed(3) }}</td>
                <td class="text-center py-1.5 px-2">{{ row['IC-A (Vegetasi Tinggi)'] }}</td>
                <td class="text-center py-1.5 px-2">{{ row['IC-B (Vegetasi Rendah)'] }}</td>
                <td class="text-center py-1.5 px-2">{{ row['IC-C (Dekat Gurun)'] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div class="card">
          <h2 class="section-title mb-3">Grafik t vs B(t)</h2>
          <svg :viewBox="`0 0 ${chartW} ${chartH + 30}`" class="w-full bg-[#0b1712] rounded-lg border border-[#21362b]" preserveAspectRatio="none">
            <line v-for="i in 4" :key="`gb${i}`" :x1="0" :x2="chartW" :y1="chartH * i / 5" :y2="chartH * i / 5" stroke="#1c2d25" stroke-width="0.8"/>
            <path v-for="r in results" :key="r.name" :d="makePath(r.t, r.B, bMax)" fill="none" :stroke="r.color" stroke-width="2"/>
            <text x="6" y="14" class="axis">B(t)</text>
            <text :x="chartW / 2" :y="chartH + 22" class="axis" text-anchor="middle">Waktu t</text>
          </svg>
        </div>

        <div class="card">
          <h2 class="section-title mb-3">Grafik t vs R(t)</h2>
          <svg :viewBox="`0 0 ${chartW} ${chartH + 30}`" class="w-full bg-[#0b1712] rounded-lg border border-[#21362b]" preserveAspectRatio="none">
            <line v-for="i in 4" :key="`gw${i}`" :x1="0" :x2="chartW" :y1="chartH * i / 5" :y2="chartH * i / 5" stroke="#1c2d25" stroke-width="0.8"/>
            <path v-for="r in results" :key="`w-${r.name}`" :d="makePath(r.t, r.R, rMax)" fill="none" :stroke="r.color" stroke-width="2"/>
            <text x="6" y="14" class="axis">R(t)</text>
            <text :x="chartW / 2" :y="chartH + 22" class="axis" text-anchor="middle">Waktu t</text>
          </svg>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title mb-3">Validasi Konvergensi terhadap Equilibrium</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-xs font-data">
            <thead>
              <tr class="border-b border-[#264034] text-[#8ca69a]">
                <th class="text-left py-2 px-2">Skenario</th>
                <th class="text-right py-2 px-2">B(T)</th>
                <th class="text-right py-2 px-2">R(T)</th>
                <th class="text-center py-2 px-2">Eq Tujuan</th>
                <th class="text-right py-2 px-2">Jarak</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in results" :key="`row-${r.name}`" class="border-b border-[#1b2c24]">
                <td class="py-2 px-2">
                  <span class="inline-block w-2.5 h-2.5 rounded-full mr-2" :style="{ background: r.color }"/>
                  {{ r.name }}
                </td>
                <td class="text-right py-2 px-2">{{ r.finalB.toFixed(4) }}</td>
                <td class="text-right py-2 px-2">{{ r.finalW.toFixed(4) }}</td>
                <td class="text-center py-2 px-2">{{ r.nearest }}</td>
                <td class="text-right py-2 px-2" :class="r.dist < 0.1 ? 'text-[#3fd08a]' : 'text-[#d0b15e]'">{{ r.dist.toFixed(6) }}</td>
              </tr>
            </tbody>
          </table>
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
.legend { color: #c5d5cc; display: inline-flex; align-items: center; gap: 8px; }
.line { width: 20px; height: 2px; display: inline-block; }
.line-blue { background: #6ea2ff; }
.line-amber { background: #e4c260; }
.line-green { background: #3fd08a; }
.dashed { background: linear-gradient(to right, #e4c260 60%, transparent 60%); background-size: 8px 2px; }

.slider { width: 100%; height: 5px; border-radius: 999px; appearance: none; -webkit-appearance: none; cursor: pointer; background: #122019; }
.slider::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 16px; height: 16px; border-radius: 999px; border: 2px solid #08110d; }
.slider-green::-webkit-slider-thumb { background: #3fd08a; }
.slider-amber::-webkit-slider-thumb { background: #e4c260; }
.slider-slate::-webkit-slider-thumb { background: #7a8f85; }
</style>
