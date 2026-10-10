import type { ChartElement, Palette } from "@/lib/schema";
import { resolveColor } from "@/lib/themes";
import { seriesColors } from "@/lib/chartColors";

/**
 * Lightweight, dependency-free chart rendering shared by the read-only
 * Slide renderer and the interactive SlideEditor, so a chart looks
 * identical in both. Deliberately simple (no charting library).
 */

export default function ChartGraphic({ element, theme }: { element: ChartElement; theme: Palette }) {
  const { chartType, data } = element;
  const colors = seriesColors(theme, data.length);
  const mutedColor = resolveColor("muted", theme);
  const textColor = resolveColor("text", theme);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        {chartType === "pie" ? (
          <PieChart data={data} colors={colors} />
        ) : chartType === "line" ? (
          <LineChart data={data} color={colors[0]} mutedColor={mutedColor} />
        ) : (
          <BarChart data={data} colors={colors} mutedColor={mutedColor} />
        )}
      </div>
      {chartType === "pie" ? (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "3%", marginTop: "4%" }}>
          {data.map((d, i) => (
            <div key={d.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[i], display: "inline-block" }} />
              <span style={{ fontSize: "1.6cqh", color: textColor }}>{d.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: "2%" }}>
          {data.map((d) => (
            <span key={d.label} style={{ fontSize: "1.6cqh", color: mutedColor, textAlign: "center" }}>
              {d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BarChart({
  data,
  colors,
  mutedColor,
}: {
  data: ChartElement["data"];
  colors: string[];
  mutedColor: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0.0001);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-around",
        gap: "4%",
        borderBottom: `1px solid ${mutedColor}66`,
      }}
    >
      {data.map((d, i) => (
        <div
          key={d.label}
          title={`${d.label}: ${d.value}`}
          style={{
            width: "100%",
            height: `${Math.max((d.value / max) * 100, 2)}%`,
            background: colors[i],
            borderRadius: "3px 3px 0 0",
          }}
        />
      ))}
    </div>
  );
}

function LineChart({
  data,
  color,
  mutedColor,
}: {
  data: ChartElement["data"];
  color: string;
  mutedColor: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0.0001);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * 100;
    const y = 100 - ((d.value - min) / range) * 100;
    return `${x},${y}`;
  });

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
      <line x1="0" y1="100" x2="100" y2="100" stroke={mutedColor} strokeWidth="0.5" opacity={0.4} />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {points.map((p, i) => {
        const [x, y] = p.split(",");
        return <circle key={i} cx={x} cy={y} r="1.6" fill={color} />;
      })}
    </svg>
  );
}

function PieChart({ data, colors }: { data: ChartElement["data"]; colors: string[] }) {
  const total = data.reduce((sum, d) => sum + Math.max(d.value, 0), 0) || 1;
  // Precompute each slice's [start, end) fraction of the circle without
  // mutating any variable during render (a running total built once, up
  // front, via reduce — not reassigned slice-by-slice inside .map()).
  const boundaries = data.reduce<number[]>(
    (acc, d) => [...acc, acc[acc.length - 1] + Math.max(d.value, 0) / total],
    [0]
  );
  const slices = data.map((d, i) => {
    const fraction = Math.max(d.value, 0) / total;
    const startAngle = boundaries[i] * 2 * Math.PI;
    const endAngle = boundaries[i + 1] * 2 * Math.PI;
    const largeArc = fraction > 0.5 ? 1 : 0;
    const [x1, y1] = [50 + 48 * Math.sin(startAngle), 50 - 48 * Math.cos(startAngle)];
    const [x2, y2] = [50 + 48 * Math.sin(endAngle), 50 - 48 * Math.cos(endAngle)];
    const path =
      fraction >= 0.9999
        ? `M 50,2 A 48,48 0 1 1 49.99,2 Z` // a single slice covering the whole pie
        : `M 50,50 L ${x1},${y1} A 48,48 0 ${largeArc} 1 ${x2},${y2} Z`;
    return <path key={i} d={path} fill={colors[i]} />;
  });

  return (
    <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
      {slices}
    </svg>
  );
}
