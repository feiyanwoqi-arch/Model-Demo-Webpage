# 交互式光学模型图谱

一个面向大学基础光学教学的交互式网页模型库。项目按**概念域 → 学习路径 → 具体模型**组织，不把实验模型孤立堆放。

## 在线网站

GitHub Pages 已配置为从 `main` 分支根目录自动发布：

**https://feiyanwoqi-arch.github.io/Model-Demo-Webpage/**

每次向 `main` 推送代码后，GitHub Pages 会自动重新部署。

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

## 运行

项目是纯静态网页，无需安装依赖。

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。也可以直接打开 `index.html`。

## 目录

```text
.
├── index.html
├── .nojekyll
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   └── diffraction.css
│   └── js/
│       ├── core.js
│       ├── site-v06.js
│       ├── reflection-models.js
│       ├── interference-*.js
│       ├── diffraction-foundations.js
│       ├── diffraction-periodic.js
│       ├── diffraction-imaging.js
│       ├── diffraction-advanced.js
│       └── bootstrap.js
└── docs/
    ├── RESEARCH_NOTES.md
    ├── REFLECTION_MODELS.md
    ├── INTERFERENCE_MODELS.md
    └── DIFFRACTION_MODELS.md
```

## 统一建模规范

```text
直接操作 → 局部物理机制 → 状态量变化 → 数学关系 → 可观测结果 → 近似边界
```

视觉语义统一为：绿色表示入射或主动光路，青色表示反射、传播或主结果，橙色表示检测点、透射或第二通道，紫色表示相位、倏逝场或辅助波动量。

## 概念边界

- **干涉**侧重少数离散相干振幅的叠加。
- **衍射**侧重连续孔径或周期结构中大量波前贡献的传播与叠加。
- 两者不存在绝对物理分界；这种分类主要服务于学习路径和模型组织。

## 维护约定

- GitHub 是项目主代码源；Google Drive 仅保留历史归档。
- 新模型先归入概念域，再实现统一模型接口与页面结构。
- 修改交互方向、角度定义或坐标映射后必须实际拖动验收。
- 物理公式、图形、数值与文字解释必须同步修改。
- 任何近场/远场、标量/矢量、近轴/大角度等近似都必须在模型页明确标注。

衍射域设计说明见 [`docs/DIFFRACTION_MODELS.md`](docs/DIFFRACTION_MODELS.md)。
