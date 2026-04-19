import { useCallback, useEffect, useState } from "react";
import { hasApiConfiguration } from "../services/api";
import { getHostsDetailed } from "../services/zabbixService";
import type { HostItem } from "../types";
import { withRetry } from "../utils/retry";

interface HostsState {
  hosts: HostItem[];
  loading: boolean;
  error?: string;
}

const initialHostState: HostsState = {
  hosts: [],
  loading: true,
  error: undefined,
};

const unconfiguredMessage =
  "Zabbix nao configurado. Defina VITE_API_BASE_URL e credenciais validas.";

export function useHosts() {
  const [state, setState] = useState<HostsState>(initialHostState);

  const loadHosts = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: undefined }));

    if (!hasApiConfiguration) {
      setState({ hosts: [], loading: false, error: unconfiguredMessage });
      return;
    }

    try {
      const hosts = await withRetry(() => getHostsDetailed(), {
        retries: 1,
        delayMs: 1000,
      });
      setState({ hosts, loading: false, error: undefined });
    } catch (error) {
      setState({ hosts: [], loading: false, error: (error as Error).message });
    }
  }, []);

  useEffect(() => {
    loadHosts();
  }, [loadHosts]);

  return { ...state, retry: loadHosts };
}
