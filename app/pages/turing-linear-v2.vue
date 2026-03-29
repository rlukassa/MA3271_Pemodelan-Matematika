<script setup>
import { computed, ref } from 'vue'

useHead({ title: 'Turing Linear V2 · Dispersi dan Stabilitas' })

const a = ref(2.0)
const m = ref(0.45)
const Db = ref(0.05)
const Dw = ref(2.0)
const kMax = ref(3.0)

const eqUpper = computed(() => {
  const av = a.value
  const mv = m.value
  const disc = av * av - 4 * mv * mv
  if (disc < 0) return null
  const B = (av + Math.sqrt(disc)) / (2 * mv)
  if (B <= 0) return null
  return { B, R: mv / B }
})

const J = computed(() => {
  const eq = eqUpper.value
  if (!eq) return null
  const B = eq.B
  const mv = m.value
  return {
    j11: mv,
    j12: B * B,
    j21: -2 * mv,
    j22: -1 - B * B
  }
})

function maxRealEigenAtK2(k2) {
  const mat = J.value
  if (!mat) return Number.NaN

  const a11 = mat.j11 - Db.value * k2
  const a12 = mat.j12
  const a21 = mat.j21
  const a22 = mat.j22 - Dw.value * k2

  const tr = a11 + a22
  const det = a11 * a22 - a12 * a21
  const disc = tr * tr - 4 * det

  if (disc >= 0) return 0.5 * (tr + Math.sqrt(disc))
  return 0.5 * tr
}

const dispersion = computed(() => {
  if (!J.value) return []
  const pts = []
  for (let k = 0; k <= kMax.value; k += 0.02) {
    const lam = maxRealEigenAtK2(k * k)
    pts.push({ k, lam })
  }
  return pts
})

const turingCheck = computed(() => {
  const mat = J.value
  if (!mat) return null
  const tr0 = mat.j11 + mat.j22
  const det0 = mat.j11 * mat.j22 - mat.j12 * mat.j21
  const stableNoDiff = tr0 < 0 && det0 > 0

  let maxLam = -1e9
  let argK = 0
  for (const p of dispersion.value) {
    if (p.lam > maxLam) {
      maxLam = p.lam
      argK = p.k
    }
  }

  return {
    tr0,
    det0,
    stableNoDiff,
    maxLam,
    argK,
    turingPossible: stableNoDiff && maxLam > 0
  }
})

const W = 760
const H = 260

const yBounds = computed(() => {
  if (dispersion.value.length === 0) return { yMin: -1, yMax: 1 }
  let yMin = Infinity
  let yMax = -Infinity
  for (const p of dispersion.value) {
    yMin = Math.min(yMin, p.lam)
    yMax = Math.max(yMax, p.lam)
  }
  const pad = Math.max(0.05, 0.15 * Math.max(Math.abs(yMin), Math.abs(yMax)))
  return { yMin: yMin - pad, yMax: yMax + pad }
})

function toSvg(k, lam) {
  const x = (k / kMax.value) * W
  const { yMin, yMax } = yBounds.value
  const y = H - ((lam - yMin) / (yMax - yMin)) * H
  return { x, y }
}

const dispPath = computed(() => {
  if (dispersion.value.length < 2) return ''
  return 'M' + dispersion.value.map((p) => {
    const c = toSvg(p.k, p.lam)
    return `${c.x.toFixed(2)},${c.y.toFixed(2)}`
  }).join('L')
})

const zeroLineY = computed(() => toSvg(0, 0).y)
const kStarX = computed(() => {
  const c = turingCheck.value
  if (!c) return 0
  return toSvg(c.argK, 0).x
})
</script>

