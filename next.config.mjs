/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mysql2', 'bcryptjs', '@deepgram/sdk', 'openai', 'nodemailer'],
  },
  eslint: { ignoreDuringBuilds: false },
}

export default nextConfig
