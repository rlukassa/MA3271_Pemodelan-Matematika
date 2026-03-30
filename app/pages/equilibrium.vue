<script setup>
import { ref, computed } from 'vue'

useHead({ title: 'Analisis Equilibrium · Klausmeier [No Nabla]' })

const a = ref(2.0)
const m = ref(0.45)

const aCrit = computed(() => 2 * m.value)

const analysis = computed(() => {
  const aVal = a.value, mVal = m.value
  const disc = aVal * aVal - 4 * mVal * mVal
  const results = []

  // Eq1: Be=0, Re=a (gurun)
  {
    const Be = 0, Re = aVal
    // J = [[-m + 2*Re*Be, Be^2], [-2*Re*Be, -1 - Be^2]]
    // At Be=0: J = [[-m, 0], [0, -1]]
    const j11 = -mVal, j12 = 0, j21 = 0, j22 = -1
    const trace = j11 + j22
    const det = j11 * j22 - j12 * j21
    const discJ = trace * trace - 4 * det
    let lambda1, lambda2, isComplex = false
    if (discJ >= 0) {
      lambda1 = (trace + Math.sqrt(discJ)) / 2
      lambda2 = (trace - Math.sqrt(discJ)) / 2
    } else {
      isComplex = true
      lambda1 = trace / 2
      lambda2 = Math.sqrt(-discJ) / 2 // imajiner
    }
    const stable = isComplex ? lambda1 < 0 : (lambda1 < 0 && lambda2 < 0)
    results.push({
      name: 'Eq1 (Gurun)',
      Be, Re,
      exists: true,
      jacobian: [[j11, j12], [j21, j22]],
      trace, det,
      lambda1, lambda2, isComplex,
      stable,
      type: stable ? 'Stabil (Node)' : 'Tidak Stabil',
      color: 'red'
    })
  }

  if (disc >= 0) {
    const sq = Math.sqrt(disc)

    // Eq2: bawah branch (saddle)
    {
      const Be = (aVal - sq) / (2 * mVal)
      if (Be > 0) {
        const Re = mVal / Be
        const j11 = -mVal + 2 * Re * Be
        const j12 = Be * Be
        const j21 = -2 * Re * Be
        const j22 = -1 - Be * Be
        const trace = j11 + j22
        const det = j11 * j22 - j12 * j21
        const discJ = trace * trace - 4 * det
        let lambda1, lambda2, isComplex = false
        if (discJ >= 0) {
          lambda1 = (trace + Math.sqrt(discJ)) / 2
          lambda2 = (trace - Math.sqrt(discJ)) / 2
        } else {
          isComplex = true
          lambda1 = trace / 2
          lambda2 = Math.sqrt(-discJ) / 2
        }
        const stable = isComplex ? lambda1 < 0 : (lambda1 < 0 && lambda2 < 0)
        results.push({
          name: 'Eq2 (Saddle)',
          Be, Re,
          exists: true,
          jacobian: [[j11, j12], [j21, j22]],
          trace, det,
          lambda1, lambda2, isComplex,
          stable,
          type: det < 0 ? 'Saddle Point' : (stable ? 'Stabil' : 'Tidak Stabil'),
          color: 'amber'
        })
      }
    }

    // Eq3: atas branch (stabil)
    {
      const Be = (aVal + sq) / (2 * mVal)
      if (Be > 0) {
        const Re = mVal / Be
        const j11 = -mVal + 2 * Re * Be
        const j12 = Be * Be
        const j21 = -2 * Re * Be
        const j22 = -1 - Be * Be
        const trace = j11 + j22
        const det = j11 * j22 - j12 * j21
        const discJ = trace * trace - 4 * det
        let lambda1, lambda2, isComplex = false
        if (discJ >= 0) {
          lambda1 = (trace + Math.sqrt(discJ)) / 2
          lambda2 = (trace - Math.sqrt(discJ)) / 2
        } else {
          isComplex = true
          lambda1 = trace / 2
          lambda2 = Math.sqrt(-discJ) / 2
        }
        const stable = isComplex ? lambda1 < 0 : (lambda1 < 0 && lambda2 < 0)
        results.push({
          name: 'Eq3 (Vegetasi)',
          Be, Re,
          exists: true,
          jacobian: [[j11, j12], [j21, j22]],
          trace, det,
          lambda1, lambda2, isComplex,
          stable,
          type: stable ? (isComplex ? 'Stabil (Spiral)' : 'Stabil (Node)') : (isComplex ? 'Tidak Stabil (Spiral)' : 'Tidak Stabil (Node)'),
          color: 'emerald'
        })
      }
    }
  }

  return results
})

