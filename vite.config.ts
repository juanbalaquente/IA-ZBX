import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_BASE_URL || "";
  const proxyConfig: Record<string, unknown> = {};

  function normalizeZabbixApiPath(rawPath: string) {
    if (rawPath.endsWith("/zabbix.php")) {
      return rawPath.replace(/\/zabbix\.php$/, "/api_jsonrpc.php");
    }
    return rawPath;
  }

  if (apiUrl) {
    try {
      const parsedUrl = new URL(apiUrl);
      const target = `${parsedUrl.protocol}//${parsedUrl.host}`;
      const apiPath = normalizeZabbixApiPath(parsedUrl.pathname);

      proxyConfig["/api"] = {
        target,
        changeOrigin: true,
        secure: false,
        rewrite: () => apiPath,
      };
    } catch (error) {
      delete proxyConfig["/api"];
    }
  }

  proxyConfig["/ai-api"] = {
    target: env.AI_AGENT_PROXY_TARGET || "http://localhost:8787",
    changeOrigin: true,
  };

  return {
    plugins: [react()],
    server: {
      port: 4173,
      proxy: Object.keys(proxyConfig).length > 0 ? proxyConfig : undefined,
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.ts", "server/**/*.test.mjs"],
    },
  };
});
