# Daedalus Astral Grande Complication

## Movement specification

The JCAM10 technical sheet for the Astronomia Stallion documents a four-satellite, 20-minute carrier, 5-minute and 60-second tourbillon axes, 60-second globe and moon spins, a differential dial and a 21,600 vibrations-per-hour escapement. Daedalus uses this one cadence, an original layout and an original finish. The axes below refer to successive local frames. Positive angles follow Three.js right-handed rotation.

| Stage | Axis and frame | Ratio and period |
| --- | --- | --- |
| Balance and lever | Local Y inside the inner cage | 6 beats/s, 3 complete oscillations/s, 1.44 rad displayed balance amplitude |
| Escape wheel | Local Y at +0.48 along the cage X axis | 15 teeth, half a tooth per beat |
| Inner cage | Local Y in the transverse yoke | 8-leaf planet against a fixed 96-tooth fourth wheel, 60 seconds |
| Transverse yoke | Local X through the regulator centre | Reversing 16:80 stage, 300 seconds |
| Central carrier | Case Y axis | 16:64 second reduction after the transverse output, 1,200 seconds, same sign as inner cage |
| Earth and moon | Crossed local axes at opposed radial stations | Equal ratios from the minute reference, 60 seconds about each axis. Opposite spin direction for the two satellites |
| Time dial | Vertical swivel on the fourth arm | Equal and opposite carrier rotation, then a fixed 39.5° dial tilt. Wall-clock angles come from Asia/Manila |
| Local train | Compound parallel arbors | 48:16 and 36:12 external pairs. The driven pinion and inner cage share the same angular reference |

The animation solves local angular displacement from the release phase of the lever. The wheel rests against each pallet before a eased half-pitch release. The lock, unlock, impulse and drop are kinematic phases. Diametrically opposite complications share a carrier. The source-of-motion equations and the relative transforms are testable without a browser. Shaft placement and envelope checks use scene units with a 2.45-unit inner case radius.

The local 48:16 pair has a 0.80-unit centre distance and the 36:12 pair has a 0.60-unit centre distance, both with a 0.025-unit module. The nominal cylinder radius of the sapphire glazing is 2.453 units. The dial was set inboard to maintain at least 0.20 units of sampled vertical clearance under the dome during the carrier orbit.

The geometry illustrates the visible local train and planetary interface. Transfer through the transverse stage, the central reduction, the satellite reversers and the dial differential is idealized. The model has no force propagation, friction, exact involute contact or validated shock/drop behaviour. The dial counter-rotates to keep its display orientation. The movement cannot be treated as a manufacturing design. The wall-clock time and the artistic celestial cycle have independent sources.

## Reference decisions

| Reference | Used for |
| --- | --- |
| [Jacob & Co. JCAM10 manufacturer sheet, archived PDF](https://12-24.com/upload/iblock/10f/10f074a8ef4ec9e672768b36a837cefc.pdf) | One coherent set of periods, 3 Hz escapement, sapphire, rose gold and folding hardware |
| [Jacob & Co. Astronomia Tourbillon](https://jacobandco.com/timepieces/astronomia-tourbillon) | Exterior and front/rear movement images, lateral transparency and raised satellites |
| [Jacob & Co. Astronomia Sky](https://jacobandco.com/timepieces/astronomia-sky) and [Astronomia Solar Zodiac](https://jacobandco.jp/timepieces/astronomia-solar-zodiac/) | Compare case glazing and calibre layouts. These variants use different mechanisms and supplied no Daedalus rates |
| [Detached lever escapement, Horology Atlas](https://atlas.watchmuseum.org/encyclopedia/lever-escapement) | Locking pallets, roller, guard and banks |
| [Patek Philippe hand finishing](https://www.patek.com/en/manufacture/artisans-of-time/hand-finishing) | Polished bevels, overlapping circular graining and localized stripes on bridges |
| [GIA round brilliant anatomy](https://www.gia.edu/diamond-cut/diamond-cut-anatomy-round-brilliant) | Ordered crown, girdle and pavilion facets in an original rounded cut |
| [JWST Cosmic Cliffs](https://science.nasa.gov/asset/webb/cosmic-cliffs-in-the-carina-nebula-nircam-image/) and [ESA/Webb Tarantula Nebula](https://esawebb.org/images/weic2212a/) | Layered dust cavities, thin illuminated fronts and quieter star fields |
| [University of Wisconsin Orion](https://www.astro.wisc.edu/~dolan/constellations/constellations/Orion.html) and [Cassiopeia](https://www.astro.wisc.edu/~dolan/constellations/constellations/Cassiopeia.html) | Recognizable connected bright-star patterns, projected individually into a decorative composition |
| [Natural Earth 1:110m land](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson) and [public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/) | Simplified coastline polygons for the gilt enamel globe |
| [Pinyon Script](https://fonts.google.com/specimen/Pinyon+Script), [Great Vibes](https://fonts.google.com/specimen/Great+Vibes) and [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) | Script proportions and complementary functional serif. The card uses Pinyon Script with a serif fallback |

The astronomical environment is decorative and does not represent the sky over Manila. Current Philippine time remains a live civil-time display.
