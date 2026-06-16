// 用 pngjs 精确分析每张 PNG 的颜色分布
// 1) 取整张图的主色调
// 2) 找"非背景"区域 (跟 4 角颜色差异 > 阈值的像素)
// 3) 输出统计信息判断能否安全去背景
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'

const targets = [
  { file: 'icon.png', mode: 'white' },           // 去白
  { file: 'public/logo.png', mode: 'white' },    // 去白
  { file: 'src/assets/hero.png', mode: 'black' },// 去黑
]

function colorDist(a, b) {
  // a/b: {r,g,b,a}
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function modeBg(mode) {
  return mode === 'white'
    ? { r: 255, g: 255, b: 255, a: 255 }
    : { r: 0, g: 0, b: 0, a: 255 }
}

function analyze(file, mode) {
  const buf = readFileSync(file)
  const png = PNG.sync.read(buf)
  const { width: w, height: h, data } = png
  const bg = modeBg(mode)

  // 1) 统计"接近背景色"的像素数
  const THRESHOLD = 30 // RGB 距离 ≤30 视为背景
  let bgCount = 0
  let nonBgCount = 0
  let transparentCount = 0

  // 2) 找"非背景"区域 bbox
  let minX = w, minY = h, maxX = -1, maxY = -1

  // 3) 颜色直方图 (top 8)
  const colorHist = new Map()
  function histKey(r, g, b) {
    // 量化到 16 阶
    return `${r >> 4},${g >> 4},${b >> 4}`
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
      if (a < 128) transparentCount++
      const d = colorDist({ r, g, b, a: 255 }, bg)
      if (d <= THRESHOLD) {
        bgCount++
      } else {
        nonBgCount++
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
      const key = histKey(r, g, b)
      colorHist.set(key, (colorHist.get(key) || 0) + 1)
    }
  }
  const total = w * h
  const bgPct = (bgCount / total * 100).toFixed(2)
  const nonBgPct = (nonBgCount / total * 100).toFixed(2)
  const transPct = (transparentCount / total * 100).toFixed(2)

  const topColors = [...colorHist.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => {
      const [r4, g4, b4] = k.split(',').map(Number)
      const pct = (v / total * 100).toFixed(2)
      return `~rgb(${(r4 << 4) + 8},${(g4 << 4) + 8},${(b4 << 4) + 8}) ${pct}%`
    })

  console.log('━'.repeat(60))
  console.log(`FILE   : ${file}`)
  console.log(`SIZE   : ${w}×${h} (${buf.length} bytes)`)
  console.log(`MODE   : 去${mode === 'white' ? '白' : '黑'}底 (threshold=${THRESHOLD})`)
  console.log(`像素分布:`)
  console.log(`  背景色像素: ${bgPct}%`)
  console.log(`  非背景像素: ${nonBgPct}%`)
  console.log(`  已透明像素: ${transPct}% (已有 alpha < 128)`)
  if (nonBgCount > 0) {
    console.log(`  非背景区域 bbox: (${minX},${minY}) - (${maxX},${maxY})`)
    console.log(`                  宽 ${maxX - minX + 1} × 高 ${maxY - minY + 1}`)
  } else {
    console.log(`  非背景区域 bbox: NONE (整张都是背景色！)`)
  }
  console.log(`Top 颜色 (含背景):`)
  topColors.forEach(c => console.log(`  ${c}`))
}

const projectRoot = 'D:\\3_Work\\8_行业咨询跟踪\\GitHub-Top-Radar'
for (const { file, mode } of targets) {
  const full = path.join(projectRoot, file)
  try {
    analyze(full, mode)
  } catch (e) {
    console.log('━'.repeat(60))
    console.log(`FILE   : ${file}  ERROR: ${e.message}`)
  }
}
