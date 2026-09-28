import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // forbidden() → настоящий ответ 403 со страницей app/forbidden.tsx
    authInterrupts: true,
  },
};

export default nextConfig;
