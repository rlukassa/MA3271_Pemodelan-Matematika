<!-- <template>
	<div class="min-h-screen bg-[#07080c] text-[#e8edf5] font-body">
		<div class="max-w-[900px] mx-auto px-4 sm:px-6 py-10">
			<h1 class="text-xl sm:text-2xl font-heading font-bold tracking-tight text-teal-400">Runge-Kutta (RK4)</h1>
			<p class="mt-2 text-sm text-[#8892a6]">
				Halaman ini sedang dinonaktifkan sementara. Dalam pengembangan !
			</p>
		</div>
	</div>
</template>

<style scoped>
.font-heading {
	font-family: 'Cormorant Garamond', Georgia, serif;
}

.font-body {
	font-family: 'Outfit', system-ui, sans-serif;
}
</style> -->

<script setup>
import { ref, computed, shallowRef, onMounted } from 'vue'

useHead({ title: 'Runge-Kutta (RK4) · Klausmeier [No Nabla]' })

const a = ref(2.0)
const m = ref(0.45)
const B0 = ref(0.5)
const W0 = ref(2.0)
const tEnd = ref(50)
const dtRK = ref(0.02)

const showMultiple = ref(false)
const presetICs = [
  { B: 0.1, W: 2.0, label: 'Dekat gurun', color: '#ef4444' },
  { B: 0.5, W: 2.0, label: 'Sedang', color: '#fbbf24' },
  { B: 2.0, W: 1.0, label: 'Biomassa tinggi', color: '#34d399' },
  { B: 4.0, W: 0.5, label: 'Sangat tinggi', color: '#22d3ee' },
]

// Equilibrium reference values
const eqValues = computed(() => {
  const aVal = a.value, mVal = m.value
  const disc = aVal * aVal - 4 * mVal * mVal
  const eqs = [{ name: 'Eq1', Be: 0, Re: aVal }]
  if (disc >= 0) {
    const sq = Math.sqrt(disc)
    const be2 = (aVal - sq) / (2 * mVal)
    const be3 = (aVal + sq) / (2 * mVal)
    if (be2 > 0) eqs.push({ name: 'Eq2', Be: be2, Re: mVal / be2 })
    if (be3 > 0) eqs.push({ name: 'Eq3', Be: be3, Re: mVal / be3 })
  }
  return eqs
})

// RK4 step function
function rk4Step(B, W, aVal, mVal, h) {
  function fB(b, w) { return -mVal * b + w * b * b }
  function fW(b, w) { return aVal - w - w * b * b }

  const k1B = fB(B, W)
  const k1W = fW(B, W)
  const k2B = fB(B + 0.5 * h * k1B, W + 0.5 * h * k1W)
  const k2W = fW(B + 0.5 * h * k1B, W + 0.5 * h * k1W)
  const k3B = fB(B + 0.5 * h * k2B, W + 0.5 * h * k2W)
  const k3W = fW(B + 0.5 * h * k2B, W + 0.5 * h * k2W)
  const k4B = fB(B + h * k3B, W + h * k3W)
  const k4W = fW(B + h * k3B, W + h * k3W)

  return {
    B: Math.max(0, B + (h / 6) * (k1B + 2 * k2B + 2 * k3B + k4B)),
    W: Math.max(0, W + (h / 6) * (k1W + 2 * k2W + 2 * k3W + k4W)),
  }
}

// Run single RK4 simulation
function runRK4(b0, w0) {
  const aVal = a.value, mVal = m.value
  const h = dtRK.value
  const T = tEnd.value
  const n = Math.ceil(T / h)
  const skip = Math.max(1, Math.floor(n / 2000)) // limit data points

  const tArr = [0], bArr = [b0], wArr = [w0]
  let B = b0, W = w0

  for (let i = 1; i <= n; i++) {
    const result = rk4Step(B, W, aVal, mVal, h)
    B = result.B
    W = result.W
    if (i % skip === 0 || i === n) {
      tArr.push(i * h)
      bArr.push(B)
      wArr.push(W)
    }
  }

  return { t: tArr, B: bArr, W: wArr, finalB: B, finalW: W }
}

