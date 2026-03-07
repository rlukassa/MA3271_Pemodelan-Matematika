<script setup>
import { onMounted, ref } from 'vue'
import { useRafFn } from '@vueuse/core'

// --- Parameter Model (Bisa diubah via UI) ---
const a = ref(2.0)    // Curah hujan (kg m^-2 year^-1)
const m = ref(0.45)   // Laju kematian (year^-1)
const Dp = 0.1        // Difusi Vegetasi (m^2 year^-1)
const Dw = 2.0        // Difusi Air (m^2 year^-1)

// config
const size = 100
const dt = 0.05
const canvasRef = ref(null)

// Matriks B (Biomassa) dan W (Air)
let B = new Float32Array(size * size)
let W = new Float32Array(size * size)

// 
const initSim = () => {
  for (let i = 0; i < size * size; i++) {
    B[i] = Math.random() * 0.2
    W[i] = a.value
  }
}

// Fungsi Laplacian (Penyebaran Spasial 2D)
const getLaplacian = (arr, x, y) => {
  const idx = y * size + x
  const left = y * size + (x - 1 + size) % size
  const right = y * size + (x + 1) % size
  const top = ((y - 1 + size) % size) * size + x
  const bottom = ((y + 1) % size) * size + x
  return arr[left] + arr[right] + arr[top] + arr[bottom] - 4 * arr[idx]
}

const update = () => {
  let nextB = new Float32Array(B)
  let nextW = new Float32Array(W)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      const lapB = getLaplacian(B, x, y)
      const lapW = getLaplacian(W, x, y)

      // Persamaan Reaksi-Difusi (Sesuai draf Anda)
      // dB/dt = -mB + WB^2 + Dp*Lap(B)
      // dW/dt = a - W - WB^2 + Dw*Lap(W)
      nextB[i] += dt * (-m.value * B[i] + W[i] * (B[i] ** 2) + Dp * lapB)
      nextW[i] += dt * (a.value - W[i] - W[i] * (B[i] ** 2) + Dw * lapW)
    }
  }
  B = nextB
  W = nextW
  draw()
}

const draw = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const imgData = ctx.createImageData(size, size)

  for (let i = 0; i < B.length; i++) {
    const val = B[i] * 100 // Skala warna hijau
    imgData.data[i * 4 + 0] = 34  // R
    imgData.data[i * 4 + 1] = val + 50 // G (Hijau bergantung kepadatan)
    imgData.data[i * 4 + 2] = 34  // B
    imgData.data[i * 4 + 3] = 255 // Alpha
  }
  ctx.putImageData(imgData, 0, 0)
}

const { pause, resume, isActive } = useRafFn(update, { immediate: false })

onMounted(() => {
  initSim()
  resume()
})
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center">
    <h1 class="text-3xl font-bold mb-4">Simulasi Resiliensi Ekosistem 2D</h1>
    <p class="mb-8 text-slate-400">Model Turing Pattern: Transisi Vegetasi vs Kekeringan</p>

    <div class="flex flex-wrap gap-12 justify-center items-start">
      <div class="bg-slate-800 p-4 rounded-xl shadow-2xl">
        <canvas ref="canvasRef" :width="size" :height="size" class="w-80 h-80 image-pixelated border-4 border-slate-700 rounded-lg"></canvas>
        <div class="mt-4 flex justify-between text-sm">
          <span>Skala: kg m⁻²</span>
          <span class="text-green-400"> Vegetasi Hidup</span>
        </div>
      </div>

      <div class="bg-slate-800 p-6 rounded-xl w-80 space-y-6">
        <div>
          <label class="block mb-2 font-medium">Curah Hujan (a): {{ a }}</label>
          <input type="range" v-model.number="a" min="0.5" max="3.0" step="0.1" class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500">
          <p class="text-xs text-slate-400 mt-1">Sesuaikan untuk memicu tipping point.</p>
        </div>

        <div>
          <label class="block mb-2 font-medium">Laju Kematian (m): {{ m }}</label>
          <input type="range" v-model.number="m" min="0.1" max="1.0" step="0.05" class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500">
        </div>

        <div class="pt-4 border-t border-slate-700 space-y-2">
          <button @click="initSim" class="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-bold transition">Reset Simulasi</button>
          <button @click="isActive ? pause() : resume()" class="w-full border border-slate-600 py-2 rounded-lg transition">
            {{ isActive ? 'Pause' : 'Resume' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-pixelated {
  image-rendering: pixelated;
}
</style>