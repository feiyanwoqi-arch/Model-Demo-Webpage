# Model page guide v0.9 validation report

Validation date: 2026-08-04

## Scope

The validation branch contained the exact `main` implementation plus one inert text probe used only to trigger pull-request workflows.

## Pull request

- PR: `#2 CI validation: model page guide v0.9`
- Head commit: `328275171c71b07d778cc46a55f084d3718abc1c`
- The PR was closed without merging because the only branch-specific file was the CI probe.

## Successful workflow runs

- `Static checks`, run `30898884855`: **success**
- `Physics regression tests`, run `30898884192`: **success**

## Checks passed

### JavaScript syntax

- `thin-film-v08-physics.js`
- `thin-film-v08-patch.js`
- `thin-film-v08-ui.js`
- `model-page-guide-v09.js`

### Thin-film physical invariants

- Lossless energy conservation for s, p, and unpolarized light;
- equal-index zero-reflection limit;
- zero-thickness direct-interface limit;
- quarter-wave matched-index anti-reflection limit;
- explicit beam-series convergence;
- real-mode averaged energy bookkeeping;
- synthetic spectrum and blind thickness recovery;
- total-internal-reflection guard behavior.

### v0.9 page-structure contract

- stylesheet and script are loaded in the correct order;
- eleven thin-film page sections are registered;
- every section has a unique id;
- every section declares `purpose`, `role`, and `action`;
- required navigation sections are present;
- semantic labels and current-section state are present;
- reduced-motion preference is respected;
- desktop sticky navigation and responsive fallback are styled.

## Remaining manual validation

Automated checks do not replace visual inspection in the user's target browser. Remaining items:

- left navigation width and text density at common desktop resolutions;
- scroll-jump offset relative to the sticky command bar;
- label overlap and section-purpose text wrapping;
- pointer interaction after DOM sections are wrapped by the guide layer;
- MathJax rendering after semantic heading replacement;
- responsive behavior on narrow screens;
- perceived scrolling and canvas animation performance.
