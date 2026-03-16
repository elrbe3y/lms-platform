/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // هيخلي الـ Build يكمل حتى لو فيه أخطاء Type
    ignoreBuildErrors: true,
  },
  eslint: {
    // هيخلي الـ Build يكمل حتى لو فيه أخطاء Linting
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;