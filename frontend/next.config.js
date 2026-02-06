/** @type {import('next').NextConfig} */
// Debug logging at top level to ensure it runs
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
console.log("--- NEXT.CONFIG.JS LOADED ---");
console.log("Raw NEXT_PUBLIC_API_URL:", rawApiUrl);

// Helper to ensure URL has protocol
const getApiUrl = () => {
    if (!rawApiUrl) return 'http://localhost:8000';
    if (rawApiUrl.startsWith('http')) return rawApiUrl;
    return `https://${rawApiUrl}`;
};

const apiUrl = getApiUrl();
console.log("Resolved API URL for rewrites:", apiUrl);
console.log("-----------------------------");

const nextConfig = {
    output: 'standalone',
    async rewrites() {
        return [
            {
                source: '/backend/:path*',
                destination: `${apiUrl}/:path*`,
            },
        ]
    },
};

module.exports = nextConfig;
