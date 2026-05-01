import type {
  NightOpsHistoryItem,
  NightOpsShiftReport,
  NightOpsStatus,
  NightOpsStoredShiftReport,
} from "../types";

const agentBaseUrl = import.meta.env.VITE_AI_AGENT_URL || "/ai-api";

export async function getNightOpsStatus(): Promise<NightOpsStatus> {
  const response = await fetch(`${agentBaseUrl}/nightops/status`);
  if (!response.ok) {
    throw new Error(`NightOps indisponivel (${response.status}).`);
  }

  return (await response.json()) as NightOpsStatus;
}

export async function analyzeNightOps(): Promise<NightOpsStatus> {
  const response = await fetch(`${agentBaseUrl}/nightops/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Falha ao analisar NightOps (${response.status}).`);
  }

  return (await response.json()) as NightOpsStatus;
}

export async function generateShiftReport(
  params?: { start?: string; end?: string },
): Promise<NightOpsShiftReport> {
  const response = await fetch(`${agentBaseUrl}/nightops/shift-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params || {}),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Falha ao gerar relatorio (${response.status}).`);
  }

  return (await response.json()) as NightOpsShiftReport;
}

export async function getNightOpsHistory(
  filters?: Record<string, string | boolean | undefined>,
): Promise<{ status: "ok"; items: NightOpsHistoryItem[]; count: number }> {
  const searchParams = new URLSearchParams();

  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const response = await fetch(
    `${agentBaseUrl}/nightops/history${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
  );

  if (!response.ok) {
    throw new Error(`Historico NightOps indisponivel (${response.status}).`);
  }

  return (await response.json()) as {
    status: "ok";
    items: NightOpsHistoryItem[];
    count: number;
  };
}

export async function getShiftReports(): Promise<{
  status: "ok";
  items: NightOpsStoredShiftReport[];
  count: number;
}> {
  const response = await fetch(`${agentBaseUrl}/nightops/reports`);
  if (!response.ok) {
    throw new Error(`Relatorios NightOps indisponiveis (${response.status}).`);
  }

  return (await response.json()) as {
    status: "ok";
    items: NightOpsStoredShiftReport[];
    count: number;
  };
}

export async function getLatestShiftReport(): Promise<NightOpsStoredShiftReport | null> {
  const response = await fetch(`${agentBaseUrl}/nightops/reports/latest`);
  if (!response.ok) {
    throw new Error(`Ultimo relatorio NightOps indisponivel (${response.status}).`);
  }

  return (await response.json()) as NightOpsStoredShiftReport | null;
}
