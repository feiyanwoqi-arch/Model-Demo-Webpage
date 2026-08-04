# 交互式光学模型图谱

一个面向大学基础光学教学的交互式网页模型库。项目按**概念域 → 学习路径 → 具体模型**组织，而不是堆放彼此孤立的动画。

## 在线网站

GitHub Pages 已配置为从 `main` 分支根目录自动发布：

`https://feiyanwoqi-arch.github.io/Model-Demo-Webpage/`

薄膜旗舰实验直达地址：

`https://feiyanwoqi-arch.github.io/Model-Demo-Webpage/#model:thin-film`

## 当前版本：v0.11

### 自适应可见性与边缘轨道

v0.11 进一步解决了固定左右栏长期挤压主实验台的问题。页面元素不再按“位于左边还是右边”决定显示方式，而是按它是否参与当前物理分析闭环分类：

```text
常驻核心
├── 主光路、波前、拖动把手
├── 已选同步分析窗口
├── 核心实时判据
└── 紧凑的模式与时间控制

边缘轨道
├── 左侧分析模块选择器
└── 右侧完整参数检查器

按需展开
├── 板块目的、作用和建议操作
├── 公式解释
└── 模型边界
```

- 左右完整侧栏默认收起，只保留可发现的窄轨；
- 桌面细指针可悬停、聚焦或点击打开；
- 打开延迟 140 ms，离开延迟 560 ms，避免经过边缘误触和移入抽屉时闪退；
- 操作滑块期间抽屉保持打开；
- 两侧均可用图钉固定，固定状态保存到浏览器本地；
- Escape、关闭按钮和移动端遮罩均可关闭抽屉；
- 触屏不依赖 hover，而采用显式按钮和模态抽屉；
- 抽屉收起时，主要宽度只分配给主实验台与同步分析区；
- 顶部标题区和目的说明压缩为紧凑、按需展开结构。

完整判定规则、调研来源、禁止事项和全项目迁移算法见 [`docs/ADAPTIVE_VISIBILITY_POLICY_V011.md`](docs/ADAPTIVE_VISIBILITY_POLICY_V011.md)。

v0.11 还加入真实浏览器视觉回归：Pull Request 会在 Chromium 中以 2560×1440 和 1920×1080 打开模型、展开左右抽屉、生成截图并检查关键布局尺寸。第一次自动审计真实发现了标题区仍过高；后续人工查看截图又发现左抽屉继承旧三栏规则而出现文字竖排，均已修复并纳入回归断言。

### v0.10：可组合的同步实验工作台

v0.10 解决了“所有视图虽然共享状态，却不能在拖动时同时看见”的逻辑缺陷。单层薄膜旗舰采用：

```text
分析模块选择 | 主实验台 | 同步分析区 | 参数控制
```

- 主光路、拖动把手和必要实时量始终保留；
- 实验装置、界面相位、多束相量、光谱、相图、盲样反演、公式映射和验证默认隐藏；
- 用户通过语义化复选框按需挂载分析模块；
- 已选模块与主光路在同一状态、同一时刻更新；
- 推荐同时开启 1–2 个，最多开启 4 个；
- 提供“相位机制、光谱分析、实验反演、四窗全景”预设；
- 任一窗口可放大或直接关闭；
- 挂载后自动重建高清 Canvas backing store。

详细设计见 [`docs/SYNCHRONIZED_WORKBENCH_V010.md`](docs/SYNCHRONIZED_WORKBENCH_V010.md)。

### v0.9：页面结构与学院士式审查

v0.9 建立了模型页语义结构：板块目的、作用、建议操作、真实标题层级和模型边界。

完整标准见 [`docs/MODEL_PAGE_ARCHITECTURE_V09.md`](docs/MODEL_PAGE_ARCHITECTURE_V09.md)。

### v0.8：I4 单层薄膜干涉旗舰虚拟实验

v0.8 建立了完整的薄膜实验物理内核：

- 真实反射光谱实验装置；
- 可拖动三层介质几何、波前和传播动画；
- 上下界面 Fresnel 反射相位独立记账；
- 多束复振幅几何级数；
- s、p 和非偏振光；
- 理想理论与现实实验两种模式；
- 精确 R/T、两束近似误差和能量守恒；
- 可见光谱和综合色；
- 膜厚—入射角二维相图；
- 盲样光谱、膜厚拟合和 CSV 导出；
- 公式项与图形对象双向高亮；
- 物理不变量 GitHub Actions 回归测试。

