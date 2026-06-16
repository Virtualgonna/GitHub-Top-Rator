---
name: Bug Report / 缺陷报告
about: 报告一个会让应用无法按预期工作的缺陷
title: '[Bug] '
labels: bug, needs-triage
assignees: ''
---

## 1. 描述 Describe the Bug

<!-- 用一两句话清晰描述这个 Bug。例如："在筛选 'Today' 时点击 'Star History' 按钮会白屏。" -->

## 2. 复现步骤 To Reproduce

1. 打开 ___ 页面/选项卡
2. 配置 ___ （语言、AI Provider、Token 等）
3. 点击/触发 ___
4. 看到 ___ 异常

## 3. 期望行为 Expected Behavior

<!-- 简述你期望发生什么。 -->

## 4. 实际行为 Actual Behavior

<!-- 简述实际发生了什么，最好附上截图或录屏。 -->

## 5. 环境信息 Environment

| 项目 | 版本/值 |
|------|---------|
| 操作系统 | e.g. Windows 11 23H2 |
| 应用形态 | e.g. Web 浏览器 (Chrome 124) / Electron 桌面端 v1.0.0 |
| Node.js (仅开发) | e.g. 20.11.0 |
| AI Provider | e.g. DeepSeek |
| 是否使用自定义代理/CORS 转发 | e.g. 否 / 是，走 127.0.0.1:7890 |

## 6. 截图 / 录屏 Screenshots / Recordings

<!-- 如果有 UI 相关问题，请拖拽或粘贴图片。 -->

## 7. 控制台日志 Console Output

<!-- 在浏览器 DevTools Console 或 Electron 主进程终端中观察到的报错（去掉敏感信息）。 -->

```text
粘贴日志片段
```

## 8. 自查 Checklist

- [ ] 我已经在 [最新 main 分支](https://github.com/.../commits/main) 上复现
- [ ] 我已经在 [已有 Issues](https://github.com/.../issues) 中搜索过，未发现重复
- [ ] 我没有在 issue 中粘贴任何 Token / API Key
- [ ] 如涉及 AI 总结异常，我已在设置中勾选"不发送 Token"验证
