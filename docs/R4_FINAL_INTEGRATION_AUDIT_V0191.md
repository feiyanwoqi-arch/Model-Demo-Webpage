# R4 final integration audit v0.19.1

This record confirms that the final R4 Fresnel/Brewster workbench is present on the current `main` lineage together with R5.

## Verified integration points

- R4 styles load before R5 styles.
- R4 physics loads before the R4 workbench.
- The scoped R4 HiDPI repair loads after the workbench and before bootstrap.
- R5 runtime extensions load after the shared bootstrap/R3 bridge chain.
- R4 physics, source-contract, R4/R5 integration, pixel-aware browser, and MathJax audits remain wired into the combined visual-audit workflow.

## Acceptance scope

The merge candidate must preserve the previously accepted R4 behavior: direct source dragging, Fresnel-curve dragging, synchronized analysis views, Brewster zero and orthogonality, critical-angle/TIR boundary, energy conservation, nonblank canvas coverage, responsive core-card visibility, and error-free MathJax rendering.
