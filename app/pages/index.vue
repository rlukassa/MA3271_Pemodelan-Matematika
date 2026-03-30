<script setup>
import { onMounted, ref, computed, shallowRef } from 'vue'
import { useRafFn } from '@vueuse/core'

useHead({
  title: 'Klausmeier tapi gak pakai Nabla',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap' }
  ]
})

// config doang
const a = ref(2.0)  
const m = ref(0.45)
const Dp = 0.1
const Dw = 2.0

const N = 500
const dx = 1.0
const dt = 0.04
const totalCells = N * N
const stepsPerFrame = ref(4)

const canvasRef = ref(null)
const overlayRef = ref(null)
const legendRef = ref(null)
const simTime = ref(0)
const fps = ref(0)
const iterationCount = ref(0)

// a = curah hujan, m = kematian tanaman, Dp = difusi biomassa, Dw = difusi air
// N = ukuran grid, dx = jarak antar sel, dt = langkah waktu
// totalCells = N*N, stepsPerFrame = berapa langkah simulasi tiap frame render (untuk mempercepat simulasi)
// canvasRef = ref untuk akses elemen canvas utama, overlayRef untuk elemen canvas overlay (garis kontur), legendRef untuk elemen canvas legenda warna

const autoCaptureYearInterval = ref(4)
let nextPeriodicCapture = 4

const showContours = ref(true) // opsi untuk menampilkan garis kontur di atas visualisasi utama
const showCrossSection = ref(true) // data untuk potongan melintang (cross-section) di tengah grid, untuk melihat profil B dan R secara vertikal

const bifTrail = shallowRef([])
const maxTrail = 80 // berapa banyak titik terakhir yang ditampilkan pada bifurcation trail (jejak titik hidup pada diagram bifurkasi)

const crossSectionData = shallowRef([])

const prevIdx = new Int32Array(N)
const nextIdx = new Int32Array(N)
for (let i = 0; i < N; i++) { // untuk menghindari perhitungan modulus yang mahal saat mengakses tetangga sel (untuk difusi), kita buat array indeks sebelumnya dan berikutnya yang sudah dihitung
  prevIdx[i] = (i - 1 + N) % N
  nextIdx[i] = (i + 1) % N
}

let B  = new Float32Array(totalCells)
let W  = new Float32Array(totalCells)
let Bn = new Float32Array(totalCells)
let Wn = new Float32Array(totalCells)

let imgData = null

const LUT = new Uint8Array(1024)
// LUT (Look-Up Table) untuk mapping nilai biomassa ke warna RGB. 
// Kita buat sekali di awal dengan interpolasi antara beberapa warna pada rentang nilai B, 
// sehingga saat render kita cukup melakukan indexing cepat tanpa perhitungan warna yang kompleks.
;(function buildLUT() { 
  const stops = [ 
    [0.00,  45,  26,  15],
    [0.05,  90,  60,  30],
    [0.15, 160, 120,  50],
    [0.25, 195, 175,  75],
    [0.35, 160, 200,  50],
    [0.50,  70, 190,  60],
    [0.70,  30, 160,  80],
    [0.85,  20, 130,  96],
    [1.00,  10, 180, 140],
  ] 
  // Setiap stop adalah [nilai B normalisasi, R, G, B]. 
  // Kita akan interpolasi warna antara stop yang berdekatan untuk setiap nilai B dari 0 sampai 1 (atau lebih, tapi kita fokus di bawah 1 untuk visualisasi).
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    let s0 = stops[0], s1 = stops[stops.length - 1]
    for (let j = 0; j < stops.length - 1; j++) {
      if (t >= stops[j][0] && t <= stops[j + 1][0]) { s0 = stops[j]; s1 = stops[j + 1]; break }
    } 
    const f = s1[0] - s0[0] > 0 ? (t - s0[0]) / (s1[0] - s0[0]) : 0
    const b = i << 2
    LUT[b]     = Math.round(s0[1] + (s1[1] - s0[1]) * f)
    LUT[b + 1] = Math.round(s0[2] + (s1[2] - s0[2]) * f)
    LUT[b + 2] = Math.round(s0[3] + (s1[3] - s0[3]) * f)
    LUT[b + 3] = 255
  }
})()

let histB = []
let histW = []
const maxHistory = 300
const stats = shallowRef({ Bavg: 0, Bmax: 0, Bvar: 0, Wavg: 0 })
const chartData = shallowRef({ biomass: [], water: [] })

const ecosystemStatus = computed(() => {
  const { Bavg, Bvar } = stats.value // status ekosistem ditentukan berdasarkan rata-rata biomassa dan koefisien variasi (cv = akar varians dibagi rata-rata) untuk mengidentifikasi pola spasial
  if (Bavg < 0.05) 
    return { label: 'Gurun (Kolaps)', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/40', pulse: 'bg-red-500',
      desc: 'Ekosistem telah melewati titik kritis (tipping point). Vegetasi tidak dapat bertahan pada curah hujan saat ini.' }
  const cv = Math.sqrt(Math.max(0, Bvar)) / Bavg // cv = akar varians dibagi rata-rata
  if (cv < 0.15 && Bavg > 0.2)
    return { label: 'Hutan Penuh (Homogen)', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/40', pulse: 'bg-green-500',
      desc: 'Tutupan vegetasi seragam dan stabil. Curah hujan cukup untuk mendukung kanopi penuh tanpa pola spasial.' }
  if (cv >= 0.15 && Bavg > 0.05)
    return { label: 'Berpola (Pola Turing)', color: 'text-cyan-400', bg: 'bg-cyan-500/20 border-cyan-500/40', pulse: 'bg-cyan-500',
      desc: 'Pola spasial terorganisir mandiri (labirin / titik / celah) meningkatkan ketahanan terhadap kekeringan melalui redistribusi air.' }
  return { label: 'Transisi', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/40', pulse: 'bg-yellow-500',
    desc: 'Sistem sedang bertransisi antar keadaan stabil. Amati dinamika pembentukan pola.' }
})

// konstanta visualisasi nya bisa disesuaikan dengan eksperimen
// jadi kalo 0.05 itu artinya kalo rata-rata biomassa di bawah 0.05 dianggap sudah kolaps, terus 0.15 itu threshold untuk cv (koefisien variasi) untuk membedakan antara pola homogen dan berpola, dan 0.2 itu threshold tambahan untuk memastikan bahwa rata-rata biomassa cukup tinggi untuk dianggap sebagai hutan penuh, bukan hanya pola dengan biomassa rendah.
// logika klasifikasi ini sederhana tapi cukup efektif untuk memberikan gambaran umum tentang status ekosistem berdasarkan statistik biomassa yang dihitung dari simulasi. Tentu saja, dalam analisis yang lebih mendalam, kita bisa menggunakan metode lain seperti analisis spektral untuk mengidentifikasi pola spasial secara lebih akurat, tapi ini sudah cukup untuk tujuan visualisasi dan edukasi di sini.

function initSim() { // inisialisasi kondisi awal simulasi dengan nilai biomassa dan air acak di setiap sel, serta reset variabel terkait seperti waktu simulasi, iterasi, statistik, dan data historis untuk grafik
  const aVal = a.value
  for (let i = 0; i < totalCells; i++) {
    B[i] = 0.1 + Math.random() * 0.15
    W[i] = aVal
  }
  Bn.fill(0); Wn.fill(0)
  histB = []; histW = []
  simTime.value = 0
  iterationCount.value = 0
  displayMax = 0.5
  nextPeriodicCapture = autoCaptureYearInterval.value
  stats.value = { Bavg: 0, Bmax: 0, Bvar: 0, Wavg: 0 }
  chartData.value = { biomass: [], water: [] }
}

