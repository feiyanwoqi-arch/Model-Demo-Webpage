# 交互式光学模型图谱

一个面向大学基础光学教学的交互式网页模型库。项目按**概念域 → 学习路径 → 具体模型**组织，而不是堆放彼此孤立的动画。

## 在线网站

GitHub Pages 已配置为从 `main` 分支根目录自动发布：

`https://feiyanwoqi-arch.github.io/Model-Demo-Webpage/`

向 `main` 推送后，Pages 会自动重新构建公开网站。薄膜旗舰实验可直接通过：

`https://feiyanwoqi-arch.github.io/Model-Demo-Webpage/#model:thin-film`

## 当前版本：v0.9

### 模型页项目栏、目的声明与学院士式审查

v0.9 首先应用于 I4 单层薄膜旗舰，并建立可供全部模型注册的通用页面结构层：

- 宽屏左侧吸附式“本页项目栏”；
- 点击项目直接跳转到对应板块；
- 滚动时自动高亮当前板块并显示进度；
- 中小屏自动转换为横向目录；
- 每个板块顶部明确写出“本节目的、它的作用、建议操作”；
- 主标题使用 `h1`，主要板块使用真实 `h2` 和区域标签；
- 模型边界在目录中持续可见；
- 新结构由 `model-page-guide-v09.js` 数据驱动，后续逐个迁移到全部反射、干涉与衍射模型。

完整页面标准和薄膜学院士式审查见 [`docs/MODEL_PAGE_ARCHITECTURE_V09.md`](docs/MODEL_PAGE_ARCHITECTURE_V09.md)。

### v0.8：I4 单层薄膜干涉旗舰虚拟实验

v0.8 选择“单层薄膜干涉”作为第一个满规格标杆模型。新增：

- 完整反射光谱实验装置；
- 可拖动三层介质几何、波前和传播动画；
- 上下界面 Fresnel 反射相位独立记账；
- 第一束、第二束、后续多束与精确几何级数相量；
- 播放、暂停、逐步、速度和公共相位时间轴；
- s、p 和非偏振光；
- 理想理论与现实实验两种模式；
- 膜厚分布、角度分布和粗糙度退相干近似；
- 精确 R/T、两束近似误差和能量守恒检查；
- 反射/透射可见光谱与综合色预测；
- 膜厚—入射角二维相图；
- 盲样反射光谱、膜厚拟合、误差比较和 CSV 导出；
- 公式项与图形对象的双向高亮；
- JavaScript 语法和物理不变量 GitHub Actions 回归测试。

完整说明见 [`docs/THIN_FILM_FLAGSHIP_V08.md`](docs/THIN_FILM_FLAGSHIP_V08.md)。

### v0.7：反射与干涉多视图升级

- 每个模型保留一张可直接拖动的主交互图；
- 按物理需要新增实验装置图、局部机制放大图和观测结果图；
- 所有补充视图与参数、主模型同步更新；
- 核心关系、推导链和公式列表改用 MathJax/LaTeX；
- 每页新增因果链、推荐操作顺序、常见误区和模型边界；
- 离开模型页面后停止旧动画循环，避免多个动画同时占用资源。

完整审计见 [`docs/REFLECTION_INTERFERENCE_AUDIT_V07.md`](docs/REFLECTION_INTERFERENCE_AUDIT_V07.md)。

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
- **I4 单层薄膜干涉（v0.9 旗舰实验）**
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

## 页面统一结构

常规模型页按以下结构组织：

```text
主交互模型
├── 实验装置图
├── 局部机制图
├── 观测结果图
├── 实时参数与物理判据
├── LaTeX 推导链
├── 常见误区校正
└── 模型近似与适用边界
```

旗舰模型进一步形成：

```text
本页项目栏 → 板块目的与作用 → 真实装置 → 直接操作
→ 局部边界机制 → 多表征联动 → 可测光谱
→ 现实误差 → 参数反演 → 自洽性测试
```

所有新模型板块必须能够回答：

```text
为什么存在？
在总推理链中起什么作用？
用户应该怎样操作？
输入、输出和适用边界是什么？
```

## 本地运行

项目是纯静态网页，无需安装依赖：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。也可以直接打开 `index.html`；但 MathJax 当前从 CDN 加载，完全离线时公式不会完成排版。

运行物理测试：

```bash
node tests/thin-film-v08-physics.test.js
```

## 代码结构

```text
.
├── index.html
├── .nojekyll
├── .github/workflows/physics-tests.yml
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   ├── diffraction.css
│   │   ├── upgrade-v07.css
│   │   ├── thin-film-v08.css
│   │   └── model-page-guide-v09.css
│   └── js/
│       ├── core.js
│       ├── site-v06.js
│       ├── reflection-models.js
│       ├── interference-*.js
│       ├── diffraction-*.js
│       ├── upgrade-v07-*.js
│       ├── thin-film-v08-physics.js
│       ├── thin-film-v08-patch.js
│       ├── thin-film-v08-ui.js
│       ├── model-page-guide-v09.js
│       └── bootstrap.js
├── tests/thin-film-v08-physics.test.js
└── docs/
    ├── MODEL_PAGE_ARCHITECTURE_V09.md
    ├── THIN_FILM_FLAGSHIP_V08.md
    ├── THIN_FILM_V08_VALIDATION.md
    ├── REFLECTION_INTERFERENCE_AUDIT_V07.md
    ├── REFLECTION_MODELS.md
    ├── INTERFERENCE_MODELS.md
    └── DIFFRACTION_MODELS.md
```

## 维护约定

- GitHub 是项目主代码源；Google Drive 只保留历史归档。
- 新模型先归入概念域，再实现统一模型接口与页面结构。
- 新增板块前必须先写出 `purpose / role / action`；写不出来则不得新增。
- 修改交互方向、角度定义或坐标映射后必须实际拖动验收。
- 物理公式、装置图、局部机制、数值和文字解释必须同步修改。
- 任何近场/远场、标量/矢量、近轴/大角度等近似都必须明确标注。
- 旗舰模型的修改必须通过物理不变量回归测试。
- 页面导航配置和板块标题必须来自同一注册数据，避免名称漂移。
