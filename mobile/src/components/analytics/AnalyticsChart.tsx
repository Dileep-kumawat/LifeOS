import { View, StyleSheet, ActivityIndicator } from "react-native";
import Svg, { Path, Circle, Line as SvgLine, Text as SvgText, G, Rect } from "react-native-svg";
import { ThemedText } from "../ui/ThemedText";
import { Card } from "../ui/Card";
import { colors, spacing, radius } from "../../theme";

export interface MobileChartSeries {
  dataKey: string;
  name: string;
  color: string;
  strokeDasharray?: string;
}

export interface MobileAnalyticsChartProps {
  type?: "bar" | "line";
  data?: any[];
  xKey: string;
  series: MobileChartSeries[];
  title?: string;
  subtitle?: string;
  height?: number;
  yAxisFormatter?: (value: number) => string;
  xAxisFormatter?: (value: string) => string;
  emptyTitle?: string;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function AnalyticsChart({
  type = "bar",
  data = [],
  xKey,
  series,
  title,
  subtitle,
  height = 190,
  yAxisFormatter,
  xAxisFormatter,
  emptyTitle = "Not Enough Data Yet",
  emptyMessage = "No activity logged for this date range.",
  isLoading = false
}: MobileAnalyticsChartProps) {
  if (isLoading) {
    return (
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          {Boolean(title) && <ThemedText variant="heading3">{title}</ThemedText>}
        </View>
        <View style={[styles.loadingContainer, { height }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <ThemedText variant="caption" color={colors.inkMuted} style={{ marginTop: 8 }}>
            Loading chart...
          </ThemedText>
        </View>
      </Card>
    );
  }

  const hasData =
    data.length > 0 &&
    data.some((item) => series.some((s) => Number(item[s.dataKey] || 0) > 0));

  if (!hasData) {
    return (
      <Card style={styles.card}>
        {Boolean(title) && (
          <ThemedText variant="heading3" style={{ marginBottom: 4 }}>
            {title}
          </ThemedText>
        )}
        {Boolean(subtitle) && (
          <ThemedText variant="caption" color={colors.inkMuted} style={{ marginBottom: 12 }}>
            {subtitle}
          </ThemedText>
        )}
        <View style={[styles.emptyContainer, { height: height - 30 }]}>
          <ThemedText variant="bodySm" style={styles.emptyTitle}>
            {emptyTitle}
          </ThemedText>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.emptySubtitle}>
            {emptyMessage}
          </ThemedText>
        </View>
      </Card>
    );
  }

  // Dimensions & Padding for SVG plotting
  const width = 340;
  const padLeft = 40;
  const padRight = 14;
  const padTop = 14;
  const padBottom = 26;

  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  // Max value calculation across all plotted series (with minimum floor to avoid divide-by-zero)
  const maxVal = Math.max(
    ...data.map((d) => Math.max(...series.map((s) => Number(d[s.dataKey] || 0)))),
    1
  );

  const getX = (idx: number) => {
    if (data.length === 1) return padLeft + chartWidth / 2;
    return padLeft + (idx / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return padTop + chartHeight - (val / maxVal) * chartHeight;
  };

  // Bar rendering calculations
  const groupWidth = data.length > 0 ? chartWidth / data.length : chartWidth;
  const barSlotWidth = Math.min(24, Math.max(6, (groupWidth * 0.7) / series.length));

  return (
    <Card style={styles.card}>
      {/* Title & Legend Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          {Boolean(title) && (
            <ThemedText variant="heading3" style={styles.title}>
              {title}
            </ThemedText>
          )}
          {Boolean(subtitle) && (
            <ThemedText variant="caption" color={colors.inkMuted}>
              {subtitle}
            </ThemedText>
          )}
        </View>

        {/* Legend Chips */}
        <View style={styles.legendContainer}>
          {series.map((s) => (
            <View key={s.dataKey} style={styles.legendChip}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <ThemedText variant="caption" style={styles.legendText}>
                {s.name}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      {/* SVG Chart Container */}
      <View style={styles.svgWrapper}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Horizontal Gridlines & Y-Axis Labels */}
          {[0, 0.5, 1].map((pct) => {
            const y = padTop + chartHeight * (1 - pct);
            const valLabel = Math.round(maxVal * pct);
            const formatted = yAxisFormatter ? yAxisFormatter(valLabel) : `${valLabel}`;

            return (
              <G key={pct}>
                <SvgLine
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke={colors.hairline}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={padLeft - 6}
                  y={y + 3.5}
                  fontSize="9.5"
                  fontWeight="500"
                  fill={colors.inkFaint}
                  textAnchor="end"
                >
                  {formatted}
                </SvgText>
              </G>
            );
          })}

          {/* Bar Rendering Variant */}
          {type === "bar" &&
            data.map((d, dIdx) => {
              const groupCenterX = padLeft + dIdx * groupWidth + groupWidth / 2;
              const totalSeriesWidth = series.length * barSlotWidth;
              const startX = groupCenterX - totalSeriesWidth / 2;

              return (
                <G key={`bar-group-${dIdx}`}>
                  {series.map((s, sIdx) => {
                    const val = Number(d[s.dataKey] || 0);
                    const barH = (val / maxVal) * chartHeight;
                    const barY = padTop + chartHeight - barH;
                    const barX = startX + sIdx * barSlotWidth;

                    if (barH <= 0) return null;

                    return (
                      <Rect
                        key={`bar-${s.dataKey}-${dIdx}`}
                        x={barX}
                        y={barY}
                        width={barSlotWidth - 2}
                        height={barH}
                        fill={s.color}
                        rx={2}
                        ry={2}
                      />
                    );
                  })}
                </G>
              );
            })}

          {/* Line Rendering Variant */}
          {type === "line" &&
            series.map((s) => {
              const pathStr = data
                .map(
                  (d, i) =>
                    `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(Number(d[s.dataKey] || 0))}`
                )
                .join(" ");

              return (
                <G key={`line-${s.dataKey}`}>
                  <Path
                    d={pathStr}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={s.strokeDasharray}
                  />
                  {data.map((d, idx) => (
                    <Circle
                      key={`dot-${s.dataKey}-${idx}`}
                      cx={getX(idx)}
                      cy={getY(Number(d[s.dataKey] || 0))}
                      r="3.5"
                      fill={s.color}
                    />
                  ))}
                </G>
              );
            })}

          {/* X-Axis Category / Date Labels */}
          {data.map((d, idx) => {
            // Downsample labels if too many data points (e.g. > 10)
            if (data.length > 10 && idx % Math.ceil(data.length / 6) !== 0 && idx !== data.length - 1) {
              return null;
            }

            const rawLabel = String(d[xKey] || "");
            const formattedLabel = xAxisFormatter ? xAxisFormatter(rawLabel) : rawLabel;
            const x = type === "bar" ? padLeft + idx * groupWidth + groupWidth / 2 : getX(idx);

            return (
              <SvgText
                key={`label-${idx}`}
                x={x}
                y={height - 6}
                fontSize="9"
                fontWeight="600"
                fill={colors.inkMuted}
                textAnchor="middle"
              >
                {formattedLabel}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.sm
  },
  title: {
    fontWeight: "700",
    color: colors.ink
  },
  legendContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5
  },
  legendText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.inkSecondary
  },
  svgWrapper: {
    alignItems: "center",
    width: "100%"
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center"
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderStyle: "dashed",
    padding: spacing.md
  },
  emptyTitle: {
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 2
  },
  emptySubtitle: {
    textAlign: "center"
  }
});
