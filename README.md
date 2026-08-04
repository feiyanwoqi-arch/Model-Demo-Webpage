# 交互式光学模型图谱

一个面向大学基础光学教学的交互式网页模型库。项目按**概念域 → 学习路径 → 具体模型**组织，而不是堆放彼此孤立的动画。

## 在线网站

GitHub Pages 已配置为从 `main` 分支根目录自动发布：

`https://feiyanwoqi-arch.github.io/Model-Demo-Webpage/`

薄膜旗舰实验直达地址：

`https://feiyanwoqi-arch.github.io/Model-Demo-Webpage/#model:thin-film`

## 当前版本：v0.12

### 三视图同屏因果闭环

v0.12 修复了一个比“状态是否同步”更深的缺陷：用户选择两个分析模块后，主实验台、分析模块 A 和分析模块 B 必须能在同一个视觉瞬间被看见，否则拖动主光线仍然无法完成即时比较。

当恰好选择两个分析模块时，页面进入 `triple` 模式：

```text
主实验台（左） | 分析模块 A（右上）
                 | 分析模块 B（右下）
```

- 两个分析模块继续占据完整分析列宽，避免被压成不可读缩略图；
- 模块采用语义裁剪，只移除 Canvas 内重复标题、大块无信息留白和重复图注；
- 不通过非等比压扁图形来换高度；
- 已为装置、界面相位、相量、光谱、相图、测量和验证注册紧凑观察窗口；
- 裁剪窗口建立后重新同步高清 Canvas backing store；
- 选择 0、1、2、3–4 个模块时分别进入单视图、双视图、三视图和总览状态。

浏览器视觉审计现在不再只测父容器宽度，而是执行真实任务：选择“真实实验装置＋界面反射相位”，收起侧栏，定位到主实验区，并要求三张卡片在 2560×1440、1920×1080 以及用户反馈对应的 1735×865 视口中均至少 96% 可见。

完整根因、调研依据和任务级验收标准见 [`docs/SIMULTANEOUS_VIEWPORT_V012.md`](docs/SIMULTANEOUS_VIEWPORT_V012.md)。

### v0.11：自适应可见性与边缘轨道

v0.11 解决固定左右栏长期挤压主实验台的问题。页面元素不再按“位于左边还是右边”决定显示方式，而是按它是否参与当前物理分析闭环分类：

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
- 打开延迟 140 ms，离开延迟 560 ms；
- 操作滑块期间抽屉保持打开；
- 两侧均可用图钉固定，固定状态保存到浏览器本地；
- Escape、关闭按钮和移动端遮罩均可关闭抽屉；
- 触屏不依赖 hover，而采用显式按钮和模态抽屉。

完整判定规则见 [`docs/ADAPTIVE_VISIBILITY_POLICY_V011.md`](docs/ADAPTIVE_VISIBILITY_POLICY_V011.md)。

### v0.10：可组合的同步实验工作台

v0.10 建立可挂载同步分析模块：

- 主光路、拖动把手和必要实时量始终保留；
- 装置、相位、相量、光谱、相图、反演、公式和验证按需挂载；
- 已选模块与主光路共享同一状态和时刻；
- 推荐同时开启 1–2 个，最多开启 4 个；
- 提供分析预设、放大和关闭能力。

详细设计见 [`docs/SYNCHRONIZED_WORKBENCH_V010.md`](docs/SYNCHRONIZED_WORKBENCH_V010.md)。

### v0.9：页面结构与学院士式审查

v0.9 建立模型页语义结构：板块目的、作用、建议操作、真实标题层级和模型边界。

完整标准见 [`docs/MODEL_PAGE_ARCHITECTURE_V09.md`](docs/MODEL_PAGE_ARCHITECTURE_V09.md)。

### v0.8：I4 单层薄膜干涉旗舰虚拟实验

v0.8 建立完整薄膜实验物理内核：真实装置、可拖动几何、界面相位、多束相量、理想/现实模式、色度学、盲样测量、参数反演和物理回归测试。

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
- **I4 单层薄膜干涉（v0.12 三视图同步工作台）**
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
→ 动作对象、原因和结果同屏
→ 比较、归因与验证
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
node tests/simultaneous-viewport-v012.test.js
```

浏览器任务级视觉审计由 `.github/workflows/visual-audit.yml` 在 Pull Request 中自动运行。

## 关键代码结构

```text
assets/
├── css/
│   ├── thin-film-workbench-v010.css
│   ├── adaptive-edge-rails-v011.css
│   ├── visual-audit-fixes-v011.css
│   └── simultaneous-viewport-v012.css
└── js/
    ├── canvas-hidpi-v092.js
    ├── thin-film-v08-physics.js
    ├── thin-film-v08-ui.js
    ├── thin-film-workbench-v010.js
    ├── adaptive-edge-rails-v011.js
    └── simultaneous-viewport-v012.js

tests/
├── thin-film-v08-physics.test.js
├── canvas-hidpi-v092.test.js
├── thin-film-workbench-v010.test.js
├── adaptive-edge-rails-v011.test.js
├── simultaneous-viewport-v012.test.js
└── visual-audit-v012.mjs

docs/
├── SIMULTANEOUS_VIEWPORT_V012.md
├── ADAPTIVE_VISIBILITY_POLICY_V011.md
├── SYNCHRONIZED_WORKBENCH_V010.md
├── MODEL_PAGE_ARCHITECTURE_V09.md
└── THIN_FILM_FLAGSHIP_V08.md
```

## 维护约定

- GitHub 是项目主代码源；Google Drive 仅保留历史归档。
- 新模型先定义不可隐藏的主实验台和“同屏因果集合”。
- 侧栏显示策略必须由任务性质决定，禁止按页面位置机械套用。
- 关键操作不得只藏在 hover 中。
- 新模块必须说明目的、状态输入、可观测输出、协调关系和模型边界。
- 修改交互方向、角度定义或坐标映射后必须实际拖动验收。
- 旗舰模型修改必须通过物理不变量、页面结构、高清绘图、工作台合同和任务级浏览器视觉回归。
