import type { TableElement, Palette } from "@/lib/schema";
import { resolveColor } from "@/lib/themes";

/**
 * Shared table rendering for the read-only Slide renderer and the
 * interactive SlideEditor. Convention: the first row is treated as a
 * header (the AI is instructed to put column headers there).
 */
export default function TableGraphic({ element, theme }: { element: TableElement; theme: Palette }) {
  const [header, ...body] = element.rows;
  const textColor = resolveColor("text", theme);
  const accentColor = resolveColor("accent", theme);
  const mutedColor = resolveColor("muted", theme);

  return (
    <table
      style={{
        width: "100%",
        height: "100%",
        borderCollapse: "collapse",
        tableLayout: "fixed",
      }}
    >
      {header && (
        <thead>
          <tr style={{ borderBottom: `1px solid ${mutedColor}` }}>
            {header.map((cell, i) => (
              <th
                key={i}
                style={{
                  textAlign: "left",
                  padding: "2% 3%",
                  fontSize: "1.8cqh",
                  fontWeight: 600,
                  color: accentColor,
                }}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {body.map((row, ri) => (
          <tr key={ri} style={{ borderBottom: `1px solid ${mutedColor}33` }}>
            {row.map((cell, ci) => (
              <td
                key={ci}
                style={{
                  textAlign: "left",
                  padding: "2% 3%",
                  fontSize: "1.8cqh",
                  color: textColor,
                }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