完整说明见 [`docs/THIN_FILM_FLAGSHIP_V08.md`](docs/THIN_FILM_FLAGSHIP_V08.md)。

## 当前内容

### 01 反射

- R1 反射定律与表面粗糙度
- R2 平面镜虚像
- R3 球面镜成像
- R4 菲涅耳反射与布儒斯特角
- R5 全反射与倏逝场
- R6 光导纤维中的全反射

### 02 干涉

- I1 两列波的相干叠加
- I2 杨氏双缝干涉
- I3 N 个相干源的离散叠加
- **I4 单层薄膜干涉（v0.11 自适应同步工作台）**
- I5 牛顿环
- I6 迈克耳孙干涉仪
- I7 法布里–珀罗多光束干涉

### 03 衍射

- D1 惠更斯–菲涅耳原理
- D2 菲涅耳近场与夫琅禾费远场
- D3 单缝夫琅禾费衍射
- D4 有限缝宽双缝衍射
- D5 衍射光栅与光谱分辨
- D6 二维孔径与傅里叶衍射图样
- D7 圆孔艾里斑与瑞利判据
- D8 刀口菲涅耳衍射
- D9 圆盘障碍与泊松亮斑
- D10 菲涅耳波带片
- D11 泰伯自成像与泰伯毯
- D12 布拉格衍射与晶格测量

## 当前统一建模逻辑

```text
稳定的可操作物理对象
→ 用户选择当前分析问题
→ 挂载最相关的协调表示
→ 连续直接操作
→ 多视图同一时刻响应
→ 比较、归因与验证
```

页面可见性判定顺序：

```text
直接操控对象？          → 常驻
主动选择的同步结果？    → 选择后常驻
高频全局状态？          → 常驻紧凑控制
间歇性配置或筛选？      → 边缘轨道/可关闭抽屉
稳定阅读的解释？        → 点击式展开
阻断式独立任务？        → 谨慎使用模态流程
```

## 本地运行

项目是纯静态网页，无需安装依赖：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。MathJax 当前从 CDN 加载，完全离线时公式不会完成排版。

运行核心回归测试：

```bash
node tests/thin-film-v08-physics.test.js
node tests/model-page-guide-v09.test.js
node tests/canvas-hidpi-v092.test.js
node tests/thin-film-workbench-v010.test.js
node tests/adaptive-edge-rails-v011.test.js
```

浏览器视觉审计由 `.github/workflows/visual-audit.yml` 在 Pull Request 中自动运行。

## 关键代码结构

```text
assets/
├── css/
│   ├── thin-film-workbench-v010.css
│   ├── adaptive-edge-rails-v011.css
│   └── visual-audit-fixes-v011.css
└── js/
    ├── canvas-hidpi-v092.js
    ├── thin-film-v08-physics.js
    ├── thin-film-v08-ui.js
    ├── thin-film-workbench-v010.js
    └── adaptive-edge-rails-v011.js

tests/
├── thin-film-v08-physics.test.js
├── canvas-hidpi-v092.test.js
├── thin-film-workbench-v010.test.js
├── adaptive-edge-rails-v011.test.js
└── visual-audit-v011.mjs

docs/
├── ADAPTIVE_VISIBILITY_POLICY_V011.md
├── SYNCHRONIZED_WORKBENCH_V010.md
├── MODEL_PAGE_ARCHITECTURE_V09.md
└── THIN_FILM_FLAGSHIP_V08.md
```

## 维护约定

- GitHub 是项目主代码源；Google Drive 仅保留历史归档。
- 新模型先确定不可隐藏的主实验台，再划分可挂载分析模块。
- 侧栏显示策略必须由任务性质决定，禁止按页面位置机械套用。
- 关键操作不得只藏在 hover 中，必须保留可见触发器、点击和键盘路径。
- 新模块必须说明目的、状态输入、可观测输出、协调关系和模型边界。
- 修改交互方向、角度定义或坐标映射后必须实际拖动验收。
- 物理公式、装置图、局部机制、数值和文字解释必须同步修改。
- 旗舰模型修改必须通过物理不变量、页面结构、高清绘图、工作台合同和浏览器视觉回归。
