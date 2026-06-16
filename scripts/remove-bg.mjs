// 把 PNG 的背景色变透明
// 算法: flood fill from 4 corners —— 从图片 4 角开始 BFS,
//       把"跟角点颜色距离 ≤ threshold"且"跟边角连通"的像素 alpha 置 0
// 优势: 不会误删图片内部的"白/黑洞", 主体保持不透明
// 用法:
//   node scripts/remove-bg.mjs                 # 处理全部 3 个
//   node scripts/remove-bg.mjs --backup        # 备份原文件到 scripts/.backup/ 后处理
//   node scripts/remove-bg.mjs --restore       # 从 scripts/.backup/ 恢复
//   node scripts/remove-bg.mjs --file icon.png # 只处理指定文件
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'

const projectRoot = path.resolve('.')

const TARGETS = [
  { file: 'icon.png',              bg: [255, 255, 255], mode: 'white' },
  { file: 'public/logo.png',       bg: [255, 255, 255], mode: 'white' },
  // hero.png 跳过: 原图是 palette 模式 + 91.77% 像素已 alpha 透明 (但 RGB 是黑色)
  //               视觉上本身就是"透明背景的图", 处理反而会让文件膨胀 3.6 倍
  { file: 'src/assets/hero.png',   bg: [0, 0, 0], mode: 'black', skip: true,
    skipReason: 'palette 模式 + 91.77% 已 alpha 透明, 不需要去背景' },
]

const THRESHOLD = 30       // RGB 距离 ≤ threshold 视为背景
const BACKUP_DIR = path.join('scripts', '.backup')

// ─── BFS 队列 (避免大图递归爆栈) ─────────────────────────────
class Queue {
  constructor() { this.a = []; this.head = 0 }
  push(v) { this.a.push(v) }
  pop() { return this.a[this.head++] }
  get size() { return this.a.length - this.head }
}

function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function floodFillFromCorners(png, bgR, bgG, bgB, threshold) {
  const { width: w, height: h, data } = png
  const visited = new Uint8Array(w * h)
  const q = new Queue()
  // 4 角入队
  const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]
  for (const [x, y] of corners) q.push((y * w + x) * 4)
  let removed = 0
  while (q.size > 0) {
    const idx = q.pop()
    if (visited[idx / 4]) continue
    visited[idx / 4] = 1
    const r = data[idx], g = data[idx + 1], b = data[idx + 2]
    const d = colorDist(r, g, b, bgR, bgG, bgB)
    if (d > threshold) continue
    // 命中: 设为透明
    if (data[idx + 3] !== 0) {
      data[idx + 3] = 0
      removed++
    }
    const x = (idx / 4) % w
    const y = Math.floor((idx / 4) / w)
    // 4 邻接
    if (x > 0)         q.push(idx - 4)
    if (x < w - 1)     q.push(idx + 4)
    if (y > 0)         q.push(idx - w * 4)
    if (y < h - 1)     q.push(idx + w * 4)
  }
  return removed
}

function processFile(relPath, bg, doBackup) {
  const full = path.join(projectRoot, relPath)
  if (!existsSync(full)) {
    console.log(`  ✗ ${relPath}  不存在, 跳过`)
    return null
  }
  const buf = readFileSync(full)
  const beforeSize = buf.length
  const png = PNG.sync.read(buf)
  const { width: w, height: h } = png
  const beforeNonBg = (() => {
    let n = 0
    for (let i = 0; i < png.data.length; i += 4) {
      const d = colorDist(png.data[i], png.data[i + 1], png.data[i + 2], bg[0], bg[1], bg[2])
      if (d > THRESHOLD && png.data[i + 3] > 128) n++
    }
    return n
  })()

  if (doBackup) {
    mkdirSync(BACKUP_DIR, { recursive: true })
    const safeName = relPath.replace(/[/\\]/g, '__')
    copyFileSync(full, path.join(BACKUP_DIR, safeName))
  }

  // 处理
  const removed = floodFillFromCorners(png, bg[0], bg[1], bg[2], THRESHOLD)

  // 重新编码
  const out = PNG.sync.write(png, { deflateLevel: 9 })
  writeFileSync(full, out)
  const afterSize = out.length
  return { relPath, w, h, beforeSize, afterSize, removed, beforeNonBg }
}

