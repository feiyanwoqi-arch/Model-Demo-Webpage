# Thin-film v0.8 validation report

Validation date: 2026-08-04

## Scope

The validation branch contained the exact `main` implementation at commit `c2d9970fa3dbfbd626602ac3053c0e42d697027f`, plus one inert text probe used only to trigger a pull-request workflow.

## First validation run

The first physics-regression run detected a genuine error in the transfer phase convention: the code used the one-way phase where the round-trip factor `exp(2 i beta)` was required. The quarter-wave matched-index anti-reflection test failed with `R = 0.021753...` instead of approaching zero.

The implementation was corrected to use:

```text
beta = 2 pi n2 d cos(theta2) / lambda
round-trip factor = exp(2 i beta)
transmission propagation factor = exp(i beta)
```

Main correction commit: `c2d9970fa3dbfbd626602ac3053c0e42d697027f`.

## Successful validation run

Pull request: `#1 CI validation: thin-film flagship v0.8`

Validation head: `8cdbcd8f16f518a83b26f4430a792ec43b01dded`

Successful workflow runs:

- `Static checks`, run `30896729394`: **success**
- `Physics regression tests`, run `30896729463`: **success**

The pull request was closed without merging because its only branch-specific change was the temporary `tests/ci-probe.txt` trigger.

## Automated checks passed

- JavaScript syntax for the physics engine, robustness patch, and flagship UI.
- Lossless energy conservation for s, p, and unpolarized light over several angles.
- Equal-index zero-reflection limit.
- Zero-thickness reduction to the direct n1–n3 interface.
- Quarter-wave matched-index anti-reflection limit.
- Convergence of the explicit reflected-beam series to the exact complex amplitude.
- Energy bookkeeping in the averaged real-experiment mode.
- Synthetic-spectrum generation and blind thickness recovery.
- Total-internal-reflection guard behavior.

## Remaining manual validation

Automated tests do not replace visual inspection in the target browser. The remaining acceptance work is manual checking of responsive layout, label overlap, pointer hit areas, drag feel, MathJax loading, CSV download, and perceived performance on the user's actual Edge/Chrome environment.
