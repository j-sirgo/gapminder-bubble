import { format, line, max, range, scaleLinear, scaleLog, scaleSqrt, sum } from "d3";
import type { DataItem } from "./data";
import { AxisBottom, AxisLeft, AxisTop, type ContinuousScale } from "./axes";
import { DAYS_PER_YEAR, INCOME_LEVELS, residual, type PrestonFit } from "./preston";
import { CONTINENT_COLORS, SURFACE, TEXT_PRIMARY, TEXT_SECONDARY } from "./theme";

export type ScaleType = "log" | "linear";

// two ways to show the income levels, kept side by side for comparison:
// "axis"   = a second x axis on top in dollars per day, bands labeled with level and population share
// "labels" = no top axis; each band's label spells out its dollar range instead
export type LevelStyle = "axis" | "labels";

// space around the chart area: in "axis" mode the top holds the dollars-per-day axis and its title
const MARGIN: Record<LevelStyle, { top: number; right: number; bottom: number; left: number }> = {
  axis: { top: 70, right: 24, bottom: 62, left: 64 },
  labels: { top: 24, right: 24, bottom: 62, left: 64 },
};

// y domain top: "labels" mode has three-line band labels, so it needs a taller strip above the data
const Y_TOP: Record<LevelStyle, number> = { axis: 88, labels: 90 };

// "$2–8 a day", "under $2 a day", "over $32 a day"
const formatDayRange = (from: number, to: number) =>
  from === 0 ? `under $${to} a day` : to === Infinity ? `over $${from} a day` : `$${from}–${to} a day`;

// x domains: GDP per capita runs from about $280 to $49,400.
// log: from $250 to $64,000 (eight doublings), so the doubling ticks have room at both ends.
// linear: from $0, the usual choice for a linear axis
const X_DOMAIN: Record<ScaleType, [number, number]> = {
  log: [250, 64000],
  linear: [0, 50000],
};
const LOG_TICKS = [500, 1000, 2000, 4000, 8000, 16000, 32000];
const Y_TICKS = range(40, 90, 10);

// how many countries get a residual stem and a label, from each end of the ranking
const N_BELOW = 5;
const N_ABOVE = 3;

// label placement, chosen by hand after looking at the rendered chart, to avoid collisions.
// a side of the bubble, plus optional extra pixels. Countries not listed get the default:
// below the bubble if under the curve, above it if over (away from its own stem).
// the two modes need different choices only where bubbles crowd together in linear mode
type Side = "left" | "right" | "above" | "below";
type Placement = { side: Side; dx?: number; dy?: number };
const SHARED_PLACEMENT: Record<string, Placement> = {
  "West Bank and Gaza": { side: "right" },
  Angola: { side: "right" },
  "Equatorial Guinea": { side: "right", dx: 4, dy: -6 },
  Botswana: { side: "right", dy: 10 },
};
const LABEL_PLACEMENT: Record<ScaleType, Record<string, Placement>> = {
  log: { ...SHARED_PLACEMENT, Vietnam: { side: "left" }, Nicaragua: { side: "above", dy: -14 } },
  linear: { ...SHARED_PLACEMENT, Vietnam: { side: "above" }, Nicaragua: { side: "right", dx: 10, dy: 18 } },
};

// turn a side into a text position relative to the bubble center (r = bubble radius)
const placeLabel = (side: Side, r: number) => {
  switch (side) {
    case "left":
      return { dx: -r - 5, dy: 4, anchor: "end" as const };
    case "right":
      return { dx: r + 5, dy: 4, anchor: "start" as const };
    case "above":
      return { dx: 0, dy: -r - 8, anchor: "middle" as const };
    case "below":
      return { dx: 0, dy: r + 14, anchor: "middle" as const };
  }
};

// "$1k", "$16k", "$500"
const formatDollars = format("$~s");

type BubblePlotProps = {
  width: number;
  height: number;
  data: DataItem[];
  fit: PrestonFit;
  scaleType: ScaleType;
  levelStyle: LevelStyle;
};

