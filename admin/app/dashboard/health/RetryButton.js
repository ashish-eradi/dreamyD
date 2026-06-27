'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function RetryButton({ jobId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleRetry() {
    setBusy(true);
    await supabase.from('failed_jobs').update({ status: 'retrying', retry_count: supabase.rpc('increment') }).eq('id', jobId);
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleRetry}
      disabled={busy}
      className="text-xs px-2.5 py-1 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-40"
    >
      {busy ? '…' : 'Retry'}
    </button>
  );
}
