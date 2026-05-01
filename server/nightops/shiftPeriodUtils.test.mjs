import { describe, expect, it } from "vitest";
import {
  filterItemsByPeriod,
  overlapsPeriod,
  resolveShiftPeriod,
} from "./shiftPeriodUtils.mjs";

describe("shiftPeriodUtils", () => {
  const period = {
    start: "2026-05-01T19:00:00-03:00",
    end: "2026-05-02T07:00:00-03:00",
  };

  it("alarme comecou e terminou antes do plantao nao entra", () => {
    expect(
      overlapsPeriod(
        "2026-05-01T10:00:00-03:00",
        "2026-05-01T12:00:00-03:00",
        period.start,
        period.end,
      ),
    ).toBe(false);
  });

  it("alarme comecou dentro do plantao entra", () => {
    expect(
      overlapsPeriod(
        "2026-05-01T20:00:00-03:00",
        null,
        period.start,
        period.end,
      ),
    ).toBe(true);
  });

  it("alarme comecou antes e terminou dentro do plantao entra", () => {
    expect(
      overlapsPeriod(
        "2026-05-01T18:00:00-03:00",
        "2026-05-01T21:00:00-03:00",
        period.start,
        period.end,
      ),
    ).toBe(true);
  });

  it("alarme comecou antes e continua ativo entra", () => {
    expect(
      overlapsPeriod(
        "2026-05-01T12:00:00-03:00",
        undefined,
        period.start,
        period.end,
      ),
    ).toBe(true);
  });

  it("alarme comecou depois do fim do plantao nao entra", () => {
    expect(
      overlapsPeriod(
        "2026-05-02T08:00:00-03:00",
        undefined,
        period.start,
        period.end,
      ),
    ).toBe(false);
  });

  it("relatorio noturno calcula 19:00 ate 07:00 corretamente", () => {
    const resolved = resolveShiftPeriod(
      { mode: "previous_night" },
      {
        now: "2026-05-01T20:00:00-03:00",
      },
    );

    expect(resolved.start).toBe("2026-04-30T19:00:00-03:00");
    expect(resolved.end).toBe("2026-05-01T07:00:00-03:00");
  });

  it("relatorio diurno calcula 07:00 ate 19:00 corretamente", () => {
    const resolved = resolveShiftPeriod(
      { mode: "previous_day" },
      {
        now: "2026-05-01T20:00:00-03:00",
      },
    );

    expect(resolved.start).toBe("2026-05-01T07:00:00-03:00");
    expect(resolved.end).toBe("2026-05-01T19:00:00-03:00");
  });

  it("ultimo plantao completo as 08:00 deve ser 19:00 de ontem ate 07:00 de hoje", () => {
    const resolved = resolveShiftPeriod(
      {},
      {
        now: "2026-05-01T08:00:00-03:00",
      },
    );

    expect(resolved.start).toBe("2026-04-30T19:00:00-03:00");
    expect(resolved.end).toBe("2026-05-01T07:00:00-03:00");
  });

  it("ultimo plantao completo as 20:00 deve ser 07:00 de hoje ate 19:00 de hoje", () => {
    const resolved = resolveShiftPeriod(
      {},
      {
        now: "2026-05-01T20:00:00-03:00",
      },
    );

    expect(resolved.start).toBe("2026-05-01T07:00:00-03:00");
    expect(resolved.end).toBe("2026-05-01T19:00:00-03:00");
  });

  it("filterItemsByPeriod nao inclui ocorrencias fora do periodo", () => {
    const items = filterItemsByPeriod(
      [
        { id: "in", startedAt: "2026-05-01T20:00:00-03:00", endedAt: null },
        { id: "out", startedAt: "2026-05-01T10:00:00-03:00", endedAt: "2026-05-01T11:00:00-03:00" },
      ],
      period,
    );

    expect(items.map((item) => item.id)).toEqual(["in"]);
  });
});