export const BubblePlot = ({ width, height, data, fit, scaleType, levelStyle }: BubblePlotProps) => {
  const margin = MARGIN[levelStyle];
  const boundsWidth = width - margin.left - margin.right;
  const boundsHeight = height - margin.top - margin.bottom;

  // x: the only scale that changes with the toggle. Everything else stays fixed,
  // so any difference between the two views comes from this one choice
  const [xMin, xMax] = X_DOMAIN[scaleType];
  const xScale: ContinuousScale =
    scaleType === "log"
      ? scaleLog().domain([xMin, xMax]).range([0, boundsWidth])
      : scaleLinear().domain([xMin, xMax]).range([0, boundsWidth]);
  const xTicks = scaleType === "log" ? LOG_TICKS : xScale.ticks(5);

  // y: top above 85, to leave a strip above the richest countries for the band labels
  const yScale = scaleLinear().domain([35, Y_TOP[levelStyle]]).range([boundsHeight, 0]);

  // radius: sqrt so that bubble AREA, not radius, is proportional to population
  const maxPop = max(data, (d) => d.pop) ?? 0;
  const rScale = scaleSqrt().domain([0, maxPop]).range([0, 38]);
  // the smallest countries would be under 1px wide; a 2px floor keeps them visible
  const radius = (d: DataItem) => Math.max(rScale(d.pop), 2);

  // residuals: which countries sit furthest below and above the curve
  const ranked = [...data].sort((a, b) => residual(a, fit) - residual(b, fit));
  const highlighted = [...ranked.slice(0, N_BELOW), ...ranked.slice(-N_ABOVE)];
  const isHighlighted = new Set(highlighted.map((d) => d.country));

  // the fitted curve, sampled at 120 points spread evenly on a log scale.
  // the fit itself never changes: the same points just land in different pixels per scale,
  // which is why it is a straight line in log mode and a bend in linear mode
  const curveStart = 250;
  const samples = range(121).map((i) => curveStart * (xMax / curveStart) ** (i / 120));
  const curvePath =
    line<number>()
      .x((gdp) => xScale(gdp))
      .y((gdp) => yScale(fit.expected(gdp)))(samples) ?? "";

  // income-level bands: dollars per day converted back to GDP per year, clipped to the x domain
  const totalPop = sum(data, (d) => d.pop);
  const bands = INCOME_LEVELS.map((lvl) => {
    const from = Math.max(lvl.fromPerDay * DAYS_PER_YEAR, xMin);
    const to = Math.min(lvl.toPerDay * DAYS_PER_YEAR, xMax);
    const people = sum(data, (d) => (d.gdpPercap >= from && d.gdpPercap < to ? d.pop : 0));
    // a log scale has no 0, so clip the left edge of level 1 to the domain start
    const x0 = xScale(Math.max(from, xMin));
    const x1 = xScale(to);
    return { ...lvl, x0, x1, share: people / totalPop };
  });
  // a band too narrow for its two-line label gets folded into a combined label instead
  const MIN_LABEL_WIDTH = 92;
  const narrow = bands.filter((b) => b.x1 - b.x0 < MIN_LABEL_WIDTH);
  const narrowShare = sum(narrow, (b) => b.share);
  const formatShare = format(".0%");

  // draw the biggest bubbles first, so small ones stay visible on top of them
  const bubbles = [...data]
    .sort((a, b) => b.pop - a.pop)
    .map((d) => {
      const on = isHighlighted.has(d.country);
      return (
        <circle
          key={d.country}
          cx={xScale(d.gdpPercap)}
          cy={yScale(d.lifeExp)}
          r={radius(d)}
          fill={CONTINENT_COLORS[d.continent]}
          fillOpacity={on ? 0.95 : 0.4}
          stroke={on ? TEXT_PRIMARY : SURFACE}
          strokeWidth={on ? 1.25 : 1}
        />
      );
    });

  // residual stems: a vertical line from the bubble to the curve, length = the gap in years.
  // vertical, so its length is the same in both scale modes
  const stems = highlighted.map((d) => {
    const x = xScale(d.gdpPercap);
    return (
      <line
        key={d.country}
        x1={x}
        x2={x}
        y1={yScale(d.lifeExp)}
        y2={yScale(fit.expected(d.gdpPercap))}
        stroke={TEXT_PRIMARY}
        strokeWidth={1.5}
      />
    );
  });

  // size key: nested circles drawn with the same rScale as the bubbles, so they match exactly.
  // circles share a bottom line; a short leader from each circle's top points to its value.
  // sits in the bottom-right corner, which is empty in both scale modes (rich and short-lived)
  const sizeKeyValues = [
    { pop: 1e9, label: "1 billion" },
    // not 100 and 10 million: area scaling makes those circles too close to label apart
    { pop: 2e8, label: "200 million" },
    { pop: 2e7, label: "20 million" },
  ];
  const keyMaxR = rScale(sizeKeyValues[0].pop);
  const keyX = boundsWidth - 150; // center of the circles
  const keyBottom = boundsHeight - 14;
  const keyLabelX = keyX + keyMaxR + 10;
  // a background-colored panel behind the key hides the grid lines under it.
  // label width is estimated (about 0.6 × font size per character), not measured
  const KEY_PAD = 8;
  const keyTitleY = keyBottom - 2 * keyMaxR - 14;
  const keyPanel = {
    x: keyX - keyMaxR - KEY_PAD,
    y: keyTitleY - 12 - KEY_PAD,
    right: keyLabelX + "200 million".length * 11 * 0.6 + KEY_PAD,
    bottom: keyBottom + KEY_PAD,
  };
  const sizeKey = (
    <g>
      <rect
        x={keyPanel.x}
        y={keyPanel.y}
        width={keyPanel.right - keyPanel.x}
        height={keyPanel.bottom - keyPanel.y}
        rx={4}
        fill={SURFACE}
      />
      <text x={keyX - keyMaxR} y={keyTitleY} fontSize={12} fontWeight={600} fill={TEXT_SECONDARY}>
        Population (bubble area)
      </text>
      {sizeKeyValues.map(({ pop, label }) => {
        const r = rScale(pop);
        const top = keyBottom - 2 * r;
        return (
          <g key={pop}>
            <circle cx={keyX} cy={keyBottom - r} r={r} fill="none" stroke={TEXT_SECONDARY} strokeWidth={1} />
            <line x1={keyX} x2={keyLabelX - 4} y1={top} y2={top} stroke={TEXT_SECONDARY} strokeWidth={0.75} strokeDasharray="2 2" />
            <text x={keyLabelX} y={top} dominantBaseline="middle" fontSize={11} fill={TEXT_SECONDARY}>
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );

  const labels = highlighted.map((d) => {
    const gap = residual(d, fit);
    const below = gap < 0;
    const placement = LABEL_PLACEMENT[scaleType][d.country] ?? { side: below ? "below" : "above" };
    const pos = placeLabel(placement.side, radius(d));
    const sign = below ? "−" : "+"; // a real minus sign, not a hyphen
    return (
      <text
        key={d.country}
        x={xScale(d.gdpPercap) + pos.dx + (placement.dx ?? 0)}
        y={yScale(d.lifeExp) + pos.dy + (placement.dy ?? 0)}
        textAnchor={pos.anchor}
        fontSize={12}
        fill={TEXT_PRIMARY}
        // white halo so the label stays readable over bubbles and grid lines
        stroke={SURFACE}
        strokeWidth={3}
        paintOrder="stroke"
      >
        <tspan fontWeight={600}>{d.country}</tspan> {sign}
        {Math.abs(gap).toFixed(0)} yrs
      </text>
    );
  });

  return (
    <svg width={width} height={height} role="img" aria-label="Bubble plot of life expectancy against GDP per capita">
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {/* income-level bands, shaded every other level */}
        {bands.map((b) => (
          <rect
            key={b.level}
            x={b.x0}
            width={Math.max(b.x1 - b.x0, 0)}
            y={0}
            height={boundsHeight}
            fill={b.level % 2 === 1 ? "#f1f0ec" : SURFACE}
          />
        ))}
        {bands
          .filter((b) => b.x1 - b.x0 >= MIN_LABEL_WIDTH)
          .map((b) => (
            <text key={b.level} x={(b.x0 + b.x1) / 2} y={16} textAnchor="middle" fontSize={12} fill={TEXT_SECONDARY}>
              <tspan fontWeight={600}>Level {b.level}</tspan>
              {levelStyle === "labels" && (
                <tspan x={(b.x0 + b.x1) / 2} dy={15}>
                  {formatDayRange(b.fromPerDay, b.toPerDay)}
                </tspan>
              )}
              <tspan x={(b.x0 + b.x1) / 2} dy={15}>
                {formatShare(b.share)} of people
              </tspan>
            </text>
          ))}
        {/* combined label for the narrow bands: one row lower, so it clears the next band's label */}
        {narrow.length > 0 && (
          <text
            x={narrow[narrow.length - 1].x1 + 6}
            y={levelStyle === "labels" ? 67 : 52}
            fontSize={12}
            fill={TEXT_SECONDARY}
          >
            <tspan fontWeight={600}>
              {"◂"} Levels {narrow[0].level}–{narrow[narrow.length - 1].level}
            </tspan>
            {levelStyle === "labels" && (
              <tspan x={narrow[narrow.length - 1].x1 + 6} dy={15}>
                {formatDayRange(narrow[0].fromPerDay, narrow[narrow.length - 1].toPerDay)}
              </tspan>
            )}
            <tspan x={narrow[narrow.length - 1].x1 + 6} dy={15}>
              {formatShare(narrowShare)} of people
            </tspan>
          </text>
        )}

        {/* axes first, so their grid lines sit under the data */}
        <AxisLeft yScale={yScale} tickValues={Y_TICKS} gridWidth={boundsWidth} label="Life expectancy at birth (years)" />
        <g transform={`translate(0, ${boundsHeight})`}>
          <AxisBottom
            xScale={xScale}
            tickValues={xTicks}
            tickFormat={formatDollars}
            gridHeight={boundsHeight}
            label={`GDP per capita, PPP dollars per year (${scaleType} scale)`}
          />
        </g>
        {levelStyle === "axis" && (
          <AxisTop
            xScale={xScale}
            tickValues={INCOME_LEVELS.slice(1).map((l) => l.fromPerDay * DAYS_PER_YEAR)}
            tickFormat={(v) => `$${v / DAYS_PER_YEAR}`}
            label="Income level boundaries, in dollars per day (GDP per capita ÷ 365)"
          />
        )}

        <path d={curvePath} fill="none" stroke={TEXT_PRIMARY} strokeWidth={2} strokeDasharray="6 4" />
        {bubbles}
        {stems}
        {labels}
        {sizeKey}
      </g>
    </svg>
  );
};
