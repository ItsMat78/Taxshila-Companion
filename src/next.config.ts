

require('dotenv').config();
import type {NextConfig} from 'next';
import path from 'path';
import {
  WebpackInjectPlugin,
} from 'webpack-inject-plugin';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
        config.plugins.push(
            new WebpackInjectPlugin({
                "self.FIREBASE_API_KEY": `"${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}"`,
                "self.FIREBASE_AUTH_DOMAIN": `"${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}"`,
                "self.FIREBASE_PROJECT_ID": `"${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}"`,
                "self.FIREBASE_STORAGE_BUCKET": `"${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com"`,
                "self.FIREBASE_MESSAGING_SENDER_ID": `"${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}"`,
                "self.FIREBASE_APP_ID": `"${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}"`,
                "self.FIREBASE_MEASUREMENT_ID": `"${process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}"`,
            },
            {
                entry: [path.resolve(__dirname, "public", "firebase-messaging-sw.js")],
            })
        )
    }
    return config
  },
  // Allow cross-origin requests from the Firebase Studio preview environment
  // for a smoother development experience.
  experimental: {
    allowedDevOrigins: [
      'https://*.cloudworkstations.dev',
      'https://*.firebase.studio',
      'https://9000-firebase-studio-1749053355191.cluster-iktsryn7xnhpexlu6255bftka4.cloudworkstations.dev',
    ],
  },
};

export default nextConfig;
