import { NextResponse } from 'next/server';
import { getAdminClient } from '../../../lib/supabase';

// PATCH /api/users — grant/revoke premium, ban, delete
export async function PATCH(request) {
  const db = getAdminClient();
  const { userId, action } = await request.json();
  if (!userId || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  switch (action) {
    case 'grant_premium':
      await db.from('users').update({ is_premium: true, plan_type: 'manual' }).eq('id', userId);
      break;
    case 'revoke_premium':
      await db.from('users').update({ is_premium: false, plan_type: 'free' }).eq('id', userId);
      break;
    case 'ban':
      await db.from('users').update({ is_banned: true }).eq('id', userId);
      await db.auth.admin.updateUserById(userId, { ban_duration: '876600h' }); // ~100 years
      break;
    case 'unban':
      await db.from('users').update({ is_banned: false }).eq('id', userId);
      await db.auth.admin.updateUserById(userId, { ban_duration: 'none' });
      break;
    case 'delete':
      await db.from('users').delete().eq('id', userId);
      await db.auth.admin.deleteUser(userId);
      break;
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
