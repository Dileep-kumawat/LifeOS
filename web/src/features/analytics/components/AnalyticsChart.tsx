import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";

export interface AnalyticsChartSeries {
  dataKey: string;
  name: string;
  color: string;
  strokeDasharray?: string;
  radius?: [number, number, number, number];
}

export interface AnalyticsChartProps {
  type?: "bar" | "line";
  data?: any[];
  xKey: string;
  series: AnalyticsChartSeries[];
  title?: string;
  subtitle?: string;
  height?: number;
  yAxisFormatter?: (value: number) => string;
  xAxisFormatter?: (value: string) => string;
  tooltipFormatter?: (value: any, name: string) => [string, string];
  emptyTitle?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  ariaLabel?: string;
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  type = "bar",
  data = [],
  xKey,
  series,
  title,
  subtitle,
  height = 280,
  yAxisFormatter,
  xAxisFormatter,
  tooltipFormatter,
  emptyTitle = "Not Enough Data Yet",
  emptyMessage = "Log activity or select a broader date range to see trends.",
  isLoading = false,
  ariaLabel
}) => {
  const chartTitle = title || (type === "bar" ? "Activity Bar Chart" : "Trend Line Chart");
  const accessibleLabel = ariaLabel || `${chartTitle} Data Summary`;

  // Determine if dataset has zero logged data across all plotted series
  const hasData =
    data.length > 0 &&
    data.some((item) => series.some((s) => Number(item[s.dataKey] || 0) > 0));

  if (isLoading) {
    return (
      <div
        className="p-6 bg-white border border-[#e6e6e6] rounded-xl shadow-xs animate-pulse"
        role="status"
        aria-label={`Loading ${chartTitle}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-40 bg-[#f1f3fc] rounded-md" />
          <div className="h-4 w-24 bg-[#f1f3fc] rounded-md" />
        </div>
        <div className="w-full bg-[#faf9f8] rounded-lg border border-[#e6e6e6]/60 flex items-center justify-center" style={{ height }}>
          <div className="flex flex-col items-center gap-2">
            <div className="size-8 rounded-full border-2 border-[#0075de] border-t-transparent animate-spin" />
            <span className="text-xs text-[#615d59]">Loading chart data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div
        className="p-6 bg-white border border-[#e6e6e6] rounded-xl shadow-xs flex flex-col"
        data-testid="analytics-chart-empty"
      >
        {(title || subtitle) && (
          <div className="mb-4">
            {title && <h3 className="text-base font-bold text-[#000000]">{title}</h3>}
            {subtitle && <p className="text-xs text-[#615d59] mt-0.5">{subtitle}</p>}
          </div>
        )}
        <div
          className="flex flex-col items-center justify-center p-8 bg-[#faf9f8] border border-dashed border-[#e6e6e6] rounded-lg text-center my-auto"
          style={{ minHeight: height }}
        >
          <div className="size-10 rounded-full bg-[#f6f5f4] border border-[#e6e6e6] flex items-center justify-center text-[#615d59] mb-3">
            {type === "bar" ? <BarChart3 className="size-5" /> : <TrendingUp className="size-5" />}
          </div>
          <h4 className="text-sm font-semibold text-[#000000] mb-1">{emptyTitle}</h4>
          <p className="text-xs text-[#615d59] max-w-xs leading-relaxed">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-6 bg-white border border-[#e6e6e6] rounded-xl shadow-xs flex flex-col"
      data-testid="analytics-chart"
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
          <div>
            {title && <h3 className="text-base font-bold text-[#000000]">{title}</h3>}
            {subtitle && <p className="text-xs text-[#615d59] mt-0.5">{subtitle}</p>}
          </div>
        </div>
      )}

      {/* Screen Reader Accessible Data Table Fallback */}
      <div className="sr-only">
        <h4>{accessibleLabel}</h4>
        <table>
          <thead>
            <tr>
              <th scope="col">{xKey}</th>
              {series.map((s) => (
                <th key={s.dataKey} scope="col">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                <td>{xAxisFormatter ? xAxisFormatter(row[xKey]) : row[xKey]}</td>
                {series.map((s) => (
                  <td key={s.dataKey}>
                    {yAxisFormatter
                      ? yAxisFormatter(Number(row[s.dataKey] || 0))
                      : row[s.dataKey]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recharts Container */}
      <div className="w-full" style={{ height }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          {type === "bar" ? (
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" vertical={false} />
              <XAxis
                dataKey={xKey}
                stroke="#615d59"
                fontSize={11}
                tickLine={false}
                tickFormatter={xAxisFormatter}
              />
              <YAxis
                stroke="#615d59"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={yAxisFormatter}
              />
              <Tooltip
                formatter={(val: any, name: string) => {
                  if (tooltipFormatter) return tooltipFormatter(val, name);
                  return [yAxisFormatter ? yAxisFormatter(Number(val)) : val, name];
                }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  borderColor: "#e6e6e6",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
                  fontSize: "12px"
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
              />
              {series.map((s) => (
                <Bar
                  key={s.dataKey}
                  dataKey={s.dataKey}
                  name={s.name}
                  fill={s.color}
                  radius={s.radius || [4, 4, 0, 0]}
                  maxBarSize={32}
                />
              ))}
            </BarChart>
          ) : (
            <LineChart
              data={data}
              margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" vertical={false} />
              <XAxis
                dataKey={xKey}
                stroke="#615d59"
                fontSize={11}
                tickLine={false}
                tickFormatter={xAxisFormatter}
              />
              <YAxis
                stroke="#615d59"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={yAxisFormatter}
              />
              <Tooltip
                formatter={(val: any, name: string) => {
                  if (tooltipFormatter) return tooltipFormatter(val, name);
                  return [yAxisFormatter ? yAxisFormatter(Number(val)) : val, name];
                }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  borderColor: "#e6e6e6",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
                  fontSize: "12px"
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
              />
              {series.map((s) => (
                <Line
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2.5}
                  strokeDasharray={s.strokeDasharray}
                  dot={{ r: 3, fill: s.color }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
