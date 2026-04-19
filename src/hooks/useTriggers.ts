import { useCallback, useEffect, useState } from "react";
import { hasApiConfiguration } from "../services/api";
import { getTriggers } from "../services/zabbixService";
import type { TriggerItem } from "../types";
import { withRetry } from "../utils/retry";

interface TriggersState {
  triggers: TriggerItem[];
  loading: boolean;
  error?: string;
}

const initialTriggersState: TriggersState = {
  triggers: [],
  loading: true,
  error: undefined,
};

const unconfiguredMessage =
  "Zabbix nao configurado. Defina VITE_API_BASE_URL e credenciais validas.";

export function useTriggers() {
  const [state, setState] = useState<TriggersState>(initialTriggersState);

  const loadTriggers = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: undefined }));

    if (!hasApiConfiguration) {
      setState({
        triggers: [],
        loading: false,
        error: unconfiguredMessage,
      });
      return;
    }

    try {
      const triggers = await withRetry(() => getTriggers({ limit: 100 }), {
        retries: 1,
        delayMs: 1000,
      });

      setState({
        triggers,
        loading: false,
        error: undefined,
      });
    } catch (error) {
      setState({
        triggers: [],
        loading: false,
        error: (error as Error).message,
      });
    }
  }, []);

  useEffect(() => {
    loadTriggers();
  }, [loadTriggers]);

  return { ...state, retry: loadTriggers };
}
