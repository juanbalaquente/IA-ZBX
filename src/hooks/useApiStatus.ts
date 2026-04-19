import { useEffect, useState } from "react";
import {
  apiConfig,
  hasApiConfiguration,
  testApiConnection,
  type ApiConnectionResult,
} from "../services/api";

export type ApiStatusState =
  | "mock"
  | "checking"
  | "connected"
  | "error"
  | "unconfigured";

export interface ApiStatus {
  state: ApiStatusState;
  message: string;
  details?: string;
  baseUrl: string;
}

export function useApiStatus() {
  const [status, setStatus] = useState<ApiStatus>(
    hasApiConfiguration
      ? {
          state: "checking",
          message: "Verificando conexao com o endpoint...",
          baseUrl: apiConfig.normalizedBaseUrl,
        }
      : {
          state: "unconfigured",
          message:
            "Zabbix nao configurado. Defina VITE_API_BASE_URL e credenciais validas.",
          baseUrl: apiConfig.normalizedBaseUrl || "Nao configurado",
        },
  );

  useEffect(() => {
    if (!hasApiConfiguration || !apiConfig.baseUrl) {
      return;
    }

    let canceled = false;

    (async () => {
      setStatus({
        state: "checking",
        message: "Verificando conexao com o endpoint...",
        baseUrl: apiConfig.normalizedBaseUrl,
      });

      const result: ApiConnectionResult = await testApiConnection();
      if (canceled) return;

      if (result.success) {
        setStatus({
          state: "connected",
          message: "Endpoint configurado e acessivel.",
          details: result.details,
          baseUrl: apiConfig.normalizedBaseUrl,
        });
      } else {
        setStatus({
          state: "error",
          message: result.status,
          details: result.details,
          baseUrl: apiConfig.normalizedBaseUrl,
        });
      }
    })();

    return () => {
      canceled = true;
    };
  }, []);

  return status;
}
