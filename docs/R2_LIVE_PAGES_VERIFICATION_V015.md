# R2 v0.15 GitHub Pages 公网验收

版本日期：2026-08-05

## 目的

本文件记录 R2 开发终验之后的发布闭环。依据核心标准 v1.2，PR 合并、`main` 入口更新和真实公网页面可用是三个不同状态，必须分别验证。

## 合并状态

R2 产品 PR #10 已合并到 `main`。

合并提交：

```text
c3df66ecfbeb4f18d3191b741246e30dfb4797b0
```

`main/index.html` 已确认加载以下 R2 v0.15 资源：

```text
assets/css/r2-visual-refinement-v015.css
assets/css/r2-drawer-position-v015.css
assets/js/r2-visual-refinement-v015.js
assets/js/r2-mechanism-sync-v015.js
assets/js/r2-render-stability-v015.js
assets/js/r2-interval-clarity-v015.js
```

## 公网验收方式

新增独立验收文件：

```text
tests/live-pages-r2-v015.mjs
.github/workflows/live-pages-audit.yml
```

该任务直接访问 GitHub Pages 公网地址，并为每次访问添加随机查询参数以绕过旧 HTML 缓存。它不使用本地静态服务器。

## 公网验收结果

GitHub Actions 运行：`30984199602`

结果：通过。

- HTTP 状态：`200`
- R2 v0.15 的 4 个 JavaScript 和 2 个 CSS 资源全部出现在公网 HTML 中
- 页面模型：`plane-mirror`
- 应用运行时类：`app r2-v015-active`
- 视图运行时类：`r2-v015-mounted`
- 横向溢出：`0 px`
- 1735×865 任务区宽度利用率：约 `94.00%`
- 首屏 Canvas 非空检测：约 `0.12895`
- 真实拖动物体后：
  - 物距 `270 px → 320 px`
  - 物高 `150 px → 195 px`
- 参数抽屉实际边界：
  - `x = 1283`
  - `y = 12`
  - `width = 440`
  - `height ≈ 670.5`
  - 完整位于 1735×865 视口内
- 浏览器错误：`0`
- 公网验收断言失败：`0`

## 人工复核

公网主页面与参数抽屉截图均已实际查看，未再发现：

- 旧版窄版心或两侧巨大空白
- 首屏 Canvas 空白
- 参数抽屉裁切
- R2 新资源未发布
- 页面回退到旧版 R2

## 结论

R2 v0.15 已完成：

```text
开发终验
→ 合并 main
→ 主入口资源确认
→ GitHub Pages 公网无缓存访问
→ 公网真实拖动
→ 公网截图人工复核
```

因此 R2 v0.15 当前可以正式称为：**已合并、已发布、已完成真实公网验收。**

本轮范围为五种桌面视口；手机纵向窄屏不在完成声明内。
