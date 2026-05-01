import { resolveAIQuery } from "./aiQueryService";

import type { Issue } from "../types";

export interface AgentContextCounts {
  hosts: number;
  problems: number;
  events: number;
}

export interface AgentQueryResponse {
  answer: string;
  source: "groq-agent" | "openrouter-agent" | "local-parser";
  model?: string;
  contextCounts?: AgentContextCounts;
}

export interface ProblemAIAnalysis {
  summary: string;
  urgency: "immediate" | "soon" | "monitor";
  likelyCause: string;
  evidence: string[];
  recommendedActions: string[];
  whatsappMessage: string;
  source: "groq-agent" | "openrouter-agent" | "local-parser";
  model?: string;
}

const agentBaseUrl = import.meta.env.VITE_AI_AGENT_URL || "/ai-api";

export async function resolveOperationalQuery(query: string) {
  try {
    const response = await fetch(`${agentBaseUrl}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Agente indisponivel (${response.status}).`);
    }

    const data = (await response.json()) as AgentQueryResponse;

    return {
      answer: data.answer,
      source: data.source,
      model: data.model,
      contextCounts: data.contextCounts,
    };
  } catch {
    const fallbackAnswer = await resolveAIQuery(query);

    return {
      answer: `${fallbackAnswer}\n\nObs.: resposta gerada pelo parser local porque o agente nao respondeu.`,
      source: "local-parser" as const,
    };
  }
}

export async function analyzeProblemWithAgent(issue: Issue): Promise<ProblemAIAnalysis> {
  try {
    const response = await fetch(`${agentBaseUrl}/analyze-problem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ issue }),
    });

    if (!response.ok) {
      throw new Error(`Agente indisponivel (${response.status}).`);
    }

    return (await response.json()) as ProblemAIAnalysis;
  } catch {
    return {
      summary: `${issue.host}: ${issue.description}`,
      urgency: issue.severity === "Disaster" ? "immediate" : "soon",
      likelyCause:
        "Analise indisponivel pelo agente. Validar diretamente no Zabbix e no equipamento afetado.",
      evidence: [
        `Host: ${issue.host}`,
        `Severidade: ${issue.severity}`,
        `Horario: ${issue.time}`,
        `Status: ${issue.status}`,
      ],
      recommendedActions: [
        "Validar disponibilidade do host no Zabbix.",
        "Checar conectividade, energia e interface do equipamento.",
        "Registrar evolucao do incidente apos a primeira validacao.",
      ],
      whatsappMessage: `ALERTA ZABBIX\nSeveridade: ${issue.severity}\nHost: ${issue.host}\nProblema: ${issue.description}\nAcao: validar disponibilidade, conectividade e energia do equipamento.`,
      source: "local-parser",
    };
  }
}
