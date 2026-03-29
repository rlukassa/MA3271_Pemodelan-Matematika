<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const sidebarOpen = ref(false)
const route = useRoute()
const scrollProgress = ref(0)

const ticker = [
  'MA3271 PEMODELAN MATEMATIKA',
  'KLAUSMEIER MODEL',
  'TURING PATTERN ANALYSIS',
  'BIFURKASI DAN EQUILIBRIUM',
  'SIMULASI NUMERIK RK4'
]

function updateScrollProgress() {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  const maxScroll = root.scrollHeight - root.clientHeight
  if (maxScroll <= 0) {
    scrollProgress.value = 0
    return
  }
  scrollProgress.value = (window.scrollY / maxScroll) * 100
}

onMounted(() => {
  updateScrollProgress()
  window.addEventListener('scroll', updateScrollProgress, { passive: true })
  window.addEventListener('resize', updateScrollProgress)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateScrollProgress)
  window.removeEventListener('resize', updateScrollProgress)
})

const features = [
  {
    path: '/',
    icon: 'S2D',
    label: 'Simulasi 2D',
    desc: 'Simulasi spasial real-time',
    status: 'stable',
    version: 1
  },
  {
    path: '/bifurkasi',
    icon: 'BIF',
    label: 'Diagram Bifurkasi',
    desc: 'a vs Be dan Re',
    status: 'stable',
    version: 1
  },
  {
    path: '/equilibrium',
    icon: 'EQ',
    label: 'Analisis Equilibrium',
    desc: 'Jacobi & Eigenvalue',
    status: 'stable',
    version: 1
  },
  {
    path: '/fase',
    icon: 'FAS',
    label: 'Potret Fase',
    desc: 'Nullclines & Trajectory',
    status: 'stable',
    version: 1
  },
  {
    path: '/runge-kutta',
    icon: 'RK4',
    label: 'Runge-Kutta (V1)',
    desc: 'Baseline numerik ODE',
    status: 'stable',
    version: 1
  },
  {
    path: '/runge-kutta-v2',
    icon: 'RK2',
    label: 'Runge-Kutta (V2)',
    desc: 'Metodologi + validasi',
    status: 'new',
    version: 2
  },
  {
    path: '/turing-linear-v2',
    icon: 'TL2',
    label: 'Turing Linear (V2)',
    desc: 'Dispersi λ(k) & syarat',
    status: 'new',
    version: 2
  },
  {
    path: '/sweep-v2',
    icon: 'SW2',
    label: 'Parameter Sweep (V2)',
    desc: 'Atlas pola kuantitatif',
    status: 'new',
    version: 2
  },
  {
    path: '/histeresis-v2',
    icon: 'HY2',
    label: 'Histeresis (V2)',
    desc: 'Forward-backward a',
    status: 'new',
    version: 2
  },
  {
    path: '/laporan-v2',
    icon: 'LP2',
    label: 'Paket Laporan (V2)',
    desc: 'Checklist naskah final',
    status: 'new',
    version: 2
  },
]

const v1Features = computed(() => features.filter(f => f.version === 1))
const v2Features = computed(() => features.filter(f => f.version === 2))
</script>

