// ─── Electron 预加载脚本 ─────────────────────────────────────────────────
// 在渲染进程注入 isElectron 标记
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
})
