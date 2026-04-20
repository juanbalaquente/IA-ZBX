import { resolveAIQuery } from "./aiQueryService";

interface AgentQueryResponse {
  answer: string;
  source: "groq-agent" | "local-parser";
  model?: string;
  contextCounts?: {
    hosts: number;
    problems: number;
    events: number;
  };
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
