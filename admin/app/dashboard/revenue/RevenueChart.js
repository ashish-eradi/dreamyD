'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function RevenueChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No revenue data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} width={40} />
        <Tooltip
          formatter={(val) => [`$${Number(val).toFixed(2)}`, 'Revenue']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={52}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === data.length - 1 ? '#7b5ea7' : '#e2d9f3'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
