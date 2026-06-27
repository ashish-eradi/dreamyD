import { getAdminClient } from '../../../lib/supabase';
import SectionHeader from '../../../components/SectionHeader';
import StatCard from '../../../components/StatCard';
import ApiCostChart from './ApiCostChart';
import { formatINR, formatUSD } from '../../../lib/costs';
import { format, startOfMonth, subMonths } from 'date-fns';

async function fetchApiCosts() {
  const db    = getAdminClient();
  const start = startOfMonth(new Date()).toISOString();
  const last  = startOfMonth(subMonths(new Date(), 1)).toISOString();

  const [{ data: thisMonth }, { data: lastMonth }, { data: byService }, { data: topUsers }] = await Promise.all([
    db.from('api_usage_logs').select('cost_usd, service, created_at, audio_duration_secs, tokens_in, tokens_out').gte('created_at', start).order('created_at', { ascending: false }),
    db.from('api_usage_logs').select('cost_usd').gte('created_at', last).lt('created_at', start),
    db.from('api_usage_logs').select('service, cost_usd').gte('created_at', start),
    db.from('api_usage_logs').select('user_id, cost_usd').gte('created_at', start).not('user_id', 'is', null),
  ]);

  const rows   = thisMonth ?? [];
  const total  = rows.reduce((s, r) => s + Number(r.cost_usd), 0);
  const totLast = (lastMonth ?? []).reduce((s, r) => s + Number(r.cost_usd), 0);

  // Aggregate by service
  const svcMap = {};
  for (const r of (byService ?? [])) {
    if (!svcMap[r.service]) svcMap[r.service] = { service: r.service, total: 0, calls: 0 };
    svcMap[r.service].total += Number(r.cost_usd);
    svcMap[r.service].calls++;
  }
  const serviceBreakdown = Object.values(svcMap).sort((a, b) => b.total - a.total);

  // Top users by cost
  const userMap = {};
  for (const r of (topUsers ?? [])) {
    userMap[r.user_id] = (userMap[r.user_id] ?? 0) + Number(r.cost_usd);
  }
  const topUsersList = Object.entries(userMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, cost]) => ({ id, cost }));

  // Daily series for chart
  const dailyMap = {};
  for (const r of rows) {
    const day = r.created_at.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { day, whisper: 0, 'gpt-4o': 0, 'gemini-flash': 0, 'claude-sonnet': 0, other: 0 };
    const svc = ['whisper','gpt-4o','gemini-flash','claude-sonnet'].includes(r.service) ? r.service : 'other';
    dailyMap[day][svc] = (dailyMap[day][svc] ?? 0) + Number(r.cost_usd);
  }
  const dailySeries = Object.values(dailyMap).sort((a, b) => a.day.localeCompare(b.day));

  const avgPerCall = rows.length > 0 ? total / rows.length : 0;

  return { total, totLast, serviceBreakdown, topUsersList, dailySeries, callCount: rows.length, avgPerCall };
}

export default async function ApiCostsPage() {
  const d = await fetchApiCosts();
  const trend = d.totLast > 0 ? ((d.total - d.totLast) / d.totLast) * 100 : null;

  return (
    <div>
      <SectionHeader
        title="API Costs"
        sub={`Detailed breakdown · ${format(new Date(), 'MMMM yyyy')}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total spend (MTD)"   value={formatINR(d.total)}       color="amber" trend={trend} sub={formatUSD(d.total)} />
        <StatCard label="API calls"            value={d.callCount.toLocaleString()} color="default" />
        <StatCard label="Avg cost / call"      value={formatINR(d.avgPerCall)}  color="default" sub={formatUSD(d.avgPerCall)} />
        <StatCard label="Last month"           value={formatINR(d.totLast)}     color="default" sub={formatUSD(d.totLast)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Daily chart */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:col-span-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Daily cost by service</p>
          <ApiCostChart data={d.dailySeries} />
        </div>

        {/* Service breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">By service</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium">Service</th>
                <th className="text-right px-5 py-3 font-medium">Calls</th>
                <th className="text-right px-5 py-3 font-medium">Total</th>
                <th className="text-right px-5 py-3 font-medium">% share</th>
              </tr>
            </thead>
            <tbody>
              {d.serviceBreakdown.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">No data yet</td></tr>
              ) : d.serviceBreakdown.map(s => (
                <tr key={s.service} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{s.service}</td>
                  <td className="px-5 py-3 text-right text-gray-500">{s.calls}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-gray-700">{formatINR(s.total)}</td>
                  <td className="px-5 py-3 text-right text-gray-400 text-xs">
                    {d.total > 0 ? ((s.total / d.total) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top users by cost */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Top users by cost (MTD)</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium">User ID</th>
                <th className="text-right px-5 py-3 font-medium">Spend</th>
              </tr>
            </thead>
            <tbody>
              {d.topUsersList.length === 0 ? (
                <tr><td colSpan={2} className="px-5 py-8 text-center text-gray-400 text-sm">No per-user data yet</td></tr>
              ) : d.topUsersList.map((u, i) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">
                    #{i+1} {u.id.slice(0, 8)}…
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-gray-700">{formatINR(u.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
