'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SESSION_COOKIE = 'admin_session';
const SESSION_VALUE  = 'authenticated';

export async function checkAuth() {
  const cookieStore = cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (session?.value !== SESSION_VALUE) {
    redirect('/login');
  }
}

export async function login(password) {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Invalid password' };
  }
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return { ok: true };
}

export async function logout() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}
