'use server';

import { NewUser } from '@/lib/db/schema';
import { compare, hash } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Ensure the AUTH_SECRET is properly defined
const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  console.error('AUTH_SECRET is not defined in environment variables');
  // In production, you might want to throw an error here
}

// Use the AUTH_SECRET only if it's available
const key = AUTH_SECRET ? new TextEncoder().encode(AUTH_SECRET) : new Uint8Array();
const SALT_ROUNDS = 10;

export async function hashPassword(password: string) {
  return hash(password, SALT_ROUNDS);
}

export async function comparePasswords(
  plainTextPassword: string,
  hashedPassword: string
) {
  return compare(plainTextPassword, hashedPassword);
}

type SessionData = {
  user: { 
    id: number | string;
    email: string;
  };
  expires: string;
};

export async function signToken(payload: SessionData) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(key);
}

export async function verifyToken(input: string) {
  try {
    if (!AUTH_SECRET) {
      throw new Error('AUTH_SECRET is not defined');
    }
    
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload as SessionData;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw error;
  }
}

export async function getSession() {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;
  return await verifyToken(session);
}

export async function setSession(user: NewUser) {
  const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session: SessionData = {
    user: { id: user.id!, email: user.email! },
    expires: expiresInOneDay.toISOString(),
  };
  const encryptedSession = await signToken(session);
  (await cookies()).set('session', encryptedSession, {
    expires: expiresInOneDay,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  });
}

export async function auth() {
  const session = await getSession();
  if (!session) {
    return null;
  }
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
    },
  };
}
