import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { MonthlyTrendItem } from "../types";

interface TrendLineChartProps {
  data?: MonthlyTrendItem[];
  title?: string;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  data = [],
  title = "Spending & Income Trend"
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white border border-[#e6e6e6] rounded-xl text-center shadow-sm">
        <h3 className="text-lg font-semibold text-[#000000] mb-2">{title}</h3>
        <p className="text-sm text-[#615d59]">No historical trend data available.</p>
      </div>
    );
  }

  const isSingleMonth = data.length <= 1;

  return (
    <div className="p-6 bg-white border border-[#e6e6e6] rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#000000]">{title}</h3>
        {isSingleMonth && (
          <span className="text-xs px-2.5 py-1 bg-[#f6f5f4] text-[#615d59] rounded-full border border-[#e6e6e6]">
            Single Month (Insufficient history for trend line)
          </span>
        )}
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
            <XAxis dataKey="month" stroke="#615d59" fontSize={12} />
            <YAxis stroke="#615d59" fontSize={12} tickFormatter={(val: any) => `$${val}`} />
            <Tooltip
              formatter={(val: any) => [`$${Number(val).toFixed(2)}`, ""]}
              contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", borderColor: "#e6e6e6" }}
            />
            <Legend verticalAlign="top" height={36} />
            <Line
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="#1aae39"
              strokeWidth={2.5}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="Expense"
              stroke="#dd5b00"
              strokeWidth={2.5}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Net Balance"
              stroke="#0075de"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