function step() { // iterasinya per langkah waktu, menghitung nilai biomassa dan air untuk setiap sel berdasarkan persamaan diferensial yang diberikan, termasuk efek pertumbuhan, kematian, interaksi antara biomassa dan air, serta difusi. Setelah menghitung nilai baru untuk semua sel, kita swap array untuk mempersiapkan iterasi berikutnya.
  const aVal = a.value, mVal = m.value
  const rDp = dt * Dp / (dx * dx) 
  const rDw = dt * Dw / (dx * dx)

  for (let y = 0; y < N; y++) {
    const yU = prevIdx[y], yD = nextIdx[y]
    const row = y * N, rowU = yU * N, rowD = yD * N
    for (let x = 0; x < N; x++) {
      const i   = row + x
      const xL  = prevIdx[x], xR = nextIdx[x]
      const b   = B[i], w = W[i]
      const wb2 = w * b * b

      const lapB = B[row + xL] + B[row + xR] + B[rowU + x] + B[rowD + x] - 4 * b
      const lapW = W[row + xL] + W[row + xR] + W[rowU + x] + W[rowD + x] - 4 * w

      let bN = b + dt * (-mVal * b + wb2) + rDp * lapB
      let wN = w + dt * ( aVal  - w - wb2) + rDw * lapW

      Bn[i] = bN > 0 ? bN : 0
      Wn[i] = wN > 0 ? wN : 0
    }
  }
  const tb = B; B = Bn; Bn = tb
  const tw = W; W = Wn; Wn = tw
}

function computeStats() {
  let sumB = 0, sumB2 = 0, maxB = 0, sumW = 0
  for (let i = 0; i < totalCells; i++) {
    const b = B[i]
    sumB  += b
    sumB2 += b * b
    if (b > maxB) maxB = b
    sumW  += W[i]
  }
  const avgB = sumB / totalCells
  stats.value = { Bavg: avgB, Bmax: maxB, Bvar: sumB2 / totalCells - avgB * avgB, Wavg: sumW / totalCells }
  histB.push(avgB); histW.push(sumW / totalCells)
  if (histB.length > maxHistory) { histB.shift(); histW.shift() }
} // fungsi untuk menghitung statistik biomassa dan air dari seluruh grid, termasuk rata-rata, varians, dan nilai maksimum biomassa. Statistik ini digunakan untuk menentukan status ekosistem dan juga untuk membangun grafik temporal dari rata-rata biomassa dan air seiring waktu.

let displayMax = 0.5

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!imgData) imgData = ctx.createImageData(N, N)
  const d = imgData.data

  let curMax = 0
  for (let i = 0; i < totalCells; i++) if (B[i] > curMax) curMax = B[i]
  displayMax = Math.max(displayMax * 0.998, curMax, 0.5)
  const scale = 255 / displayMax

  for (let i = 0; i < totalCells; i++) {
    const ci = Math.min(255, (B[i] * scale) | 0) << 2
    const pi = i << 2
    d[pi]     = LUT[ci]
    d[pi + 1] = LUT[ci + 1]
    d[pi + 2] = LUT[ci + 2]
    d[pi + 3] = 255
  }
  ctx.putImageData(imgData, 0, 0)

  if (showContours.value) {
    drawContours(ctx, scale)
  }
}

function drawContours(ctx, scale) {
  const thresholds = [0.15, 0.5, 1.5, 3.0]
  ctx.lineWidth = 0.8
  for (const thr of thresholds) {
    const alpha = thr < 1 ? 0.25 : 0.4
    ctx.strokeStyle = thr < 1 ? `rgba(255,120,80,${alpha})` : `rgba(255,255,255,${alpha})`
    ctx.beginPath()
    for (let y = 0; y < N - 1; y += 2) {
      const row = y * N
      for (let x = 0; x < N - 1; x += 2) {
        const v00 = B[row + x] >= thr ? 1 : 0
        const v10 = B[row + x + 1] >= thr ? 1 : 0
        const v01 = B[row + N + x] >= thr ? 1 : 0
        const v11 = B[row + N + x + 1] >= thr ? 1 : 0
        const caseId = v00 | (v10 << 1) | (v01 << 2) | (v11 << 3)
        if (caseId === 0 || caseId === 15) continue
        const mx = x + 1, my = y + 1
        if (caseId === 1 || caseId === 14) { ctx.moveTo(x, my); ctx.lineTo(mx, y) }
        else if (caseId === 2 || caseId === 13) { ctx.moveTo(mx, y); ctx.lineTo(x + 2, my) }
        else if (caseId === 4 || caseId === 11) { ctx.moveTo(x, my); ctx.lineTo(mx, y + 2) }
        else if (caseId === 8 || caseId === 7) { ctx.moveTo(mx, y + 2); ctx.lineTo(x + 2, my) }
        else if (caseId === 3 || caseId === 12) { ctx.moveTo(x, my); ctx.lineTo(x + 2, my) }
        else if (caseId === 5 || caseId === 10) { ctx.moveTo(mx, y); ctx.lineTo(mx, y + 2) }
        else if (caseId === 6 || caseId === 9) { ctx.moveTo(mx, y); ctx.lineTo(x, my); ctx.moveTo(mx, y + 2); ctx.lineTo(x + 2, my) }
      }
    }
    ctx.stroke()
  }
}

function updateCrossSection() {
  if (!showCrossSection.value) return
  const midY = N >> 1
  const row = midY * N
  const data = new Array(N)
  for (let x = 0; x < N; x++) data[x] = B[row + x]
  crossSectionData.value = data
}

function drawLegend() { // fungsi untuk menggambar legenda warna pada canvas terpisah, menggunakan LUT yang sama dengan yang digunakan untuk render utama, sehingga legenda mencerminkan mapping warna yang akurat untuk nilai biomassa yang ditampilkan
  const c = legendRef.value
  if (!c) return
  const ctx = c.getContext('2d')
  const h = c.height
  for (let y = 0; y < h; y++) {
    const ci = Math.round((1 - y / (h - 1)) * 255) << 2
    ctx.fillStyle = `rgb(${LUT[ci]},${LUT[ci + 1]},${LUT[ci + 2]})`
    ctx.fillRect(0, y, c.width, 1)
  }
}

const chartW = 500, chartH = 120 // ukuran canvas untuk grafik temporal rata-rata biomassa dan air seiring waktu

function buildPath(data) {
  if (!data || data.length < 2) return ''
  let mx = 0.01
  for (let i = 0; i < data.length; i++) if (data[i] > mx) mx = data[i]
  const sx = chartW / (maxHistory - 1)
  const pts = new Array(data.length)
  for (let i = 0; i < data.length; i++) {
    pts[i] = `${(i * sx).toFixed(1)},${(chartH - (data[i] / mx) * (chartH - 4) - 2).toFixed(1)}`
  }
  return 'M' + pts.join('L')
}

const biomassPath = computed(() => buildPath(chartData.value.biomass))
const waterPath   = computed(() => buildPath(chartData.value.water))

const snapshots = ref([])
const maxSnapshots = 24
const showModal = ref(false)
const modalIdx = ref(0)
const autoCaptureFeedback = ref(false)

