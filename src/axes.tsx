import type { ScaleLinear, ScaleLogarithmic } from "d3";

// the x axis has to work with both a linear and a log scale (the toggle).
// both have the same domain(), range() and call signature, so one union type covers them
export type ContinuousScale =
  | ScaleLinear<number, number>
  | ScaleLogarithmic<number, number>;

const TICK_LENGTH = 6;
const AXIS_COLOR = "#8a8984";
const GRID_COLOR = "#e4e3df";
const LABEL_COLOR = "#52514e";

// unlike the course version, the parent passes tickValues explicitly:
// a log scale's ticks() returns many unround values, so each scale mode picks its own ticks

type AxisBottomProps = {
  xScale: ContinuousScale;
  tickValues: number[];
  tickFormat: (value: number) => string;
  gridHeight: number; // grid lines go up from the axis, across the whole chart area
  label: string;
};

export const AxisBottom = ({ xScale, tickValues, tickFormat, gridHeight, label }: AxisBottomProps) => {
  const [start, end] = xScale.range();
  return (
    <>
      <line x1={start} x2={end} y1={0} y2={0} stroke={AXIS_COLOR} />
      {tickValues.map((value) => (
        <g key={value} transform={`translate(${xScale(value)}, 0)`}>
          <line y1={0} y2={-gridHeight} stroke={GRID_COLOR} />
          <line y1={0} y2={TICK_LENGTH} stroke={AXIS_COLOR} />
          <text y={TICK_LENGTH + 14} textAnchor="middle" fontSize={12} fill={LABEL_COLOR}>
            {tickFormat(value)}
          </text>
        </g>
      ))}
      <text x={(start + end) / 2} y={48} textAnchor="middle" fontSize={13} fill={LABEL_COLOR}>
        {label}
      </text>
    </>
  );
};

type AxisLeftProps = {
  yScale: ScaleLinear<number, number>;
  tickValues: number[];
  gridWidth: number; // grid lines go right from the axis
  label: string;
};

export const AxisLeft = ({ yScale, tickValues, gridWidth, label }: AxisLeftProps) => {
  // a y range is flipped ([boundsHeight, 0]), so the bottom pixel comes first
  const [bottom, top] = yScale.range();
  return (
    <>
      <line x1={0} x2={0} y1={bottom} y2={top} stroke={AXIS_COLOR} />
      {tickValues.map((value) => (
        <g key={value} transform={`translate(0, ${yScale(value)})`}>
          <line x1={0} x2={gridWidth} stroke={GRID_COLOR} />
          <line x1={0} x2={-TICK_LENGTH} stroke={AXIS_COLOR} />
          <text x={-TICK_LENGTH - 4} textAnchor="end" dominantBaseline="middle" fontSize={12} fill={LABEL_COLOR}>
            {value}
          </text>
        </g>
      ))}
      <text
        transform={`translate(-46, ${(bottom + top) / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize={13}
        fill={LABEL_COLOR}
      >
        {label}
      </text>
    </>
  );
};

// top axis: the mirror image of AxisBottom, ticks and labels pointing up, no grid lines
type AxisTopProps = {
  xScale: ContinuousScale;
  tickValues: number[];
  tickFormat: (value: number) => string;
  label: string;
};

export const AxisTop = ({ xScale, tickValues, tickFormat, label }: AxisTopProps) => {
  const [start, end] = xScale.range();
  return (
    <>
      <line x1={start} x2={end} y1={0} y2={0} stroke={AXIS_COLOR} />
      {tickValues.map((value) => (
        <g key={value} transform={`translate(${xScale(value)}, 0)`}>
          <line y1={0} y2={-TICK_LENGTH} stroke={AXIS_COLOR} />
          <text y={-TICK_LENGTH - 5} textAnchor="middle" fontSize={12} fill={LABEL_COLOR}>
            {tickFormat(value)}
          </text>
        </g>
      ))}
      <text x={(start + end) / 2} y={-34} textAnchor="middle" fontSize={13} fill={LABEL_COLOR}>
        {label}
      </text>
    </>
  );
};
