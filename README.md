# 交互式光学模型图谱

一个面向大学基础光学教学的交互式网页模型库。项目按**概念域 → 学习路径 → 具体模型**组织，不把彼此孤立的动画堆在同一页面。

## 在线网站

GitHub Pages 从 `main` 分支根目录发布：

`https://feiyanwoqi-arch.github.io/Model-Demo-Webpage/`

模型直达示例：

```text
#model:reflection-law
#model:plane-mirror
#model:spherical-mirror
#model:fresnel
#model:total-internal
#model:thin-film
```

## 当前版本：v0.19

### v0.19：R5 全反射与倏逝场同步工作台

R5 将“折射光在临界角后消失”的简化说法，重建为连续可见的物理链：

```text
切向波数守恒
→ 临界角
→ 法向波数平方跨过 0
→ 传播折射波转化为倏逝解
→ 场幅指数衰减
→ 局部探针与受抑全反射装置读出
```

核心能力：

- 直接拖动入射方向跨越临界角；
- 直接拖动场探针读取不同深度的局部场；
- 同步计算 Fresnel `R/T`、`s/p` 偏振与全反射相位差；
- 显示振幅和强度穿透深度；
- 支持未到临界角、临界附近、全反射和不存在临界角四类状态；
- 提供波数转变、空间衰减、受抑全反射装置、公式推导和模型边界模块；
- 主图图例随传播状态切换，不在非全反射状态错误显示倏逝场；
- Canvas 根据真实 CSS 缩放补偿有效字号；
- 固定边缘控件、内部图例、拖动标签和模块内容均有遮挡与裁切验收。

R5 在以下桌面视口执行原生比例截图、真实交互和严格有效字号验收：

```text
2560×1440
1920×1080
1735×865
1440×900
1366×768
```

最终验收同时通过基础任务、容器/抽屉/装置和 v1.3 严格字号/遮挡/状态图例三层审计。完整实现、模型边界和证据见 [`docs/R5_TOTAL_INTERNAL_REFLECTION_V019.md`](docs/R5_TOTAL_INTERNAL_REFLECTION_V019.md)，可复查证据位于 [`docs/live-evidence/r5-v019/`](docs/live-evidence/r5-v019/)。

### v0.19：R4 菲涅耳反射与布儒斯特角工作台

R4 已在当前 `main` 中完成统一状态、偏振、Fresnel 系数、布儒斯特角与 R4/R5 集成验收；R4 与 R5 共用当前页面运行环境和像素感知交互基础。

### v0.18：R3 球面镜有限物点光线追迹与排版升级

R3 使用有限物点、球面交点和局部法线进行反射追迹，并补齐真实显示字号、标签布局、直接拖动和多视口原生截图证据。

### v0.15：R2 平面镜虚像严格运行验收

R2 以“真实光传播 → 有限镜面截获 → 进入有限瞳孔 → 观察者反向追迹 → 对称虚像定位”为统一因果链，明确区分镜前真实传播区和镜后虚拟定位区，并完成镜面端点直接拖动、必要反射区间、眼睛移动和屏幕判据等任务级验收。

完整说明见 [`docs/R2_RUNTIME_VISUAL_AUDIT_V015.md`](docs/R2_RUNTIME_VISUAL_AUDIT_V015.md)。

### v0.14：R1 反射定律与表面粗糙度严格视觉返工

R1 将局部法线、入射角、反射角、观察方向、接受角、角分布峰宽和相对接收信号连接成同一可见因果链。

完整说明见 [`docs/R1_RUNTIME_VISUAL_AUDIT_V014.md`](docs/R1_RUNTIME_VISUAL_AUDIT_V014.md)。

### v0.13–v0.8：工作台基础能力

- v0.13：反射前三个基础模型同步工作台；
- v0.12：薄膜主实验台与两个分析模块同屏；
- v0.11：自适应边缘轨和参数抽屉；
- v0.10：可组合同步实验工作台；
- v0.9：模块目的、操作和模型边界；
- v0.8：单层薄膜精确多束、光谱、装置和物理回归。

## 当前内容

### 01 反射

- **R1 反射定律与表面粗糙度**
- **R2 平面镜虚像**
- **R3 球面镜成像**
- **R4 菲涅耳反射与布儒斯特角（v0.19 工作台）**
- **R5 全反射与倏逝场（v0.19 严格验收工作台）**
- R6 光导纤维中的全反射

### 02 干涉

- I1 两列波的相干叠加
- I2 杨氏双缝干涉
- I3 N 个相干源的离散叠加
- **I4 单层薄膜干涉（同步工作台）**
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
→ 将发现的缺陷转成自动拒绝条件
→ 合并、发布并复验线上页面
```

## 项目级标准

- 主标准：[`docs/INTERACTIVE_MODEL_CONSTRUCTION_STANDARD_V1.md`](docs/INTERACTIVE_MODEL_CONSTRUCTION_STANDARD_V1.md)
- v1.2 发布与真实环境增补：[`docs/INTERACTIVE_MODEL_STANDARD_V12_AMENDMENTS.md`](docs/INTERACTIVE_MODEL_STANDARD_V12_AMENDMENTS.md)

项目区分以下状态：

```text
代码完成
→ 分支测试通过
→ 人工视觉复验通过
→ 合并 main
→ Pages 发布
→ 真实线上地址无缓存复验
```

这些状态不得互相替代。自动测试通过也不能替代对关键原生截图的人工查看。

## 本地运行

项目是纯静态网页，无需安装运行时依赖：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。MathJax 当前从 CDN 加载，完全离线时公式不会完成排版。

### R5 核心回归

```bash
node tests/r5-physics-v019.test.js
node tests/r5-physics-extended-v019.test.js
node tests/visual-audit-r5-v019.mjs
node tests/visual-audit-r5-occlusion-v019.mjs
node tests/visual-audit-r5-strict-v019.mjs
```

R5 的持续证据工作流为：

```text
.github/workflows/r5-live-audit-v019.yml
```

## R5 关键代码结构

```text
assets/
├── css/
│   ├── r5-workbench-v019.css
│   ├── r5-wide-occlusion-v019.css
│   └── r5-edge-safe-rails-v019.css
└── js/
    ├── r5-workbench-v019.js
    ├── r5-canvas-fit-v019.js
    └── r5-canvas-typography-v019.js

tests/
├── r5-physics-v019.test.js
├── r5-physics-extended-v019.test.js
├── visual-audit-r5-v019.mjs
├── visual-audit-r5-occlusion-v019.mjs
└── visual-audit-r5-strict-v019.mjs

docs/
├── R5_TOTAL_INTERNAL_REFLECTION_V019.md
└── live-evidence/r5-v019/
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