function captureSnapshot(isAuto = false) { // tangkap snapshot
  const canvas = canvasRef.value
  if (!canvas) return

  const annotCanvas = document.createElement('canvas')
  const size = N
  const bannerH = 60
  annotCanvas.width = size
  annotCanvas.height = size + bannerH
  const actx = annotCanvas.getContext('2d')

  actx.drawImage(canvas, 0, 0)

  actx.fillStyle = 'rgba(7,8,12,0.92)'
  actx.fillRect(0, size, size, bannerH)
  actx.fillStyle = '#0f1117'
  actx.fillRect(0, size, size, 1)

  actx.font = 'bold 16px monospace'
  actx.fillStyle = '#5eead4'
  actx.fillText(`t = ${simTime.value.toFixed(2)} thn`, 10, size + 20)

  actx.font = '13px monospace'
  actx.fillStyle = '#c0c8d8'
  actx.fillText(`a=${a.value.toFixed(2)}  m=${m.value.toFixed(2)}  B_avg=${stats.value.Bavg.toFixed(3)}  R_avg=${stats.value.Wavg.toFixed(3)}`, 10, size + 38)

  const statusLabel = ecosystemStatus.value.label
  const statusColors = { 'Gurun (Kolaps)': '#f87171', 'Hutan Penuh (Homogen)': '#34d399', 'Berpola (Pola Turing)': '#22d3ee', 'Transisi': '#fbbf24' }
  actx.font = 'bold 14px sans-serif'
  actx.fillStyle = statusColors[statusLabel] || '#8892a6'
  actx.textAlign = 'right'
  actx.fillText(statusLabel, size - 10, size + 20)
  actx.textAlign = 'left'

  actx.font = '11px monospace'
  actx.fillStyle = '#555d70'
  actx.textAlign = 'right'
  actx.fillText(`iter #${iterationCount.value.toLocaleString()}`, size - 10, size + 38)
  actx.textAlign = 'left'

  actx.strokeStyle = 'rgba(251,191,36,0.4)'
  actx.lineWidth = 1
  actx.setLineDash([4, 4])
  actx.beginPath()
  actx.moveTo(0, size >> 1)
  actx.lineTo(size, size >> 1)
  actx.stroke()
  actx.setLineDash([])

  const dataUrl = annotCanvas.toDataURL('image/png')
  snapshots.value.push({
    dataUrl,
    time: simTime.value,
    a: a.value,
    m: m.value,
    status: statusLabel,
    Bavg: stats.value.Bavg,
    Wavg: stats.value.Wavg,
    iteration: iterationCount.value,
    auto: isAuto,
  })
  if (snapshots.value.length > maxSnapshots) snapshots.value.shift()
  if (isAuto) {
    autoCaptureFeedback.value = true
    setTimeout(() => { autoCaptureFeedback.value = false }, 1200)
  }
}

let prevStatus = ''
let autoCaptureDebounce = 0

function checkAutoCapture() {
  const currentStatus = ecosystemStatus.value.label
  if (prevStatus && currentStatus !== prevStatus && simTime.value > 1) {
    const now = performance.now()
    if (now - autoCaptureDebounce > 3000) {
      autoCaptureDebounce = now
      captureSnapshot(true)
    }
  }
  prevStatus = currentStatus
}

function checkPeriodicCapture() {
  if (simTime.value >= nextPeriodicCapture) {
    captureSnapshot(true)
    nextPeriodicCapture += autoCaptureYearInterval.value
  }
}

function downloadSnapshot(idx) {
  const snap = snapshots.value[idx]
  if (!snap) return
  const link = document.createElement('a')
  link.href = snap.dataUrl
  link.download = `klausmeier_t${snap.time.toFixed(1)}_a${snap.a.toFixed(2)}_m${snap.m.toFixed(2)}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function openModal(idx) {
  modalIdx.value = idx
  showModal.value = true
}

function clearGallery() {
  snapshots.value = []
}

const bifW = 400, bifH = 200 // diagram bifurkasi: sumbu x untuk parameter a (curah hujan), sumbu y untuk rata-rata biomassa Bavg, dengan batas atas sekitar 5 untuk fokus pada rentang yang relevan. Kita akan menggambar cabang bifurkasi, titik hidup saat ini, dan jejak titik hidup seiring waktu pada diagram ini.

const bifurcationData = computed(() => {
  const mVal = m.value
  const aCrit = 2 * mVal
  const upperBranch = []
  const lowerBranch = []

  for (let aVal = aCrit; aVal <= 3.5; aVal += 0.01) {
    const disc = aVal * aVal - 4 * mVal * mVal
    if (disc < 0) continue
    const sqrtDisc = Math.sqrt(disc)
    upperBranch.push({ a: aVal, B: (aVal + sqrtDisc) / (2 * mVal) })
    lowerBranch.push({ a: aVal, B: (aVal - sqrtDisc) / (2 * mVal) })
  }

  return { upperBranch, lowerBranch, aCrit }
})

function bifToSvg(aVal, bVal) {
  const x = ((aVal - 0.5) / 3.0) * bifW
  const y = bifH - (bVal / 5.0) * bifH
  return { x, y }
}

const bifUpperPath = computed(() => {
  const pts = bifurcationData.value.upperBranch
  if (pts.length < 2) return ''
  return 'M' + pts.map(p => {
    const { x, y } = bifToSvg(p.a, p.B)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join('L')
})

const bifLowerPath = computed(() => {
  const pts = bifurcationData.value.lowerBranch
  if (pts.length < 2) return ''
  return 'M' + pts.map(p => {
    const { x, y } = bifToSvg(p.a, p.B)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join('L')
})

const bifDesertPath = computed(() => {
  const p1 = bifToSvg(0.5, 0)
  const p2 = bifToSvg(3.5, 0)
  return `M${p1.x.toFixed(1)},${p1.y.toFixed(1)}L${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
})

const bifCurrentX = computed(() => bifToSvg(a.value, 0).x)
const bifTippingX = computed(() => bifToSvg(bifurcationData.value.aCrit, 0).x)

const bifLivePoint = computed(() => bifToSvg(a.value, stats.value.Bavg))

