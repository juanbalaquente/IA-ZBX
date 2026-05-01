import { describe, expect, it } from "vitest";
import {
  formatHumanDuration,
  generateShiftReport,
} from "./shiftReportService.mjs";

function buildIncident(overrides = {}) {
  return {
    id: "INC-1",
    title: "OLT TAQUARAS OFFLINE",
    severity: "critical",
    status: "active",
    startedAt: "2026-04-20T13:00:00-03:00",
    durationMinutes: 75,
    affectedHosts: ["OLT-1", "CLIENTE-1"],
    affectedGroups: ["10031-SPEEDNET"],
    problemIds: ["p1", "p2", "p3"],
    eventIds: ["e1"],
    probableCause: "Queda temporaria de energia ou transporte.",
    impact: "Clientes vinculados sem comunicacao.",
    evidence: ["Sem comunicacao com a OLT", "Multiplos hosts afetados"],
    recommendedActions: ["Validar energia e transporte da OLT."],
    escalation: { required: true, reason: "Evento massivo", target: "Engenharia" },
    customerMessage: "",
    internalMessage: "",
    confidence: 0.8,
    ...overrides,
  };
}

describe("shiftReportService", () => {
  it("gera plainTextReport", () => {
    const report = generateShiftReport({
      start: "2026-04-20T19:00:00-03:00",
      end: "2026-04-21T07:00:00-03:00",
      incidents: [buildIncident()],
    });

    expect(report.plainTextReport).toContain("RELATORIO NOC NOTURNO");
    expect(report.plainTextReport).toContain("PASSAGEM DE TURNO:");
  });

  it("inclui titulo com data", () => {
    const report = generateShiftReport({
      start: "2026-04-20T19:00:00-03:00",
      end: "2026-04-21T07:00:00-03:00",
      incidents: [],
    });

    expect(report.title).toBe("RELATORIO NOC NOTURNO - 20/04/2026");
  });

  it("inclui periodo no relatorio", () => {
    const report = generateShiftReport({
      start: "2026-04-20T19:00:00-03:00",
      end: "2026-04-21T07:00:00-03:00",
      incidents: [buildIncident()],
    });

    expect(report.plainTextReport).toContain("PERIODO: 19:00 AS 07:00");
  });

  it("lista ocorrencias relevantes", () => {
    const report = generateShiftReport({
      start: "2026-04-20T19:00:00-03:00",
      end: "2026-04-21T07:00:00-03:00",
      incidents: [
        buildIncident(),
        buildIncident({
          id: "INC-2",
          title: "CIRCUITO ABILIO <> AGUAS_MARINHAS OFFLINE",
          durationMinutes: 600,
        }),
      ],
    });

    expect(report.relevantOccurrences).toHaveLength(2);
    expect(report.plainTextReport).toContain("OCORRENCIAS RELEVANTES:");
  });

  it("limita ocorrencias relevantes para nao gerar relatorio gigante", () => {
    const incidents = Array.from({ length: 20 }, (_, index) =>
      buildIncident({
        id: `INC-${index}`,
        title: `INCIDENTE ${index}`,
        problemIds: [`p-${index}`],
      }),
    );

    const report = generateShiftReport({
      start: "2026-04-20T19:00:00-03:00",
      end: "2026-04-21T07:00:00-03:00",
      incidents,
    });

    expect(report.relevantOccurrences).toHaveLength(10);
  });

  it("formata duracao em minutos e horas", () => {
    expect(formatHumanDuration(15)).toBe("15 minutos");
    expect(formatHumanDuration(70)).toBe("1 hora e 10 minutos");
    expect(formatHumanDuration(1560)).toBe("1 dia e 2 horas");
  });

  it("gera observacao quando total e alto por causa de ocorrencia massiva", () => {
    const incidents = [
      buildIncident({
        title: "OLT TAQUARAS OFFLINE",
        affectedHosts: new Array(15).fill("HOST"),
        problemIds: Array.from({ length: 100 }, (_, index) => `p-${index}`),
      }),
    ];

    const report = generateShiftReport({
      start: "2026-04-20T19:00:00-03:00",
      end: "2026-04-21T07:00:00-03:00",
      incidents,
    });

    expect(report.summary).toContain("volume alto");
    expect(report.plainTextReport).toContain("OBSERVACAO:");
  });

  it("nao quebra quando nao ha incidentes", () => {
    const report = generateShiftReport({
      start: "2026-04-20T19:00:00-03:00",
      end: "2026-04-21T07:00:00-03:00",
      incidents: [],
    });

    expect(report.relevantOccurrences).toEqual([]);
    expect(report.handoverText).toContain("nao houve ocorrencias relevantes");
  });

  it("nao inclui Shadow Mode no relatorio", () => {
    const report = generateShiftReport({
      start: "2026-04-20T19:00:00-03:00",
      end: "2026-04-21T07:00:00-03:00",
      incidents: [buildIncident()],
    });

    expect(report.plainTextReport.toLowerCase()).not.toContain("shadow");
  });

  it("mantem handoverText", () => {
    const report = generateShiftReport({
      start: "2026-04-20T19:00:00-03:00",
      end: "2026-04-21T07:00:00-03:00",
      incidents: [buildIncident()],
    });

    expect(report.handoverText).toContain("Bom dia");
  });
});
