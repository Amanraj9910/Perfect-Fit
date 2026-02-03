import axios from "axios";

// Create an Axios instance
const api = axios.create({
    baseURL: "http://localhost:3001", // TODO: Use env var
    headers: {
        "Content-Type": "application/json",
    },
});

// Add a request interceptor to inject the token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("accessToken");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
