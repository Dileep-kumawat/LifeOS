import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { CategoryBreakdownItem } from "../types";

interface CategoryBreakdownChartProps {
  data?: CategoryBreakdownItem[];
  title?: string;
}

const COLORS = [
  "#0075de", // Notion primary blue
  "#2a9d99", // Teal
  "#dd5b00", // Orange
  "#ff64c8", // Pink
  "#d6b6f6", // Purple
  "#62aef0", // Sky
  "#1aae39", // Green
  "#523410"  // Brown
];

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  data = [],
  title = "Category Breakdown"
}) => {
  const expenses = data.filter((item) => item.type === "expense" && item.totalAmount > 0);

  if (!expenses || expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white border border-[#e6e6e6] rounded-xl text-center shadow-sm">
        <h3 className="text-lg font-semibold text-[#000000] mb-2">{title}</h3>
        <p className="text-sm text-[#615d59]">No expense data logged for this period yet.</p>
      </div>
    );
  }

  const chartData = expenses.map((item) => ({
    name: item.category,
    value: item.totalAmount
  }));

  return (
    <div className="p-6 bg-white border border-[#e6e6e6] rounded-xl shadow-sm">
      <h3 className="text-lg font-semibold text-[#000000] mb-4">{title}</h3>

      {/* Visually hidden accessible data table fallback for screen readers */}
      <div className="sr-only">
        <h4>{title} Data Summary</h4>
        <table>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td>${item.value.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="w-full h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Amount"]}
              contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", borderColor: "#e6e6e6" }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: any) => <span className="text-xs text-[#31302e] font-medium">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
