// 从根目录的 icon.png 生成 build/icon.ico
// 用法：node scripts/gen-ico.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pngToIco from 'png-to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const src = path.join(projectRoot, 'icon.png')
const dst = path.join(projectRoot, 'build', 'icon.ico')

console.log('[gen-ico] source :', src)
console.log('[gen-ico] target :', dst)

const buf = await pngToIco(src)
writeFileSync(dst, buf)
console.log('[gen-ico] written :', buf.length, 'bytes')