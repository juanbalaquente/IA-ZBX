import { describe, expect, it } from "vitest";
import { generateShiftReport } from "./shiftReportService.mjs";

describe("generateShiftReport", () => {
  it("monta relatorio com resumo e handover", () => {
    const report = generateShiftReport({
      start: "2026-04-30T19:00:00-03:00",
      end: "2026-05-01T07:00:00-03:00",
      incidents: [
        {
          id: "INC-1",
          severity: "critical",
          status: "active",
          problemIds: ["p1", "p2"],
          escalation: { required: true, reason: "Critico", target: "Supervisor" },
        },
      ],
    });

    expect(report.title).toBe("Relatorio NOC Noturno");
    expect(report.numbers.totalProblems).toBe(2);
    expect(report.handoverText).toContain("Passagem de turno");
  });
});
