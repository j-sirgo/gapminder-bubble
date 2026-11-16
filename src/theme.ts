// colors shared by the chart and the HTML legend.
// five continents is more than a bubble chart can separate by color alone: this set is the best
// five-color subset of the reference palette (it passes the normal-vision check, but two pairs sit
// in the colorblind "warning" band), so the legend always names each continent next to its swatch
export const CONTINENT_COLORS: Record<string, string> = {
  Africa: "#e34948",
  Americas: "#eda100",
  Asia: "#2a78d6",
  Europe: "#1baf7a",
  Oceania: "#008300",
};

export const SURFACE = "#fcfcfb";
export const TEXT_PRIMARY = "#0b0b0b";
export const TEXT_SECONDARY = "#52514e";
