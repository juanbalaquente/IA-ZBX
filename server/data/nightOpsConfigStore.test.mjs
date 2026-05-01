import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createNightOpsConfigStore,
  validateNightOpsConfig,
} from "./nightOpsConfigStore.mjs";

const defaults = {
  defaultStartHour: 19,
  defaultEndHour: 7,
  timezone: "America/Sao_Paulo",
  minDurationMinutes: 5,
  correlationWindowMinutes: 10,
  sameGroupAffectedHostsThreshold: 5,
  criticalKeywords: ["OLT", "POP", "BGP", "BACKBONE", "CORE", "TRANSPORTE", "ENLACE"],
  autoEscalationEnabled: false,
};

function createTempFilePath(name) {
  const dir = join(
    tmpdir(),
    `nightops-config-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  mkdirSync(dir, { recursive: true });
  return {
    dir,
    filePath: join(dir, name),
  };
}

describe("nightOpsConfigStore", () => {
  let tempDir = "";

  beforeEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("carrega configuracao default", () => {
    const { dir, filePath } = createTempFilePath("nightops-config.json");
    tempDir = dir;
    const store = createNightOpsConfigStore({ filePath, defaults });

    expect(existsSync(filePath)).toBe(true);
    expect(store.getConfig().defaultStartHour).toBe(19);
    expect(store.getConfig().autoEscalationEnabled).toBe(false);
  });

  it("salva configuracao valida", () => {
    const { dir, filePath } = createTempFilePath("nightops-config.json");
    tempDir = dir;
    const store = createNightOpsConfigStore({ filePath, defaults });

    const result = store.updateConfig({
      ...defaults,
      minDurationMinutes: 8,
      criticalKeywords: ["OLT", "POP", "CORE"],
      autoEscalationEnabled: true,
    });

    expect(result.ok).toBe(true);
    expect(store.getConfig().minDurationMinutes).toBe(8);
    expect(store.getConfig().autoEscalationEnabled).toBe(false);
  });

  it("rejeita valores invalidos", () => {
    const validation = validateNightOpsConfig(
      {
        ...defaults,
        correlationWindowMinutes: 0,
        criticalKeywords: new Array(30).fill("A"),
      },
      defaults,
    );

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it("cria backup quando JSON esta invalido", () => {
    const { dir, filePath } = createTempFilePath("nightops-config.json");
    tempDir = dir;
    writeFileSync(filePath, "{ invalido", "utf8");

    const store = createNightOpsConfigStore({ filePath, defaults });
    const backupName = readdirSync(dir).find((name) =>
      name.startsWith("nightops-config.json.bak-")
    );

    expect(Boolean(backupName)).toBe(true);
    expect(store.getConfig().timezone).toBe("America/Sao_Paulo");
  });
});
