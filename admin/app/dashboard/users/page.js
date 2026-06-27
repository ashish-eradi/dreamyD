import { getAdminClient } from '../../../lib/supabase';
import SectionHeader from '../../../components/SectionHeader';
import StatCard from '../../../components/StatCard';
import UserActions from './UserActions';
import UserSearch from './UserSearch';
import { format, differenceInDays } from 'date-fns';

async function fetchUsers(query) {
  const db = getAdminClient();

  // Get all auth users (for email + last_sign_in)
  const { data: { users: authUsers } } = await db.auth.admin.listUsers({ perPage: 500 });

  // Get profiles
  let profileQ = db.from('users').select('*');
  const { data: profiles } = await profileQ;

  // Get dream counts per user
  const { data: dreamCounts } = await db
    .from('dreams')
    .select('user_id')
    .then(res => {
      const counts = {};
      (res.data ?? []).forEach(d => { counts[d.user_id] = (counts[d.user_id] ?? 0) + 1; });
      return { data: counts };
    });

  // Get day-7 dreams per user (recorded exactly 7 days after join)
  const { data: allDreams } = await db.from('dreams').select('user_id, recorded_at');

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  let merged = (authUsers ?? []).map(au => {
    const profile  = profileMap[au.id] ?? {};
    const joinDate = new Date(au.created_at);

    // Day-7 retention: did they record on day 6–8 after joining?
    const userDreams = (allDreams ?? []).filter(d => d.user_id === au.id);
    const day7 = userDreams.some(d => {
      const diff = differenceInDays(new Date(d.recorded_at), joinDate);
      return diff >= 6 && diff <= 8;
    });

    return {
      id:         au.id,
      email:      au.email ?? '—',
      joinDate:   au.created_at,
      lastActive: au.last_sign_in_at,
      isPremium:  profile.is_premium ?? false,
      isBanned:   profile.is_banned  ?? false,
      planType:   profile.plan_type  ?? 'free',
      language:   profile.language   ?? '—',
      dreamCount: dreamCounts[au.id] ?? 0,
      day7,
    };
  });

  // Filter by search query
  if (query) {
    const q = query.toLowerCase();
    merged = merged.filter(u =>
      u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
    );
  }

  // Sort: newest first
  merged.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate));

  const totalUsers   = merged.length;
  const premiumUsers = merged.filter(u => u.isPremium).length;
  const bannedUsers  = merged.filter(u => u.isBanned).length;
  const day7Rate     = totalUsers > 0
    ? ((merged.filter(u => u.day7).length / totalUsers) * 100).toFixed(1)
    : '0.0';

  return { users: merged.slice(0, 100), totalUsers, premiumUsers, bannedUsers, day7Rate };
}

export default async function UsersPage({ searchParams }) {
  const query = searchParams?.q ?? '';
  const { users, totalUsers, premiumUsers, bannedUsers, day7Rate } = await fetchUsers(query);

  return (
    <div>
      <SectionHeader
        title="User Management"
        sub={`${totalUsers} total users`}
        action={<UserSearch />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total users"    value={totalUsers}                 color="default" />
        <StatCard label="Premium users"  value={premiumUsers}               color="purple"
          sub={`${totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : 0}% conversion`} />
        <StatCard label="Day-7 retention" value={`${day7Rate}%`}           color="green"
          sub="Recorded on day 7 after joining" />
        <StatCard label="Suspended"      value={bannedUsers}                color="red" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium">User</th>
              <th className="text-left px-5 py-3 font-medium">Plan</th>
              <th className="text-center px-4 py-3 font-medium">Dreams</th>
              <th className="text-center px-4 py-3 font-medium">Day-7</th>
              <th className="text-left px-5 py-3 font-medium">Last active</th>
              <th className="text-left px-5 py-3 font-medium">Joined</th>
              <th className="text-left px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50 ${u.isBanned ? 'opacity-50' : ''}`}>
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-800 text-sm">{u.email}</p>
                  <p className="text-xs text-gray-400 font-mono">{u.id.slice(0, 12)}…</p>
                </td>
                <td className="px-5 py-3">
                  <PlanBadge plan={u.planType} isPremium={u.isPremium} isBanned={u.isBanned} />
                </td>
                <td className="px-4 py-3 text-center font-semibold text-gray-700">{u.dreamCount}</td>
                <td className="px-4 py-3 text-center">
                  {u.day7
                    ? <span className="text-emerald-500 font-bold">✓</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3 text-xs text-gray-500">
                  {u.lastActive ? format(new Date(u.lastActive), 'dd MMM yyyy') : '—'}
                </td>
                <td className="px-5 py-3 text-xs text-gray-500">
                  {format(new Date(u.joinDate), 'dd MMM yyyy')}
                </td>
                <td className="px-5 py-3">
                  <UserActions userId={u.id} isPremium={u.isPremium} isBanned={u.isBanned} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlanBadge({ plan, isPremium, isBanned }) {
  if (isBanned) return <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">Suspended</span>;
  if (!isPremium) return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Free</span>;
  const colors = { monthly: 'bg-brand-50 text-brand-700', quarterly: 'bg-purple-50 text-purple-700', annual: 'bg-emerald-50 text-emerald-700', manual: 'bg-amber-50 text-amber-700' };
  const cls = colors[plan] ?? 'bg-brand-50 text-brand-700';
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{plan ?? 'premium'}</span>;
}