const bifTrailPath = computed(() => {
  const t = bifTrail.value
  if (t.length < 2) return ''
  return 'M' + t.map(p => {
    const { x, y } = bifToSvg(p.a, p.B)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join('L')
})

const busseW = 400, busseH = 200 // diagram busse balloon: sumbu x untuk parameter a (curah hujan), sumbu y untuk nilai k, dengan batas atas sekitar 3 untuk fokus pada rentang yang relevan. Kita akan menggambar batas area stabil, titik hidup saat ini, dan jejak titik hidup seiring waktu pada diagram ini. 

const busseBalloonData = computed(() => { 
  const mVal = m.value
  const aCrit = 2 * mVal
  const result = []

  for (let aVal = aCrit + 0.005; aVal <= 3.5; aVal += 0.01) {
    const discEq = aVal * aVal - 4 * mVal * mVal
    if (discEq < 0) continue

    const Bstar = (aVal + Math.sqrt(discEq)) / (2 * mVal)
    if (Bstar <= 1.0) continue

    const Bsq = Bstar * Bstar
    const alpha = Dp * (1 + Bsq) - mVal * Dw
    if (alpha >= 0) continue

    const beta = mVal * (Bsq - 1)
    const Delta = alpha * alpha - 4 * Dp * Dw * beta
    if (Delta <= 0) continue

    const sqrtDelta = Math.sqrt(Delta)
    const K1 = (-alpha - sqrtDelta) / (2 * Dp * Dw)
    const K2 = (-alpha + sqrtDelta) / (2 * Dp * Dw)

    if (K1 <= 0) continue

    const k1 = Math.sqrt(K1)
    const k2 = Math.sqrt(K2)
    const kMax = Math.sqrt(-alpha / (2 * Dp * Dw))

    result.push({ a: aVal, k1, k2, kMax })
  }

  return result
})

function busseToSvg(aVal, kVal) {
  const kMaxRange = 3.0
  const x = ((aVal - 0.5) / 3.0) * busseW
  const y = busseH - (kVal / kMaxRange) * busseH
  return { x, y }
}

const busseBoundaryPath = computed(() => {
  const data = busseBalloonData.value
  if (data.length < 2) return ''
  const upper = data.map(d => {
    const { x, y } = busseToSvg(d.a, d.k2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const lower = [...data].reverse().map(d => {
    const { x, y } = busseToSvg(d.a, d.k1)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return 'M' + upper.join('L') + 'L' + lower.join('L') + 'Z'
})

const busseMaxPath = computed(() => {
  const data = busseBalloonData.value
  if (data.length < 2) return ''
  return 'M' + data.map(d => {
    const { x, y } = busseToSvg(d.a, d.kMax)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join('L')
})

const busseCurrentX = computed(() => busseToSvg(a.value, 0).x)

const crossSectionPath = computed(() => {
  const data = crossSectionData.value
  if (!data || data.length < 2) return ''
  const w = 500, h = 80
  let mx = 0.5
  for (let i = 0; i < data.length; i++) if (data[i] > mx) mx = data[i]
  const sx = w / (data.length - 1)
  const pts = []
  const step = Math.max(1, Math.floor(data.length / 250))
  for (let i = 0; i < data.length; i += step) {
    pts.push(`${(i * sx).toFixed(1)},${(h - (data[i] / mx) * (h - 6) - 3).toFixed(1)}`)
  }
  return 'M' + pts.join('L')
})
const crossSectionFillPath = computed(() => {
  const data = crossSectionData.value
  if (!data || data.length < 2) return ''
  const w = 500, h = 80
  let mx = 0.5
  for (let i = 0; i < data.length; i++) if (data[i] > mx) mx = data[i]
  const sx = w / (data.length - 1)
  const pts = [`0,${h}`]
  const step = Math.max(1, Math.floor(data.length / 250))
  for (let i = 0; i < data.length; i += step) {
    pts.push(`${(i * sx).toFixed(1)},${(h - (data[i] / mx) * (h - 6) - 3).toFixed(1)}`)
  }
  pts.push(`${w},${h}`)
  return 'M' + pts.join('L') + 'Z'
})

const phaseW = 400, phaseH = 200

const nullclineData = computed(() => {
  const mVal = m.value, aVal = a.value
  const BnullPts = []
  const WnullPts = []

  for (let bv = 0.05; bv <= 5; bv += 0.05) {
    BnullPts.push({ B: bv, W: mVal / bv })
  }

  for (let bv = 0; bv <= 5; bv += 0.05) {
    WnullPts.push({ B: bv, W: aVal / (1 + bv * bv) })
  }

  const disc = aVal * aVal - 4 * mVal * mVal
  const sss = [{ B: 0, W: aVal, stable: true, type: 'gurun' }]
  if (disc >= 0) {
    const B1 = (aVal - Math.sqrt(disc)) / (2 * mVal)
    const B2 = (aVal + Math.sqrt(disc)) / (2 * mVal)
    if (B1 > 0) sss.push({ B: B1, W: mVal / B1, stable: false, type: 'saddle' })
    if (B2 > 0) sss.push({ B: B2, W: mVal / B2, stable: B2 > 1, type: 'vegetasi' })
  }

  return { BnullPts, WnullPts, steadyStates: sss }
})

function phaseToSvg(bVal, wVal) {
  const x = (bVal / 5.0) * phaseW
  const y = phaseH - (wVal / 3.0) * phaseH
  return { x: Math.max(0, Math.min(phaseW, x)), y: Math.max(0, Math.min(phaseH, y)) }
}

const bnullPath = computed(() => {
  const pts = nullclineData.value.BnullPts.filter(p => p.W <= 3)
  if (pts.length < 2) return ''
  return 'M' + pts.map(p => {
    const { x, y } = phaseToSvg(p.B, p.W)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join('L')
})

const wnullPath = computed(() => {
  const pts = nullclineData.value.WnullPts.filter(p => p.W <= 3)
  if (pts.length < 2) return ''
  return 'M' + pts.map(p => {
    const { x, y } = phaseToSvg(p.B, p.W)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join('L')
})

let lastTime = performance.now(), frameAcc = 0, frameNum = 0

function mainLoop() {
  // JADI DI SINI KITA MENGATUR LOOP UTAMA SIMULASI, DI MANA KITA MELAKUKAN BEBERAPA LANGKAH:
  // 1. 
  const now = performance.now()
  frameAcc++
  if (now - lastTime > 600) {
    fps.value = Math.round(frameAcc * 1000 / (now - lastTime))
    frameAcc = 0; lastTime = now
  }
  const spf = stepsPerFrame.value
  for (let s = 0; s < spf; s++) step()
  simTime.value += dt * spf
  iterationCount.value += spf
  frameNum++
  if (frameNum % 3 === 0) {
    computeStats()
    checkAutoCapture()
    checkPeriodicCapture()
    updateBifTrail()
    updateCrossSection()
  }
  if (frameNum % 9 === 0) chartData.value = { biomass: histB.slice(), water: histW.slice() }
  draw()
}

function updateBifTrail() {
  const trail = bifTrail.value.slice()
  trail.push({ a: a.value, B: stats.value.Bavg })
  if (trail.length > maxTrail) trail.shift()
  bifTrail.value = trail
}

const { pause, resume, isActive } = useRafFn(mainLoop, { immediate: false })

function togglePause() { isActive.value ? pause() : resume() }
function resetSim() { initSim(); draw() }

onMounted(() => {
  initSim()
  resume()
  setTimeout(drawLegend, 100)
})
</script>

<template>
  <div class="min-h-screen bg-[#07080c] text-[#e8edf5] font-body">

    <Teleport to="body">
      <div v-if="showModal && snapshots[modalIdx]" class="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" @click.self="showModal = false">
        <div class="bg-[#0f1117] rounded-2xl border border-[#1a1d2b] p-3 sm:p-5 max-w-2xl w-full animate-modal">
          <div class="flex justify-between items-center mb-3 gap-2">
            <div class="font-data text-[10px] sm:text-xs text-[#8892a6] truncate">
              t = {{ snapshots[modalIdx].time.toFixed(2) }} thn &middot; Iterasi #{{ snapshots[modalIdx].iteration.toLocaleString() }} &middot; a = {{ snapshots[modalIdx].a.toFixed(2) }} &middot; m = {{ snapshots[modalIdx].m.toFixed(2) }}
            </div>
            <div class="flex gap-2 shrink-0">
              <button @click="downloadSnapshot(modalIdx)" class="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-teal-600/20 border border-teal-600/40 text-teal-400 rounded-lg text-[10px] sm:text-xs hover:bg-teal-600/30 transition">Simpan PNG</button>
              <button @click="showModal = false" class="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#1a1d2b] rounded-lg text-[10px] sm:text-xs hover:bg-[#252836] transition text-[#8892a6]">&times;</button>
            </div>
          </div>
          <img :src="snapshots[modalIdx].dataUrl" class="w-full rounded-xl canvas-pixel border border-[#1a1d2b]" :alt="'Snapshot at t=' + snapshots[modalIdx].time.toFixed(1)" />
          <div class="mt-2 flex gap-4 text-[9px] sm:text-[10px] text-[#555d70] font-data">
            <span>B_avg = {{ snapshots[modalIdx].Bavg.toFixed(3) }}</span>
            <span>R_avg = {{ snapshots[modalIdx].Wavg.toFixed(3) }}</span>
            <span>{{ snapshots[modalIdx].status }}</span>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ===== PAGE HEADER ===== -->
    <div class="border-b border-[#1a1d2b] bg-[#07080c]/90 backdrop-blur-md sticky top-0 z-10 lg:z-10">
      <div class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h1 class="text-lg sm:text-xl font-heading font-bold tracking-tight">Simulasi 2D Real-Time</h1>
          <p class="text-[9px] sm:text-xs text-[#555d70] mt-0.5 font-body">Simulasi spasial Model Klausmeier dengan Euler Eksplisit · Grid {{ N }}×{{ N }} · Pola Turing 2D</p>
        </div>
        <div :class="['px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border text-[10px] sm:text-sm font-medium flex items-center gap-2 shrink-0 font-body', ecosystemStatus.bg]">
          <span class="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
            <span :class="['animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', ecosystemStatus.pulse]"></span>
            <span :class="['relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5', ecosystemStatus.pulse]"></span>
          </span>
          <span :class="ecosystemStatus.color">{{ ecosystemStatus.label }}</span>
        </div>
      </div>
    </div>

    <main class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

      <div class="mb-4 sm:mb-6 card">
        <h3 class="text-xs font-body font-semibold text-teal-400 mb-1.5">Tentang Fitur Ini</h3>
        <p class="text-[11px] sm:text-xs text-[#8892a6] font-body leading-relaxed">
          Simulasi 2D menjalankan Model Klausmeier pada grid {{ N }}×{{ N }} piksel menggunakan metode Euler Eksplisit.
          Coupling difusi (D<sub>b</sub>={{ Dp }}, D<sub>R</sub>={{ Dw }}) diterapkan secara numerik untuk menghasilkan
          pola Turing — pola spasial terorganisir mandiri berupa labirin, titik, atau celah yang muncul
          akibat instabilitas difusi. Ubah parameter <strong class="text-teal-400">a</strong> (curah hujan) dan
          <strong class="text-amber-400">m</strong> (kematian) untuk mengamati transisi ekosistem.
        </p>
      </div>

      <div :class="['mb-4 sm:mb-6 px-3 sm:px-4 py-2 sm:py-3 rounded-xl border text-[11px] sm:text-sm transition-colors duration-500 font-body', ecosystemStatus.bg]">
        <p :class="ecosystemStatus.color">{{ ecosystemStatus.desc }}</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        <div class="lg:col-span-2">
          <div class="card">
            <div class="flex items-center justify-between mb-3">
              <h2 class="section-title">Domain Spasial &middot; {{ N }}&times;{{ N }}</h2>
              <div class="flex items-center gap-2 sm:gap-3 text-[9px] sm:text-xs font-data text-[#555d70]">
                <span>{{ fps }} FPS</span>
                <span>Iterasi #{{ iterationCount.toLocaleString() }}</span>
              </div>
            </div>

            <div class="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg bg-[#0a0b10] border border-[#13151e]">
              <div class="flex-1">
                <p class="text-[9px] sm:text-[10px] text-[#3a3f50] font-body uppercase tracking-wider">Waktu Simulasi</p>
                <p class="font-data text-base sm:text-lg text-teal-400">{{ simTime.toFixed(2) }} <span class="text-[10px] sm:text-xs text-[#555d70]">tahun</span></p>
              </div>
              <div class="text-right">
                <p class="text-[9px] sm:text-[10px] text-[#3a3f50] font-body uppercase tracking-wider">Tangkap berikutnya</p>
                <p class="font-data text-sm sm:text-base text-amber-400">t = {{ Math.ceil(simTime / autoCaptureYearInterval) * autoCaptureYearInterval }} <span class="text-[10px] sm:text-xs text-[#555d70]">tahun</span></p>
              </div>
            </div>
            <div class="flex gap-2 sm:gap-3">
              <canvas
                ref="canvasRef" :width="N" :height="N"
                class="w-full aspect-square rounded-xl border border-[#1a1d2b] canvas-pixel canvas-glow"
              ></canvas>
              <div class="flex flex-col items-center gap-1 w-6 sm:w-8 shrink-0">
                <span class="text-[7px] sm:text-[10px] text-[#555d70] font-body">Tinggi</span>
                <canvas ref="legendRef" width="20" height="200" class="rounded-lg flex-1 w-4 sm:w-5 border border-[#1a1d2b]"></canvas>
                <span class="text-[7px] sm:text-[10px] text-[#555d70] font-body">Rendah</span>
              </div>
            </div>
            <p class="text-[9px] sm:text-[11px] text-[#3a3f50] mt-2 font-body">Biomassa B (kg m&#x207B;&sup2;) &middot; Batas Periodik &middot; dx = {{ dx }} m</p>

            <div class="flex items-center gap-3 mt-2">
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" v-model="showContours" class="accent-teal-400 w-3.5 h-3.5" />
                <span class="text-[9px] sm:text-[10px] text-[#555d70] font-body">Kontur Garis</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" v-model="showCrossSection" class="accent-amber-400 w-3.5 h-3.5" />
                <span class="text-[9px] sm:text-[10px] text-[#555d70] font-body">Profil Irisan</span>
              </label>
            </div>

            <div v-if="showCrossSection && crossSectionPath" class="mt-3">
              <p class="text-[8px] sm:text-[9px] text-[#3a3f50] font-body mb-1 uppercase tracking-wider">Profil Irisan Tengah (y = {{ N >> 1 }})</p>
              <svg viewBox="0 0 500 80" class="w-full h-14 sm:h-16 lg:h-20 rounded-lg border border-[#13151e] bg-[#0a0b10]" preserveAspectRatio="none">
                <line v-for="i in 3" :key="'csh'+i" :x1="0" :y1="80*i/4" :x2="500" :y2="80*i/4" stroke="#13151e" stroke-width="0.5" />
                <path :d="crossSectionFillPath" fill="rgba(52,211,153,0.08)" />
                <path :d="crossSectionPath" fill="none" stroke="#34d399" stroke-width="1.5" />
              </svg>
              <div class="flex justify-between text-[7px] sm:text-[8px] text-[#3a3f50] font-data mt-0.5">
                <span>x = 0</span>
                <span>Biomassa B</span>
                <span>x = {{ N }}</span>
              </div>
            </div>

            <div v-if="autoCaptureFeedback" class="mt-2 px-3 py-1.5 bg-teal-600/15 border border-teal-600/30 rounded-lg text-[10px] sm:text-xs text-teal-400 font-body animate-fadeSlide">
              Tangkapan otomatis: transisi ke {{ ecosystemStatus.label }}
            </div>
          </div>
        </div>

        <div class="space-y-4 sm:space-y-5">

          <div class="card">
            <h2 class="section-title mb-3 sm:mb-4">Parameter Model</h2>
            <div class="space-y-3 sm:space-y-4">
              <div>
                <div class="flex justify-between text-[11px] sm:text-sm mb-1.5">
                  <label class="text-[#c0c8d8] font-body">Curah Hujan (a)</label>
                  <span class="font-data text-teal-400">{{ a.toFixed(2) }}</span>
                </div>
                <input type="range" v-model.number="a" min="0.5" max="3.5" step="0.05" class="slider slider-teal">
                <div class="flex justify-between text-[8px] sm:text-[10px] text-[#3a3f50] mt-0.5 font-body"><span>Kering</span><span>Basah</span></div>
              </div>
              <div>
                <div class="flex justify-between text-[11px] sm:text-sm mb-1.5">
                  <label class="text-[#c0c8d8] font-body">Kematian (m)</label>
                  <span class="font-data text-amber-400">{{ m.toFixed(2) }}</span>
                </div>
                <input type="range" v-model.number="m" min="0.1" max="1.0" step="0.01" class="slider slider-amber">
              </div>
              <div>
                <div class="flex justify-between text-[11px] sm:text-sm mb-1.5">
                  <label class="text-[#c0c8d8] font-body">Kecepatan</label>
                  <span class="font-data text-[#8892a6]">{{ stepsPerFrame }}&times;</span>
                </div>
                <input type="range" v-model.number="stepsPerFrame" min="1" max="16" step="1" class="slider slider-slate">
              </div>
              <div>
                <div class="flex justify-between text-[11px] sm:text-sm mb-1.5">
                  <label class="text-[#c0c8d8] font-body">Auto-tangkap tiap</label>
                  <span class="font-data text-purple-400">{{ autoCaptureYearInterval }} thn</span>
                </div>
                <input type="range" v-model.number="autoCaptureYearInterval" min="1" max="20" step="1" class="slider slider-purple">
              </div>
            </div>
            <div class="flex gap-2 mt-4">
              <button @click="resetSim" class="btn-secondary flex-1">&#x21BA; Ulang</button>
              <button @click="togglePause" :class="['flex-1 text-[11px] sm:text-sm py-2 rounded-xl font-semibold transition-all text-white font-body', isActive ? 'bg-amber-600/80 hover:bg-amber-600' : 'bg-teal-600/80 hover:bg-teal-600']">
                {{ isActive ? '&#9646;&#9646; Jeda' : '&#9654; Lanjut' }}
              </button>
              <button @click="captureSnapshot(false)" class="btn-capture" title="Tangkap gambar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </button>
            </div>
          </div>

          <div class="card">
            <h2 class="section-title mb-3">Metrik Waktu Nyata</h2>
            <div class="grid grid-cols-2 gap-2 sm:gap-3">
              <div class="metric-box">
                <p class="metric-label">B_avg</p>
                <p class="font-data text-sm sm:text-lg text-emerald-400">{{ stats.Bavg.toFixed(3) }}</p>
              </div>
              <div class="metric-box">
                <p class="metric-label">B_max</p>
                <p class="font-data text-sm sm:text-lg text-green-400">{{ stats.Bmax.toFixed(3) }}</p>
              </div>
              <div class="metric-box">
                <p class="metric-label">B_var (&sigma;&sup2;)</p>
                <p class="font-data text-sm sm:text-lg text-teal-400">{{ stats.Bvar.toFixed(4) }}</p>
              </div>
              <div class="metric-box">
                <p class="metric-label">R_avg</p>
                <p class="font-data text-sm sm:text-lg text-sky-400">{{ stats.Wavg.toFixed(3) }}</p>
              </div>
            </div>
          </div>

          <div class="card">
            <h2 class="section-title mb-3">Persamaan Model</h2>
            <div class="text-[11px] sm:text-sm text-[#8892a6] space-y-2 font-data leading-relaxed eq-box">
              <LatexExpr :expr="'\\frac{dB}{dt}=-mB+RB^2'" :block="true" />
              <LatexExpr :expr="'\\frac{dR}{dt}=a-R-RB^2'" :block="true" />
            </div>
            <div class="mt-2.5 text-[8px] sm:text-[10px] text-[#3a3f50] font-body space-y-0.5">
              <LatexExpr :expr="`D_b=${Dp},\\;D_R=${Dw}\\;\\text{m}^2\\,\\text{thn}^{-1}`" :block="true" />
              <p class="italic">Coupling difusi ditambahkan secara numerik untuk simulasi spasial.</p>
            </div>
          </div>

          <div class="card">
            <h2 class="section-title mb-3">Konfigurasi Numerik</h2>
            <div class="grid grid-cols-2 gap-2">
              <div class="config-row"><span class="config-label">Grid (N)</span><span class="config-val">{{ N }} &times; {{ N }}</span></div>
              <div class="config-row"><span class="config-label">Total Sel</span><span class="config-val">{{ totalCells.toLocaleString() }}</span></div>
              <div class="config-row"><span class="config-label">dx</span><span class="config-val">{{ dx }} m</span></div>
              <div class="config-row"><span class="config-label">dt</span><span class="config-val">{{ dt }} thn</span></div>
              <div class="config-row"><span class="config-label">D<sub>b</sub></span><span class="config-val">{{ Dp }} m&sup2;/thn</span></div>
              <div class="config-row"><span class="config-label">D<sub>R</sub></span><span class="config-val">{{ Dw }} m&sup2;/thn</span></div>
              <div class="config-row col-span-2"><span class="config-label">Iterasi/frame</span><span class="config-val">{{ stepsPerFrame }} &times; dt = {{ (stepsPerFrame * dt).toFixed(3) }} thn/frame</span></div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="snapshots.length > 0" class="mt-4 sm:mt-6 card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="section-title">Galeri Tangkapan &middot; {{ snapshots.length }}/{{ maxSnapshots }}</h2>
          <button @click="clearGallery" class="text-[9px] sm:text-xs text-red-400/50 hover:text-red-400 transition font-body">Hapus Semua</button>
        </div>
        <div class="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 snap-gallery">
          <div
            v-for="(snap, i) in snapshots" :key="i"
            class="shrink-0 w-28 sm:w-36 md:w-40 snap-card group"
            @click="openModal(i)"
          >
            <div class="relative overflow-hidden rounded-t-lg">
              <img :src="snap.dataUrl" class="w-full aspect-square canvas-pixel" :alt="'Snapshot ' + (i+1)" />
              <div class="absolute inset-0 bg-gradient-to-t from-[#0a0b10]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                <span class="text-[9px] text-teal-400 font-data">Klik untuk perbesar</span>
              </div>
            </div>
            <div class="p-1.5 sm:p-2">
              <div class="flex items-center gap-1">
                <p class="font-data text-[8px] sm:text-[10px] text-[#555d70]">t = {{ snap.time.toFixed(2) }} thn</p>
                <span v-if="snap.auto" class="text-[6px] sm:text-[7px] px-1 py-0.5 bg-amber-500/15 text-amber-400/70 rounded font-body">AUTO</span>
              </div>
              <p class="font-data text-[8px] sm:text-[10px] text-teal-400/60">a={{ snap.a.toFixed(2) }} m={{ snap.m.toFixed(2) }}</p>
              <p class="font-data text-[7px] sm:text-[8px] text-[#3a3f50]">iter #{{ snap.iteration.toLocaleString() }}</p>
              <div class="flex items-center gap-1.5 mt-1">
                <button @click.stop="downloadSnapshot(i)" class="text-[7px] sm:text-[9px] px-1.5 py-0.5 bg-teal-600/15 text-teal-400/70 rounded hover:bg-teal-600/30 transition font-data">Simpan</button>
                <span class="text-[7px] sm:text-[8px] text-[#3a3f50] truncate font-body">{{ snap.status }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 sm:mt-6 card">
        <h2 class="section-title mb-3">Dinamika Temporal</h2>
        <svg :viewBox="`0 0 ${chartW} ${chartH}`" class="w-full h-20 sm:h-28 lg:h-32" preserveAspectRatio="none">
          <line v-for="i in 4" :key="i" :x1="0" :y1="chartH * i / 5" :x2="chartW" :y2="chartH * i / 5" stroke="#13151e" stroke-width="0.5" />
          <path v-if="biomassPath" :d="biomassPath" fill="none" stroke="#34d399" stroke-width="2" stroke-linejoin="round" />
          <path v-if="waterPath" :d="waterPath" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="4,3" />
        </svg>
        <div class="flex gap-4 sm:gap-6 mt-2 text-[9px] sm:text-xs text-[#555d70] font-body">
          <span class="flex items-center gap-1.5"><span class="w-3 h-0.5 bg-emerald-400 inline-block rounded"></span> B_avg (Biomassa)</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-0.5 bg-blue-400 inline-block rounded"></span> R_avg (Air)</span>
        </div>
      </div>

      <div class="mt-4 sm:mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">

        <div class="card">
          <h2 class="section-title mb-3">Diagram Bifurkasi <span class="text-red-400/60">(Tipping Point)</span></h2>
          <svg :viewBox="`0 0 ${bifW} ${bifH + 30}`" class="w-full" preserveAspectRatio="xMidYMid meet">
            <line v-for="i in 5" :key="'bh'+i" :x1="0" :y1="bifH * i / 6" :x2="bifW" :y2="bifH * i / 6" stroke="#13151e" stroke-width="0.5" />
            <line v-for="i in 5" :key="'bv'+i" :x1="bifW * i / 6" :y1="0" :x2="bifW * i / 6" :y2="bifH" stroke="#13151e" stroke-width="0.5" />

            <rect :x="0" :y="0" :width="bifTippingX" :height="bifH" fill="rgba(239,68,68,0.04)" />
            <line :x1="bifTippingX" :y1="0" :x2="bifTippingX" :y2="bifH" stroke="#ef4444" stroke-width="1" stroke-dasharray="3,3" opacity="0.5" />
            <text :x="bifTippingX + 4" :y="14" fill="#ef4444" font-size="9" opacity="0.7" class="font-svg-data">a* = {{ bifurcationData.aCrit.toFixed(2) }}</text>

            <path :d="bifDesertPath" fill="none" stroke="#ef4444" stroke-width="2" class="anim-draw" style="--draw-len: 600" />
            <path v-if="bifUpperPath" :d="bifUpperPath" fill="none" stroke="#34d399" stroke-width="2.5" class="anim-draw" style="--draw-len: 800" />
            <path v-if="bifLowerPath" :d="bifLowerPath" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.6" class="anim-draw" style="--draw-len: 800" />

            <line :x1="bifCurrentX" :y1="0" :x2="bifCurrentX" :y2="bifH" stroke="#5eead4" stroke-width="1.5" opacity="0.7" class="anim-cursor" />

            <path v-if="bifTrailPath" :d="bifTrailPath" fill="none" stroke="#f472b6" stroke-width="1.5" opacity="0.6" stroke-linejoin="round" />

            <circle :cx="bifLivePoint.x" :cy="bifLivePoint.y" r="5" fill="#f472b6" stroke="#07080c" stroke-width="1.5" class="anim-pulse-dot" />
            <text :x="bifLivePoint.x + 9" :y="bifLivePoint.y + 4" fill="#f472b6" font-size="8" class="font-svg-data">B_avg</text>

            <circle :cx="bifCurrentX" :cy="bifH" r="4" fill="#5eead4" class="anim-pulse-dot" />

            <text :x="bifW - 5" :y="bifH - 5" fill="#ef4444" font-size="8" text-anchor="end" opacity="0.5" class="font-svg-data">Gurun (B=0)</text>
            <text x="5" :y="bifH + 15" fill="#555d70" font-size="8" class="font-svg-data">a = 0.5</text>
            <text :x="bifW - 5" :y="bifH + 15" fill="#555d70" font-size="8" text-anchor="end" class="font-svg-data">a = 3.5</text>
            <text x="5" y="11" fill="#555d70" font-size="9" class="font-svg-data">B*</text>
            <text :x="bifW / 2" :y="bifH + 26" fill="#555d70" font-size="9" text-anchor="middle" class="font-svg-data">Curah Hujan (a)</text>
          </svg>
          <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[8px] sm:text-[10px] text-[#555d70] font-body">
            <span class="flex items-center gap-1"><span class="w-2.5 h-0.5 bg-emerald-400 inline-block rounded"></span> Stabil (atas)</span>
            <span class="flex items-center gap-1"><span class="w-2.5 h-0.5 bg-amber-400 inline-block rounded"></span> Tidak stabil</span>
            <span class="flex items-center gap-1"><span class="w-2.5 h-0.5 bg-red-400 inline-block rounded"></span> Gurun</span>
            <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 bg-teal-400 inline-block rounded-full"></span> Nilai a saat ini</span>
            <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 bg-pink-400 inline-block rounded-full"></span> B_avg aktual (live)</span>
          </div>
        </div>

        <div class="card">
          <h2 class="section-title mb-3">Busse Balloon <span class="text-teal-400/60">(Stabilitas Pola)</span></h2>
          <svg :viewBox="`0 0 ${busseW} ${busseH + 30}`" class="w-full" preserveAspectRatio="xMidYMid meet">
            <line v-for="i in 5" :key="'ush'+i" :x1="0" :y1="busseH * i / 6" :x2="busseW" :y2="busseH * i / 6" stroke="#13151e" stroke-width="0.5" />
            <line v-for="i in 5" :key="'usv'+i" :x1="busseW * i / 6" :y1="0" :x2="busseW * i / 6" :y2="busseH" stroke="#13151e" stroke-width="0.5" />

            <path v-if="busseBoundaryPath" :d="busseBoundaryPath" fill="rgba(94,234,212,0.07)" stroke="rgba(94,234,212,0.3)" stroke-width="1" class="anim-balloon" />
            <path v-if="busseMaxPath" :d="busseMaxPath" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="3,3" class="anim-draw" style="--draw-len: 800" />

            <line :x1="busseCurrentX" :y1="0" :x2="busseCurrentX" :y2="busseH" stroke="#5eead4" stroke-width="1.5" opacity="0.5" class="anim-cursor" />

            <text x="5" y="11" fill="#555d70" font-size="9" class="font-svg-data">k</text>
            <text :x="busseW / 2" :y="busseH + 26" fill="#555d70" font-size="9" text-anchor="middle" class="font-svg-data">Curah Hujan (a)</text>
            <text x="5" :y="busseH + 15" fill="#555d70" font-size="8" class="font-svg-data">a = 0.5</text>
            <text :x="busseW - 5" :y="busseH + 15" fill="#555d70" font-size="8" text-anchor="end" class="font-svg-data">a = 3.5</text>
          </svg>
          <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[8px] sm:text-[10px] text-[#555d70] font-body">
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 bg-teal-500/20 border border-teal-500/40 inline-block rounded-sm"></span> Zona Instabilitas Turing</span>
            <span class="flex items-center gap-1"><span class="w-2.5 h-0.5 bg-amber-400 inline-block rounded"></span> k paling tidak stabil</span>
          </div>
        </div>

        <div class="card md:col-span-2 xl:col-span-1">
          <h2 class="section-title mb-3">Potret Fase <span class="text-sky-400/60">(Nullclines)</span></h2>
          <svg :viewBox="`0 0 ${phaseW} ${phaseH + 30}`" class="w-full" preserveAspectRatio="xMidYMid meet">
            <line v-for="i in 5" :key="'ph'+i" :x1="0" :y1="phaseH * i / 6" :x2="phaseW" :y2="phaseH * i / 6" stroke="#13151e" stroke-width="0.5" />
            <line v-for="i in 5" :key="'pv'+i" :x1="phaseW * i / 6" :y1="0" :x2="phaseW * i / 6" :y2="phaseH" stroke="#13151e" stroke-width="0.5" />

            <path v-if="bnullPath" :d="bnullPath" fill="none" stroke="#34d399" stroke-width="2" />
            <path v-if="wnullPath" :d="wnullPath" fill="none" stroke="#60a5fa" stroke-width="2" />

            <template v-for="(ss, i) in nullclineData.steadyStates" :key="'ss'+i">
              <circle
                :cx="phaseToSvg(ss.B, ss.W).x" :cy="phaseToSvg(ss.B, ss.W).y"
                :r="5"
                :fill="ss.stable ? (ss.type === 'gurun' ? '#ef4444' : '#34d399') : 'none'"
                :stroke="ss.stable ? 'none' : '#fbbf24'"
                :stroke-width="ss.stable ? 0 : 2"
              />
            </template>

            <text x="5" y="11" fill="#555d70" font-size="9" class="font-svg-data">R</text>
            <text :x="phaseW / 2" :y="phaseH + 26" fill="#555d70" font-size="9" text-anchor="middle" class="font-svg-data">Biomassa (B)</text>
            <text x="5" :y="phaseH + 15" fill="#555d70" font-size="8" class="font-svg-data">B = 0</text>
            <text :x="phaseW - 5" :y="phaseH + 15" fill="#555d70" font-size="8" text-anchor="end" class="font-svg-data">B = 5</text>
          </svg>
          <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[8px] sm:text-[10px] text-[#555d70] font-body">
            <span class="flex items-center gap-1"><span class="w-2.5 h-0.5 bg-emerald-400 inline-block rounded"></span> dB/dt = 0</span>
            <span class="flex items-center gap-1"><span class="w-2.5 h-0.5 bg-blue-400 inline-block rounded"></span> dR/dt = 0</span>
            <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 bg-emerald-400 inline-block rounded-full"></span> Stabil</span>
            <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 border border-amber-400 inline-block rounded-full"></span> Saddle</span>
            <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 bg-red-400 inline-block rounded-full"></span> Gurun</span>
          </div>
        </div>
      </div>
    </main>

  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
</style>

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
.font-svg-data {
  font-family: 'JetBrains Mono', monospace;
}

.canvas-pixel {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.canvas-glow {
  box-shadow: 0 0 40px rgba(65, 201, 133, 0.07), inset 0 0 0 1px rgba(65, 201, 133, 0.12);
}

.card {
  background: #0d1713;
  border-radius: 0.8rem;
  border: 1px solid #1f3229;
  padding: 1.25rem;
  box-shadow: 4px 4px 0 0 #08110d;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 0 #08110d;
  border-color: #2e4b3d;
}

.section-title {
  font-size: 0.65rem;
  font-weight: 700;
  color: #83a592;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: 'Space Grotesk', system-ui, sans-serif;
}

.metric-box {
  background: rgba(11, 22, 17, 0.85);
  border-radius: 0.75rem;
  padding: 0.625rem;
  border: 1px solid #1f3229;
}

.metric-label {
  font-size: 0.55rem;
  color: #3a3f50;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: 'JetBrains Mono', monospace;
}

.eq-box {
  background: #0b1712;
  border-radius: 0.625rem;
  padding: 0.75rem;
  border: 1px solid #1f3229;
}

.btn-secondary {
  background: #13231b;
  border: 1px solid #1f3229;
  color: #a4b8ac;
  font-size: 0.7rem;
  padding: 0.5rem 0.625rem;
  border-radius: 0.6rem;
  font-weight: 600;
  transition: all 0.2s;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  box-shadow: 2px 2px 0 0 #08110d;
}
.btn-secondary:hover {
  background: #1a2e24;
  color: #d7e8df;
  transform: translate(-1px, -1px);
}

.btn-capture {
  background: #13231b;
  border: 1px solid #1f3229;
  color: #a4b8ac;
  font-size: 0.85rem;
  padding: 0.5rem 0.625rem;
  border-radius: 0.6rem;
  transition: all 0.2s;
  line-height: 1;
  box-shadow: 2px 2px 0 0 #08110d;
}
.btn-capture:hover {
  background: #1a2e24;
  border-color: #3fb877;
  color: #3fd08a;
  transform: translate(-1px, -1px);
}

.config-row {
  background: rgba(11, 22, 17, 0.85);
  border-radius: 0.5rem;
  padding: 0.375rem 0.625rem;
  border: 1px solid #1f3229;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.config-label {
  font-size: 0.55rem;
  color: #83a592;
  font-family: 'Space Grotesk', system-ui, sans-serif;
}
.config-val {
  font-size: 0.65rem;
  color: #c0c8d8;
  font-family: 'JetBrains Mono', monospace;
}

.slider {
  width: 100%;
  height: 5px;
  border-radius: 999px;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  background: #122019;
}
.slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #08110d;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}
.slider-teal::-webkit-slider-thumb { background: #32d583; }
.slider-amber::-webkit-slider-thumb { background: #fbbf24; }
.slider-slate::-webkit-slider-thumb { background: #64748b; }
.slider-purple::-webkit-slider-thumb { background: #a78bfa; }

.snap-card {
  background: #0b1712;
  border-radius: 0.75rem;
  border: 1px solid #1f3229;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 3px 3px 0 0 #08110d;
}
.snap-card:hover {
  border-color: rgba(63, 208, 138, 0.35);
  transform: translate(-2px, -2px);
}

.snap-gallery::-webkit-scrollbar {
  height: 4px;
}
.snap-gallery::-webkit-scrollbar-track {
  background: #0b1712;
  border-radius: 4px;
}
.snap-gallery::-webkit-scrollbar-thumb {
  background: #1f3229;
  border-radius: 4px;
}
.snap-gallery::-webkit-scrollbar-thumb:hover {
  background: #2b4638;
}

.animate-modal {
  animation: modalIn 0.2s ease-out;
}
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@media (max-width: 640px) {
  .card {
    padding: 0.875rem;
    border-radius: 0.75rem;
  }
  .section-title {
    font-size: 0.55rem;
  }
  .slider::-webkit-slider-thumb {
    width: 22px;
    height: 22px;
  }
}

@media (min-width: 1280px) {
  .card {
    padding: 1.5rem;
  }
}

/* SVG path draw-on animation */
.anim-draw {
  stroke-dasharray: var(--draw-len, 600);
  stroke-dashoffset: var(--draw-len, 600);
  animation: svgDraw 1.4s cubic-bezier(0.65, 0, 0.35, 1) forwards;
}
@keyframes svgDraw {
  to { stroke-dashoffset: 0; }
}

/* Busse balloon fill fade-in */
.anim-balloon {
  opacity: 0;
  animation: balloonFade 1.8s 0.4s ease-out forwards;
}
@keyframes balloonFade {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Cursor line transition */
.anim-cursor {
  transition: x1 0.3s ease, x2 0.3s ease, y1 0.3s ease, y2 0.3s ease;
}

/* Pulsing current-position dot */
.anim-pulse-dot {
  animation: pulseDot 2s ease-in-out infinite;
  transition: cx 0.3s ease, cy 0.3s ease;
}
@keyframes pulseDot {
  0%, 100% { r: 4; opacity: 1; }
  50% { r: 6; opacity: 0.7; }
}

/* Auto-capture notification slide */
.animate-fadeSlide {
  animation: fadeSlide 0.3s ease-out, fadeSlide 0.3s 0.9s ease-in reverse forwards;
}
@keyframes fadeSlide {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
