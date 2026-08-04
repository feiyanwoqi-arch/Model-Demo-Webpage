# 交互式光学模型图谱

一个面向大学基础光学教学的交互式网页模型库。项目按**概念域 → 学习路径 → 具体模型**组织，不把彼此孤立的动画堆在同一页面。

## 在线网站

GitHub Pages 从 `main` 分支根目录自动发布：

`https://feiyanwoqi-arch.github.io/Model-Demo-Webpage/`

模型直达示例：

```text
#model:reflection-law
#model:plane-mirror
#model:spherical-mirror
#model:thin-film
```

## 当前版本：v0.13

### 反射前三个基础模型工作台

v0.13 首次把薄膜旗舰多轮升级后形成的核心标准批量应用到：

- **R1 反射定律与表面粗糙度**；
- **R2 平面镜虚像**；
- **R3 球面镜成像**。

统一结构：

```text
紧凑研究问题与因果链

主实验台                    同步分析区
├── 直接拖动物理对象        ├── 分析模块 A
├── 核心实时量              └── 分析模块 B
└── 当前判据

左侧边缘轨：模块选择
右侧边缘轨：参数、预设和完整验证
```

核心变化：

- 主实验台与两个已选模块必须在同一视口完成比较；
- 同屏预算固定为两个分析模块，避免把几何图压成不可读缩略图；
- 每个模型默认显示“局部机制＋可观测量”；
- 模块可切换为“装置＋观测”或“公式＋验证”；
- 左右间歇性控件改为可固定、可关闭、支持触屏的边缘抽屉；
- 所有 Canvas 保持高 DPI 重绘和统一逻辑坐标；
- 每个模块明确目的、作用与建议操作；
- 每个模型加入随状态变化的验证与边界提示。

物理升级：

- R1 将“粗糙度”严格定性为**局部法线离散度的几何示意**，并增加观察方向、角分布和接收信号；
- R2 修复旧版同一点眼睛连接任意两个镜面命中点的光路缺陷，改用有限瞳孔和镜像法严格构造反射路径，并加入有限镜面完整可见性；
- R3 增加有效口径、精确球面法线反射束、球差焦散宽度、屏幕偏移和 F/2F 成像区域图。

项目级核心标准见 [`docs/INTERACTIVE_MODEL_CONSTRUCTION_STANDARD_V1.md`](docs/INTERACTIVE_MODEL_CONSTRUCTION_STANDARD_V1.md)。

本轮实现与验收说明见 [`docs/REFLECTION_FOUNDATIONS_V013.md`](docs/REFLECTION_FOUNDATIONS_V013.md)。

### v0.12：薄膜三视图同屏因果闭环

v0.12 修复“状态同步但观察不同步”的缺陷。当用户选择两个分析模块时，主实验台、模块 A 和模块 B 在同一个视觉瞬间可见，并在 2560×1440、1920×1080 和用户反馈对应的 1735×865 视口中执行任务级验收。

完整说明见 [`docs/SIMULTANEOUS_VIEWPORT_V012.md`](docs/SIMULTANEOUS_VIEWPORT_V012.md)。

### v0.11：自适应可见性与边缘轨道

将模块选择和完整参数栏改为可悬停、点击、固定、关闭并支持触屏的边缘抽屉。显示策略由任务性质决定，而不是由页面左右位置决定。

完整规则见 [`docs/ADAPTIVE_VISIBILITY_POLICY_V011.md`](docs/ADAPTIVE_VISIBILITY_POLICY_V011.md)。

### v0.10：可组合同步实验工作台

建立“主实验台常驻＋分析模块按需挂载＋统一状态同步”的基本结构。

详细设计见 [`docs/SYNCHRONIZED_WORKBENCH_V010.md`](docs/SYNCHRONIZED_WORKBENCH_V010.md)。

### v0.9 / v0.8

- v0.9：板块目的、作用、建议操作、语义标题和模型边界；
- v0.8：单层薄膜精确多束、装置、光谱、反演和物理回归测试。

## 当前内容

### 01 反射

- **R1 反射定律与表面粗糙度（v0.13 同步工作台）**
- **R2 平面镜虚像（v0.13 同步工作台）**
- **R3 球面镜成像（v0.13 同步工作台）**
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
明确不可隐藏的物理本体
→ 建立单一状态源
→ 直接操控对象本身
→ 按问题挂载互补表示
→ 动作、原因和结果同屏
→ 读取可观测量
→ 检查公式、近似与边界
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
node tests/reflection-foundations-v013.test.js
```

浏览器任务级视觉审计由 `.github/workflows/visual-audit.yml` 在 Pull Request 中自动运行：

```text
tests/visual-audit-v012.mjs
tests/visual-audit-reflection-v013.mjs
```

## 关键代码结构

```text
assets/
├── css/
│   ├── reflection-foundations-v013.css
│   ├── thin-film-workbench-v010.css
│   ├── adaptive-edge-rails-v011.css
│   └── simultaneous-viewport-v012.css
└── js/
    ├── reflection-foundations-v013.js
    ├── reflection-foundations-v013-patch.js
    ├── canvas-hidpi-v092.js
    ├── thin-film-v08-physics.js
    ├── thin-film-workbench-v010.js
    ├── adaptive-edge-rails-v011.js
    └── simultaneous-viewport-v012.js

tests/
├── reflection-foundations-v013.test.js
├── visual-audit-reflection-v013.mjs
├── thin-film-v08-physics.test.js
├── simultaneous-viewport-v012.test.js
└── visual-audit-v012.mjs

docs/
├── INTERACTIVE_MODEL_CONSTRUCTION_STANDARD_V1.md
├── REFLECTION_FOUNDATIONS_V013.md
├── SIMULTANEOUS_VIEWPORT_V012.md
├── ADAPTIVE_VISIBILITY_POLICY_V011.md
└── SYNCHRONIZED_WORKBENCH_V010.md
```

## 维护约定

- GitHub 是项目唯一主代码源；Google Drive 仅保留历史归档。
- 新模型先完成模型合同，再写页面。
- 新模块必须说明目的、作用、操作、输入、输出和边界。
- 同屏数量必须由可读性预算决定。
- 修改交互方向、坐标映射或布局后，必须执行真实指针和目标视口验收。
- 物理公式、装置图、局部机制、可观测量和验证必须共享同一状态。
- 任何近似必须同时拥有边界说明和至少一个运行时检查。
