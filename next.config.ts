import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Старый адрес страницы смены пароля
    return [{ source: "/account", destination: "/profile", permanent: true }];
  },
  experimental: {
    // forbidden() → настоящий ответ 403 со страницей app/forbidden.tsx
    authInterrupts: true,
  },
};

export default nextConfig;
