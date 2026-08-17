import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle, Line, Text as SvgText, G } from "react-native-svg";
import { ThemedText } from "../ui/ThemedText";
import { Card } from "../ui/Card";
import { colors, spacing } from "../../theme";
import type { CategorySpendSummary, MonthlyTrendPoint } from "../../db/repositories/financeRepo";

const PALETTE = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#6B7280"  // Gray
];

interface CategoryBreakdownChartProps {
  data: CategorySpendSummary[];
  totalExpense: number;
}

export function CategoryBreakdownChart({ data, totalExpense }: CategoryBreakdownChartProps) {
  if (data.length === 0 || totalExpense <= 0) {
    return (
      <Card style={styles.card}>
        <ThemedText variant="heading3" style={styles.cardTitle}>
          Category Breakdown
        </ThemedText>
        <ThemedText variant="caption" color={colors.inkMuted} style={{ textAlign: "center", paddingVertical: spacing.md }}>
          No expense transactions logged for this period.
        </ThemedText>
      </Card>
    );
  }

  // SVG Ring Chart calculations
  const size = 180;
  const strokeWidth = 24;
  const center = size / 2;
  const radiusVal = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusVal;

  let currentOffset = 0;

  return (
    <Card style={styles.card}>
      <ThemedText variant="heading3" style={styles.cardTitle}>
        Category Breakdown
      </ThemedText>

      <View style={styles.chartAndLegend}>
        {/* SVG Donut */}
        <View style={styles.svgWrapper}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <G rotation="-90" origin={`${center}, ${center}`}>
              {data.map((item, idx) => {
                const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -currentOffset;
                currentOffset += (item.percentage / 100) * circumference;
                const sliceColor = PALETTE[idx % PALETTE.length];

                return (
                  <Circle
                    key={item.category}
                    cx={center}
                    cy={center}
                    r={radiusVal}
                    stroke={sliceColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    fill="transparent"
                  />
                );
              })}
            </G>
          </Svg>

          <View style={styles.centerLabel}>
            <ThemedText variant="caption" color={colors.inkMuted}>
              Total
            </ThemedText>
            <ThemedText variant="heading3" style={{ fontWeight: "700" }}>
              ${Math.round(totalExpense)}
            </ThemedText>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          {data.slice(0, 5).map((item, idx) => {
            const dotColor = PALETTE[idx % PALETTE.length];
            return (
              <View key={item.category} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: dotColor }]} />
                <ThemedText variant="caption" numberOfLines={1} style={styles.legendLabel}>
                  {item.category}
                </ThemedText>
                <ThemedText variant="caption" style={{ fontWeight: "600" }}>
                  ${Math.round(item.amount)} ({item.percentage}%)
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>
    </Card>
  );
}

interface TrendLineChartProps {
  data: MonthlyTrendPoint[];
}

export function TrendLineChart({ data }: TrendLineChartProps) {
  if (data.length === 0) {
    return null;
  }

  const width = 310;
  const height = 160;
  const padLeft = 35;
  const padRight = 15;
  const padTop = 15;
  const padBottom = 25;

  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.income, d.expense)),
    100
  );

  const getX = (idx: number) => {
    if (data.length === 1) return padLeft + chartWidth / 2;
    return padLeft + (idx / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return padTop + chartHeight - (val / maxVal) * chartHeight;
  };

  // Build SVG Path strings for income and expenses
  const incomePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.income)}`)
    .join(" ");

  const expensePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.expense)}`)
    .join(" ");

  return (
    <Card style={styles.card}>
      <View style={styles.trendHeader}>
        <ThemedText variant="heading3">Income & Spend Trend</ThemedText>
        <View style={styles.trendLegend}>
          <View style={styles.legendChip}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <ThemedText variant="caption">Income</ThemedText>
          </View>
          <View style={styles.legendChip}>
            <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
            <ThemedText variant="caption">Expense</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.chartWrapper}>
        <Svg width={width} height={height}>
          {/* Grid lines */}
          {[0, 0.5, 1].map((pct) => {
            const y = padTop + chartHeight * (1 - pct);
            const valLabel = Math.round(maxVal * pct);
            return (
              <G key={pct}>
                <Line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke={colors.hairline}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={padLeft - 5}
                  y={y + 3}
                  fontSize="9"
                  fill={colors.inkFaint}
                  textAnchor="end"
                >
                  ${valLabel}
                </SvgText>
              </G>
            );
          })}

          {/* Income Line */}
          <Path
            d={incomePath}
            fill="none"
            stroke={colors.success}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Expense Line */}
          <Path
            d={expensePath}
            fill="none"
            stroke={colors.error}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Data points & X-axis month labels */}
          {data.map((d, idx) => {
            const x = getX(idx);
            return (
              <G key={d.month}>
                <Circle cx={x} cy={getY(d.income)} r="3.5" fill={colors.success} />
                <Circle cx={x} cy={getY(d.expense)} r="3.5" fill={colors.error} />
                <SvgText
                  x={x}
                  y={height - 5}
                  fontSize="10"
                  fill={colors.inkMuted}
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
              </G>
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
  cardTitle: {
    marginBottom: spacing.sm
  },
  chartAndLegend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around"
  },
  svgWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center"
  },
  centerLabel: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center"
  },
  legendContainer: {
    flex: 1,
    marginLeft: spacing.sm,
    gap: 6
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  legendLabel: {
    flex: 1,
    marginRight: 4
  },
  trendHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  trendLegend: {
    flexDirection: "row",
    gap: spacing.xs
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  chartWrapper: {
    alignItems: "center"
  }
});
