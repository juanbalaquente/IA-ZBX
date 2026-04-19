import { useCallback, useEffect, useState } from "react";
import { hasApiConfiguration } from "../services/api";
import { getEvents } from "../services/zabbixService";
import type { EventItem } from "../types";
import { withRetry } from "../utils/retry";

interface EventsState {
  events: EventItem[];
  loading: boolean;
  error?: string;
}

const initialEventsState: EventsState = {
  events: [],
  loading: true,
  error: undefined,
};

const unconfiguredMessage =
  "Zabbix nao configurado. Defina VITE_API_BASE_URL e credenciais validas.";

export function useEvents() {
  const [state, setState] = useState<EventsState>(initialEventsState);

  const loadEvents = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: undefined }));

    if (!hasApiConfiguration) {
      setState({
        events: [],
        loading: false,
        error: unconfiguredMessage,
      });
      return;
    }

    try {
      const events = await withRetry(() => getEvents({ limit: 100 }), {
        retries: 1,
        delayMs: 1000,
      });

      setState({
        events,
        loading: false,
        error: undefined,
      });
    } catch (error) {
      setState({
        events: [],
        loading: false,
        error: (error as Error).message,
      });
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return { ...state, retry: loadEvents };
}
