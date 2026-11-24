# Daedalus · Haute Horlogerie Edition
Watch-only branch from main; the broad visual fidelity draft #167 is not inherited.

## References and choices
- [IWC — Flying tourbillon](https://www.iwc.com/us-en/journal/the-flying-tourbillon-where-time-flies): the rotating cage carries the oscillator, lever and escape wheel; the escape pinion rolls around a fixed fourth wheel. Preserve the existing one-minute cadence and actual tooth counts.
- [Horopedia — Balance and hairspring](https://horopedia.org/regulating-organ-balance-hairspring/): a harmonic oscillator. Use a nominal 250-degree amplitude and a fixed outer stud, moving inner collet, with an animated rectangular-section spiral.
- [Horopedia — Swiss lever](https://horopedia.org/distribution-mechanism-swiss-lever-escapement/): use an impulse roller, ruby impulse pin, safety roller, fork and pallets. Their mesh is an illustration; no collision/contact dynamics are solved.
- [SJX — Gear tooth profiles](https://watchesbysjx.com/2026/08/insight-watch-gears-and-profiles.html): actual horological teeth require specialized geometry. This edition uses rounded sampled profiles with shared module and bounded clearance, NOT manufacturing-grade cycloidal tooth shapes. Index the third pinion separately from its compound wheel.
- [Monochrome — Haute horlogerie finishing](https://monochrome-watches.com/a-technical-perspective-all-you-want-to-know-about-finishing-in-haute-horlogerie/): perlage, polished bevels and refined finishing inspire the procedural maps and sculpted shoulders; these are original artistic interpretations.

## Construction
The cutaway mainspring drum is a visual representation and does not simulate winding or torque. The celestial complications are gear-driven artwork, not astronomical ephemerides. Time hands continue to show the actual Asia/Manila clock. No mechanical claim of chronometer accuracy, manufacturing tolerances, or validated pallet clearance is made.

## Render strategy
Procedural perlage, guilloche and brushing maps are generated once. Subassemblies flatten into rigid parents and batch by material without merging animated pivots. Dynamic spring arrays are reused. High is the initial setting, existing explicit choices persist; the high preset retains the original GPU pixel caps and now responds to sustained slow frame cadence as well as submit cost. The 20-second archival sky recording explicitly uses Balanced to avoid mixing video encoding overhead with maximum graphics quality; separate fresh desktop and mobile browser tests exercise High.

## Before merging
Inspect screenshots of overview, escapement, train and astronomical details; verify high/default/low real canvas size, context recovery, pause, pinch, keyboard and phone layout. Check spring and pallet clearances by eye; compare device GPU timing and memory. CI must pass before production. No other interactive worlds, cars, protected pages or authentication are touched.
