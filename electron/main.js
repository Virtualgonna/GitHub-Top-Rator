// ─── Electron 主进程 ──────────────────────────────────────────────────────
import { app, BrowserWindow, protocol, net } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = process.argv.includes('--dev')
let mainWindow = null

// ★ 必须先在 app.whenReady() 之前把 app:// 声明为特权协议
//   否则渲染进程加载 CSS/JS 时会被 CORS 策略阻止
//   standard:  标识为标准协议（http/ftp/ws 等级别）
//   secure:    允许 fetch/CORS/XHR 等
//   supportFetchAPI / corsEnabled / stream：放宽同源 / 流式响应
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

// ★ protocol.handle 内部会访问 defaultSession
//   defaultSession 仅在 app.whenReady() 之后可用
//   因此必须把注册动作延后到 ready 回调中执行
//   （注册句柄的回调函数体到那时才执行）

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, '..', 'icon.png'),
    title: 'GitHub Top Radar',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadURL('app://desktop/index.html')
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // 1) 注册 app:// 协议（在窗口创建之前）
  if (!isDev) {
    protocol.handle('app', (request) => {
      const url = new URL(request.url)
      let filePath = decodeURIComponent(url.pathname)
      if (filePath === '/' || filePath === '') filePath = '/index.html'

      const fullPath = path.join(__dirname, '..', 'dist', filePath)
      return net.fetch(`file:///${fullPath.replace(/\\/g, '/')}`)
    })
  }

  // 2) 创建主窗口
  createWindow()

  // 3) macOS：dock 图标被点击时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
