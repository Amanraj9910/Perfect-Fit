/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    async rewrites() {
        console.log("D E B U G: NEXT_PUBLIC_API_URL is:", process.env.NEXT_PUBLIC_API_URL);
        return [
            {
                source: '/backend/:path*',
                destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/:path*`,
            },
        ]
    },
};

module.exports = nextConfig;
