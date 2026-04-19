import { useCallback, useEffect, useState } from "react";
import { hasApiConfiguration } from "../services/api";
import { getProblemsDetailed } from "../services/zabbixService";
import type { Issue } from "../types";
import { withRetry } from "../utils/retry";

interface ProblemsState {
  issues: Issue[];
  loading: boolean;
  error?: string;
}

const initialProblemsState: ProblemsState = {
  issues: [],
  loading: true,
  error: undefined,
};

const unconfiguredMessage =
  "Zabbix nao configurado. Defina VITE_API_BASE_URL e credenciais validas.";

export function useProblems() {
  const [state, setState] = useState<ProblemsState>(initialProblemsState);

  const loadProblems = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: undefined }));

    if (!hasApiConfiguration) {
      setState({
        issues: [],
        loading: false,
        error: unconfiguredMessage,
      });
      return;
    }

    try {
      const issues = await withRetry(
        () => getProblemsDetailed({ limit: 100 }),
        {
          retries: 1,
          delayMs: 1000,
        },
      );

      setState({
        issues,
        loading: false,
        error: undefined,
      });
    } catch (error) {
      setState({
        issues: [],
        loading: false,
        error: (error as Error).message,
      });
    }
  }, []);

  useEffect(() => {
    loadProblems();
  }, [loadProblems]);

  return { ...state, retry: loadProblems };
}
