'use client';

import { User } from '@/lib/db/schema';
import { createContext, ReactNode, Suspense, useContext } from 'react';

type UserContextType = {
  user: User | null;
};

const UserContext = createContext<UserContextType | null>(null);

export function useUser(): UserContextType {
  let context = useContext(UserContext);
  if (context === null) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

function UserProviderInner({
  user,
  children
}: {
  user: User | null;
  children: ReactNode;
}) {
  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
}

export function UserProvider({
  children,
  userPromise
}: {
  children: ReactNode;
  userPromise: Promise<User | null>;
}) {
  return (
    <Suspense>
      <AsyncUserProvider userPromise={userPromise}>
        {children}
      </AsyncUserProvider>
    </Suspense>
  );
}

async function AsyncUserProvider({
  children,
  userPromise
}: {
  children: ReactNode;
  userPromise: Promise<User | null>;
}) {
  const user = await userPromise;
  
  return (
    <UserProviderInner user={user}>
      {children}
    </UserProviderInner>
  );
}
