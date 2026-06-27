import { getAdminClient } from '../../../lib/supabase';
import SectionHeader from '../../../components/SectionHeader';
import StatCard from '../../../components/StatCard';
import AddExpenseForm from './AddExpenseForm';
import { formatINR, formatUSD } from '../../../lib/costs';
import { format, startOfMonth, subMonths } from 'date-fns';

async function fetchExpenses() {
  const db = getAdminClient();
  const { data } = await db.from('manual_expenses').select('*').order('period_month', { ascending: false });

  const rows = data ?? [];
  const thisMonthStr = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const lastMonthStr = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');

  const mtd  = rows.filter(r => r.period_month === thisMonthStr).reduce((s, r) => s + Number(r.amount_usd), 0);
  const last = rows.filter(r => r.period_month === lastMonthStr).reduce((s, r) => s + Number(r.amount_usd), 0);
  const trend = last > 0 ? ((mtd - last) / last) * 100 : null;

  // By service
  const svcMap = {};
  for (const r of rows.filter(r => r.period_month === thisMonthStr)) {
    svcMap[r.service] = (svcMap[r.service] ?? 0) + Number(r.amount_usd);
  }
  const byService = Object.entries(svcMap).sort((a, b) => b[1] - a[1]);

  return { rows, mtd, last, trend, byService };
}

export default async function ExpensesPage() {
  const d = await fetchExpenses();

  return (
    <div>
      <SectionHeader
        title="Expenses"
        sub="Infrastructure &amp; tooling costs · manual entry"
        action={<AddExpenseForm />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="This month"   value={formatINR(d.mtd)}  color="amber" trend={d.trend} sub={formatUSD(d.mtd)} />
        <StatCard label="Last month"   value={formatINR(d.last)} color="default" sub={formatUSD(d.last)} />
        <StatCard label="YTD total"    value={formatINR(d.rows.reduce((s, r) => s + Number(r.amount_usd), 0))} color="default" />
        <StatCard label="Services"     value={Object.keys(Object.fromEntries(d.rows.map(r => [r.service, 1]))).length} color="default" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* This month by service */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">This month by service</h2>
          </div>
          <div className="p-5 space-y-3">
            {d.byService.length === 0 ? (
              <p className="text-sm text-gray-400">No expenses this month</p>
            ) : d.byService.map(([svc, amt]) => (
              <div key={svc} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{svc}</span>
                    <span className="text-gray-500">{formatINR(amt)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${d.mtd > 0 ? (amt / d.mtd) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense log */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">All expenses</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium">Month</th>
                <th className="text-left px-5 py-3 font-medium">Service</th>
                <th className="text-left px-5 py-3 font-medium">Notes</th>
                <th className="text-right px-5 py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">No expenses logged yet — add one above</td></tr>
              ) : d.rows.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {format(new Date(r.period_month + 'T00:00:00'), 'MMM yyyy')}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">{r.service}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{r.notes || '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">{formatINR(r.amount_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