<template>
  <div class="min-h-screen bg-transparent text-[#e8edf5] font-body">
    <div class="max-w-[1260px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div class="card">
        <h1 class="text-lg sm:text-xl font-heading font-bold">Turing Linear V2: Dispersi dan Syarat Ketidakstabilan</h1>
        <p class="text-xs text-[#9ab0a3] mt-1">Halaman ini menjawab gap analisis linear 2D: menilai stabilitas tanpa difusi, lalu memeriksa apakah ada mode k > 0 yang tumbuh.</p>
      </div>

      <div class="card">
        <h2 class="section-title mb-3">Kontrol Parameter</h2>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <label>
            <span class="label">a: {{ a.toFixed(2) }}</span>
            <input v-model.number="a" type="range" min="0.6" max="3.5" step="0.01" class="slider slider-green">
          </label>
          <label>
            <span class="label">m: {{ m.toFixed(2) }}</span>
            <input v-model.number="m" type="range" min="0.1" max="1.0" step="0.01" class="slider slider-amber">
          </label>
          <label>
            <span class="label">D_b: {{ Db.toFixed(3) }}</span>
            <input v-model.number="Db" type="range" min="0.005" max="0.30" step="0.001" class="slider slider-slate">
          </label>
          <label>
            <span class="label">D_w: {{ Dw.toFixed(3) }}</span>
            <input v-model.number="Dw" type="range" min="0.05" max="4.0" step="0.01" class="slider slider-slate">
          </label>
          <label>
            <span class="label">k_max: {{ kMax.toFixed(2) }}</span>
            <input v-model.number="kMax" type="range" min="1.0" max="6.0" step="0.1" class="slider slider-slate">
          </label>
        </div>
      </div>

      <div v-if="turingCheck" class="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div class="card xl:col-span-2">
          <h2 class="section-title mb-3">Kurva Dispersi λ_max(k)</h2>
          <svg :viewBox="`0 0 ${W} ${H + 30}`" class="w-full bg-[#0b1712] rounded-lg border border-[#21362b]" preserveAspectRatio="none">
            <line v-for="i in 5" :key="`grid-${i}`" :x1="0" :x2="W" :y1="H * i / 6" :y2="H * i / 6" stroke="#1c2d25" stroke-width="0.8"/>
            <line :x1="0" :x2="W" :y1="zeroLineY" :y2="zeroLineY" stroke="#2f7f5a" stroke-width="1" stroke-dasharray="5,4"/>
            <path :d="dispPath" fill="none" stroke="#e4c260" stroke-width="2.2"/>
            <line :x1="kStarX" :x2="kStarX" :y1="0" :y2="H" stroke="#5f86d2" stroke-width="1.2" stroke-dasharray="4,4"/>
            <text x="8" y="14" class="axis">λ_max(k)</text>
            <text :x="W / 2" :y="H + 22" class="axis" text-anchor="middle">Bilangan gelombang k</text>
          </svg>
        </div>

        <div class="card">
          <h2 class="section-title mb-3">Evaluasi Syarat</h2>
          <div class="space-y-2 text-sm">
            <p>Tr(J): <span class="font-data">{{ turingCheck.tr0.toFixed(6) }}</span></p>
            <p>det(J): <span class="font-data">{{ turingCheck.det0.toFixed(6) }}</span></p>
            <p>Stabil tanpa difusi: <span :class="turingCheck.stableNoDiff ? 'ok' : 'warn'">{{ turingCheck.stableNoDiff ? 'Ya' : 'Tidak' }}</span></p>
            <p>max λ(k): <span class="font-data" :class="turingCheck.maxLam > 0 ? 'ok' : 'warn'">{{ turingCheck.maxLam.toFixed(6) }}</span></p>
            <p>k* dominan: <span class="font-data">{{ turingCheck.argK.toFixed(4) }}</span></p>
            <div class="p-2 rounded border" :class="turingCheck.turingPossible ? 'border-[#2f7f5a] bg-[#11261c]' : 'border-[#6f5630] bg-[#241b11]'">
              <p class="font-semibold" :class="turingCheck.turingPossible ? 'ok' : 'warn'">{{ turingCheck.turingPossible ? 'Mode Turing terindikasi' : 'Belum ada mode Turing tumbuh' }}</p>
              <p class="text-xs text-[#96ab9f] mt-1">Kondisi kerja: stabil di k = 0, tetapi tidak stabil pada sebagian rentang k > 0.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title mb-2">Catatan Presentasi</h2>
        <p class="text-sm text-[#9ab0a3] leading-relaxed">Gunakan halaman ini saat menjelaskan tahap linearisasi PDE: matriks mode Fourier A(k) = J - k^2 D, lalu tunjukkan bahwa tanda λ_max(k) adalah indikator pertumbuhan mode spasial. Ini langsung menutup kebutuhan analisis dispersi terhadap k.</p>
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
.ok { color: #3fd08a; }
.warn { color: #e4c260; }

.slider { width: 100%; height: 5px; border-radius: 999px; appearance: none; -webkit-appearance: none; cursor: pointer; background: #122019; }
.slider::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 16px; height: 16px; border-radius: 999px; border: 2px solid #08110d; }
.slider-green::-webkit-slider-thumb { background: #3fd08a; }
.slider-amber::-webkit-slider-thumb { background: #e4c260; }
.slider-slate::-webkit-slider-thumb { background: #7a8f85; }
</style>
