"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/lib/db/schema";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser } from "@/app/(login)/actions";

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState<boolean>(!initialUser);
  const pathname = usePathname();
  
  // Listen for route changes to refresh user state after login/logout
  useEffect(() => {
    // We'll focus on monitoring navigation changes to detect sign-in
    // This helps refresh the UserMenu component after login
    if (pathname === '/projects' || pathname === '/') {
      // These are the routes that users are redirected to after login/logout
      setIsLoading(true);
      
      // Fetch the latest user data from the server
      const fetchCurrentUser = async () => {
        try {
          const latestUser = await getCurrentUser();
          if (latestUser) {
            setUser(latestUser);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchCurrentUser();
    }
  }, [pathname]);

  return (
    <UserContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}