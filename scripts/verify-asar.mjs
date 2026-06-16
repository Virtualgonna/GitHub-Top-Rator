// 验证 app.asar 内容：列出所有文件，检查是否包含 icon.png 和新的 electron/main.js
import { extractAll } from '@electron/asar'
import { readFileSync, rmSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const projectRoot = 'D:\\3_Work\\8_行业咨询跟踪\\GitHub-Top-Radar'
const asarPath = path.join(projectRoot, 'release', 'win-unpacked', 'resources', 'app.asar')
const dst = path.join(projectRoot, '.tmp-asar-verify')

try { rmSync(dst, { recursive: true, force: true }) } catch {}

extractAll(asarPath, dst)

function walk(dir, prefix = '') {
  const items = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix + e.name
    const full = path.join(dir, e.name)
    if (e.isDirectory()) items.push(...walk(full, rel + '/'))
    else items.push({ path: rel, size: statSync(full).size })
  }
  return items
}

console.log('=== app.asar contents ===')
const files = walk(dst)
files.forEach(f => console.log(f.size.toString().padStart(8), f.path))

// 关键校验：icon.png 和 electron/main.js 是否在 asar 内
console.log('\n=== Key checks ===')
const iconPng = files.find(f => f.path === 'icon.png')
console.log('icon.png       :', iconPng ? `${iconPng.size} bytes ✓` : 'MISSING ✗')

const mainJs = files.find(f => f.path === 'electron/main.js')
if (mainJs) {
  const content = readFileSync(path.join(dst, 'electron', 'main.js'), 'utf8')
  const usesIconPng = content.includes("..', 'icon.png')")
  console.log('electron/main.js:', `${mainJs.size} bytes, references icon.png: ${usesIconPng ? '✓' : '✗'}`)
}

// 清理
rmSync(dst, { recursive: true, force: true })
console.log('\n=== cleaned up:', dst)