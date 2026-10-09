"use client";

import { useState } from "react";

export interface RadarDimension {
  name: string;
  nivel: number;
}

export const RADAR_LEVELS = [1, 2, 3, 4, 5];

const SIZE = 360;
const CENTER = SIZE / 2;
const RADIUS = 130;
const LABEL_RADIUS = 150;
const START_ANGLE = -90;

const RING_STROKE = "#E4E0EC";
const AXIS_STROKE = "#EDEAF2";
const RING_FILL = "rgba(74,44,125,0.035)";
const DATA_STROKE = "#4A2C7D";
const LABEL_COLOR = "#3B2366";

export function clampLevel(level: number): number {
  return Math.min(5, Math.max(1, level));
}

function angleFor(index: number, total: number): number {
  return (START_ANGLE + (index * 360) / total) * (Math.PI / 180);
}

function pointAt(
  radius: number,
  index: number,
  total: number,
): { x: number; y: number } {
  const angle = angleFor(index, total);
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

function polarPoint(
  level: number,
  index: number,
  total: number,
  radius: number,
): { x: number; y: number } {
  const clamped = clampLevel(level);
  const fraction = (clamped - 1) / (RADAR_LEVELS.length - 1);
  return pointAt(radius * fraction, index, total);
}

function pointsString(items: { x: number; y: number }[]): string {
  return items.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export function RadarSpider({ dimensions }: { dimensions: RadarDimension[] }) {
  const [active, setActive] = useState<number | null>(null);

  const total = dimensions.length;
  if (total === 0) return null;

  const rings = RADAR_LEVELS.map((level, i) => (
    <polygon
      key={`ring-${level}`}
      points={pointsString(
        dimensions.map((_, index) => polarPoint(level, index, total, RADIUS)),
      )}
      fill={i % 2 === 0 ? RING_FILL : "none"}
      stroke={RING_STROKE}
      strokeWidth={1}
    />
  ));

  const axes = dimensions.map((_, i) => {
    const tip = polarPoint(5, i, total, RADIUS);
    return (
      <line
        key={`axis-${i}`}
        x1={CENTER}
        y1={CENTER}
        x2={tip.x}
        y2={tip.y}
        stroke={active === i ? DATA_STROKE : AXIS_STROKE}
        strokeWidth={active === i ? 1.25 : 1}
      />
    );
  });

  const dataPoly = (
    <polygon
      points={pointsString(
        dimensions.map((dim, i) => polarPoint(dim.nivel, i, total, RADIUS)),
      )}
      fill="rgba(74,44,125,0.18)"
      stroke={DATA_STROKE}
      strokeWidth={2}
      strokeLinejoin="round"
    />
  );

  const indexLabels = dimensions.map((_, i) => {
    const p = pointAt(LABEL_RADIUS, i, total);
    return (
      <text
        key={`index-${i}`}
        x={p.x}
        y={p.y + 3.5}
        textAnchor="middle"
        fontSize={10}
        fontWeight={600}
        fill={active === i ? DATA_STROKE : LABEL_COLOR}
        opacity={active === null || active === i ? 1 : 0.4}
      >
        {i + 1}
      </text>
    );
  });

  const vertices = dimensions.map((dim, i) => {
    const p = polarPoint(dim.nivel, i, total, RADIUS);
    return (
      <circle
        key={`vertex-${i}`}
        cx={p.x}
        cy={p.y}
        r={active === i ? 5 : 3.5}
        fill={DATA_STROKE}
        stroke="#FFFFFF"
        strokeWidth={1.5}
        onMouseEnter={() => setActive(i)}
        onMouseLeave={() => setActive(null)}
        onFocus={() => setActive(i)}
        onBlur={() => setActive(null)}
        style={{ transition: "r 200ms cubic-bezier(0.32,0.72,0,1)" }}
      />
    );
  });

  const tooltip = active !== null ? (
    <text
      x={CENTER}
      y={SIZE - 6}
      textAnchor="middle"
      fontSize={12}
      fontWeight={600}
      fill={DATA_STROKE}
    >
      {`${dimensions[active].name} — nível ${dimensions[active].nivel}`}
    </text>
  ) : null;

  return (
    <div className="flex h-full w-full flex-col">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto h-auto w-full max-w-[380px]"
        role="img"
        aria-label="Radar de maturidade por dimensão"
      >
        {rings}
        {axes}
        {dataPoly}
        {vertices}
        {indexLabels}
        {tooltip}
      </svg>

      <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {dimensions.map((dim, i) => (
          <li key={`legend-${i}`} className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-rhema-lavender-light font-mono text-[10px] font-semibold text-rhema-primary">
              {i + 1}
            </span>
            <span
              className="truncate font-inter text-xs text-rhema-dark/70"
              title={dim.name}
            >
              {dim.name}
            </span>
            <span className="ml-auto shrink-0 font-mono text-[11px] font-semibold text-rhema-primary">
              N{clampLevel(dim.nivel)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