// Stability summary
const stabilitySummary = computed(() => {
  const eqs = analysis.value
  const stableEqs = eqs.filter(e => e.stable).map(e => e.name)
  if (stableEqs.length === 0) return 'Tidak ada equilibrium stabil — sistem tidak terikat.'
  return `Equilibrium stabil: ${stableEqs.join(', ')}. Solusi dengan initial condition yang tepat akan menuju kesetimbangan ini.`
})

function fmtNum(n) {
  if (typeof n !== 'number' || isNaN(n)) return '—'
  return n.toFixed(4)
}
</script>

<template>
  <div class="min-h-screen bg-transparent text-[#e8edf5] font-body">
    <!-- Page Header -->
    <div class="border-b border-[#1a1d2b] bg-[#07080c]/90 backdrop-blur-md sticky top-0 z-10 lg:z-10">
      <div class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <h1 class="text-lg sm:text-xl font-heading font-bold tracking-tight">Analisis Equilibrium</h1>
        <p class="text-[9px] sm:text-xs text-[#555d70] mt-0.5 font-body">Matriks Jacobi · Eigenvalue · Kestabilan · Tujuan #2, #3, #4</p>
      </div>
    </div>

    <div class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">

      <!-- Penjelasan -->
      <div class="card">
        <h3 class="text-xs font-body font-semibold text-teal-400 mb-1.5">Tentang Fitur Ini</h3>
        <p class="text-[11px] sm:text-xs text-[#8892a6] font-body leading-relaxed">
          Halaman ini menghitung <strong class="text-teal-400">semua titik kesetimbangan</strong> (Eq1, Eq2, Eq3)
          dan menganalisis kestabilannya menggunakan <strong class="text-teal-400">Matriks Jacobi</strong>.
          Eigenvalue dari Jacobian menentukan apakah equilibrium bersifat stabil, tidak stabil, atau saddle.
        </p>
        <div class="mt-2 p-3 bg-[#0a0b10] rounded-lg border border-[#13151e] font-data text-[10px] text-[#8892a6] space-y-1">
          <p>Jacobian di titik equilibrium:</p>
          <LatexExpr class="ml-3" :expr="'J(B_e,R_e)=\\frac{\\partial(F,G)}{\\partial(B,R)}'" :block="true" />
          <LatexExpr class="ml-3" :expr="'J=\\begin{bmatrix}-m+2RB & B^2\\\\-2RB & -1-B^2\\end{bmatrix}'" :block="true" />
          <LatexExpr class="mt-1.5" :expr="'\\det(J-\\lambda I)=0\\Rightarrow \\lambda^2-\\operatorname{Tr}(J)\\lambda+\\det(J)=0'" :block="true" />
          <p class="text-emerald-400/70">Stabil jika: <strong>kedua eigenvalue bagian real negatif</strong></p>
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
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <label class="text-[#c0c8d8] font-body">Kematian (m)</label>
              <span class="font-data text-amber-400">{{ m.toFixed(2) }}</span>
            </div>
            <input type="range" v-model.number="m" min="0.1" max="1.0" step="0.01" class="slider slider-amber">
          </div>
        </div>
        <div class="mt-2 text-[10px] font-data">
          <span class="text-[#555d70]">Tipping point: a* = 2m = </span>
          <span :class="a >= aCrit ? 'text-emerald-400' : 'text-red-400'">{{ aCrit.toFixed(3) }}</span>
          <span class="text-[#555d70]"> · Diskriminan: a² − 4m² = </span>
          <span :class="(a*a - 4*m*m) >= 0 ? 'text-emerald-400' : 'text-red-400'">{{ (a*a - 4*m*m).toFixed(4) }}</span>
        </div>
      </div>

      <!-- Stability Summary -->
      <div :class="['card border-l-4', analysis.some(e => e.stable && e.name.includes('Vegetasi')) ? 'border-l-emerald-500' : 'border-l-red-500']">
        <p class="text-xs text-[#c0c8d8] font-body">{{ stabilitySummary }}</p>
      </div>

      <!-- Equilibrium Cards -->
      <div class=" grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div v-for="eq in analysis" :key="eq.name" class="card space-y-3">
          <!-- Header -->
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-body font-semibold" :class="`text-${eq.color}-400`">{{ eq.name }}</h3>
            <span :class="['px-2 py-0.5 rounded-md text-[9px] font-data', eq.stable ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400']">
              {{ eq.type }}
            </span>
          </div>

          <!-- Equilibrium values -->
          <div class="p-2.5 bg-[#0a0b10] rounded-lg border border-[#13151e]">
            <p class="text-[9px] text-[#3a3f50] font-body uppercase tracking-wider mb-1">Titik Kesetimbangan</p>
            <div class="font-data text-xs text-[#c0c8d8] space-y-0.5">
              <p>Be = <span :class="`text-${eq.color}-400`">{{ fmtNum(eq.Be) }}</span></p>
              <p>Re = <span :class="`text-${eq.color}-400`">{{ fmtNum(eq.Re) }}</span></p>
            </div>
          </div>

          <!-- Jacobian Matrix -->
          <div class="p-2.5 bg-[#0a0b10] rounded-lg border border-[#13151e]">
            <p class="text-[9px] text-[#3a3f50] font-body uppercase tracking-wider mb-1">Matriks Jacobi</p>
            <div class="font-data text-[10px] text-[#8892a6]">
              <div class="flex items-center gap-1">
                <span class="text-[#3a3f50]">[</span>
                <span class="w-20 text-right">{{ fmtNum(eq.jacobian[0][0]) }}</span>
                <span class="w-20 text-right">{{ fmtNum(eq.jacobian[0][1]) }}</span>
                <span class="text-[#3a3f50]">]</span>
              </div>
              <div class="flex items-center gap-1">
                <span class="text-[#3a3f50]">[</span>
                <span class="w-20 text-right">{{ fmtNum(eq.jacobian[1][0]) }}</span>
                <span class="w-20 text-right">{{ fmtNum(eq.jacobian[1][1]) }}</span>
                <span class="text-[#3a3f50]">]</span>
              </div>
            </div>
          </div>

          <!-- Eigenvalues -->
          <div class="p-2.5 bg-[#0a0b10] rounded-lg border border-[#13151e]">
            <p class="text-[9px] text-[#3a3f50] font-body uppercase tracking-wider mb-1">Eigenvalue</p>
            <div class="font-data text-xs space-y-0.5">
              <template v-if="!eq.isComplex">
                <p>λ₁ = <span :class="eq.lambda1 < 0 ? 'text-emerald-400' : 'text-red-400'">{{ fmtNum(eq.lambda1) }}</span></p>
                <p>λ₂ = <span :class="eq.lambda2 < 0 ? 'text-emerald-400' : 'text-red-400'">{{ fmtNum(eq.lambda2) }}</span></p>
              </template>
              <template v-else>
                <p>λ = <span :class="eq.lambda1 < 0 ? 'text-emerald-400' : 'text-red-400'">{{ fmtNum(eq.lambda1) }}</span>
                  ± <span class="text-sky-400">{{ fmtNum(eq.lambda2) }}i</span></p>
              </template>
            </div>
          </div>

          <!-- Trace & Det -->
          <div class="grid grid-cols-2 gap-2">
            <div class="p-2 bg-[#0a0b10] rounded-lg border border-[#13151e] text-center">
              <p class="text-[8px] text-[#3a3f50] font-body uppercase">Tr(J)</p>
              <p class="font-data text-xs" :class="eq.trace < 0 ? 'text-emerald-400' : 'text-red-400'">{{ fmtNum(eq.trace) }}</p>
            </div>
            <div class="p-2 bg-[#0a0b10] rounded-lg border border-[#13151e] text-center">
              <p class="text-[8px] text-[#3a3f50] font-body uppercase">det(J)</p>
              <p class="font-data text-xs" :class="eq.det > 0 ? 'text-emerald-400' : 'text-red-400'">{{ fmtNum(eq.det) }}</p>
            </div>
          </div>

          <!-- Stability explanation -->
          <div class="text-[9px] text-[#555d70] font-body leading-relaxed">
            <template v-if="eq.stable">
              <p class="text-emerald-400/80"><strong>Stabil:</strong> semua eigenvalue bagian real &lt; 0. Solusi yang dimulai dekat titik ini akan konvergen ke sini.</p>
            </template>
            <template v-else-if="eq.det < 0">
              <p class="text-amber-400/80"><strong>Saddle Point:</strong> det(J) &lt; 0, eigenvalue berbeda tanda. Titik ini menarik di satu arah tapi menolak di arah lain.</p>
            </template>
            <template v-else>
              <p class="text-red-400/80"><strong>Tidak Stabil:</strong> eigenvalue positif. Solusi akan menjauhi titik kesetimbangan ini.</p>
            </template>
          </div>
        </div>
      </div>

      <!-- Theory section -->
      <div class="card">
        <h2 class="section-title mb-3">Ringkasan Teori Kestabilan</h2>
        <div class="text-[11px] sm:text-xs text-[#8892a6] font-body leading-relaxed space-y-2">
          <p>
            Untuk sistem 2D, kestabilan ditentukan oleh <strong class="text-teal-400">Tr(J)</strong> dan
            <strong class="text-teal-400">det(J)</strong>:
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div class="p-3 bg-[#0a0b10] rounded-lg border border-[#13151e] text-[10px]">
              <p class="text-emerald-400 font-data mb-1">Stabil Node/Spiral:</p>
              <p>Tr(J) &lt; 0 <strong>dan</strong> det(J) &gt; 0</p>
            </div>
            <div class="p-3 bg-[#0a0b10] rounded-lg border border-[#13151e] text-[10px]">
              <p class="text-amber-400 font-data mb-1">Saddle Point:</p>
              <p>det(J) &lt; 0 (eigenvalue berbeda tanda)</p>
            </div>
            <div class="p-3 bg-[#0a0b10] rounded-lg border border-[#13151e] text-[10px]">
              <p class="text-red-400 font-data mb-1">Tidak Stabil Node/Spiral:</p>
              <p>Tr(J) &gt; 0</p>
            </div>
            <div class="p-3 bg-[#0a0b10] rounded-lg border border-[#13151e] text-[10px]">
              <p class="text-sky-400 font-data mb-1">Spiral (Osilasi):</p>
              <p>Tr(J)² − 4·det(J) &lt; 0 (eigenvalue kompleks)</p>
            </div>
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

.card { background: #0d1713; border-radius: 0.8rem; border: 1px solid #1f3229; padding: 1.25rem; box-shadow: 4px 4px 0 0 #08110d; transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
.card:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 0 #08110d; border-color: #2e4b3d; }
.section-title { font-size: 0.65rem; font-weight: 700; color: #83a592; text-transform: uppercase; letter-spacing: 0.1em; font-family: 'Space Grotesk', system-ui, sans-serif; }

.slider { width: 100%; height: 5px; border-radius: 999px; appearance: none; -webkit-appearance: none; cursor: pointer; background: #122019; }
.slider::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; border: 2px solid #08110d; box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
.slider-teal::-webkit-slider-thumb { background: #32d583; }
.slider-amber::-webkit-slider-thumb { background: #fbbf24; }
</style>