<template>
  <div class="min-h-screen bg-transparent text-[#e8f2ea] font-body flex">
    <div class="fixed top-0 left-0 h-1.5 bg-[#41c985] z-[70] border-b border-[#0d1b15]" :style="{ width: `${scrollProgress}%` }" />

    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
      @click="sidebarOpen = false"
    />

    <aside
      :class="[
        'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-[#0b1511] border-r border-[#1e3127] flex flex-col transition-transform duration-300 shadow-[6px_0_0_0_#08110d]',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
    >
      <div class="px-4 py-4 border-b border-[#1e3127] bg-[#0e1a14]">
        <NuxtLink to="/" class="flex items-center gap-2" @click="sidebarOpen = false">
          <span class="text-emerald-300 text-xs font-data border border-[#355643] bg-[#112019] rounded px-1.5 py-0.5">MM</span>
          <div>
            <h1 class="text-sm font-heading font-bold tracking-tight">Klausmeier Model</h1>
            <p class="text-[9px] text-[#6f8a7a] font-body">MA3271 · Kelompok 4</p>
          </div>
        </NuxtLink>
      </div>

      <nav class="flex-1 py-3 px-2 space-y-3 overflow-y-auto">
        <div>
          <p class="px-3 py-2 text-[8px] text-[#74a0e8] uppercase tracking-[0.15em] font-body">Versi 1 (Baseline)</p>
          <NuxtLink
            v-for="f in v1Features"
            :key="f.path"
            :to="f.path"
            :class="[
              'neo-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative',
              route.path === f.path
                ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
                : 'hover:bg-[#13231b] text-[#95a99d] hover:text-[#d5e3da] border border-blue-500/20'
            ]"
            @click="sidebarOpen = false"
          >
            <span class="text-[10px] w-10 text-center shrink-0 transition-colors font-data border border-blue-500/40 rounded px-1.5 py-1 text-blue-200 bg-blue-500/10">
              {{ f.icon }}
            </span>

            <div class="min-w-0">
              <p class="text-xs font-medium truncate">{{ f.label }}</p>
              <p class="text-[9px] text-[#6f8a7a] truncate">{{ f.desc }}</p>
            </div>

            <span
              class="absolute right-2 top-1.5 text-[6px] px-1 py-0.5 rounded font-data bg-blue-500/15 text-blue-300/80"
            >V1</span>
          </NuxtLink>
        </div>

        <div>
          <p class="px-3 py-2 text-[8px] text-[#d3b654] uppercase tracking-[0.15em] font-body">Versi 2 (Pengembangan)</p>
        <NuxtLink
  v-for="f in v2Features"
  :key="f.path"
  :to="f.path"
  :class="[
    'neo-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative',
    route.path === f.path 
      ? 'bg-amber-500/10 border border-amber-500/35 text-amber-300'
      : 'hover:bg-[#13231b] text-[#95a99d] hover:text-[#d5e3da] border border-amber-500/20'
  ]"
  @click="sidebarOpen = false"
>
  <span :class="[
    'text-[10px] w-10 text-center shrink-0 transition-colors font-data border border-[#2f4b3c] rounded px-1.5 py-1',
    'text-amber-200 group-hover:text-amber-100 bg-amber-500/10 border-amber-500/45'
  ]">
    {{ f.icon }}
  </span>

  <div class="min-w-0">
    <p class="text-xs font-medium truncate">{{ f.label }}</p>
    <p class="text-[9px] text-[#6f8a7a] truncate">{{ f.desc }}</p>
  </div>

  <span
    class="absolute right-2 top-1.5 text-[6px] px-1 py-0.5 rounded font-data bg-amber-500/15 text-amber-200"
  >V2</span>
</NuxtLink>
        </div>
      </nav>

      <div class="px-4 py-3 border-t border-[#1e3127] text-[8px] text-[#6f8a7a] font-body space-y-1 bg-[#0e1a14]">
        <p>Model Klausmeier (tanpa operator Laplace)</p>
        <p>dB/dt = −mB + WB²</p>
        <p>dW/dt = a − W − WB²</p>
      </div>
    </aside>

    <div class="flex-1 min-w-0 flex flex-col">
      <header class="lg:hidden sticky top-0 z-20 bg-[#0a140f]/90 backdrop-blur-md border-b border-[#1e3127]">
        <div class="px-4 py-3 flex items-center gap-3">
          <button
            @click="sidebarOpen = !sidebarOpen"
            class="p-1.5 rounded-lg bg-[#13231b] border border-[#1e3127] text-[#95a99d] hover:text-emerald-300 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span class="text-[10px] font-data border border-[#355643] bg-[#112019] rounded px-1.5 py-0.5 text-emerald-300">MM</span>
          <span class="text-sm font-heading font-bold">Klausmeier Model</span>
        </div>
      </header>

      <div class="marquee-container border-b border-[#1e3127] bg-[#0c1712]">
        <div class="marquee-track text-[11px] font-data text-[#91b8a2] uppercase tracking-[0.08em] py-2">
          <span v-for="(item, idx) in [...ticker, ...ticker]" :key="`${item}-${idx}`" class="mx-5">{{ item }}</span>
        </div>
      </div>

      <main class="flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.font-heading {
  font-family: 'Space Grotesk', system-ui, sans-serif;
}
.font-body {
  font-family: 'Space Grotesk', system-ui, sans-serif;
}
.font-data {
  font-family: 'JetBrains Mono', monospace;
}

.neo-nav-item {
  box-shadow: 2px 2px 0 0 transparent;
}

.neo-nav-item:hover {
  transform: translate(-1px, -1px);
  box-shadow: 2px 2px 0 0 #0b1511;
}

.marquee-container {
  overflow: hidden;
}

.marquee-track {
  display: flex;
  width: max-content;
  animation: marqueeScroll 36s linear infinite;
}

.marquee-container:hover .marquee-track {
  animation-play-state: paused;
}

@keyframes marqueeScroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
</style>
