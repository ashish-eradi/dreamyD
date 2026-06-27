'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UserActions({ userId, isPremium, isBanned }) {
  const router  = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action) {
    if (action === 'delete' && !confirm('Permanently delete this user and all their data? This cannot be undone.')) return;
    setBusy(true);
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {isPremium ? (
        <button onClick={() => act('revoke_premium')} disabled={busy}
          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
          Revoke premium
        </button>
      ) : (
        <button onClick={() => act('grant_premium')} disabled={busy}
          className="text-xs px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 disabled:opacity-40">
          Grant premium
        </button>
      )}
      {isBanned ? (
        <button onClick={() => act('unban')} disabled={busy}
          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
          Unban
        </button>
      ) : (
        <button onClick={() => act('ban')} disabled={busy}
          className="text-xs px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-40">
          Suspend
        </button>
      )}
      <button onClick={() => act('delete')} disabled={busy}
        className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40">
        Delete
      </button>
    </div>
  );
}
