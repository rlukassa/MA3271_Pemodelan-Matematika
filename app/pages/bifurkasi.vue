<script setup>
import { ref, computed } from 'vue'

useHead({ title: 'Diagram Bifurkasi · Klausmeier [No Nabla]' })

const a = ref(2.0)
const m = ref(0.45)

const aCrit = computed(() => 2 * m.value)

const bifData = computed(() => {
  const mVal = m.value
  const ac = aCrit.value
  const upperBe = [], lowerBe = []
  const upperRe = [], lowerRe = []

  for (let aVal = 0.5; aVal <= 3.5; aVal += 0.005) {
    // Desert equilibrium selalu ada: Be=0, Re=a
    // Non-trivial: Be = (a ± sqrt(a²-4m²))/(2m), Re = m/Be
    const disc = aVal * aVal - 4 * mVal * mVal
    if (disc < 0) continue
    const sqrtDisc = Math.sqrt(disc)
    const be_up = (aVal + sqrtDisc) / (2 * mVal)
    const be_lo = (aVal - sqrtDisc) / (2 * mVal)
    const re_up = mVal / be_up
    const re_lo = mVal / be_lo

    upperBe.push({ a: aVal, val: be_up })
    lowerBe.push({ a: aVal, val: be_lo })
    upperRe.push({ a: aVal, val: re_up })
    lowerRe.push({ a: aVal, val: re_lo })
  }

  // Gurun: Be=0 untuk semua a; Re=a untuk semua a
  const desertBe = [{ a: 0.5, val: 0 }, { a: 3.5, val: 0 }]
  const desertRe = [{ a: 0.5, val: 0.5 }, { a: 3.5, val: 3.5 }]

  return { upperBe, lowerBe, upperRe, lowerRe, desertBe, desertRe, ac }
})

// nilai eq
const currentEq = computed(() => {
  const aVal = a.value, mVal = m.value
  const disc = aVal * aVal - 4 * mVal * mVal
  const eqs = [{ name: 'Eq1 (Gurun)', Be: 0, Re: aVal, exists: true }]
  if (disc >= 0) {
    const sq = Math.sqrt(disc)
    const be2 = (aVal - sq) / (2 * mVal)
    const be3 = (aVal + sq) / (2 * mVal)
    eqs.push({ name: 'Eq2 (Saddle)', Be: be2, Re: mVal / be2, exists: be2 > 0 })
    eqs.push({ name: 'Eq3 (Stabil)', Be: be3, Re: mVal / be3, exists: be3 > 0 })
  }
  return eqs
})

const W = 500, H = 240

function toSvgBe(aVal, bVal) {
  const x = ((aVal - 0.5) / 3.0) * W
  const y = H - (bVal / 6.0) * H
  return { x, y }
}

function toSvgRe(aVal, rVal) {
  const x = ((aVal - 0.5) / 3.0) * W
  const y = H - (rVal / 4.0) * H
  return { x, y }
}