function restoreAll() {
  if (!existsSync(BACKUP_DIR)) {
    console.log('  没有备份目录, 无需恢复')
    return
  }
  const files = readdirSync(BACKUP_DIR)
  for (const f of files) {
    const rel = f.replace(/__/g, path.sep)
    const src = path.join(BACKUP_DIR, f)
    const dst = path.join(projectRoot, rel)
    if (existsSync(dst)) {
      copyFileSync(src, dst)
      console.log(`  ↩  ${rel}  ←  ${src}`)
    }
  }
}

function main() {
  const args = process.argv.slice(2)
  const doBackup = !args.includes('--no-backup')
  const onlyBackup = args.includes('--backup')
  const onlyRestore = args.includes('--restore')
  const fileIdx = args.indexOf('--file')
  const onlyFile = fileIdx >= 0 ? args[fileIdx + 1] : null

  console.log('━'.repeat(60))
  console.log('PNG 背景透明化工具 (flood fill from corners)')
  console.log('━'.repeat(60))

  if (onlyRestore) {
    console.log('模式: 恢复 (从 scripts/.backup/ 还原)')
    restoreAll()
    return
  }

  if (onlyBackup) {
    mkdirSync(BACKUP_DIR, { recursive: true })
    for (const t of TARGETS) {
      if (onlyFile && t.file !== onlyFile) continue
      if (t.skip) continue
      const full = path.join(projectRoot, t.file)
      if (!existsSync(full)) continue
      const safeName = t.file.replace(/[/\\]/g, '__')
      copyFileSync(full, path.join(BACKUP_DIR, safeName))
      console.log(`  ✓ 备份 ${t.file} → scripts/.backup/${safeName}`)
    }
    return
  }

  console.log(`阈值: THRESHOLD=${THRESHOLD} (RGB 欧氏距离)`)
  console.log(`备份: ${doBackup ? `是 → ${BACKUP_DIR}/` : '否 (用户主动 --no-backup)'}`)
  console.log(`目标:`)
  for (const t of TARGETS) {
    if (onlyFile && t.file !== onlyFile) continue
    if (t.skip) {
      console.log(`  • ${t.file}  [SKIP] ${t.skipReason}`)
    } else {
      console.log(`  • ${t.file}  (去${t.mode === 'white' ? '白' : '黑'}底)`)
    }
  }
  console.log('')

  const results = []
  for (const t of TARGETS) {
    if (onlyFile && t.file !== onlyFile) continue
    if (t.skip) {
      console.log(`⏭  跳过 ${t.file}: ${t.skipReason}`)
      console.log('')
      continue
    }
    console.log(`▶ 处理 ${t.file} ...`)
    const r = processFile(t.file, t.bg, doBackup)
    if (r) {
      console.log(`  ✓ ${r.relPath}`)
      console.log(`    尺寸: ${r.w}×${r.h}`)
      console.log(`    文件: ${r.beforeSize} → ${r.afterSize} bytes (${(r.afterSize / r.beforeSize * 100).toFixed(1)}%)`)
      console.log(`    透明化像素: ${r.removed} (${(r.removed / (r.w * r.h) * 100).toFixed(2)}% of pixels)`)
      console.log(`    主体(非背景)像素: ${r.beforeNonBg} (处理前, 应当保持不变)`)
      results.push(r)
    }
    console.log('')
  }
  if (results.length === 0) {
    console.log('  (没有处理任何文件)')
  } else {
    console.log('━'.repeat(60))
    console.log('✓ 处理完成. 备份在', BACKUP_DIR + '/')
  }
}

main()
