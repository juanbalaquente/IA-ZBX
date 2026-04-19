import { useEffect, useState } from "react";
import { getHostCount, getProblemCount } from "../services/api";
import type { ApiStatus } from "./useApiStatus";
import { withRetry } from "../utils/retry";

export interface ZabbixMetrics {
  loading: boolean;
  hostCount: number | null;
  problemCount: number | null;
  error?: string;
}

const initialMetrics: ZabbixMetrics = {
  loading: false,
  hostCount: null,
  problemCount: null,
  error: undefined,
};

export function useZabbixMetrics(apiStatus: ApiStatus) {
  const [metrics, setMetrics] = useState<ZabbixMetrics>(initialMetrics);

  useEffect(() => {
    if (apiStatus.state !== "connected") {
      setMetrics(initialMetrics);
      return;
    }

    let canceled = false;
    setMetrics({ loading: true, hostCount: null, problemCount: null });

    (async () => {
      try {
        const [hostCount, problemCount] = await withRetry(
          () => Promise.all([getHostCount(), getProblemCount()]),
          { retries: 1, delayMs: 1000 },
        );

        if (!canceled) {
          setMetrics({ loading: false, hostCount, problemCount });
        }
      } catch (error) {
        if (!canceled) {
          setMetrics({
            loading: false,
            hostCount: null,
            problemCount: null,
            error: (error as Error).message,
          });
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, [apiStatus.state]);

  return metrics;
}
