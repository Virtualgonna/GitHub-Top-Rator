@echo off
REM ============================================================
REM  GitHub Top Radar · Windows 本地启动器
REM  双击本文件即可启动 launcher-server.cjs 并用默认浏览器打开
REM ============================================================
chcp 65001 >nul
title GitHub Top Radar - Launcher

cd /d "%~dp0\.."

echo.
echo  ============================================
echo   GitHub Top Radar  本地启动器
echo  ============================================
echo.
echo   正在启动本地服务 (端口 5180)...
echo   关闭此窗口或按 Ctrl+C 可停止服务
echo.

node scripts\launcher-server.cjs

if errorlevel 1 (
  echo.
  echo  [错误] 启动失败：请确认已安装 Node.js
  echo          下载地址: https://nodejs.org/
  echo.
  pause
)
