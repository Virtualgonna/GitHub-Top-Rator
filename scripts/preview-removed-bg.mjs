// 生成对比预览图：把去背景后的 PNG 合成到 4 种背景上, 让用户直接看到效果
// 布局: 上下 4 行, 每行 = [标签条] + [合成图]
//       行 1: 纯白底
//       行 2: 纯黑底
//       行 3: 浅灰底 (代表 launcher hover 浅色场景)
//       行 4: 透明棋盘格 (PNG viewer 自己的透明展示)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'

const projectRoot = path.resolve('.')

const PREVIEW_DIR = path.join('scripts', '.preview')
const PREVIEW_BACKGROUND_DIR = path.join('scripts', '.preview', 'bg')
const TARGETS = [
  { file: 'icon.png',         label: 'icon.png  (522x522, EXE & launcher)' },
  { file: 'public/logo.png',  label: 'public/logo.png  (1357x763, Web app)' },
]

// 4 种背景, 每种颜色 + 是否带棋盘
const BACKGROUNDS = [
  { name: 'white',   r: 255, g: 255, b: 255, checker: false },
  { name: 'black',   r: 0,   g: 0,   b: 0,   checker: false },
  { name: 'gray',    r: 240, g: 240, b: 240, checker: false },
  { name: 'checker', r: 220, g: 220, b: 220, checker: true },
]

const LABEL_HEIGHT = 28    // 每行顶部标签条
const LABEL_TEXT_FALLBACK = 24  // 标签背景条高度 (无文字)
const PADDING = 0          // 行间距

function makePreview(srcPath, srcLabel) {
  const buf = readFileSync(srcPath)
  const src = PNG.sync.read(buf)
  const W = src.width
  const H = src.height
  const totalH = (H + LABEL_HEIGHT + PADDING) * BACKGROUNDS.length
  const out = new PNG({ width: W, height: totalH })

  // 给输出图填充"棋盘透明"作为底 (PNG 写入后 viewer 看到的就是棋盘)
  // 先 fill alpha=0
  for (let i = 3; i < out.data.length; i += 4) out.data[i] = 0

  for (let row = 0; row < BACKGROUNDS.length; row++) {
    const bg = BACKGROUNDS[row]
    const yStart = row * (H + LABEL_HEIGHT + PADDING)
    // 1) 标签条 (固定浅蓝, 简单点)
    drawLabelBar(out, 0, yStart, W, LABEL_HEIGHT, bg.name, srcLabel)

    // 2) 合成图区
    const imgY0 = yStart + LABEL_HEIGHT
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const di = ((imgY0 + y) * W + x) * 4
        // 决定背景色
        let br = bg.r, bg2 = bg.g, bb = bg.b
        if (bg.checker) {
          // 16x16 棋盘
          const cx = Math.floor(x / 16)
          const cy = Math.floor(y / 16)
          if ((cx + cy) % 2 === 0) {
            br = 220; bg2 = 220; bb = 220
          } else {
            br = 160; bg2 = 160; bb = 160
          }
        }
        // 源像素
        const si = (y * W + x) * 4
        const sr = src.data[si], sg = src.data[si + 1], sb = src.data[si + 2], sa = src.data[si + 3]
        // Alpha 合成: out = src*sa + bg*(1-sa)
        const a = sa / 255
        out.data[di]     = Math.round(sr * a + br * (1 - a))
        out.data[di + 1] = Math.round(sg * a + bg2 * (1 - a))
        out.data[di + 2] = Math.round(sb * a + bb * (1 - a))
        out.data[di + 3] = 255
      }
    }
  }
  return PNG.sync.write(out, { deflateLevel: 9 })
}

// 简单画一个标签条 (用颜色 + 反差竖条, 不画文字 - 文字需要 canvas/字体)
function drawLabelBar(out, x0, y0, w, h, bgName, srcLabel) {
  // 不同背景用不同颜色标签
  const labelColor = {
    'white':   [40, 40, 40],
    'black':   [220, 220, 220],
    'gray':    [80, 80, 80],
    'checker': [60, 60, 60],
  }[bgName] || [40, 40, 40]

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const di = ((y0 + y) * w + x) * 4
      // 交替深浅"色带", 简单标识
      if (y < h / 2) {
        out.data[di]     = labelColor[0]
        out.data[di + 1] = labelColor[1]
        out.data[di + 2] = labelColor[2]
      } else {
        out.data[di]     = Math.max(0, labelColor[0] - 30)
        out.data[di + 1] = Math.max(0, labelColor[1] - 30)
        out.data[di + 2] = Math.max(0, labelColor[2] - 30)
      }
      out.data[di + 3] = 255
    }
  }
}

function main() {
  mkdirSync(PREVIEW_DIR, { recursive: true })
  console.log('━'.repeat(60))
  console.log('生成对比预览图 (4 种背景 × 处理后的 PNG)')
  console.log('━'.repeat(60))

  for (const t of TARGETS) {
    const full = path.join(projectRoot, t.file)
    if (!existsSync(full)) {
      console.log(`  ✗ ${t.file}  不存在`)
      continue
    }
    const outName = t.file.replace(/[/\\]/g, '_').replace(/\.png$/, '') + '__preview.png'
    const outPath = path.join(PREVIEW_DIR, outName)
    console.log(`▶ ${t.file}`)
    console.log(`  label: ${t.label}`)
    const buf = makePreview(full, t.label)
    writeFileSync(outPath, buf)
    console.log(`  ✓ 写出 ${outPath}  (${buf.length} bytes)`)
    console.log(`  布局: 4 行 [白底|黑底|灰底|透明棋盘] × 原图尺寸`)
    console.log('')
  }

  console.log('━'.repeat(60))
  console.log('预览图已生成, 路径:')
  console.log('  ' + path.join(projectRoot, PREVIEW_DIR))
  console.log('  直接用 Windows 图片查看器打开即可对比效果')
}

main()
