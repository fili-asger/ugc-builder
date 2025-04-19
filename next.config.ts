import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https", // Protocol for the image URL
        hostname: "via.placeholder.com", // The allowed hostname
        port: "", // You can specify a port if needed, leave empty for any
        pathname: "/**", // Allows any path under the hostname
      },
      {
        // Add pattern for OpenAI DALL-E images
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net", // Common hostname for DALL-E images
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