// Main simulation result
const simResult = shallowRef(null)
const multiResults = shallowRef([])

function runSimulation() {
  simResult.value = runRK4(B0.value, W0.value)
  if (showMultiple.value) {
    multiResults.value = presetICs.map(ic => ({
      ...ic,
      result: runRK4(ic.B, ic.W)
    }))
  }
}

// Convergence analysis
const convergenceInfo = computed(() => {
  if (!simResult.value) return null
  const { finalB, finalW } = simResult.value
  const eqs = eqValues.value
  let closest = eqs[0], minDist = Infinity
  for (const eq of eqs) {
    const d = Math.sqrt((finalB - eq.Be) ** 2 + (finalW - eq.Re) ** 2)
    if (d < minDist) { minDist = d; closest = eq }
  }
  return { eq: closest, dist: minDist, finalB, finalW }
})

// SVG chart helpers
const chartW = 600, chartH = 200

function buildTimePath(tArr, valArr, tMax, vMax) {
  if (!tArr || tArr.length < 2) return ''
  const pts = []
  for (let i = 0; i < tArr.length; i++) {
    const x = (tArr[i] / tMax) * chartW
    const y = chartH - (valArr[i] / vMax) * (chartH - 8) - 4
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return 'M' + pts.join('L')
}

const bPath = computed(() => {
  if (!simResult.value) return ''
  const { t, B } = simResult.value
  const vMax = Math.max(0.5, ...B) * 1.1
  return buildTimePath(t, B, tEnd.value, vMax)
})

const wPath = computed(() => {
  if (!simResult.value) return ''
  const { t, W } = simResult.value
  const vMax = Math.max(0.5, ...W) * 1.1
  return buildTimePath(t, W, tEnd.value, vMax)
})

const bMax = computed(() => simResult.value ? Math.max(0.5, ...simResult.value.B) * 1.1 : 1)
const wMax = computed(() => simResult.value ? Math.max(0.5, ...simResult.value.W) * 1.1 : 1)

// Multi-trace paths
const multiBPaths = computed(() => {
  return multiResults.value.map(mr => ({
    color: mr.color,
    label: mr.label,
    path: buildTimePath(mr.result.t, mr.result.B, tEnd.value, Math.max(0.5, ...mr.result.B, ...(simResult.value?.B || [0])) * 1.1)
  }))
})

const multiWPaths = computed(() => {
  return multiResults.value.map(mr => ({
    color: mr.color,
    label: mr.label,
    path: buildTimePath(mr.result.t, mr.result.W, tEnd.value, Math.max(0.5, ...mr.result.W, ...(simResult.value?.W || [0])) * 1.1)
  }))
})

// Eq reference lines for B chart
const eqBLines = computed(() => {
  if (!simResult.value) return []
  const vMax = bMax.value
  return eqValues.value.map(eq => ({
    name: eq.name,
    y: chartH - (eq.Be / vMax) * (chartH - 8) - 4,
    val: eq.Be
  }))
})

const eqWLines = computed(() => {
  if (!simResult.value) return []
  const vMax = wMax.value
  return eqValues.value.map(eq => ({
    name: eq.name,
    y: chartH - (eq.Re / vMax) * (chartH - 8) - 4,
    val: eq.Re
  }))
})

onMounted(() => runSimulation())
</script>

<template>
  <div class="min-h-screen bg-transparent text-[#e8edf5] font-body">
    <!-- Page Header -->
    <div class="border-b border-[#1a1d2b] bg-[#07080c]/90 backdrop-blur-md sticky top-0 z-10 lg:z-10">
      <div class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <h1 class="text-lg sm:text-xl font-heading font-bold tracking-tight">Runge-Kutta (RK4)</h1>
        <p class="text-[9px] sm:text-xs text-[#555d70] mt-0.5 font-body">Solusi Numerik ODE · t vs B(t) dan R(t) · Cross-check Kestabilan · Tujuan #5, #6</p>
      </div>
    </div>

    <div class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">

      <!-- Penjelasan -->
      <div class="card">
        <h3 class="text-xs font-body font-semibold text-teal-400 mb-1.5">Tentang Fitur Ini</h3>
        <p class="text-[11px] sm:text-xs text-[#8892a6] font-body leading-relaxed">
          Fitur ini menyelesaikan sistem ODE Klausmeier <strong class="text-teal-400">tanpa difusi</strong> menggunakan
          metode <strong class="text-teal-400">Runge-Kutta orde 4 (RK4)</strong> — metode numerik yang lebih akurat
          dari Euler. Tujuannya untuk <em>cross-check</em>: apakah solusi konvergen ke equilibrium yang diprediksi
          oleh analisis Jacobian? Dari initial condition (B₀, R₀), kita lihat solusi lari ke Eq1, Eq2, atau Eq3.
        </p>
        <div class="mt-2 p-3 bg-[#0a0b10] rounded-lg border border-[#13151e] font-data text-[10px] text-[#8892a6] space-y-1">
          <p>Sistem ODE (tanpa difusi):</p>
          <p class="ml-3">dB/dt = −mB + RB²</p>
          <p class="ml-3">dR/dt = a − R − RB²</p>
          <p class="mt-1.5 text-[9px]">RK4: y_{n+1} = y_n + (h/6)(k₁ + 2k₂ + 2k₃ + k₄), orde akurasi O(h⁴)</p>
        </div>
      </div>

      <!-- Parameters + Initial Conditions -->
      <div class="card">
        <h2 class="section-title mb-3">Parameter & Kondisi Awal</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <label class="text-[#c0c8d8] font-body">Curah Hujan (a)</label>
              <span class="font-data text-teal-400">{{ a.toFixed(2) }}</span>
            </div>
            <input type="range" v-model.number="a" min="0.5" max="3.5" step="0.01" class="slider slider-teal">
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <label class="text-[#c0c8d8] font-body">Kematian (m)</label>
              <span class="font-data text-amber-400">{{ m.toFixed(2) }}</span>
            </div>
            <input type="range" v-model.number="m" min="0.1" max="1.0" step="0.01" class="slider slider-amber">
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <label class="text-[#c0c8d8] font-body">Waktu akhir (T)</label>
              <span class="font-data text-[#8892a6]">{{ tEnd }} thn</span>
            </div>
            <input type="range" v-model.number="tEnd" min="10" max="200" step="5" class="slider slider-slate">
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <label class="text-[#c0c8d8] font-body">B₀ (Biomassa awal)</label>
              <span class="font-data text-emerald-400">{{ B0.toFixed(2) }}</span>
            </div>
            <input type="range" v-model.number="B0" min="0.01" max="6.0" step="0.01" class="slider slider-green">
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <label class="text-[#c0c8d8] font-body">R₀ (Air awal)</label>
              <span class="font-data text-sky-400">{{ W0.toFixed(2) }}</span>
            </div>
            <input type="range" v-model.number="W0" min="0.01" max="5.0" step="0.01" class="slider slider-sky">
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <label class="text-[#c0c8d8] font-body">dt (langkah waktu)</label>
              <span class="font-data text-[#8892a6]">{{ dtRK.toFixed(3) }}</span>
            </div>
            <input type="range" v-model.number="dtRK" min="0.001" max="0.1" step="0.001" class="slider slider-slate">
          </div>
        </div>
        <div class="flex items-center gap-4 mt-4">
          <button @click="runSimulation" class="px-4 py-2 bg-teal-600/80 hover:bg-teal-600 text-white text-xs rounded-xl font-semibold transition font-body">
            Jalankan RK4
          </button>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" v-model="showMultiple" class="accent-teal-400 w-3.5 h-3.5" />
            <span class="text-[10px] text-[#555d70] font-body">Bandingkan 4 initial condition</span>
          </label>
        </div>
      </div>

      <!-- Equilibrium Reference -->
      <div class="card">
        <h2 class="section-title mb-2">Titik Kesetimbangan Referensi</h2>
        <div class="flex flex-wrap gap-3">
          <div v-for="eq in eqValues" :key="eq.name" class="px-3 py-2 bg-[#0a0b10] rounded-lg border border-[#13151e] font-data text-[10px]">
            <span :class="eq.name === 'Eq1' ? 'text-red-400' : eq.name === 'Eq2' ? 'text-amber-400' : 'text-emerald-400'">{{ eq.name }}:</span>
            <span class="text-[#8892a6] ml-1">Be={{ eq.Be.toFixed(3) }}, Re={{ eq.Re.toFixed(3) }}</span>
          </div>
        </div>
      </div>

      <!-- Results -->
      <template v-if="simResult">
        <!-- Convergence Info -->
        <div v-if="convergenceInfo" :class="['card border-l-4', convergenceInfo.eq.name === 'Eq3' ? 'border-l-emerald-500' : convergenceInfo.eq.name === 'Eq1' ? 'border-l-red-500' : 'border-l-amber-500']">
          <p class="text-xs text-[#c0c8d8] font-body">
            <strong>Konvergensi:</strong> Solusi menuju
            <span :class="convergenceInfo.eq.name === 'Eq3' ? 'text-emerald-400' : convergenceInfo.eq.name === 'Eq1' ? 'text-red-400' : 'text-amber-400'" class="font-data">
              {{ convergenceInfo.eq.name }}
            </span>
            (jarak: {{ convergenceInfo.dist.toFixed(6) }}).
            Nilai akhir: B(T)={{ convergenceInfo.finalB.toFixed(4) }}, R(T)={{ convergenceInfo.finalW.toFixed(4) }}
          </p>
        </div>

        <!-- Chart: t vs B(t) -->
        <div class="card">
          <h2 class="section-title mb-3">Grafik t vs B(t) <span class="text-emerald-400/60">(Biomassa)</span></h2>
          <p class="text-[10px] text-[#555d70] font-body mb-2">
            Apakah B(t) naik atau turun dari B₀={{ B0.toFixed(2) }}? Garis putus-putus menunjukkan nilai Be equilibrium.
          </p>
          <svg :viewBox="`0 0 ${chartW} ${chartH + 30}`" class="w-full bg-[#0a0b10] rounded-xl border border-[#13151e]" preserveAspectRatio="none">
            <line v-for="i in 4" :key="'bh'+i" :x1="0" :y1="chartH * i / 5" :x2="chartW" :y2="chartH * i / 5" stroke="#13151e" stroke-width="0.5" />

            <!-- Eq reference lines -->
            <template v-for="(eq, i) in eqBLines" :key="'eqb'+i">
              <line v-if="eq.y > 0 && eq.y < chartH" :x1="0" :y1="eq.y" :x2="chartW" :y2="eq.y"
                :stroke="eq.name === 'Eq1' ? '#ef4444' : eq.name === 'Eq2' ? '#fbbf24' : '#34d399'"
                stroke-width="1" stroke-dasharray="4,4" opacity="0.4" />
              <text v-if="eq.y > 8 && eq.y < chartH - 4" :x="chartW - 5" :y="eq.y - 4"
                :fill="eq.name === 'Eq1' ? '#ef4444' : eq.name === 'Eq2' ? '#fbbf24' : '#34d399'"
                font-size="8" text-anchor="end" class="font-svg-data" opacity="0.6">{{ eq.name }} ({{ eq.val.toFixed(2) }})</text>
            </template>

            <!-- Multi-trace -->
            <template v-if="showMultiple">
              <path v-for="(mp, i) in multiBPaths" :key="'mb'+i" :d="mp.path" fill="none" :stroke="mp.color" stroke-width="1.5" opacity="0.6" />
            </template>

            <!-- Main trace -->
            <path :d="bPath" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linejoin="round" />

            <!-- Labels -->
            <text x="5" y="12" fill="#555d70" font-size="9" class="font-svg-data">B(t)</text>
            <text :x="chartW / 2" :y="chartH + 22" fill="#555d70" font-size="9" text-anchor="middle" class="font-svg-data">Waktu t (tahun)</text>
            <text x="5" :y="chartH + 14" fill="#3a3f50" font-size="7" class="font-svg-data">0</text>
            <text :x="chartW - 5" :y="chartH + 14" fill="#3a3f50" font-size="7" text-anchor="end" class="font-svg-data">{{ tEnd }}</text>
          </svg>
          <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[9px] text-[#555d70] font-body">
            <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-emerald-400 inline-block rounded"></span> B(t) utama</span>
            <template v-if="showMultiple">
              <span v-for="ic in presetICs" :key="ic.label" class="flex items-center gap-1">
                <span class="w-3 h-0.5 inline-block rounded" :style="{background: ic.color}"></span> {{ ic.label }}
              </span>
            </template>
          </div>
        </div>

        <!-- Chart: t vs R(t) -->
        <div class="card">
          <h2 class="section-title mb-3">Grafik t vs R(t) <span class="text-sky-400/60">(Air)</span></h2>
          <p class="text-[10px] text-[#555d70] font-body mb-2">
            Evolusi air tanah R(t). Perhatikan hubungan terbalik dengan B(t) — saat vegetasi tumbuh, air diserap.
          </p>
          <svg :viewBox="`0 0 ${chartW} ${chartH + 30}`" class="w-full bg-[#0a0b10] rounded-xl border border-[#13151e]" preserveAspectRatio="none">
            <line v-for="i in 4" :key="'wh'+i" :x1="0" :y1="chartH * i / 5" :x2="chartW" :y2="chartH * i / 5" stroke="#13151e" stroke-width="0.5" />

            <!-- Eq reference lines -->
            <template v-for="(eq, i) in eqWLines" :key="'eqw'+i">
              <line v-if="eq.y > 0 && eq.y < chartH" :x1="0" :y1="eq.y" :x2="chartW" :y2="eq.y"
                :stroke="eq.name === 'Eq1' ? '#ef4444' : eq.name === 'Eq2' ? '#fbbf24' : '#34d399'"
                stroke-width="1" stroke-dasharray="4,4" opacity="0.4" />
              <text v-if="eq.y > 8 && eq.y < chartH - 4" :x="chartW - 5" :y="eq.y - 4"
                :fill="eq.name === 'Eq1' ? '#ef4444' : eq.name === 'Eq2' ? '#fbbf24' : '#34d399'"
                font-size="8" text-anchor="end" class="font-svg-data" opacity="0.6">{{ eq.name }} ({{ eq.val.toFixed(2) }})</text>
            </template>

            <!-- Multi-trace -->
            <template v-if="showMultiple">
              <path v-for="(mp, i) in multiWPaths" :key="'mw'+i" :d="mp.path" fill="none" :stroke="mp.color" stroke-width="1.5" opacity="0.6" />
            </template>

            <!-- Main trace -->
            <path :d="wPath" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linejoin="round" />

            <!-- Labels -->
            <text x="5" y="12" fill="#555d70" font-size="9" class="font-svg-data">R(t)</text>
            <text :x="chartW / 2" :y="chartH + 22" fill="#555d70" font-size="9" text-anchor="middle" class="font-svg-data">Waktu t (tahun)</text>
            <text x="5" :y="chartH + 14" fill="#3a3f50" font-size="7" class="font-svg-data">0</text>
            <text :x="chartW - 5" :y="chartH + 14" fill="#3a3f50" font-size="7" text-anchor="end" class="font-svg-data">{{ tEnd }}</text>
          </svg>
          <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[9px] text-[#555d70] font-body">
            <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-blue-400 inline-block rounded"></span> R(t) utama</span>
          </div>
        </div>

        <!-- Cross-check table -->
        <div class="card">
          <h2 class="section-title mb-3">Cross-Check: RK4 vs Analitik</h2>
          <p class="text-[10px] text-[#555d70] font-body mb-3">
            Membandingkan nilai akhir dari solusi RK4 dengan equilibrium teoritis.
            Jarak kecil mengonfirmasi bahwa analisis kestabilan Jacobian benar.
          </p>
          <div class="overflow-x-auto">
            <table class="w-full text-[10px] font-data">
              <thead>
                <tr class="border-b border-[#1a1d2b]">
                  <th class="py-2 px-3 text-left text-[#555d70]">Equilibrium</th>
                  <th class="py-2 px-3 text-right text-[#555d70]">Be (teori)</th>
                  <th class="py-2 px-3 text-right text-[#555d70]">Re (teori)</th>
                  <th class="py-2 px-3 text-right text-[#555d70]">B(T) RK4</th>
                  <th class="py-2 px-3 text-right text-[#555d70]">R(T) RK4</th>
                  <th class="py-2 px-3 text-right text-[#555d70]">Jarak</th>
                  <th class="py-2 px-3 text-center text-[#555d70]">Konvergen?</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="eq in eqValues" :key="eq.name" class="border-b border-[#13151e]">
                  <td class="py-2 px-3" :class="eq.name === 'Eq1' ? 'text-red-400' : eq.name === 'Eq2' ? 'text-amber-400' : 'text-emerald-400'">{{ eq.name }}</td>
                  <td class="py-2 px-3 text-right text-[#c0c8d8]">{{ eq.Be.toFixed(4) }}</td>
                  <td class="py-2 px-3 text-right text-[#c0c8d8]">{{ eq.Re.toFixed(4) }}</td>
                  <td class="py-2 px-3 text-right text-[#c0c8d8]">{{ simResult.finalB.toFixed(4) }}</td>
                  <td class="py-2 px-3 text-right text-[#c0c8d8]">{{ simResult.finalW.toFixed(4) }}</td>
                  <td class="py-2 px-3 text-right font-data"
                    :class="Math.sqrt((simResult.finalB - eq.Be)**2 + (simResult.finalW - eq.Re)**2) < 0.1 ? 'text-emerald-400' : 'text-[#555d70]'">
                    {{ Math.sqrt((simResult.finalB - eq.Be)**2 + (simResult.finalW - eq.Re)**2).toFixed(6) }}
                  </td>
                  <td class="py-2 px-3 text-center">
                    <span v-if="Math.sqrt((simResult.finalB - eq.Be)**2 + (simResult.finalW - eq.Re)**2) < 0.1"
                      class="text-emerald-400">Ya</span>
                    <span v-else class="text-[#3a3f50]">Tidak</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- Interpretation -->
      <div class="card">
        <h2 class="section-title mb-3">Interpretasi</h2>
        <div class="text-[11px] sm:text-xs text-[#8892a6] font-body leading-relaxed space-y-2">
          <p>
            <strong class="text-teal-400">Tujuan cross-check:</strong> Jika analisis Jacobian mengatakan Eq3 stabil,
            maka solusi RK4 dari initial condition dekat Eq3 harus konvergen ke sana. Ini memvalidasi analisis.
          </p>
          <p>
            <strong class="text-amber-400">Saddle (Eq2) sebagai separatrix:</strong> Initial condition di atas Be(Eq2)
            biasanya konvergen ke Eq3. Di bawahnya, menuju Eq1 (gurun). Coba ubah B₀ dan lihat peralihan.
          </p>
          <p>
            <strong class="text-emerald-400">Mode perbandingan:</strong> Aktifkan "Bandingkan 4 initial condition"
            untuk melihat beberapa trajectory sekaligus. Ini menunjukkan basin of attraction dari setiap equilibrium.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-heading { font-family: 'Space Grotesk', system-ui, sans-serif; }
.font-body { font-family: 'Space Grotesk', system-ui, sans-serif; }
.font-data { font-family: 'JetBrains Mono', monospace; }
.font-svg-data { font-family: 'JetBrains Mono', monospace; }

.card { background: #0d1713; border-radius: 0.8rem; border: 1px solid #1f3229; padding: 1.25rem; box-shadow: 4px 4px 0 0 #08110d; transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
.card:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 0 #08110d; border-color: #2e4b3d; }
.section-title { font-size: 0.65rem; font-weight: 700; color: #83a592; text-transform: uppercase; letter-spacing: 0.1em; font-family: 'Space Grotesk', system-ui, sans-serif; }

.slider { width: 100%; height: 5px; border-radius: 999px; appearance: none; -webkit-appearance: none; cursor: pointer; background: #122019; }
.slider::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; border: 2px solid #08110d; box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
.slider-teal::-webkit-slider-thumb { background: #32d583; }
.slider-amber::-webkit-slider-thumb { background: #fbbf24; }
.slider-slate::-webkit-slider-thumb { background: #64748b; }
.slider-green::-webkit-slider-thumb { background: #34d399; }
.slider-sky::-webkit-slider-thumb { background: #60a5fa; }
</style>
