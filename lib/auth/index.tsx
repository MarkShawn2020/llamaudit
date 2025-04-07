'use client';

import { User } from '@/lib/db/schema';
import { createContext, ReactNode, useContext, useState } from 'react';

type UserContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
};

// 创建一个带有默认值的Context
const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
});

export function useUser(): UserContextType {
  return useContext(UserContext);
}

export function UserProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}
