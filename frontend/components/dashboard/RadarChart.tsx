"use client";

import {
  RadarChart as RechartsRadar,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface RadarDataPoint {
  dimension: string;
  score: number;
  fullMark: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
}

// Custom tooltip
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: RadarDataPoint }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 10,
      padding: "8px 14px",
      boxShadow: "var(--shadow-lg)",
      fontSize: 13,
    }}>
      <div style={{ fontWeight: 700, color: "var(--color-navy)", marginBottom: 2 }}>{d.dimension}</div>
      <div style={{ color: "var(--color-accent)", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
        {d.score}<span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)" }}>/100</span>
      </div>
    </div>
  );
}

export function RadarChart({ data }: RadarChartProps) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadar
          data={data}
          margin={{ top: 8, right: 24, bottom: 8, left: 24 }}
        >
          {/* Concentric polygon grid */}
          <PolarGrid
            stroke="var(--color-border)"
            strokeWidth={1}
          />

          {/* Axis labels */}
          <PolarAngleAxis
            dataKey="dimension"
            tick={{
              fontSize: 11,
              fontWeight: 700,
              fill: "var(--color-navy)",
              fontFamily: "inherit",
            }}
          />

          {/* Radial scale 0–100 (hidden ticks, just for reference) */}
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />

          {/* The filled radar area */}
          <Radar
            name="Skor"
            dataKey="score"
            stroke="#0D6B4F"
            strokeWidth={2}
            fill="#0D6B4F"
            fillOpacity={0.18}
            dot={{
              fill: "#0D6B4F",
              r: 4,
              strokeWidth: 2,
              stroke: "#fff",
            }}
            activeDot={{
              r: 6,
              fill: "#0D6B4F",
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />

          <Tooltip content={<CustomTooltip />} />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
