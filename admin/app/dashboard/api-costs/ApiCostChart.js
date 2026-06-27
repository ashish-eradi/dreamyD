'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const SERVICES = [
  { key: 'whisper',       color: '#3b82f6', label: 'Whisper' },
  { key: 'gpt-4o',        color: '#10b981', label: 'GPT-4o'  },
  { key: 'gemini-flash',  color: '#8b5cf6', label: 'Gemini'  },
  { key: 'claude-sonnet', color: '#f59e0b', label: 'Claude'  },
  { key: 'other',         color: '#d1d5db', label: 'Other'   },
];

export default function ApiCostChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data this month yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="day" tickFormatter={d => d.slice(8)} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(3)}`} width={55} />
        <Tooltip
          formatter={(val, name) => [`$${Number(val).toFixed(5)}`, name]}
          labelFormatter={l => `Day ${l.slice(8)}`}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        {SERVICES.map(s => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} radius={s.key === 'other' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
