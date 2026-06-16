// 端到端冒烟测试：验证「自动刷新」+ 新增「2026 新建项目榜 / 全站 Star 总榜」视图
const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  const errors = []
  const consoleMsgs = []
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`)
    consoleMsgs.push(`[${msg.type()}] ${msg.text()}`)
  })

  // 辅助：检查某个 view 的 div（通过 .main-content > div > div:nth-child(N)）是否激活
  const checkView = async (viewIdx, label) => {
    const info = await page.evaluate((idx) => {
      const outer = document.querySelector('.main-content > div')
      if (!outer) return { error: 'no outer div' }
      const div = outer.querySelectorAll(':scope > div')[idx]
      if (!div) return { error: `no inner div[${idx}]` }
      const cs = getComputedStyle(div)
      const desc = div.querySelector('.top-repos-desc')
      const descRect = desc ? desc.getBoundingClientRect() : null
      return {
        display: cs.display,
        hasDesc: !!desc,
        descVisible: descRect && descRect.width > 0 && descRect.height > 0,
        pageLoading: !!div.querySelector('.page-loading'),
        pageEmpty: !!div.querySelector('.page-empty'),
        pageError: div.querySelector('.page-error')?.textContent || null,
        growthSidebar: div.querySelectorAll('.growth-sidebar').length,
        favBtnCount: div.querySelectorAll('.top-repo-sidebar .fav-btn-quick').length,
        cardCount: div.querySelectorAll('.trending-card').length,
      }
    }, viewIdx)
    console.log(`  ${label}:`, JSON.stringify(info))
    return info
  }

  try {
    await page.goto('http://localhost:5183/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForSelector('.header-nav', { timeout: 10000 })

    // 1) 6 个导航 Tab 是否齐全
    const navTabs = await page.$$eval('.nav-tab', els => els.map(e => e.textContent.trim()))
    console.log('导航 Tab:', navTabs)
    const expectedTabs = ['Repos', 'Developers', '2026 新建项目榜', '全站 Star 总榜', '我的收藏', '浏览足迹']
    for (const t of expectedTabs) {
      if (!navTabs.some(tab => tab.includes(t))) errors.push(`[UI] 缺少导航 Tab: ${t}`)
    }

    // 2) 默认 trending 应自动加载（首次进入）
    await page.waitForTimeout(800)
    const trendingInfo = await checkView(0, '默认 trending 视图')
    if (trendingInfo.pageLoading || trendingInfo.cardCount > 0) {
      console.log('  ✓ trending 自动加载')
    } else {
      errors.push('[UI] trending 首次未自动加载')
    }

    // 3) 点击「2026 新建项目榜」
    console.log('\n>>> 点击 2026 新建项目榜')
    await page.locator('.nav-tab', { hasText: '2026 新建项目榜' }).click()
    await page.waitForTimeout(1000)
    const new2026 = await checkView(2, 'new2026 视图')
    if (new2026.display !== 'block') errors.push('[UI] 2026 视图未显示')
    if (!new2026.hasDesc) errors.push('[UI] 2026 视图缺少 .top-repos-desc')
    if (!new2026.descVisible) errors.push('[UI] 2026 视图 description 不可见')
    if (new2026.pageLoading && new2026.cardCount === 0) {
      // 首次进入触发自动加载 - 正常
      console.log('  ✓ 2026 视图首次进入正在自动加载')
    }

    // 4) 点击「全站 Star 总榜」
    console.log('\n>>> 点击 全站 Star 总榜')
    await page.locator('.nav-tab', { hasText: '全站 Star 总榜' }).click()
    await page.waitForTimeout(1000)
    const alltime = await checkView(3, 'alltime 视图')
    if (alltime.display !== 'block') errors.push('[UI] alltime 视图未显示')
    if (!alltime.hasDesc) errors.push('[UI] alltime 视图缺少 .top-repos-desc')
    if (!alltime.descVisible) errors.push('[UI] alltime 视图 description 不可见')
    if (alltime.growthSidebar > 0) {
      errors.push(`[UI] alltime 视图不应出现 .growth-sidebar，但发现 ${alltime.growthSidebar} 个`)
    } else {
      console.log('  ✓ alltime 视图未出现 .growth-sidebar（按需求不应显示周期 star 增长）')
    }

    // 5) 截图存档
    await page.screenshot({ path: 'smoke-test-alltime.png', fullPage: true })
    console.log('\n  截图已保存: smoke-test-alltime.png')

  } catch (e) {
    errors.push(`[Exception] ${e.message}`)
  }

  console.log('\n--- 错误汇总 ---')
  if (errors.length === 0) {
    console.log('✅ 全部通过')
  } else {
    for (const e of errors) console.log('❌', e)
  }

  console.log('\n--- Console 关键日志 (最后 10 条) ---')
  for (const m of consoleMsgs.slice(-10)) console.log(m)

  await browser.close()
  process.exit(errors.length === 0 ? 0 : 1)
})()
