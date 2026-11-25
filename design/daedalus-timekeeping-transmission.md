# Daedalus timekeeping transmission

Daedalus uses the existing six-beat escapement and one-minute cage shaft as the seconds take-off. A concentric transfer carries that motion to the orbiting dial, where the bevel pair redirects it into the inclined face. The second, minute and hour hands sit on three concentric rotating arbors.

| Train | Teeth, upstream to downstream | Result |
| --- | --- | --- |
| Cage to central seconds arbor | 24 → 20 → 24 | Equal speed, same direction in carrier coordinates |
| Central arbor to vertical dial feed | 38 → 18 → 40 | +19/20 of cage speed in carrier coordinates |
| Fixed sun to upright dial swivel | 24 → 24 → 24 | One counter-turn per carrier turn |
| Vertical feed to dial axis | 20 → 20 bevels | Equal speed, opposite direction in dial coordinates |
| Seconds to cannon pinion | 12 → 60, 10 → 60, 12 → 24 → 24 | +1/60. The fourth mesh restores the direction |
| Cannon pinion to hour wheel | 12 → 36, 10 → 40 | +1/12. Two meshes keep the hands turning together |

The carrier runs at +1/20 of cage speed. Its frame sees the fixed sun run at −1/20, and that angle travels to the dial swivel through two external meshes. Subtracting the swivel rotation from the +19/20 feed gives +1 cage turn per minute in the bearing that houses the bevel input. The 1:1 bevel pair reverses that sign along the dial normal so the hands read clockwise. These are separate orientation and timing paths. The design does not assume an undocumented Jacob & Co. differential gearset.

Spur axes lie on lines between the take-off, central arbor and dial bearing. Each pair uses pitch radii `r = module × teeth / 2`, with an axle distance equal to the sum of both radii. The three carrier-level rows have modules of approximately .03243, .02417 and .02870 scene units. The under-dial seconds stages use modules of .00672, .00685 and .00737. The hour stages use .01067 and .01024. The bevel axes intersect at the dial origin at approximately 39.5°. Each pitch cone opens to half that angle. At .36 units from the apex, both pitch radii are approximately .129 units.

Each rendered time sample starts from the current Asia/Manila clock. The six-beat locking and release phases govern the analog display, which varies from continuous time by less than one beat. All phases repeat at Manila noon and midnight. When movement is paused or reduced motion is active, the browser shows one mechanically coherent pose per elapsed second. Offscreen or hidden rendering suspends and samples the current time when visible again. The digital clock uses the unquantized wall-clock reading.

Verification covers signed ratios, tooth/gap indexing at the pitch circles, the 12-hour seam, coaxial transformed hands and sampled sapphire clearance across a complete carrier orbit. The nominal involute-based spur profiles are sampled for intersections throughout a tooth cycle. The displayed root forms, chamfers and conical bevels are simplified. These checks do not measure contact stress, load transfer or manufacturing tolerances.

## References

- [Bartosz Ciechanowski’s Mechanical Watch](https://ciechanow.ski/mechanical-watch/) illustrates the flow from barrel to escapement and animates the motion works.
- [Horopedia’s counting and transmission mechanism](https://horopedia.org/counting-and-transmission-mechanism/) relates fourth-wheel seconds and centre-wheel minutes.
- [Horopedia’s minute wheel](https://horopedia.org/minute-wheel-motion-work/) describes the compound wheel and pinion, cannon pinion, coaxial hour wheel and 12:1 reduction.
- [Jacob & Co.’s Astronomia Tourbillon](https://jacobandco.com/timepieces/astronomia-tourbillon) gives visual reference for presenting a time dial on an orbiting satellite.
- [KHK’s bevel-gear reference](https://khkgears.net/product-category/bevel-gears/) describes intersecting shafts and equal-ratio bevel pitch cones.
