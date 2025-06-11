import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
    serverExternalPackages: ["pino", "pino-pretty"],
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "img.freepik.com",
                port: ""
            },
            {
                protocol: "https",
                hostname: "static.vecteezy.com",
                port: ""
            },
        ]
    }
};

export default nextConfig;
