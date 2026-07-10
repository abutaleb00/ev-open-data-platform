import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';

export const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            token: Cookies.get('token') || null,

            login: (userData, token) => {
                // Save to cookies for Next.js Middleware (Route Protection)
                Cookies.set('token', token, { expires: 1 });
                Cookies.set('userRole', userData.role, { expires: 1 });

                // Save to state
                set({ user: userData, token });
            },

            logout: () => {
                Cookies.remove('token');
                Cookies.remove('userRole');
                set({ user: null, token: null });
            }
        }),
        {
            name: 'ev-auth-storage', // This saves the user state to localStorage
        }
    )
);