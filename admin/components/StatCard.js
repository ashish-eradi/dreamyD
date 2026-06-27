import clsx from 'clsx';

export default function StatCard({ label, value, sub, trend, color = 'default' }) {
  const colors = {
    default: 'text-gray-900',
    green:   'text-emerald-600',
    red:     'text-red-500',
    purple:  'text-brand-600',
    amber:   'text-amber-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <p className={clsx('text-3xl font-semibold', colors[color])}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {trend != null && (
        <p className={clsx('text-xs mt-1 font-medium', trend >= 0 ? 'text-emerald-500' : 'text-red-500')}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% vs last month
        </p>
      )}
    </div>
  );
}
