import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getApiRuntimeSummary,
  getEventCount,
  getHostCount,
  getProblemCount,
  getZabbixVersion,
  type ApiRuntimeSummary,
} from "../services/api";
import type { ApiStatus } from "./useApiStatus";
import { withRetry } from "../utils/retry";

interface LiveDiagnostics {
  version: string;
  hostCount: number;
  problemCount: number;
  eventCount: number;
}

interface SettingsDiagnosticsState {
  loading: boolean;
  error?: string;
  lastUpdated?: string;
  data?: LiveDiagnostics;
}

const initialState: SettingsDiagnosticsState = {
  loading: false,
  error: undefined,
  lastUpdated: undefined,
  data: undefined,
};

function formatRefreshTimestamp(date: Date) {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function useSettingsDiagnostics(apiStatus: ApiStatus) {
  const runtime = useMemo<ApiRuntimeSummary>(() => getApiRuntimeSummary(), []);
  const [state, setState] = useState<SettingsDiagnosticsState>(initialState);

  const refresh = useCallback(async () => {
    if (apiStatus.state !== "connected") {
      setState(initialState);
      return;
    }

    setState((current) => ({
      ...current,
      loading: true,
      error: undefined,
    }));

    try {
      const [version, hostCount, problemCount, eventCount] = await withRetry(
        () =>
          Promise.all([
            getZabbixVersion(),
            getHostCount(),
            getProblemCount(),
            getEventCount(),
          ]),
        { retries: 1, delayMs: 1000 },
      );

      setState({
        loading: false,
        error: undefined,
        lastUpdated: formatRefreshTimestamp(new Date()),
        data: {
          version,
          hostCount,
          problemCount,
          eventCount,
        },
      });
    } catch (error) {
      setState({
        loading: false,
        error: (error as Error).message,
        lastUpdated: undefined,
        data: undefined,
      });
    }
  }, [apiStatus.state]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    runtime,
    ...state,
    refresh,
  };
}
