import { getAdminClient } from '../../../lib/supabase';
import SectionHeader from '../../../components/SectionHeader';
import StatCard from '../../../components/StatCard';
import RevenueChart from './RevenueChart';
import AddPaymentForm from './AddPaymentForm';
import { formatINR, formatUSD } from '../../../lib/costs';
import { format, startOfMonth, subMonths, parseISO } from 'date-fns';

async function fetchRevenue() {
  const db = getAdminClient();

  const [{ data: payments }, { count: totalPremium }] = await Promise.all([
    db.from('subscription_payments').select('*').order('payment_date', { ascending: false }).limit(100),
    db.from('users').select('*', { count: 'exact', head: true }).eq('is_premium', true),
  ]);

  const rows = payments ?? [];
  const now  = new Date();
  const thisMonthStr = format(startOfMonth(now), 'yyyy-MM-dd');
  const lastMonthStr = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');

  const mtdTotal  = rows.filter(r => r.payment_date >= thisMonthStr).reduce((s, r) => s + Number(r.amount_usd), 0);
  const lastTotal = rows.filter(r => r.payment_date >= lastMonthStr && r.payment_date < thisMonthStr).reduce((s, r) => s + Number(r.amount_usd), 0);
  const allTime   = rows.reduce((s, r) => s + Number(r.amount_usd), 0);
  const mrr       = totalPremium ? totalPremium * 1.99 : 0; // proxy: premium users × plan price

  // Monthly series for last 6 months
  const monthly = [];
  for (let i = 5; i >= 0; i--) {
    const mo = subMonths(now, i);
    const moStr  = format(startOfMonth(mo), 'yyyy-MM-dd');
    const nextStr = format(startOfMonth(subMonths(mo, -1)), 'yyyy-MM-dd');
    const total = rows.filter(r => r.payment_date >= moStr && r.payment_date < nextStr).reduce((s, r) => s + Number(r.amount_usd), 0);
    monthly.push({ month: format(mo, 'MMM'), total });
  }

  const trend = lastTotal > 0 ? ((mtdTotal - lastTotal) / lastTotal) * 100 : null;

  return { mtdTotal, lastTotal, allTime, mrr, trend, monthly, recentPayments: rows.slice(0, 20), totalPremium: totalPremium ?? 0 };
}

export default async function RevenuePage() {
  const d = await fetchRevenue();

  return (
    <div>
      <SectionHeader
        title="Revenue"
        sub="Subscription payments · manual tracking"
        action={<AddPaymentForm />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Revenue (MTD)"   value={formatINR(d.mtdTotal)}  color="green" trend={d.trend} sub={formatUSD(d.mtdTotal)} />
        <StatCard label="All-time revenue" value={formatINR(d.allTime)}   color="green" sub={formatUSD(d.allTime)} />
        <StatCard label="Premium users"    value={d.totalPremium}         color="purple" />
        <StatCard label="Est. MRR"         value={formatINR(d.mrr)}       color="purple" sub="premium users × ₹179" />
      </div>

      {/* 6-month chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Monthly revenue (last 6 months)</p>
        <RevenueChart data={d.monthly} />
      </div>

      {/* Payment log */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Payment log</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left px-5 py-3 font-medium">Date</th>
              <th className="text-left px-5 py-3 font-medium">Plan</th>
              <th className="text-left px-5 py-3 font-medium">Source</th>
              <th className="text-left px-5 py-3 font-medium">Notes</th>
              <th className="text-right px-5 py-3 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {d.recentPayments.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">No payments logged yet — add one above</td></tr>
            ) : d.recentPayments.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-600">{p.payment_date}</td>
                <td className="px-5 py-3">
                  <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">{p.plan}</span>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">{p.source}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">{p.notes || '—'}</td>
                <td className="px-5 py-3 text-right font-semibold text-emerald-600">{formatINR(p.amount_usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
