'use client';

import { useState, useCallback } from 'react';
import type { User } from '@/lib/types';
import { currentStudent, currentTeacher, users } from '@/lib/mock-data';

type AuthUser = User | null;

/**
 * Simulated authentication hook.
 * Provides login/logout with mock users and role-based routing.
 */
export function useMockAuth() {
  const [user, setUser] = useState<AuthUser>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(
    async (email: string, _password: string): Promise<{ success: boolean; redirectTo: string }> => {
      setIsLoading(true);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const foundUser = users.find((u) => u.email === email);

      if (foundUser) {
        setUser(foundUser);
        setIsLoading(false);
        const redirectTo = foundUser.role === 'teacher' ? '/teacher' : '/student';
        return { success: true, redirectTo };
      }

      setIsLoading(false);
      return { success: false, redirectTo: '/login' };
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const loginAsStudent = useCallback(() => {
    setUser(currentStudent);
  }, []);

  const loginAsTeacher = useCallback(() => {
    setUser(currentTeacher);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
    isStudent: user?.role === 'student',
    isTeacher: user?.role === 'teacher',
    login,
    logout,
    loginAsStudent,
    loginAsTeacher,
  };
}
