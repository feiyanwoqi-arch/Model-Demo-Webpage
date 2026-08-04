# 衍射模型图谱：调研、架构与建模边界

## 1. 统一定义

衍射不是“光线碰到边缘后转弯”。更统一的表述是：

> 有限孔径、障碍物或周期结构改变了波前的振幅或相位分布；波前各部分继续传播并在观察面相干叠加，从而重新分配光的传播方向与空间强度。

因此衍射和干涉没有绝对物理分界。教学上通常把少数离散波束的叠加称为干涉，把连续孔径或大量周期单元的传播叠加称为衍射。

## 2. 学习路径

```text
D1 惠更斯–菲涅耳原理
  ↓
D2 菲涅耳近场 / 夫琅禾费远场
  ↓
D3 单缝连续相量
  ↓
D4 双缝条纹 × 单缝包络
  ↓
D5 周期光栅、级次与光谱分辨
  ↓
D6 二维孔径与傅里叶频谱
  ↓
D7 圆孔点扩散函数与分辨率
  ↓
D8 刀口近场条纹
  ↓
D9 圆盘障碍与泊松亮斑
  ↓
D10 波带片衍射聚焦
  ↓
D11 周期结构的泰伯自成像
  ↓
D12 晶格周期与布拉格衍射
```

## 3. 已实现模型

### D1 惠更斯–菲涅耳原理

核心目标：看到最终场是孔径内全部次级贡献的**复振幅积分**，而不是只由两个边缘产生。

交互：拖动孔径边缘；改变波长、传播距离和初相。

边界：标量、单色、相干、近轴。

### D2 菲涅耳近场与夫琅禾费远场

核心无量纲参数：

```text
N_F = (a/2)^2 / (lambda z)
```

模型连续展示近场几何影子、过渡区和远场稳定角谱，而不是把两种近似画成互不相干的章节。

### D3 单缝夫琅禾费衍射

```text
I/I0 = (sin beta / beta)^2
beta = pi a sin(theta) / lambda
```

重点不是背第一暗纹公式，而是看到缝内连续相量如何成对相消，以及为什么缝越窄角谱越宽。

### D4 有限缝宽双缝衍射

```text
I ∝ sinc^2(alpha) cos^2(beta)
```

把快速干涉条纹和缓慢单缝包络分开显示，并演示缺级。

### D5 衍射光栅与光谱分辨

```text
d sin(theta_m) = m lambda
R ≈ m N
```

周期决定峰位，有效周期数决定峰宽；白光模式把波长直接映射为空间方向。

### D6 二维孔径与傅里叶图样

支持矩形孔、圆孔、环形孔和双孔。远场通过解析傅里叶表达计算，展示“孔径窄方向 ↔ 角谱宽方向”的互易关系。

### D7 圆孔艾里斑与瑞利判据

```text
theta_R = 1.22 lambda / D
```

两个点源不再被画成两个无限小像点，而是两个重叠的点扩散函数。

### D8 刀口菲涅耳衍射

使用菲涅耳 C、S 积分计算几何明暗边界附近的振荡与亮侧过冲。

### D9 泊松亮斑

通过圆周等光程与巴比涅原理说明圆盘阴影中心为何出现亮点。当前径向强度为教学近似；完整二维菲涅耳积分列为后续高精度升级项。

### D10 菲涅耳波带片

```text
r_n^2 ≈ n lambda f
```

对比振幅型和相位型波带片，显示主焦点、高阶焦点和强色散。

### D11 泰伯效应

```text
z_T = 2 d^2 / lambda
```

通过周期光栅傅里叶级次的传播相位重合生成泰伯毯、整数自成像和分数自成像。

### D12 布拉格衍射

```text
n lambda = 2 d sin(theta)
```

把相邻晶面路径差、有限晶面数与角度扫描峰连接起来。

## 4. 信息架构决定

原干涉域中的 I3 改名为“N 个相干源的离散叠加”，只负责离散相量求和。

衍射域 D5 才负责真实光栅：有限孔径包络、白光色散、峰宽和分辨本领。这样既承认干涉与衍射的统一性，又避免两个分类出现完全重复的模型。

## 5. 后续精度升级

1. 泊松亮斑改为完整二维轴对称菲涅耳积分。
2. 加入科纽螺线独立视图，把刀口和单缝近场统一起来。
3. 二维孔径模型加入可绘制自定义孔径与真正 FFT。
4. 光栅加入闪耀角、偏振与效率，而不仅是级次方向。
5. 艾里斑模型加入像差、中心遮挡和调制传递函数 MTF。
6. 布拉格模型加入晶粒尺寸、应变展宽和 Scherrer 关系。
7. 加入贝塞尔光束与“有限范围近似无衍射”模型。

## 6. 主要参考

- OpenStax, *University Physics Volume 3*, Chapter 4: Diffraction.
- OpenStax sections on single-slit diffraction, double-slit diffraction, diffraction gratings, circular apertures and resolution.
- RP Photonics Encyclopedia, article **Diffraction**, Dr. Rüdiger Paschotta.
- RP Photonics Encyclopedia, article **Zone Plates**, Dr. Rüdiger Paschotta.
- MIT OpenCourseWare optics materials on Fresnel and Fraunhofer diffraction.
- GitHub Pages official documentation for branch-based static deployment.