function makePath(pts, mapFn) {
  if (pts.length < 2) return ''
  return 'M' + pts.map(p => {
    const { x, y } = mapFn(p.a, p.val)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join('L')
}

const upperBePath = computed(() => makePath(bifData.value.upperBe, toSvgBe))
const lowerBePath = computed(() => makePath(bifData.value.lowerBe, toSvgBe))
const desertBePath = computed(() => makePath(bifData.value.desertBe, toSvgBe))

const upperRePath = computed(() => makePath(bifData.value.upperRe, toSvgRe))
const lowerRePath = computed(() => makePath(bifData.value.lowerRe, toSvgRe))
const desertRePath = computed(() => makePath(bifData.value.desertRe, toSvgRe))

const currentX_Be = computed(() => toSvgBe(a.value, 0).x)
const tippingX_Be = computed(() => toSvgBe(aCrit.value, 0).x)
const currentX_Re = computed(() => toSvgRe(a.value, 0).x)
const tippingX_Re = computed(() => toSvgRe(aCrit.value, 0).x)

const eqDotsBe = computed(() => {
  return currentEq.value.filter(e => e.exists).map(e => ({
    ...e,
    ...toSvgBe(a.value, e.Be)
  }))
})

// Eq dots for Re chart
const eqDotsRe = computed(() => {
  return currentEq.value.filter(e => e.exists).map(e => ({
    ...e,
    ...toSvgRe(a.value, e.Re)
  }))
})
</script>

<template>
  <div class="min-h-screen bg-transparent text-[#e8edf5] font-body">
    <!-- Page Header -->
    <div class="border-b border-[#1a1d2b] bg-[#07080c]/90 backdrop-blur-md sticky top-0 z-10 lg:z-10">
      <div class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <h1 class="text-lg sm:text-xl font-heading font-bold tracking-tight">Diagram Bifurkasi</h1>
        <p class="text-[9px] sm:text-xs text-[#555d70] mt-0.5 font-body">Grafik a terhadap Be dan Re · Tipping Point · Tujuan #1</p>
      </div>
    </div>

    <div class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">

      <!-- Penjelasan -->
      <div class="card">
        <h3 class="text-xs font-body font-semibold text-teal-400 mb-1.5">Tentang Fitur Ini</h3>
        <p class="text-[11px] sm:text-xs text-[#8892a6] font-body leading-relaxed">
          Diagram bifurkasi menunjukkan bagaimana <strong class="text-teal-400">titik kesetimbangan</strong> (equilibrium)
          berubah seiring perubahan parameter curah hujan <strong class="text-teal-400">a</strong>.
          Dari persamaan steady state dB/dt = 0 dan dW/dt = 0, diperoleh persamaan kuadrat
          <span class="font-data">mB² − aB + m = 0</span> dengan solusi:
        </p>
        <div class="mt-2 p-3 bg-[#0a0b10] rounded-lg border border-[#13151e] font-data text-[11px] text-[#8892a6] space-y-1">
          <p><span class="text-red-400">Eq1:</span> Be = 0, Re = a (solusi trivial / gurun)</p>
          <p><span class="text-amber-400">Eq2:</span> Be = (a − √(a² − 4m²)) / 2m (saddle node)</p>
          <p><span class="text-emerald-400">Eq3:</span> Be = (a + √(a² − 4m²)) / 2m (stabil atas)</p>
          <p class="text-red-400/70 text-[10px] mt-1">Tipping point: a* = 2m = {{ aCrit.toFixed(3) }} — di bawah ini vegetasi kolaps!</p>
        </div>
      </div>

      <!-- Parameter Controls -->
      <div class="card">
        <h2 class="section-title mb-3">Parameter</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <label class="text-[#c0c8d8] font-body">Curah Hujan (a)</label>
              <span class="font-data text-teal-400">{{ a.toFixed(2) }}</span>
            </div>
            <input type="range" v-model.number="a" min="0.5" max="3.5" step="0.01" class="slider slider-teal">
            <div class="flex justify-between text-[9px] text-[#3a3f50] mt-0.5 font-body"><span>0.5</span><span>3.5</span></div>
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <label class="text-[#c0c8d8] font-body">Kematian (m)</label>
              <span class="font-data text-amber-400">{{ m.toFixed(2) }}</span>
            </div>
            <input type="range" v-model.number="m" min="0.1" max="1.0" step="0.01" class="slider slider-amber">
            <div class="flex justify-between text-[9px] text-[#3a3f50] mt-0.5 font-body"><span>0.1</span><span>1.0</span></div>
          </div>
        </div>
      </div>

      <!-- Current Equilibrium Values -->
      <div class="card">
        <h2 class="section-title mb-3">Nilai Equilibrium Saat Ini (a={{ a.toFixed(2) }}, m={{ m.toFixed(2) }})</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div v-for="eq in currentEq" :key="eq.name" :class="['p-3 rounded-lg border', eq.exists ? 'bg-[#0a0b10] border-[#13151e]' : 'bg-red-900/10 border-red-900/20 opacity-50']">
            <p class="font-data text-[10px] mb-1" :class="eq.name.includes('Gurun') ? 'text-red-400' : eq.name.includes('Saddle') ? 'text-amber-400' : 'text-emerald-400'">{{ eq.name }}</p>
            <p class="font-data text-xs text-[#c0c8d8]">Be = {{ eq.exists ? eq.Be.toFixed(4) : '—' }}</p>
            <p class="font-data text-xs text-[#c0c8d8]">Re = {{ eq.exists ? eq.Re.toFixed(4) : '—' }}</p>
            <p v-if="!eq.exists" class="text-[9px] text-red-400/60 font-body mt-1">Tidak ada (a &lt; a*)</p>
          </div>
        </div>
      </div>

      <!-- Bifurcation Chart: Be vs a -->
      <div class="card">
        <h2 class="section-title mb-3">Grafik 1: a vs Be <span class="text-teal-400/60">(Biomassa Equilibrium)</span></h2>
        <p class="text-[10px] text-[#555d70] font-body mb-3">
          Grafik ini sesuai dengan jurnal — menunjukkan cabang stabil atas (Eq3, hijau), cabang tidak stabil (Eq2, kuning putus-putus),
          dan gurun (Eq1, Be=0, merah). Di bawah tipping point a*={{ aCrit.toFixed(2) }}, hanya gurun yang tersisa.
        </p>
        <svg :viewBox="`0 0 ${W} ${H + 35}`" class="w-full bg-[#0a0b10] rounded-xl border border-[#13151e] p-2" preserveAspectRatio="xMidYMid meet">
          <!-- Grid -->
          <line v-for="i in 5" :key="'bh'+i" :x1="0" :y1="H * i / 6" :x2="W" :y2="H * i / 6" stroke="#13151e" stroke-width="0.5" />
          <line v-for="i in 5" :key="'bv'+i" :x1="W * i / 6" :y1="0" :x2="W * i / 6" :y2="H" stroke="#13151e" stroke-width="0.5" />

          <!-- Danger zone -->
          <rect :x="0" :y="0" :width="tippingX_Be" :height="H" fill="rgba(239,68,68,0.05)" />
          <line :x1="tippingX_Be" :y1="0" :x2="tippingX_Be" :y2="H" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.6" />
          <text :x="tippingX_Be + 5" :y="16" fill="#ef4444" font-size="10" opacity="0.8" class="font-svg-data">a* = {{ aCrit.toFixed(2) }}</text>

          <!-- Branches -->
          <path :d="desertBePath" fill="none" stroke="#ef4444" stroke-width="2.5" class="anim-draw" style="--draw-len: 600" />
          <path v-if="upperBePath" :d="upperBePath" fill="none" stroke="#34d399" stroke-width="2.5" class="anim-draw" style="--draw-len: 800" />
          <path v-if="lowerBePath" :d="lowerBePath" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.7" class="anim-draw" style="--draw-len: 800" />

          <!-- Current a cursor -->
          <line :x1="currentX_Be" :y1="0" :x2="currentX_Be" :y2="H" stroke="#5eead4" stroke-width="1.5" opacity="0.6" class="anim-cursor" />

          <!-- Eq dots -->
          <template v-for="(dot, i) in eqDotsBe" :key="'dbe'+i">
            <circle :cx="dot.x" :cy="dot.y" r="5"
              :fill="dot.name.includes('Gurun') ? '#ef4444' : dot.name.includes('Saddle') ? 'none' : '#34d399'"
              :stroke="dot.name.includes('Saddle') ? '#fbbf24' : 'none'" :stroke-width="dot.name.includes('Saddle') ? 2 : 0"
              class="anim-pulse-dot" />
            <text :x="dot.x + 8" :y="dot.y + 4" :fill="dot.name.includes('Gurun') ? '#ef4444' : dot.name.includes('Saddle') ? '#fbbf24' : '#34d399'" font-size="8" class="font-svg-data">{{ dot.name.split(' ')[0] }}</text>
          </template>

          <!-- Labels -->
          <text x="5" y="12" fill="#555d70" font-size="10" class="font-svg-data">Be</text>
          <text :x="W / 2" :y="H + 28" fill="#555d70" font-size="10" text-anchor="middle" class="font-svg-data">Curah Hujan (a)</text>
          <text x="5" :y="H + 16" fill="#555d70" font-size="8" class="font-svg-data">a=0.5</text>
          <text :x="W - 5" :y="H + 16" fill="#555d70" font-size="8" text-anchor="end" class="font-svg-data">a=3.5</text>

          <!-- Y-axis ticks -->
          <text x="-3" :y="H" fill="#3a3f50" font-size="7" text-anchor="end" class="font-svg-data">0</text>
          <text x="-3" :y="H * 4/6" fill="#3a3f50" font-size="7" text-anchor="end" class="font-svg-data">2</text>
          <text x="-3" :y="H * 2/6" fill="#3a3f50" font-size="7" text-anchor="end" class="font-svg-data">4</text>
          <text x="-3" :y="H * 0/6 + 8" fill="#3a3f50" font-size="7" text-anchor="end" class="font-svg-data">6</text>
        </svg>
        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[9px] text-[#555d70] font-body">
          <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-emerald-400 inline-block rounded"></span> Eq3 Stabil (atas)</span>
          <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-amber-400 inline-block rounded"></span> Eq2 Tidak stabil</span>
          <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-red-400 inline-block rounded"></span> Eq1 Gurun (Be=0)</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 bg-teal-400/30 inline-block rounded-full"></span> Nilai a saat ini</span>
        </div>
      </div>

      <!-- Bifurcation Chart: Re vs a -->
      <div class="card">
        <h2 class="section-title mb-3">Grafik 2: a vs Re <span class="text-sky-400/60">(Air Equilibrium)</span></h2>
        <p class="text-[10px] text-[#555d70] font-body mb-3">
          Grafik ini menunjukkan kesetimbangan air (Re = W*). Re = m/Be untuk solusi non-trivial.
          Pada gurun (Eq1), Re = a (seluruh air tersimpan tanpa diserap vegetasi).
          Perhatikan bahwa Re pada cabang stabil atas <em>lebih rendah</em> — vegetasi menyerap air.
        </p>
        <svg :viewBox="`0 0 ${W} ${H + 35}`" class="w-full bg-[#0a0b10] rounded-xl border border-[#13151e] p-2" preserveAspectRatio="xMidYMid meet">
          <!-- Grid -->
          <line v-for="i in 5" :key="'rh'+i" :x1="0" :y1="H * i / 6" :x2="W" :y2="H * i / 6" stroke="#13151e" stroke-width="0.5" />
          <line v-for="i in 5" :key="'rv'+i" :x1="W * i / 6" :y1="0" :x2="W * i / 6" :y2="H" stroke="#13151e" stroke-width="0.5" />

          <!-- Danger zone -->
          <rect :x="0" :y="0" :width="tippingX_Re" :height="H" fill="rgba(239,68,68,0.05)" />
          <line :x1="tippingX_Re" :y1="0" :x2="tippingX_Re" :y2="H" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.6" />
          <text :x="tippingX_Re + 5" :y="16" fill="#ef4444" font-size="10" opacity="0.8" class="font-svg-data">a* = {{ aCrit.toFixed(2) }}</text>

          <!-- Branches -->
          <path :d="desertRePath" fill="none" stroke="#ef4444" stroke-width="2.5" class="anim-draw" style="--draw-len: 600" />
          <path v-if="upperRePath" :d="upperRePath" fill="none" stroke="#34d399" stroke-width="2.5" class="anim-draw" style="--draw-len: 800" />
          <path v-if="lowerRePath" :d="lowerRePath" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.7" class="anim-draw" style="--draw-len: 800" />

          <!-- Current a cursor -->
          <line :x1="currentX_Re" :y1="0" :x2="currentX_Re" :y2="H" stroke="#5eead4" stroke-width="1.5" opacity="0.6" class="anim-cursor" />

          <!-- Eq dots -->
          <template v-for="(dot, i) in eqDotsRe" :key="'dre'+i">
            <circle :cx="dot.x" :cy="dot.y" r="5"
              :fill="dot.name.includes('Gurun') ? '#ef4444' : dot.name.includes('Saddle') ? 'none' : '#34d399'"
              :stroke="dot.name.includes('Saddle') ? '#fbbf24' : 'none'" :stroke-width="dot.name.includes('Saddle') ? 2 : 0"
              class="anim-pulse-dot" />
            <text :x="dot.x + 8" :y="dot.y + 4" :fill="dot.name.includes('Gurun') ? '#ef4444' : dot.name.includes('Saddle') ? '#fbbf24' : '#34d399'" font-size="8" class="font-svg-data">{{ dot.name.split(' ')[0] }}</text>
          </template>

          <!-- Labels -->
          <text x="5" y="12" fill="#555d70" font-size="10" class="font-svg-data">Re</text>
          <text :x="W / 2" :y="H + 28" fill="#555d70" font-size="10" text-anchor="middle" class="font-svg-data">Curah Hujan (a)</text>
          <text x="5" :y="H + 16" fill="#555d70" font-size="8" class="font-svg-data">a=0.5</text>
          <text :x="W - 5" :y="H + 16" fill="#555d70" font-size="8" text-anchor="end" class="font-svg-data">a=3.5</text>

          <!-- Y-axis ticks -->
          <text x="-3" :y="H" fill="#3a3f50" font-size="7" text-anchor="end" class="font-svg-data">0</text>
          <text x="-3" :y="H * 3/4" fill="#3a3f50" font-size="7" text-anchor="end" class="font-svg-data">1</text>
          <text x="-3" :y="H * 2/4" fill="#3a3f50" font-size="7" text-anchor="end" class="font-svg-data">2</text>
          <text x="-3" :y="H * 1/4" fill="#3a3f50" font-size="7" text-anchor="end" class="font-svg-data">3</text>
        </svg>
        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[9px] text-[#555d70] font-body">
          <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-emerald-400 inline-block rounded"></span> Eq3 Stabil (Re rendah)</span>
          <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-amber-400 inline-block rounded"></span> Eq2 Tidak stabil</span>
          <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-red-400 inline-block rounded"></span> Eq1 Gurun (Re=a)</span>
        </div>
      </div>

      <!-- Interpretation -->
      <div class="card">
        <h2 class="section-title mb-3">Interpretasi</h2>
        <div class="text-[11px] sm:text-xs text-[#8892a6] font-body leading-relaxed space-y-2">
          <p>
            <strong class="text-red-400">Tipping Point (a* = 2m = {{ aCrit.toFixed(3) }}):</strong>
            Ketika curah hujan <span class="font-data text-teal-400">a</span> turun di bawah a*, solusi non-trivial menghilang.
            Ekosistem hanya memiliki <em>satu</em> kesetimbangan: gurun (Be = 0).
          </p>
          <p>
            <strong class="text-emerald-400">Di atas tipping point:</strong>
            Terdapat tiga equilibrium. Eq3 (stabil atas) menarik sebagian besar initial condition.
            Vegetasi bisa bertahan dengan biomassa tinggi dan air rendah (diserap oleh tanaman).
          </p>
          <p>
            <strong class="text-amber-400">Saddle node (Eq2):</strong>
            Titik kesetimbangan tidak stabil ini menjadi pemisah (separatrix). Initial condition
            di atas Eq2 akan menuju Eq3 (hutan), di bawahnya menuju Eq1 (gurun).
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

.anim-draw { stroke-dasharray: var(--draw-len, 600); stroke-dashoffset: var(--draw-len, 600); animation: svgDraw 1.4s cubic-bezier(0.65,0,0.35,1) forwards; }
@keyframes svgDraw { to { stroke-dashoffset: 0; } }
.anim-cursor { transition: x1 0.3s ease, x2 0.3s ease; }
.anim-pulse-dot { animation: pulseDot 2s ease-in-out infinite; transition: cx 0.3s ease, cy 0.3s ease; }
@keyframes pulseDot { 0%, 100% { r: 4; opacity: 1; } 50% { r: 6; opacity: 0.7; } }
</style>
