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

## 当前版本：v0.15

### v0.15：R2 平面镜虚像严格运行验收

R2 以“真实光传播 → 有限镜面截获 → 进入有限瞳孔 → 观察者反向追迹 → 对称虚像定位”为统一因果链，重建主实验台与同步分析模块。

核心升级：

- 明确区分镜前真实传播区和镜后虚拟定位区；
- 同时显示物体、有限镜面、眼睛、真实入射光、真实反射光、反向延长线、虚像和顶部/底部必要反射点；
- 镜面有效区之外的候选命中点用减弱路径和红色叉号表示；
- 镜面上下端点可以直接拖动；
- 有限镜面判据从“比较两个长度”升级为“所需反射点区间是否被有效镜面区间包含”；
- 眼睛移动改变必要反射点，但不改变虚像的对称位置；
- 眼睛/相机可以记录虚像，镜后屏幕不能接收真实会聚光；
- 主图和所有分析模块共享统一状态；
- 修复宽屏旧版版心、Canvas 初始空白、比例失真、抽屉裁切和高屏幕抽屉空白。

R2 在以下桌面视口执行真实拖动与任务级截图验收：

```text
2560×1440
1920×1080
1735×865
1440×900
1366×768
```

完整实现与验收证据见 [`docs/R2_RUNTIME_VISUAL_AUDIT_V015.md`](docs/R2_RUNTIME_VISUAL_AUDIT_V015.md)。

### v0.14：R1 反射定律与表面粗糙度严格视觉返工

R1 将局部法线、入射角、反射角、观察方向、接受角、角分布峰宽和相对接收信号连接成同一可见因果链，并建立“真实浏览器运行结果是最终验收事实”的规则。

完整说明见 [`docs/R1_RUNTIME_VISUAL_AUDIT_V014.md`](docs/R1_RUNTIME_VISUAL_AUDIT_V014.md)。

### v0.13：反射前三个基础模型同步工作台

v0.13 首次把薄膜旗舰多轮升级后形成的核心标准批量应用到：

- R1 反射定律与表面粗糙度；
- R2 平面镜虚像；
- R3 球面镜成像。

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

本轮历史说明见 [`docs/REFLECTION_FOUNDATIONS_V013.md`](docs/REFLECTION_FOUNDATIONS_V013.md)。

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

## 项目级核心标准

- 主标准：[`docs/INTERACTIVE_MODEL_CONSTRUCTION_STANDARD_V1.md`](docs/INTERACTIVE_MODEL_CONSTRUCTION_STANDARD_V1.md)
- v1.2 发布与真实环境增补：[`docs/INTERACTIVE_MODEL_STANDARD_V12_AMENDMENTS.md`](docs/INTERACTIVE_MODEL_STANDARD_V12_AMENDMENTS.md)

v1.2 进一步规定：

```text
代码完成
→ 分支测试通过
→ 人工视觉复验通过
→ PR 可审阅
→ 合并 main
→ 发布完成
→ 真实线上地址无缓存复验通过
```

这些状态不得互相替代。PR 通过不等于网站已经更新。

## 当前内容

### 01 反射

- **R1 反射定律与表面粗糙度（v0.14 严格视觉工作台）**
- **R2 平面镜虚像（v0.15 严格运行工作台）**
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
→ 在真实浏览器中完成任务
→ 人工查看关键状态截图
→ 合并、发布并复验线上页面
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
tests/visual-audit-r1-v014.mjs
tests/visual-audit-r2-v015.mjs
tests/visual-audit-r2-direct-control-v015.mjs
tests/visual-audit-r2-drawer-fit-v015.mjs
```

## 关键代码结构

```text
assets/
├── css/
│   ├── reflection-foundations-v013.css
│   ├── r1-visual-refinement-v014.css
│   ├── r2-visual-refinement-v015.css
│   ├── r2-drawer-position-v015.css
│   ├── thin-film-workbench-v010.css
│   ├── adaptive-edge-rails-v011.css
│   └── simultaneous-viewport-v012.css
└── js/
    ├── reflection-foundations-v013.js
    ├── r1-visual-refinement-v014.js
    ├── r2-visual-refinement-v015.js
    ├── r2-mechanism-sync-v015.js
    ├── r2-render-stability-v015.js
    ├── r2-interval-clarity-v015.js
    ├── canvas-hidpi-v092.js
    ├── thin-film-workbench-v010.js
    ├── adaptive-edge-rails-v011.js
    └── simultaneous-viewport-v012.js

tests/
├── reflection-foundations-v013.test.js
├── visual-audit-reflection-v013.mjs
├── visual-audit-r1-v014.mjs
├── visual-audit-r2-v015.mjs
├── visual-audit-r2-direct-control-v015.mjs
├── visual-audit-r2-drawer-fit-v015.mjs
├── thin-film-v08-physics.test.js
└── visual-audit-v012.mjs

docs/
├── INTERACTIVE_MODEL_CONSTRUCTION_STANDARD_V1.md
├── INTERACTIVE_MODEL_STANDARD_V12_AMENDMENTS.md
├── R1_RUNTIME_VISUAL_AUDIT_V014.md
├── R2_RUNTIME_VISUAL_AUDIT_V015.md
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
- 自动测试失败时必须同时检查产品与测试工具，不得默认测试工具绝对正确。
- 用户实际浏览器截图可以推翻实验室验收结论。
- 未完成 `main` 合并、Pages 发布和真实线上无缓存复验，不得宣告网站已经更新。
