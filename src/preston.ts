import { mean, sum } from "d3";
import type { DataItem } from "./data";

// the Preston curve: life expectancy rises with income, fast at first, then flattening.
// it is a straight line once income is on a log scale, so we fit
//   lifeExp = intercept + slope * log2(gdpPercap)
// by ordinary least squares. With log2, the slope reads as "years gained per doubling of income".
export type PrestonFit = {
  intercept: number;
  slope: number;
  expected: (gdpPercap: number) => number;
};

export const fitPreston = (data: DataItem[]): PrestonFit => {
  const xs = data.map((d) => Math.log2(d.gdpPercap));
  const ys = data.map((d) => d.lifeExp);

  // d3.mean returns undefined for an empty array, hence the ?? 0 fallback
  const xMean = mean(xs) ?? 0;
  const yMean = mean(ys) ?? 0;

  // slope = covariance(x, y) / variance(x); the 1/n factors cancel, so plain sums are enough
  const sxy = sum(xs, (x, i) => (x - xMean) * (ys[i] - yMean));
  const sxx = sum(xs, (x) => (x - xMean) ** 2);
  const slope = sxy / sxx;
  const intercept = yMean - slope * xMean;

  return {
    intercept,
    slope,
    expected: (gdpPercap) => intercept + slope * Math.log2(gdpPercap),
  };
};

// residual: actual minus expected life expectancy, in years.
// negative = the country lives shorter than its income predicts
export const residual = (d: DataItem, fit: PrestonFit) =>
  d.lifeExp - fit.expected(d.gdpPercap);

// Gapminder's four income levels, defined in dollars per day.
// approximated here as GDP per capita / 365 (GDP is not household income, see the chart note)
export const INCOME_LEVELS = [
  { level: 1, fromPerDay: 0, toPerDay: 2 },
  { level: 2, fromPerDay: 2, toPerDay: 8 },
  { level: 3, fromPerDay: 8, toPerDay: 32 },
  { level: 4, fromPerDay: 32, toPerDay: Infinity },
];

export const DAYS_PER_YEAR = 365;
