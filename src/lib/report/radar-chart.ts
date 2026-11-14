import React from "react";
import { Svg, Polygon, Line, Text } from "@react-pdf/renderer";
import { shortDimensionLabel } from "./dimension-label";

export interface RadarDimension {
  name: string;
  nivel: number;
}

export interface RadarChartProps {
  dimensions: RadarDimension[];
}

const h = React.createElement;

export const RADAR_LEVELS = [1, 2, 3, 4, 5];

export const RADAR_BOX = { width: 540, height: 427 };
export const RADAR_CENTER = { x: 270, y: 213.5 };
export const RADAR_RADIUS = 160;

// Canvas is A4 at 96 dpi (794 px); the PDF is A4 at 72 pt (595 pt).
const PRINT_SCALE = 595 / 794;

const START_ANGLE = -90;
const LABEL_GAP = 14;
const LABEL_BASELINE = 8;

const GRID_COLOR = "#1D1D1F";
const GRID_OPACITY = 0.12;
const POLYGON_FILL = "#4A2C7D";
const POLYGON_FILL_OPACITY = 0.2;
const POLYGON_STROKE = "#4A2C7D";
const LABEL_COLOR = "#6E6E73";

interface LabelAnchor {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
}

export function clampLevel(level: number): number {
  return Math.min(5, Math.max(1, level));
}

function polarPoint(
  level: number,
  index: number,
  total: number,
  radius: number,
): { x: number; y: number } {
  const clamped = clampLevel(level);
  const r = (radius * clamped) / RADAR_LEVELS.length;
  const angle = (START_ANGLE + (index * 360) / total) * (Math.PI / 180);
  return {
    x: RADAR_CENTER.x + r * Math.cos(angle),
    y: RADAR_CENTER.y + r * Math.sin(angle),
  };
}

function pointsString(items: { x: number; y: number }[]): string {
  return items.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}

function labelAnchor(index: number, total: number): LabelAnchor {
  const angle = (START_ANGLE + (index * 360) / total) * (Math.PI / 180);
  const cos = Math.cos(angle);
  const r = RADAR_RADIUS + LABEL_GAP;
  return {
    x: RADAR_CENTER.x + r * cos,
    y: RADAR_CENTER.y + r * Math.sin(angle),
    anchor: Math.abs(cos) < 0.35 ? "middle" : cos > 0 ? "start" : "end",
  };
}

export function RadarChart({ dimensions }: RadarChartProps): ReturnType<typeof h> | null {
  const total = dimensions.length;
  if (total === 0) return null;

  const gridPolys = RADAR_LEVELS.map((level) =>
    h(Polygon, {
      key: `grid-${level}`,
      points: pointsString(
        dimensions.map((_, i) => polarPoint(level, i, total, RADAR_RADIUS)),
      ),
      fill: "none",
      stroke: GRID_COLOR,
      strokeOpacity: GRID_OPACITY,
      strokeWidth: 1,
    }),
  );

  const axes = dimensions.map((_, i) => {
    const tip = polarPoint(RADAR_LEVELS.length, i, total, RADAR_RADIUS);
    return h(Line, {
      key: `axis-${i}`,
      x1: RADAR_CENTER.x,
      y1: RADAR_CENTER.y,
      x2: tip.x,
      y2: tip.y,
      stroke: GRID_COLOR,
      strokeOpacity: GRID_OPACITY,
      strokeWidth: 0.8,
    });
  });

  const dataPoly = h(Polygon, {
    key: "data",
    points: pointsString(
      dimensions.map((dim, i) => polarPoint(dim.nivel, i, total, RADAR_RADIUS)),
    ),
    fill: POLYGON_FILL,
    fillOpacity: POLYGON_FILL_OPACITY,
    stroke: POLYGON_STROKE,
    strokeWidth: 2,
  });

  const labels = dimensions.map((dim, i) => {
    const anchor = labelAnchor(i, total);
    return h(
      Text,
      {
        key: `label-${i}`,
        x: anchor.x,
        y: anchor.y + LABEL_BASELINE,
        textAnchor: anchor.anchor,
        style: { fontSize: 9.5, fontFamily: "Inter", fontWeight: 500, fill: LABEL_COLOR },
      },
      shortDimensionLabel(dim.name),
    );
  });

  return h(
    Svg,
    {
      viewBox: `0 0 ${RADAR_BOX.width} ${RADAR_BOX.height}`,
      width: RADAR_BOX.width * PRINT_SCALE,
      height: RADAR_BOX.height * PRINT_SCALE,
    },
    ...gridPolys,
    ...axes,
    dataPoly,
    ...labels,
  );
}
