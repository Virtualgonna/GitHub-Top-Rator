// electron-builder 配置（CJS 格式，因?package.json type=module?）
module.exports = {
  appId: 'com.github-top-radar.app',
  productName: 'GitHub Top Radar',
  directories: {
    output: 'release',
  },
  files: [
    'dist/**/*',
    'electron/**/*',
    // 主进程 BrowserWindow 用到的 icon.png 必须打进 asar，否则运行时找不到
    'icon.png',
  ],
  // 本项目无 native 依赖，跳过 @electron/rebuild（Windows 上 fork 失败 EPERM）
  npmRebuild: false,
  win: {
    // 预先生成的 .ico（含 7 张尺寸，最大 256x256），直接使用以避开 runIconsTool 的 spawn EPERM
    icon: 'build/icon.ico',
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'GitHub Top Radar',
  },
}
