import { useCallback, useEffect, useState } from "react";
import { createDashboardStats } from "../adapters/zabbixAdapter";
import { hasApiConfiguration } from "../services/api";
import {
  getEvents,
  getHostsDetailed,
  getProblemsDetailed,
} from "../services/zabbixService";
import type { EventItem, Issue, StatMetric } from "../types";
import { withRetry } from "../utils/retry";

interface DashboardState {
  loading: boolean;
  error?: string;
  stats: StatMetric[];
  issues: Issue[];
  events: EventItem[];
}

const initialState: DashboardState = {
  loading: true,
  error: undefined,
  stats: [],
  issues: [],
  events: [],
};

const unconfiguredMessage =
  "Zabbix nao configurado. Defina VITE_API_BASE_URL e credenciais validas.";

export function useDashboardData() {
  const [state, setState] = useState<DashboardState>(initialState);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: undefined }));

    if (!hasApiConfiguration) {
      setState({
        loading: false,
        error: unconfiguredMessage,
        stats: [],
        issues: [],
        events: [],
      });
      return;
    }

    try {
      const [hosts, issues, events] = await withRetry(
        () =>
          Promise.all([
            getHostsDetailed(),
            getProblemsDetailed(),
            getEvents(),
          ]),
        { retries: 1, delayMs: 1000 },
      );

      const stats = createDashboardStats(hosts, issues, events);

      setState({ loading: false, error: undefined, stats, issues, events });
    } catch (error) {
      setState({
        loading: false,
        error: (error as Error).message,
        stats: [],
        issues: [],
        events: [],
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
