'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { format, startOfMonth } from 'date-fns';

const SERVICES = ['Supabase', 'Expo / EAS', 'Apple Developer', 'Google Play', 'OpenAI', 'Google Cloud', 'Domain / Hosting', 'Other'];

export default function AddExpenseForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    service: 'Supabase',
    amount_usd: '',
    period_month: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('manual_expenses').insert({
      service:       form.service,
      amount_usd:    parseFloat(form.amount_usd),
      period_month:  form.period_month,
      notes:         form.notes || null,
    });
    if (err) { setError(err.message); setSaving(false); return; }
    setOpen(false);
    setSaving(false);
    setForm({ service: 'Supabase', amount_usd: '', period_month: format(startOfMonth(new Date()), 'yyyy-MM-dd'), notes: '' });
    router.refresh();
  }

  const field = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
      >
        + Add expense
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Log an expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Service</label>
                  <select className={field} value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))}>
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount (USD)</label>
                  <input type="number" step="0.01" required className={field} placeholder="25.00"
                    value={form.amount_usd} onChange={e => setForm(f => ({ ...f, amount_usd: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
                <input type="date" required className={field}
                  value={form.period_month} onChange={e => setForm(f => ({ ...f, period_month: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <input type="text" className={field} placeholder="e.g. Pro plan, build minutes overage…"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 text-sm bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
