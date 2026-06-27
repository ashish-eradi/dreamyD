'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

export function NewSubsChart({ data }) {
  if (!data?.length) return <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No data yet</div>;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
        <Bar dataKey="new" name="New subscribers" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {data.map((_, i) => <Cell key={i} fill={i === data.length - 1 ? '#7b5ea7' : '#e2d9f3'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ChurnChart({ data }) {
  if (!data?.length) return <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No data yet</div>;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={36} />
        <Tooltip formatter={v => [`${v}%`, 'Churn']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
        <Line type="monotone" dataKey="churn" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
