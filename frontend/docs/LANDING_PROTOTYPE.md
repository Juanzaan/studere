# Landing prototype

Self-contained HTML prototype (canonical fixed version):

- Repo: `frontend/public/landing-prototype.html` (versioned, all fixes applied)
- Working copy: `studerelandingwithbugsf1.html` (local scratch during fixes)

Open in a browser (needs network for fonts + GSAP CDN).

## Fix status (2026-08-05)

All known demo bugs fixed, verified in headless browser at 320–1440px:

- Strikethrough stagger in hero transcript (transition-delay per filler + reflow)
- Hero quiz no longer hardcoded: options typed from `currentPack.quizOpts`, auto-click marks the correct one
- `applyHeroPack` no longer rewrites the demo section's summary bullets / map tip (demo stays bio)
- Responsive CSS only (no JS changes): panel-frame auto height ≤700px, tabbar single-row scroll ≤520px, CTA column + inputs 1-col ≤380px
- Hero demo pauses (cycle + waveform rAF) when out of viewport or tab hidden, resumes clean restart on return

See git history / CHANGELOG for details.

## Stack choice (hybrid — keep this)

| Layer | Tool | Why |
|-------|------|-----|
| Progress bar | CSS `animation-timeline: scroll()` + JS fallback | Cheap, native |
| Hero storytelling (typewriter → flip → slot → map → quiz) | JS + GSAP timelines | Product logic + expressive motion |
| Card swaps + slot-into-mazo | **GSAP only** | No CSS/GSAP transform fight |
| Tutor typing + source line | Small JS + CSS fade | Simple, readable |
| Quiz / flash micro | CSS + tiny JS | Feedback pops |
| Tool rows / notes / ichips | IntersectionObserver | Reliable today; can move to `view()` later |

**Do not** move hero card swaps to pure CSS. Sequencing, interrupts, and residual state need a single owner (GSAP). CSS scroll-driven is great for continuous progress and simple enter/exit; keep GSAP for anything with branching product logic.

## Card swap fix (v4.1)

Root cause of the visual glitch between cards:
1. CSS `@keyframes cardSlot` (`is-slotting`) left `forwards` transforms on the element.
2. Next `swapCard` fought residual inline/CSS transforms and class state.
3. `clearProps` after settle was incomplete when slotting had run.

Fix:
- Removed CSS keyframes for slot — **slotIntoMazo is pure GSAP**.
- `hardResetCard()` kills tweens, strips inline transform/opacity/filter/animation, removes all state classes.
- Every `swapCard` hard-resets both cards first, then sets explicit identity with `gsap.set`, then timelines out/in with `force3D`.
- On complete: `clearProps: 'all'` so CSS classes own the settled state again.
- Slot → map handoff no longer races residual `is-slotting`.

## Reduced motion

Hero cycle still runs content changes under `prefers-reduced-motion`, but tilt and long motion paths are skipped where gated by `reduce`.
