# Local runtime dependencies

- GSAP / ScrollTrigger 3.15.0 — license notice retained in source headers and licenses/GSAP-LICENSE.txt when supplied by the upstream package.
- Lenis 1.3.26 — license in licenses/Lenis-LICENSE.txt.
- Barlow (400–700), Teko (500–700), VT323 — Google Fonts distributions, OFL license files in licenses/.

Local copies avoid external CDN/font requests during entry, keep screenshot rendering repeatable, and allow the static site to run offline after the files are downloaded. No build step is required.
