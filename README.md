# 交互式光学模型图谱

一个面向大学基础光学教学的交互式网页模型库。项目按**概念域 → 学习路径 → 具体模型**组织，而不是堆放彼此孤立的动画。

## 在线网站

GitHub Pages 已配置为从 `main` 分支根目录自动发布：

`https://feiyanwoqi-arch.github.io/Model-Demo-Webpage/`

向 `main` 推送后，Pages 会自动重新构建公开网站。

## 当前版本：v0.7

本次重点重构了**反射**和**干涉**两个版块：

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
- I4 单层薄膜干涉
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

反射与干涉模型页目前按以下结构组织：

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

统一建模闭环：

```text
直接操作 → 局部物理机制 → 状态量变化 → 数学关系 → 可观测结果 → 近似边界
```

## 本地运行

项目是纯静态网页，无需安装依赖：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。也可以直接打开 `index.html`；但 MathJax 当前从 CDN 加载，完全离线时公式不会完成排版。

## 代码结构

```text
.
├── index.html
├── .nojekyll
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   ├── diffraction.css
│   │   └── upgrade-v07.css
│   └── js/
│       ├── core.js
│       ├── site-v06.js
│       ├── reflection-models.js
│       ├── interference-*.js
│       ├── diffraction-*.js
│       ├── upgrade-v07-core.js
│       ├── upgrade-v07-reflection.js
│       ├── upgrade-v07-interference.js
│       └── bootstrap.js
└── docs/
    ├── REFLECTION_INTERFERENCE_AUDIT_V07.md
    ├── REFLECTION_MODELS.md
    ├── INTERFERENCE_MODELS.md
    └── DIFFRACTION_MODELS.md
```

## 维护约定

- GitHub 是项目主代码源；Google Drive 只保留历史归档。
- 新模型先归入概念域，再实现统一模型接口与页面结构。
- 修改交互方向、角度定义或坐标映射后必须实际拖动验收。
- 物理公式、装置图、局部机制、数值和文字解释必须同步修改。
- 任何近场/远场、标量/矢量、近轴/大角度等近似都必须明确标注。
