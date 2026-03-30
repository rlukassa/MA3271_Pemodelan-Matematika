<script setup>
import { ref, computed, shallowRef, onMounted, watch } from 'vue'

useHead({ title: 'Potret Fase · Klausmeier [No Nabla]' })

const a = ref(2.0)
const m = ref(0.45)
const showTrajectories = ref(true)
const showVectorField = ref(true)

const W_SVG = 500, H_SVG = 400
const bRange = 6, wRange = 4

function toSvg(bVal, wVal) {
  const x = (bVal / bRange) * W_SVG
  const y = H_SVG - (wVal / wRange) * H_SVG
  return { x, y }
}

const nullclines = computed(() => {
  const mVal = m.value, aVal = a.value
  const bNull = [] // dB/dt = 0: R = m/B
  const wNull = [] // dR/dt = 0: R = a/(1+B²)

  for (let bv = 0.02; bv <= bRange; bv += 0.02) {
    const wv = mVal / bv
    if (wv <= wRange) bNull.push({ B: bv, W: wv })
  }
  for (let bv = 0; bv <= bRange; bv += 0.02) {
    wNull.push({ B: bv, W: aVal / (1 + bv * bv) })
  }

  return { bNull, wNull }
})

const bNullPath = computed(() => {
  const pts = nullclines.value.bNull
  if (pts.length < 2) return ''
  return 'M' + pts.map(p => {
    const { x, y } = toSvg(p.B, p.W)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join('L')
})

const wNullPath = computed(() => {
  const pts = nullclines.value.wNull
  if (pts.length < 2) return ''
  return 'M' + pts.map(p => {
    const { x, y } = toSvg(p.B, p.W)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join('L')
})

const steadyStates = computed(() => {
  const aVal = a.value, mVal = m.value
  const disc = aVal * aVal - 4 * mVal * mVal
  const ss = [{ name: 'Eq1', B: 0, W: aVal, stable: true, type: 'gurun' }]
  if (disc >= 0) {
    const sq = Math.sqrt(disc)
    const B1 = (aVal - sq) / (2 * mVal)
    const B2 = (aVal + sq) / (2 * mVal)
    if (B1 > 0) ss.push({ name: 'Eq2', B: B1, W: mVal / B1, stable: false, type: 'saddle' })
    if (B2 > 0) ss.push({ name: 'Eq3', B: B2, W: mVal / B2, stable: B2 > 1, type: 'vegetasi' })
  }
  return ss
})

function computeTrajectory(b0, w0, aVal, mVal, tMax, dt) {
  function fB(b, w) { return -mVal * b + w * b * b }
  function fW(b, w) { return aVal - w - w * b * b }
  const pts = [{ B: b0, W: w0 }]
  let B = b0, W = w0
  const n = Math.ceil(tMax / dt)
  const skip = Math.max(1, Math.floor(n / 500))
  for (let i = 1; i <= n; i++) {
    const k1B = fB(B, W), k1W = fW(B, W)
    const k2B = fB(B + 0.5*dt*k1B, W + 0.5*dt*k1W), k2W = fW(B + 0.5*dt*k1B, W + 0.5*dt*k1W)
    const k3B = fB(B + 0.5*dt*k2B, W + 0.5*dt*k2W), k3W = fW(B + 0.5*dt*k2B, W + 0.5*dt*k2W)
    const k4B = fB(B + dt*k3B, W + dt*k3W), k4W = fW(B + dt*k3B, W + dt*k3W)
    B = Math.max(0, B + (dt/6)*(k1B + 2*k2B + 2*k3B + k4B))
    W = Math.max(0, W + (dt/6)*(k1W + 2*k2W + 2*k3W + k4W))
    if (i % skip === 0) pts.push({ B, W })
  }
  return pts
}

const trajectoryICs = [
  { B: 0.1, W: 0.5, color: '#f87171' },
  { B: 0.1, W: 2.0, color: '#fb923c' },
  { B: 0.5, W: 3.5, color: '#fbbf24' },
  { B: 1.5, W: 3.0, color: '#a78bfa' },
  { B: 3.0, W: 0.3, color: '#22d3ee' },
  { B: 5.0, W: 0.5, color: '#34d399' },
  { B: 2.0, W: 1.5, color: '#f472b6' },
  { B: 4.5, W: 2.0, color: '#818cf8' },
]

const trajectories = shallowRef([])

function computeTrajectories() {
  const aVal = a.value, mVal = m.value
  trajectories.value = trajectoryICs.map(ic => {
    const pts = computeTrajectory(ic.B, ic.W, aVal, mVal, 60, 0.02)
    const path = 'M' + pts.map(p => {
      const { x, y } = toSvg(p.B, p.W)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join('L')
    const last = pts[pts.length - 1]
    const ss = steadyStates.value
    let closestEq = ss[0]
    let minDist = Infinity
    for (const eq of ss) {
      const d = Math.sqrt((last.B - eq.B)**2 + (last.W - eq.W)**2)
      if (d < minDist) { minDist = d; closestEq = eq }
    }
    return { ...ic, path, start: toSvg(ic.B, ic.W), convergesTo: closestEq.name, minDist }
  })
}

const vectorArrows = computed(() => {
  const aVal = a.value, mVal = m.value
  const arrows = []
  const stepB = bRange / 16, stepW = wRange / 12
  for (let bv = stepB; bv < bRange; bv += stepB) {
    for (let wv = stepW / 2; wv < wRange; wv += stepW) {
      const dB = -mVal * bv + wv * bv * bv
      const dW = aVal - wv - wv * bv * bv
      const mag = Math.sqrt(dB * dB + dW * dW)
      if (mag < 0.001) continue
      const scale = Math.min(12, mag * 3) / mag
      const { x, y } = toSvg(bv, wv)
      const dx = dB * scale * (W_SVG / bRange)
      const dy = -dW * scale * (H_SVG / wRange)
      arrows.push({ x, y, dx, dy, mag })
    }
  }
  return arrows
})

watch([a, m], computeTrajectories, { immediate: false })
onMounted(computeTrajectories)
</script>

<template>
  <div class="min-h-screen bg-transparent text-[#e8edf5] font-body">
    <div class="border-b border-[#1a1d2b] bg-[#07080c]/90 backdrop-blur-md sticky top-0 z-10 lg:z-10">
      <div class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <h1 class="text-lg sm:text-xl font-heading font-bold tracking-tight">Potret Fase</h1>
        <p class="text-[9px] sm:text-xs text-[#555d70] mt-0.5 font-body">Nullclines · Vector Field · Trajectory · Tujuan #3</p>
      </div>
    </div>

    <div class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">

      <!-- Penjelasan -->
      <div class="card">
        <h3 class="text-xs font-body font-semibold text-teal-400 mb-1.5">Tentang Fitur Ini</h3>
        <p class="text-[11px] sm:text-xs text-[#8892a6] font-body leading-relaxed">
          Potret fase menampilkan <strong class="text-teal-400">nullclines</strong> dan <strong class="text-teal-400">trajectory</strong>
          di bidang (B, R). Nullclines adalah kurva di mana turunan bernilai nol: dB/dt = 0 (hijau) dan dR/dt = 0 (biru).
          Titik potong nullclines adalah <em>titik kesetimbangan</em>. Trajectory menunjukkan <strong class="text-amber-400">ke mana solusi akan lari</strong>
          dari berbagai initial condition.
        </p>
        <div class="mt-2 p-3 bg-[#0a0b10] rounded-lg border border-[#13151e] font-data text-[10px] text-[#8892a6] space-y-1">
          <p><span class="text-emerald-400">dB/dt = 0:</span> R = m/B (hiperbola)</p>
          <p><span class="text-sky-400">dR/dt = 0:</span> R = a/(1 + B²) (Lorentzian)</p>
          <p class="mt-1.5 text-[9px]">Panah vektor menunjukkan arah aliran, trajectory dihitung dengan RK4.</p>
        </div>
      </div>

      <!-- Parameters -->
      <div class="card">
        <h2 class="section-title mb-3">Parameter</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>
        <div class="flex items-center gap-4 mt-3">
          <button @click="computeTrajectories" class="px-4 py-2 bg-teal-600/80 hover:bg-teal-600 text-white text-xs rounded-xl font-semibold transition font-body">
            Hitung Trajectory
          </button>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" v-model="showTrajectories" class="accent-teal-400 w-3.5 h-3.5" />
            <span class="text-[10px] text-[#555d70] font-body">Trajectory</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" v-model="showVectorField" class="accent-amber-400 w-3.5 h-3.5" />
            <span class="text-[10px] text-[#555d70] font-body">Vector Field</span>
          </label>
        </div>
      </div>

      <!-- Phase Portrait SVG -->
      <div class="card">
        <h2 class="section-title mb-3">Potret Fase (B, R)</h2>
        <svg :viewBox="`0 0 ${W_SVG} ${H_SVG + 35}`" class="w-full bg-[#0a0b10] rounded-xl border border-[#13151e]" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="#3a3f50" />
            </marker>
          </defs>

          <!-- Grid -->
          <line v-for="i in 5" :key="'gh'+i" :x1="0" :y1="H_SVG * i / 6" :x2="W_SVG" :y2="H_SVG * i / 6" stroke="#13151e" stroke-width="0.5" />
          <line v-for="i in 5" :key="'gv'+i" :x1="W_SVG * i / 6" :y1="0" :x2="W_SVG * i / 6" :y2="H_SVG" stroke="#13151e" stroke-width="0.5" />

          <!-- Vector field -->
          <template v-if="showVectorField">
            <line v-for="(arr, i) in vectorArrows" :key="'va'+i"
              :x1="arr.x" :y1="arr.y" :x2="arr.x + arr.dx" :y2="arr.y + arr.dy"
              stroke="#3a3f50" :stroke-width="0.8" marker-end="url(#arrowhead)" opacity="0.5" />
          </template>

          <!-- Nullclines -->
          <path :d="bNullPath" fill="none" stroke="#34d399" stroke-width="2.5" />
          <path :d="wNullPath" fill="none" stroke="#60a5fa" stroke-width="2.5" />

          <!-- Trajectories -->
          <template v-if="showTrajectories">
            <path v-for="(traj, i) in trajectories" :key="'tr'+i" :d="traj.path"
              fill="none" :stroke="traj.color" stroke-width="1.5" opacity="0.7" stroke-linejoin="round" />
            <!-- Start points -->
            <circle v-for="(traj, i) in trajectories" :key="'ts'+i"
              :cx="traj.start.x" :cy="traj.start.y" r="4" :fill="traj.color" stroke="#07080c" stroke-width="1" />
          </template>

          <!-- Steady states -->
          <template v-for="(ss, i) in steadyStates" :key="'ss'+i">
            <circle
              :cx="toSvg(ss.B, ss.W).x" :cy="toSvg(ss.B, ss.W).y"
              r="7"
              :fill="ss.stable ? (ss.type === 'gurun' ? '#ef4444' : '#34d399') : 'none'"
              :stroke="ss.stable ? '#07080c' : '#fbbf24'"
              :stroke-width="ss.stable ? 1.5 : 2.5"
            />
            <text :x="toSvg(ss.B, ss.W).x + 10" :y="toSvg(ss.B, ss.W).y + 4"
              :fill="ss.type === 'gurun' ? '#ef4444' : ss.type === 'saddle' ? '#fbbf24' : '#34d399'"
              font-size="10" class="font-svg-data">{{ ss.name }}</text>
          </template>

          <!-- Axis labels -->
          <text x="5" y="14" fill="#555d70" font-size="10" class="font-svg-data">R (Air)</text>
          <text :x="W_SVG / 2" :y="H_SVG + 28" fill="#555d70" font-size="10" text-anchor="middle" class="font-svg-data">B (Biomassa)</text>
          <text x="5" :y="H_SVG + 16" fill="#3a3f50" font-size="8" class="font-svg-data">0</text>
          <text :x="W_SVG - 5" :y="H_SVG + 16" fill="#3a3f50" font-size="8" text-anchor="end" class="font-svg-data">{{ bRange }}</text>
          <text x="-3" :y="H_SVG" fill="#3a3f50" font-size="7" text-anchor="end" class="font-svg-data">0</text>
          <text x="-3" y="12" fill="#3a3f50" font-size="7" text-anchor="end" class="font-svg-data">{{ wRange }}</text>
        </svg>
        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[9px] text-[#555d70] font-body">
          <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-emerald-400 inline-block rounded"></span> dB/dt = 0</span>
          <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-blue-400 inline-block rounded"></span> dR/dt = 0</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 bg-emerald-400 inline-block rounded-full"></span> Stabil</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 border border-amber-400 inline-block rounded-full"></span> Saddle</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 bg-red-400 inline-block rounded-full"></span> Gurun</span>
        </div>
      </div>

      <!-- Trajectory convergence table -->
      <div v-if="trajectories.length > 0" class="card">
        <h2 class="section-title mb-3">Analisis Trajectory: Solusi Lari Kemana?</h2>
        <p class="text-[10px] text-[#555d70] font-body mb-3">
          Setiap initial condition ditunjukkan sebagai titik berwarna. Kolom "Konvergen ke" menunjukkan
          equilibrium terdekat di akhir simulasi — inilah yang membuktikan basin of attraction.
        </p>
        <div class="overflow-x-auto">
          <table class="w-full text-[10px] font-data">
            <thead>
              <tr class="border-b border-[#1a1d2b]">
                <th class="py-2 px-3 text-left text-[#555d70]">IC</th>
                <th class="py-2 px-3 text-right text-[#555d70]">B₀</th>
                <th class="py-2 px-3 text-right text-[#555d70]">R₀</th>
                <th class="py-2 px-3 text-center text-[#555d70]">Konvergen ke</th>
                <th class="py-2 px-3 text-right text-[#555d70]">Jarak</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(traj, i) in trajectories" :key="'tt'+i" class="border-b border-[#13151e]">
                <td class="py-2 px-3">
                  <span class="inline-block w-3 h-3 rounded-full mr-1" :style="{background: traj.color}"></span>
                </td>
                <td class="py-2 px-3 text-right text-[#c0c8d8]">{{ traj.B.toFixed(1) }}</td>
                <td class="py-2 px-3 text-right text-[#c0c8d8]">{{ traj.W.toFixed(1) }}</td>
                <td class="py-2 px-3 text-center"
                  :class="traj.convergesTo === 'Eq3' ? 'text-emerald-400' : traj.convergesTo === 'Eq1' ? 'text-red-400' : 'text-amber-400'">
                  {{ traj.convergesTo }}
                </td>
                <td class="py-2 px-3 text-right text-[#555d70]">{{ traj.minDist.toFixed(4) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Interpretation -->
      <div class="card">
        <h2 class="section-title mb-3">Interpretasi</h2>
        <div class="text-[11px] sm:text-xs text-[#8892a6] font-body leading-relaxed space-y-2">
          <p>
            <strong class="text-teal-400">Nullclines:</strong> Di atas nullcline hijau, dB/dt &lt; 0 (biomassa turun).
            Di bawahnya, dB/dt &gt; 0 (biomassa naik). Hal serupa untuk nullcline biru.
          </p>
          <p>
            <strong class="text-emerald-400">Basin of Attraction:</strong> Kumpulan semua initial condition yang
            menuju equilibrium yang sama membentuk "basin of attraction". Saddle node (Eq2) berada
            di batas antara basin Eq1 dan Eq3.
          </p>
          <p>
            <strong class="text-amber-400">Vector Field:</strong> Panah menunjukkan arah dan kecepatan relatif
            aliran di setiap titik. Perhatikan bagaimana panah berputar dengan arah yang konsisten di sekitar
            titik kesetimbangan spiral.
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
</style>
