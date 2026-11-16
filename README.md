# Gapminder bubble plot

A React + D3 bubble plot of the Gapminder dataset (2007): GDP per capita against life expectancy, one
bubble per country, colored by continent and sized by population. It's the Axes module project
from the [D3 ❤️ React course](https://www.react-graph-gallery.com/react-d3-dataviz-course).

Live: <https://j-sirgo.github.io/gapminder-bubble/>

The angle: **the Preston curve and its exceptions.** A fitted curve (life expectancy on log₂ GDP,
about +5 years per doubling of income) shows the life expectancy expected for each income, and
vertical stems mark the countries furthest above and below it. A top axis converts income to
Gapminder's four dollars-a-day levels, with each level's share of the world's population. A
log/linear toggle shows how the scale reshapes the picture while the gaps stay the same. The page
opens on the linear view; `?scale=log` opens the log view directly.

| File | What it holds |
|---|---|
| `src/data.ts` | the 142-country dataset and its type |
| `src/preston.ts` | the curve fit, residuals, and income-level definitions (math only) |
| `src/axes.tsx` | `AxisBottom`, `AxisLeft`, `AxisTop` components |
| `src/BubblePlot.tsx` | scales, bands, curve, bubbles, stems, labels |
| `src/theme.ts` | continent colors and text/surface colors |
| `src/App.tsx` | headline, toggle, legend, captions, notes |

## Run

```sh
npm install
npm run dev
```

## Deploy

`npm run deploy` builds and publishes `dist/` to the `gh-pages` branch (GitHub Pages, base path
`/gapminder-bubble/`).
