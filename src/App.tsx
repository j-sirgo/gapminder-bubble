import { useState } from "react";
import { format, mean, sum } from "d3";
import { data } from "./data";
import { BubblePlot, type LevelStyle, type ScaleType } from "./BubblePlot";
import { DAYS_PER_YEAR, fitPreston, residual } from "./preston";
import { CONTINENT_COLORS, TEXT_PRIMARY } from "./theme";
import "./App.css";

// fit once: the data never change, and the fit must be the same in both scale modes
const fit = fitPreston(data);

// the UN "Southern Africa" subregion, used for the headline number
const SOUTHERN_AFRICA = ["Botswana", "Lesotho", "Namibia", "South Africa", "Swaziland"];
const southernGap = mean(
  data.filter((d) => SOUTHERN_AFRICA.includes(d.country)),
  (d) => residual(d, fit)
) ?? 0;

// numbers for the linear-mode caption: people below $8 a day, and how much of the axis they get
const level3Start = 8 * DAYS_PER_YEAR;
const shareBelow8 =
  sum(data, (d) => (d.gdpPercap < level3Start ? d.pop : 0)) / sum(data, (d) => d.pop);
const axisShareBelow8 = level3Start / 50000; // linear domain is $0 to $50,000
const pct = format(".0%");

const CAPTIONS: Record<ScaleType, string> = {
  log: `On a log scale each gridline step is a doubling of income, and the Preston curve becomes a straight line: about ${fit.slope.toFixed(1)} more years of life per doubling.`,
  linear: `On a linear scale the same curve bends sharply, and the ${pct(shareBelow8)} of the world's people living on less than $8 a day are squeezed into the leftmost ${pct(axisShareBelow8)} of the chart. The stems keep their length: the scale changes the picture, not the gaps.`,
};

// start on linear, the familiar view, so switching to log is the reveal;
// ?scale=log in the URL opens the log view directly
const initialScale: ScaleType =
  new URLSearchParams(window.location.search).get("scale") === "log" ? "log" : "linear";

// for comparing the two income-level designs: ?levels=labels drops the top axis
const levelStyle: LevelStyle =
  new URLSearchParams(window.location.search).get("levels") === "labels" ? "labels" : "axis";

function App() {
  const [scaleType, setScaleType] = useState<ScaleType>(initialScale);

  return (
    <main>
      <h1>
        Each doubling of income buys about {Math.round(fit.slope)} more years of life. Southern
        Africa falls {Math.round(-southernGap)} years short.
      </h1>
      <p className="subtitle">
        Life expectancy against GDP per capita for {data.length} countries in 2007. The dashed line
        is the Preston curve fitted to these data: the life expectancy expected for each income.
        Stems show how far the countries furthest from it sit above or below.
      </p>

      <div className="controls">
        <div className="toggle" role="group" aria-label="Income axis scale">
          {(["linear", "log"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scaleType === s}
              onClick={() => setScaleType(s)}
            >
              {s === "log" ? "Log scale" : "Linear scale"}
            </button>
          ))}
        </div>
        <ul className="legend">
          {Object.entries(CONTINENT_COLORS).map(([continent, color]) => (
            <li key={continent}>
              <svg width={12} height={12} aria-hidden="true">
                <circle cx={6} cy={6} r={5.5} fill={color} />
              </svg>
              {continent}
            </li>
          ))}
          <li>
            <svg width={26} height={12} aria-hidden="true">
              <line x1={0} x2={26} y1={6} y2={6} stroke={TEXT_PRIMARY} strokeWidth={2} strokeDasharray="6 4" />
            </svg>
            Expected for income
          </li>
          <li>
            <svg width={8} height={14} aria-hidden="true">
              <line x1={4} x2={4} y1={0} y2={14} stroke={TEXT_PRIMARY} strokeWidth={1.5} />
            </svg>
            Gap from expected
          </li>
        </ul>
      </div>

      <BubblePlot width={960} height={600} data={data} fit={fit} scaleType={scaleType} levelStyle={levelStyle} />

      <p className="caption">{CAPTIONS[scaleType]}</p>

      <p className="notes">
        Data: Gapminder, 2007 snapshot, via the D3 ❤️ React course. Curve: ordinary least squares of
        life expectancy on log₂ GDP per capita, all countries weighted equally. Income levels are
        Gapminder's four levels in dollars a day, approximated as GDP per capita ÷ 365; GDP is not
        household income, so the band edges are indicative. The Southern African gaps coincide
        with the HIV/AIDS epidemic, which these data do not measure.
      </p>
    </main>
  );
}

export default App;
