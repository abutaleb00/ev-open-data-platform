import axios from 'axios';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
    headers: {
        'Content-Type': 'application/json'
    }
});

// 1. REQUEST INTERCEPTOR: Inject Authorization Tokens Dynamically
api.interceptors.request.use(
    (config) => {
        const token = Cookies.get('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 2. RESPONSE INTERCEPTOR: Catch Session Expirations (401) Globally
api.interceptors.response.use(
    (response) => {
        // Return standard successful data arrays directly
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Verify if the status code indicates an expired or invalid authorization context
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // 1. Purge client-side tracking state variables from cookies instantly
            Cookies.remove('token', { path: '/' });
            Cookies.remove('userRole', { path: '/' });

            // 2. Clear state properties down within the Zustand memory engine
            if (useAuthStore.getState().logout) {
                useAuthStore.getState().logout();
            }

            // 3. Prevent UI text leaks and instantly redirect the window to the login deck
            if (typeof window !== 'undefined') {
                window.location.href = '/login?expired=true';
            }
        }

        return Promise.reject(error);
    }
);

export default api;