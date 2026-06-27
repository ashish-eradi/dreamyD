'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function AddPaymentForm() {
  const router  = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount_usd: '', plan: 'premium', payment_date: new Date().toISOString().slice(0, 10), source: 'manual', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('subscription_payments').insert({
      amount_usd:   parseFloat(form.amount_usd),
      plan:         form.plan,
      payment_date: form.payment_date,
      source:       form.source,
      notes:        form.notes || null,
      currency:     'USD',
    });
    if (err) { setError(err.message); setSaving(false); return; }
    setOpen(false);
    setSaving(false);
    setForm({ amount_usd: '', plan: 'premium', payment_date: new Date().toISOString().slice(0, 10), source: 'manual', notes: '' });
    router.refresh();
  }

  const field = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
      >
        + Add payment
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Log a payment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount (USD)</label>
                  <input type="number" step="0.01" required className={field} placeholder="1.99"
                    value={form.amount_usd} onChange={e => setForm(f => ({ ...f, amount_usd: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input type="date" required className={field}
                    value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                  <select className={field} value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                    <option value="premium">Premium</option>
                    <option value="premium_annual">Premium Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
                  <select className={field} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                    <option value="manual">Manual</option>
                    <option value="revenuecat">RevenueCat</option>
                    <option value="stripe">Stripe</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <input type="text" className={field} placeholder="e.g. User ID, transaction ref…"
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
                  {saving ? 'Saving…' : 'Save payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
