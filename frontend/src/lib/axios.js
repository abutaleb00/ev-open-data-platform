import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://evopen-api.maanrishfaxyz.xyz/api/v1', // Adjust port if needed
    headers: {
        'Content-Type': 'application/json'
    }
});

// Intercept every request BEFORE it leaves the frontend
api.interceptors.request.use(
    (config) => {
        // Grab the token from cookies (where Zustand saved it)
        const token = Cookies.get('token');

        // If the token exists, attach it as a Bearer token
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;