import { getAdminClient } from '../../lib/supabase';
import StatCard from '../../components/StatCard';
import SectionHeader from '../../components/SectionHeader';
import OverviewChart from './OverviewChart';
import { formatUSD, formatINR } from '../../lib/costs';
import { format, startOfMonth, subMonths } from 'date-fns';

async function fetchStats() {
  const db = getAdminClient();

  const now        = new Date();
  const thisMonthStart = startOfMonth(now).toISOString();
  const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();

  const [
    { count: totalUsers },
    { count: premiumUsers },
    { data: apiThisMonth },
    { data: apiLastMonth },
    { data: revenueThisMonth },
    { data: revenueLastMonth },
    { data: recentLogs },
  ] = await Promise.all([
    db.from('users').select('*', { count: 'exact', head: true }),
    db.from('users').select('*', { count: 'exact', head: true }).eq('is_premium', true),
    db.from('api_usage_logs').select('cost_usd').gte('created_at', thisMonthStart),
    db.from('api_usage_logs').select('cost_usd').gte('created_at', lastMonthStart).lt('created_at', thisMonthStart),
    db.from('subscription_payments').select('amount_usd').gte('payment_date', format(startOfMonth(now), 'yyyy-MM-dd')),
    db.from('subscription_payments').select('amount_usd').gte('payment_date', format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')).lt('payment_date', format(startOfMonth(now), 'yyyy-MM-dd')),
    db.from('api_usage_logs').select('service, cost_usd, created_at').order('created_at', { ascending: false }).limit(10),
  ]);

  const apiCostThis  = (apiThisMonth  ?? []).reduce((s, r) => s + Number(r.cost_usd), 0);
  const apiCostLast  = (apiLastMonth  ?? []).reduce((s, r) => s + Number(r.cost_usd), 0);
  const revThis      = (revenueThisMonth  ?? []).reduce((s, r) => s + Number(r.amount_usd), 0);
  const revLast      = (revenueLastMonth  ?? []).reduce((s, r) => s + Number(r.amount_usd), 0);
  const netThis      = revThis - apiCostThis;

  const apiTrend = apiCostLast > 0 ? ((apiCostThis - apiCostLast) / apiCostLast) * 100 : null;
  const revTrend = revLast     > 0 ? ((revThis - revLast)         / revLast)      * 100 : null;

  return { totalUsers: totalUsers ?? 0, premiumUsers: premiumUsers ?? 0, apiCostThis, apiTrend, revThis, revTrend, netThis, recentLogs: recentLogs ?? [] };
}

async function fetchDailyCosts() {
  const db = getAdminClient();
  const start = startOfMonth(new Date()).toISOString();
  const { data } = await db
    .from('api_usage_logs')
    .select('service, cost_usd, created_at')
    .gte('created_at', start)
    .order('created_at', { ascending: true });

  // Group by day + service
  const byDay = {};
  for (const row of (data ?? [])) {
    const day = row.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = { day, whisper: 0, 'gpt-4o': 0, 'gemini-flash': 0, 'claude-sonnet': 0 };
    byDay[day][row.service] = (byDay[day][row.service] ?? 0) + Number(row.cost_usd);
  }
  return Object.values(byDay);
}

export default async function OverviewPage() {
  const [stats, dailyCosts] = await Promise.all([fetchStats(), fetchDailyCosts()]);

  return (
    <div>
      <SectionHeader
        title="Overview"
        sub={`Month to date · ${format(new Date(), 'MMMM yyyy')}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total users"    value={stats.totalUsers}           color="default" />
        <StatCard label="Premium users"  value={stats.premiumUsers}         color="purple"
          sub={stats.totalUsers > 0 ? `${((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1)}% conversion` : undefined} />
        <StatCard label="Revenue (MTD)"  value={formatUSD(stats.revThis)}   color="green"  trend={stats.revTrend}
          sub={formatINR(stats.revThis)} />
        <StatCard label="API cost (MTD)" value={formatUSD(stats.apiCostThis)} color="amber" trend={stats.apiTrend} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Net margin (MTD)</p>
          <p className={`text-3xl font-semibold ${stats.netThis >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatUSD(stats.netThis)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{formatINR(stats.netThis)}</p>
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Daily API spend this month</p>
          <OverviewChart data={dailyCosts} />
        </div>
      </div>

      {/* Recent API calls */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Recent API calls</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left px-5 py-3 font-medium">Service</th>
              <th className="text-right px-5 py-3 font-medium">Cost</th>
              <th className="text-right px-5 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentLogs.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400 text-sm">No API calls logged yet</td></tr>
            ) : stats.recentLogs.map((log, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <ServiceBadge service={log.service} />
                    {log.service}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-mono text-xs text-gray-600">{formatUSD(log.cost_usd)}</td>
                <td className="px-5 py-3 text-right text-gray-400 text-xs">
                  {format(new Date(log.created_at), 'dd MMM, HH:mm')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ServiceBadge({ service }) {
  const colors = {
    'whisper':         'bg-blue-100 text-blue-700',
    'gpt-4o':          'bg-green-100 text-green-700',
    'gemini-flash':    'bg-purple-100 text-purple-700',
    'claude-sonnet':   'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colors[service] ?? 'bg-gray-100 text-gray-600'}`}>
      {service}
    </span>
  );
}
