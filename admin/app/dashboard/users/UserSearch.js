'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function UserSearch() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ]    = useState(searchParams.get('q') ?? '');

  function handleSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (q.trim()) params.set('q', q.trim()); else params.delete('q');
    router.push(`/dashboard/users?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search by email or user ID…"
        className="w-72 px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <button type="submit"
        className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700">
        Search
      </button>
    </form>
  );
}
