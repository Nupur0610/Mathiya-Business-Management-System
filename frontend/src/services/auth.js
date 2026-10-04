import axios from "axios";
import api from "./api";

const KEY = "mathiya_token";

export const getToken = () => localStorage.getItem(KEY);
export const setToken = (token) => localStorage.setItem(KEY, token);
export const clearToken = () => localStorage.removeItem(KEY);

export const logout = () => {
  clearToken();
  window.dispatchEvent(new Event("auth-expired"));
};

// Attach the login token to every request (works for both the shared `api`
// instance and pages that use plain `axios`), and log out if the server
// says the token is no longer valid.
export function setupAuthInterceptors() {
  [axios, api].forEach((client) => {
    client.interceptors.request.use((config) => {
      const token = getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    client.interceptors.response.use(
      (response) => response,
      (error) => {
        const url = error.config?.url || "";
        if (error.response?.status === 401 && !url.includes("/auth/login")) {
          logout();
        }
        return Promise.reject(error);
      }
    );
  });
}
