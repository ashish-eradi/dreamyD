import { getAdminClient } from '../../../lib/supabase';
import SectionHeader from '../../../components/SectionHeader';
import StatCard from '../../../components/StatCard';
import { NewSubsChart, ChurnChart } from './SubChart';
import { formatINR } from '../../../lib/costs';
import { format, startOfMonth, subMonths, startOfDay, startOfWeek } from 'date-fns';

async function fetchSubscriptionData() {
  const db  = getAdminClient();
  const now = new Date();

  const todayStr     = format(startOfDay(now),          'yyyy-MM-dd');
  const weekStr      = format(startOfWeek(now),         'yyyy-MM-dd');
  const monthStr     = format(startOfMonth(now),        'yyyy-MM-dd');
  const lastMonthStr = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');

  const [
    { count: totalPremium },
    { data: payments },
    { data: profiles },
  ] = await Promise.all([
    db.from('users').select('*', { count: 'exact', head: true }).eq('is_premium', true),
    db.from('subscription_payments').select('*').order('payment_date', { ascending: false }),
    db.from('users').select('id, is_premium, plan_type, created_at'),
  ]);

  const rows = payments ?? [];

  // New subs counts
  const newToday  = rows.filter(r => r.payment_date >= todayStr).length;
  const newWeek   = rows.filter(r => r.payment_date >= weekStr).length;
  const newMonth  = rows.filter(r => r.payment_date >= monthStr).length;

  // Revenue counts
  const mrrUSD = rows
    .filter(r => r.payment_date >= monthStr)
    .reduce((s, r) => s + Number(r.amount_usd), 0);

  // Plan breakdown
  const planCounts = { monthly: 0, quarterly: 0, annual: 0, manual: 0, free: 0 };
  (profiles ?? []).forEach(p => {
    const k = p.plan_type ?? 'free';
    planCounts[k] = (planCounts[k] ?? 0) + 1;
  });

  // Churn: last month subs who are NOT premium now (rough estimate)
  const lastMonthSubs = rows.filter(r => r.payment_date >= lastMonthStr && r.payment_date < monthStr).length;
  const churnCount    = Math.max(0, lastMonthSubs - newMonth);
  const churnRate     = lastMonthSubs > 0 ? ((churnCount / lastMonthSubs) * 100).toFixed(1) : '0.0';

  // Monthly series (last 6 months)
  const monthlySeries = [];
  for (let i = 5; i >= 0; i--) {
    const mo      = subMonths(now, i);
    const moStr   = format(startOfMonth(mo), 'yyyy-MM-dd');
    const nextStr = format(startOfMonth(subMonths(mo, -1)), 'yyyy-MM-dd');
    const newSubs = rows.filter(r => r.payment_date >= moStr && r.payment_date < nextStr).length;
    // Simple churn estimate: prior month subs * average churn rate
    const priorMoStr = format(startOfMonth(subMonths(mo, 1)), 'yyyy-MM-dd');
    const priorSubs  = rows.filter(r => r.payment_date < moStr && r.payment_date >= priorMoStr).length;
    const moChurn    = priorSubs > 0 ? ((Math.max(0, priorSubs - newSubs) / priorSubs) * 100).toFixed(1) : '0.0';
    monthlySeries.push({ month: format(mo, 'MMM'), new: newSubs, churn: parseFloat(moChurn) });
  }

  // Recent payments
  const recent = rows.slice(0, 15);

  return {
    totalPremium: totalPremium ?? 0,
    newToday, newWeek, newMonth,
    mrrUSD, churnRate, churnCount,
    planCounts,
    monthlySeries,
    recent,
  };
}

export default async function SubscriptionsPage() {
  const d = await fetchSubscriptionData();

  const planLabels = { monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual', manual: 'Gifted', free: 'Free' };
  const planColors = { monthly: 'bg-brand-50 text-brand-700', quarterly: 'bg-purple-50 text-purple-700', annual: 'bg-emerald-50 text-emerald-700', manual: 'bg-amber-50 text-amber-700', free: 'bg-gray-100 text-gray-500' };

  return (
    <div>
      <SectionHeader title="Subscription Overview" sub="Active subscribers and revenue health" />

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active premium"   value={d.totalPremium}          color="purple" />
        <StatCard label="MRR"              value={formatINR(d.mrrUSD)}     color="green"  sub="this month's payments" />
        <StatCard label="Churn rate"       value={`${d.churnRate}%`}       color={parseFloat(d.churnRate) > 10 ? 'red' : 'default'} sub="monthly estimate" />
        <StatCard label="New this month"   value={d.newMonth}              color="default" sub={`${d.newToday} today · ${d.newWeek} this week`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">New subscribers / month</p>
          <NewSubsChart data={d.monthlySeries} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Estimated churn rate %</p>
          <ChurnChart data={d.monthlySeries} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Plan breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Breakdown by plan</p>
          <div className="space-y-3">
            {Object.entries(d.planCounts).filter(([, v]) => v > 0).map(([plan, count]) => {
              const total = Object.values(d.planCounts).reduce((s, v) => s + v, 0);
              return (
                <div key={plan}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${planColors[plan] ?? 'bg-gray-100 text-gray-500'}`}>
                      {planLabels[plan] ?? plan}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full bg-brand-400 rounded-full" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.values(d.planCounts).every(v => v === 0) && (
              <p className="text-sm text-gray-400">No data yet</p>
            )}
          </div>
        </div>

        {/* Recent payments */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Recent payments</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-left px-5 py-3 font-medium">Plan</th>
                <th className="text-left px-5 py-3 font-medium">Source</th>
                <th className="text-right px-5 py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {d.recent.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">No payments yet</td></tr>
              ) : d.recent.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-600 text-xs">{p.payment_date}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColors[p.plan] ?? 'bg-gray-100 text-gray-500'}`}>
                      {planLabels[p.plan] ?? p.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{p.source}</td>
                  <td className="px-5 py-3 text-right font-semibold text-emerald-600">{formatINR(p.amount_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
