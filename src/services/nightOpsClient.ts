import type { NightOpsShiftReport, NightOpsStatus } from "../types";

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
