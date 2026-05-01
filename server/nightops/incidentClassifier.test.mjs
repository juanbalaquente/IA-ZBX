import { describe, expect, it } from "vitest";
import { classifyProblem } from "./incidentClassifier.mjs";

describe("classifyProblem", () => {
  it("aplica boost de prioridade para OLT/POP/BGP", () => {
    const result = classifyProblem(
      {
        id: "p1",
        eventid: "e1",
        triggerid: "t1",
        title: "OLT POP Centro sem comunicacao",
        severity: "High",
        startedAtTs: Date.parse("2026-04-30T19:00:00.000Z"),
        host: "OLT-CENTRO-01",
        groups: ["POP-CENTRO"],
        triggerDescription: "OLT principal",
        acknowledged: false,
      },
      {
        nowTs: Date.parse("2026-04-30T19:10:00.000Z"),
        rules: { minDurationMinutes: 5 },
      },
    );

    expect(result.severity).toBe("critical");
    expect(result.affectedHosts).toContain("OLT-CENTRO-01");
  });
});
