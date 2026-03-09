<script setup>
import { ref } from 'vue'

const sidebarOpen = ref(false)
const route = useRoute()

const features = [
  {
    path: '/',
    icon: '⬡',
    label: 'Simulasi 2D',
    desc: 'Simulasi spasial real-time',
    status: 'existing'
  },
  {
    path: '/bifurkasi',
    icon: '⑂',
    label: 'Diagram Bifurkasi',
    desc: 'a vs Be dan Re',
    status: 'new'
  },
  {
    path: '/equilibrium',
    icon: '⊛',
    label: 'Analisis Equilibrium',
    desc: 'Jacobi & Eigenvalue',
    status: 'new'
  },
  {
    path: '/runge-kutta',
    icon: '∫',
    label: 'Runge-Kutta (RK4)',
    desc: 't vs B(t) dan R(t)',
    status: 'new'
  },
  {
    path: '/fase',
    icon: '◎',
    label: 'Potret Fase',
    desc: 'Nullclines & Trajectory',
    status: 'new'
  },
]
</script>

<template>
  <div class="min-h-screen bg-[#07080c] text-[#e8edf5] font-body flex">
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
      @click="sidebarOpen = false"
    />

\    <aside
      :class="[
        'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-[#0a0b10] border-r border-[#1a1d2b] flex flex-col transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
    >
\      <div class="px-4 py-4 border-b border-[#1a1d2b]">
        <NuxtLink to="/" class="flex items-center gap-2" @click="sidebarOpen = false">
          <span class="text-teal-400 text-2xl">⬡</span>
          <div>
            <h1 class="text-sm font-heading font-bold tracking-tight">Klausmeier Model</h1>
            <p class="text-[9px] text-[#3a3f50] font-body">MA3271 · Kelompok 4</p>
          </div>
        </NuxtLink>
      </div>

      <nav class="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        <p class="px-3 py-2 text-[8px] text-[#3a3f50] uppercase tracking-[0.15em] font-body">Fitur Analisis</p>
        <NuxtLink
          v-for="f in features"
          :key="f.path"
          :to="f.path"
          :class="[
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative',
            route.path === f.path
              ? 'bg-teal-500/10 border border-teal-500/20 text-teal-400'
              : 'hover:bg-[#13151e] text-[#8892a6] hover:text-[#c0c8d8] border border-transparent'
          ]"
          @click="sidebarOpen = false"
        >
          <span class="text-lg w-6 text-center shrink-0">{{ f.icon }}</span>
          <div class="min-w-0">
            <p class="text-xs font-medium truncate">{{ f.label }}</p>
            <p class="text-[9px] text-[#3a3f50] truncate">{{ f.desc }}</p>
          </div>
          <span
            v-if="f.status === 'new'"
            class="absolute right-2 top-1.5 text-[6px] px-1 py-0.5 bg-teal-500/15 text-teal-400/70 rounded font-data"
          >BARU</span>
        </NuxtLink>
      </nav>

      <div class="px-4 py-3 border-t border-[#1a1d2b] text-[8px] text-[#3a3f50] font-body space-y-1">
        <p>Model Klausmeier (tanpa ∇)</p>
        <p>dB/dt = −mB + WB²</p>
        <p>dW/dt = a − W − WB²</p>
      </div>
    </aside>

\    <div class="flex-1 min-w-0 flex flex-col">
      <header class="lg:hidden sticky top-0 z-20 bg-[#07080c]/90 backdrop-blur-md border-b border-[#1a1d2b]">
        <div class="px-4 py-3 flex items-center gap-3">
          <button
            @click="sidebarOpen = !sidebarOpen"
            class="p-1.5 rounded-lg bg-[#13151e] border border-[#1a1d2b] text-[#8892a6] hover:text-teal-400 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span class="text-teal-400 text-lg">⬡</span>
          <span class="text-sm font-heading font-bold">Klausmeier Model</span>
        </div>
      </header>

      <main class="flex-1">
        <slot />
      </main>
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
.font-data {
  font-family: 'JetBrains Mono', monospace;
}
</style>
