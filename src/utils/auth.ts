import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from "axios";
import { NextRouter } from 'next/router'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const handleUnauthorized = (router: NextRouter): void => { // Updated type
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem('welcomeShown');
    router.push("/auth/login");
};

export const setupAxiosInterceptor = (router: NextRouter): AxiosInstance => {
    const axiosInstance = axios.create({
        baseURL: BASE_URL,
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Request interceptor
    axiosInstance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error: AxiosError) => {
            return Promise.reject(error);
        }
    );

    // Response interceptor
    axiosInstance.interceptors.response.use(
        (response: AxiosResponse) => response,
        (error: AxiosError) => {
            if (error.response?.status === 401) {
                handleUnauthorized(router);
            } else if (error.response?.status === 403) {
                // Handle forbidden
                router.push("/unauthorized");
            } else if (error.response?.status === 404) {
                // Handle not found
                router.push("/not-found");
            } else if (error.response?.status === 500) {
                // Handle server error
                console.error('Server error:', error);
            }
            return Promise.reject(error);
        }
    );

    return axiosInstance;
};

// Helper functions for auth state management
export const isAuthenticated = (): boolean => {
    const token = localStorage.getItem('token');
    return !!token;
};

export const getAuthToken = (): string | null => {
    return localStorage.getItem('token');
};

export const setAuthToken = (token: string): void => {
    localStorage.setItem('token', token);
};

export const getCurrentUser = (): unknown | null => {
    const userStr = localStorage.getItem('user');
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
    }
};

export const setCurrentUser = (user: unknown): void => {
    localStorage.setItem('user', JSON.stringify(user));
};

// Example usage for API calls
export const authAPI = {
    login: async (credentials: { email: string; password: string }) => {
        const instance = axios.create({ baseURL: BASE_URL });
        return instance.post('/auth/login', credentials);
    },
    
    logout: async () => {
        const instance = axios.create({
            baseURL: BASE_URL,
            headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        return instance.post('/auth/logout');
    },

    refreshToken: async () => {
        const instance = axios.create({
            baseURL: BASE_URL,
            headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        return instance.post('/auth/refresh');
    }
};