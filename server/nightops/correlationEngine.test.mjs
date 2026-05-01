import { describe, expect, it } from "vitest";
import { correlateIncidents } from "./correlationEngine.mjs";

function createIncident(id, host, startedAt, overrides = {}) {
  return {
    id,
    title: "Falha POP acesso",
    severity: "high",
    sourceSeverity: "High",
    status: "active",
    startedAt,
    durationMinutes: 15,
    affectedHosts: [host],
    affectedGroups: ["POP-CENTRO"],
    problemIds: [`p-${id}`],
    eventIds: [`e-${id}`],
    probableCause: "Falha de acesso",
    impact: "Impacto regional",
    evidence: [],
    recommendedActions: [],
    escalation: {
      required: false,
      reason: "Sem criterios deterministas de escalonamento.",
      target: "NOC",
    },
    confidence: 0.6,
    ...overrides,
  };
}

describe("correlateIncidents", () => {
  it("correlaciona varios hosts do mesmo grupo em uma unica ocorrencia", () => {
    const incidents = Array.from({ length: 6 }, (_, index) =>
      createIncident(
        `i${index}`,
        `POP-CENTRO-${index}`,
        `2026-04-30T19:0${index}:00.000Z`,
      )
    );

    const result = correlateIncidents(incidents, {
      correlationWindowMinutes: 10,
      rules: { minDurationMinutes: 5 },
    });

    expect(result).toHaveLength(1);
    expect(result[0].classification).toBe("correlated-outage");
    expect(result[0].affectedHosts).toHaveLength(6);
    expect(result[0].escalation.required).toBe(true);
  });
});
