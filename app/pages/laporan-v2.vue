<script setup>
import { computed, ref } from 'vue'

useHead({ title: 'Laporan V2 · Checklist Siap Tempel' })

const done = ref({
  rk4Method: true,
  rk4Validation: true,
  turingLinear: true,
  parameterSweep: true,
  hysteresis: true,
  notation: false,
  references: false,
  finalProofread: false
})

const completion = computed(() => {
  const vals = Object.values(done.value)
  const doneCount = vals.filter(Boolean).length
  return {
    doneCount,
    total: vals.length,
    pct: Math.round((doneCount / vals.length) * 100)
  }
})

const sections = [
  {
    title: 'Bab Metode Numerik (RK4)',
    key: 'rk4Method',
    content: [
      'Tuliskan skema RK4 untuk sistem dua variabel B dan W.',
      'Cantumkan pemilihan langkah waktu h dan horizon waktu simulasi.',
      'Jelaskan alasan stabilitas numerik untuk rentang parameter yang digunakan.'
    ]
  },
  {
    title: 'Bab Validasi RK4',
    key: 'rk4Validation',
    content: [
      'Lampirkan tabel galat relatif terhadap solusi referensi/steady-state.',
      'Tunjukkan tren galat saat h diperkecil (orde konvergensi empiris).',
      'Simpulkan bahwa solusi numerik konsisten dengan dinamika model.'
    ]
  },
  {
    title: 'Bab Analisis Turing Linear',
    key: 'turingLinear',
    content: [
      'Turunkan matriks Jacobian efektif mode-k dari linearisasi PDE.',
      'Plot kurva dispersi lambda_max(k) dan tandai rentang mode tumbuh.',
      'Interpretasikan syarat instabilitas difusi terhadap pembentukan pola.'
    ]
  },
  {
    title: 'Bab Sweep Parameter',
    key: 'parameterSweep',
    content: [
      'Sajikan peta fase kuantitatif terhadap parameter a dan rasio Dw/Db.',
      'Gunakan klasifikasi regime: desert, uniform, pattern, unstable.',
      'Hubungkan hasil peta dengan narasi ekologis model (degradasi/pemulihan).' 
    ]
  },
  {
    title: 'Bab Histeresis',
    key: 'hysteresis',
    content: [
      'Tunjukkan kurva forward-backward parameter a.',
      'Buktikan path dependence melalui loop histeresis yang tidak berimpit.',
      'Jelaskan implikasi praktis terhadap tipping point dan pemulihan ekosistem.'
    ]
  },
  {
    title: 'Konsistensi Notasi',
    key: 'notation',
    content: [
      'Gunakan notasi yang sama pada laporan dan aplikasi (B, W, a, m, Db, Dw).',
      'Samakan istilah Bahasa Indonesia/Inggris agar tidak ambigu.',
      'Pastikan satuan dan domain variabel konsisten di semua bab.'
    ]
  },
  {
    title: 'Referensi dan Sitasi',
    key: 'references',
    content: [
      'Lengkapi daftar pustaka untuk model Klausmeier, RK4, dan Turing pattern.',
      'Tambahkan sitasi sumber metode numerik yang dipakai.',
      'Pastikan format sitasi sesuai pedoman mata kuliah.'
    ]
  },
  {
    title: 'Final Proofread',
    key: 'finalProofread',
    content: [
      'Sinkronkan urutan gambar/figur dengan pembahasan.',
      'Periksa typo, ejaan, dan konsistensi heading.',
      'Lakukan uji presentasi 8-10 menit berbasis alur simulasi-visualisasi.'
    ]
  }
]

const openingScript = `Pembuka presentasi: penelitian ini memodelkan interaksi biomassa dan air pada ekosistem kering menggunakan model Klausmeier. Versi V2 menambahkan validasi numerik RK4, analisis Turing linear, peta sweep parameter, dan uji histeresis agar argumen ilmiah lebih kuat serta visualisasi lebih mudah dipahami.`
</script>

<template>
  <div class="min-h-screen bg-transparent text-[#e8edf5] font-body">
    <div class="max-w-[1260px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div class="card">
        <h1 class="text-lg sm:text-xl font-heading font-bold">Laporan V2: Checklist Siap Tempel ke Naskah</h1>
        <p class="text-xs text-[#9ab0a3] mt-1">Halaman ini merangkum apa saja yang wajib ada agar laporan dan demo presentasi sinkron.</p>
      </div>

      <div class="card">
        <div class="flex items-center justify-between gap-3 mb-2">
          <h2 class="section-title">Status Kelengkapan</h2>
          <span class="text-xs text-[#9ab0a3] font-data">{{ completion.doneCount }}/{{ completion.total }}</span>
        </div>
        <div class="w-full h-3 bg-[#0b1712] border border-[#203328] rounded-full overflow-hidden">
          <div class="h-full bg-[#e4c260]" :style="{ width: `${completion.pct}%` }"/>
        </div>
        <p class="text-sm mt-2 text-[#c7d6cd]">Progress naskah: <span class="font-data text-[#e4c260]">{{ completion.pct }}%</span></p>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section v-for="item in sections" :key="item.key" class="card">
          <label class="flex items-start gap-3 cursor-pointer">
            <input v-model="done[item.key]" type="checkbox" class="mt-1 accent-[#e4c260]">
            <div>
              <h3 class="text-sm font-semibold text-[#edf4ef]">{{ item.title }}</h3>
              <ul class="mt-2 space-y-1 text-sm text-[#a8bcb2]">
                <li v-for="line in item.content" :key="line">- {{ line }}</li>
              </ul>
            </div>
          </label>
        </section>
      </div>

      <div class="card">
        <h2 class="section-title mb-2">Naskah Pembuka (Siap Ucap)</h2>
        <p class="text-sm leading-relaxed text-[#d7e5dd]">{{ openingScript }}</p>
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
</style>
