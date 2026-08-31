import React from "react";
import { Svg, Polygon, Line, Text } from "@react-pdf/renderer";

export interface RadarDimension {
  name: string;
  nivel: number;
}

export interface RadarChartProps {
  dimensions: RadarDimension[];
}

const h = React.createElement;

export const RADAR_LEVELS = [1, 2, 3, 4, 5];

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 120;
const START_ANGLE = -90;

const GRID_COLOR = "#D9D5E0";
const POLYGON_FILL = "rgba(74,44,125,0.20)";
const POLYGON_STROKE = "#4A2C7D";
const LABEL_COLOR = "#4A2C7D";

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
  const fraction = (clamped - 1) / (RADAR_LEVELS.length - 1);
  const r = radius * fraction;
  const angle = (START_ANGLE + (index * 360) / total) * (Math.PI / 180);
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
}

function pointsString(items: { x: number; y: number }[]): string {
  return items.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export function RadarChart({ dimensions }: RadarChartProps): ReturnType<typeof h> | null {
  const total = dimensions.length;
  if (total === 0) return null;

  const gridPolys = RADAR_LEVELS.map((level) =>
    h(Polygon, {
      key: `grid-${level}`,
      points: pointsString(
        dimensions.map((_, i) => polarPoint(level, i, total, RADIUS)),
      ),
      fill: "none",
      stroke: GRID_COLOR,
      strokeWidth: 1,
    }),
  );

  const axes = dimensions.map((_, i) => {
    const tip = polarPoint(5, i, total, RADIUS);
    return h(Line, {
      key: `axis-${i}`,
      x1: CENTER,
      y1: CENTER,
      x2: tip.x,
      y2: tip.y,
      stroke: GRID_COLOR,
      strokeWidth: 0.75,
    });
  });

  const dataPoly = h(Polygon, {
    key: "data",
    points: pointsString(
      dimensions.map((_, i) => polarPoint(dimensions[i].nivel, i, total, RADIUS)),
    ),
    fill: POLYGON_FILL,
    stroke: POLYGON_STROKE,
    strokeWidth: 1.5,
  });

  const labels = dimensions.map((dim, i) => {
    const p = polarPoint(5, i, total, RADIUS);
    const dx = p.x - CENTER;
    const dy = p.y - CENTER;
    const anchorX = Math.abs(dx) < 1 ? CENTER : p.x + Math.sign(dx) * 6;
    const anchorY = p.y + Math.sign(dy) * 4;
    const textAnchor =
      Math.abs(dx) < 1 ? "middle" : dx > 0 ? "start" : "end";
    return h(Text, {
      key: `label-${i}`,
      x: anchorX,
      y: anchorY,
      textAnchor,
      fontSize: 6,
      fill: LABEL_COLOR,
    }, dim.name);
  });

  return h(
    Svg,
    { viewBox: `0 0 ${SIZE} ${SIZE}`, width: SIZE, height: SIZE },
    ...gridPolys,
    ...axes,
    dataPoly,
    ...labels,
  );
}
