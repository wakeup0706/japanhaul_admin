import React from 'react';
import { useRouter } from 'next/navigation';
import { auth } from './firebase';
import { User } from 'firebase/auth';

/**
 * Check if user is currently authenticated
 * @returns Promise<boolean> - true if user is authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(!!user);
    });
  });
}

/**
 * Get current authenticated user
 * @returns Promise<User | null> - current user or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Check authentication and redirect if not authenticated
 * @param redirectTo - URL to redirect to if not authenticated
 * @returns Promise<{authenticated: boolean, user: User | null}>
 */
export async function checkAuthAndRedirect(redirectTo = '/login'): Promise<{authenticated: boolean; user: User | null}> {
  const user = await getCurrentUser();

  if (!user) {
    // In a client-side context, we can't directly redirect
    // This should be handled by the component using this function
    return { authenticated: false, user: null };
  }

  return { authenticated: true, user };
}

/**
 * Higher-order function for protecting pages that require authentication
 */
export function withAuthProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AuthProtectedComponent(props: P) {
    const [isLoading, setIsLoading] = React.useState(true);
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const router = useRouter();

    React.useEffect(() => {
      const checkAuth = async () => {
        const authResult = await checkAuthAndRedirect();

        if (!authResult.authenticated) {
          router.push('/login?message=Please login to access checkout');
          return;
        }

        setIsAuthenticated(true);
        setIsLoading(false);
      };

      checkAuth();
    }, [router]);

    if (isLoading) {
      return React.createElement(
        'div',
        { className: 'min-h-screen flex items-center justify-center' },
        React.createElement(
          'div',
          { className: 'text-center' },
          React.createElement('div', {
            className: 'animate-spin inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mb-4'
          }),
          React.createElement('p', { className: 'text-gray-600' }, 'Checking authentication...')
        )
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return React.createElement(WrappedComponent, props);
  };
}
