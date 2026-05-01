import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAiRouter } from "./ai/aiRouter.mjs";
import { createNightOpsConfigStore } from "./data/nightOpsConfigStore.mjs";
import { createNightOpsStore } from "./data/nightOpsStore.mjs";
import { createNightOpsService } from "./nightops/nightOpsService.mjs";
import { createZabbixServerClient } from "./zabbix/zabbixServerClient.mjs";

const port = Number(process.env.AI_AGENT_PORT || 8787);

loadEnvFile(".env.local");
loadEnvFile(".env");

const config = {
  aiProvider: process.env.AI_PROVIDER || "groq",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  groqMaxTokens: Number(process.env.GROQ_MAX_TOKENS || 700),
  groqTemperature: Number(process.env.GROQ_TEMPERATURE || 0.2),
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
  openRouterModel: process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
  openRouterSiteUrl: process.env.OPENROUTER_SITE_URL || "http://localhost:5173",
  openRouterAppName: process.env.OPENROUTER_APP_NAME || "IA-ZBX",
  openRouterTemperature: Number(process.env.OPENROUTER_TEMPERATURE || 0.2),
  zabbixUrl:
    process.env.ZABBIX_API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    "",
  zabbixToken:
    process.env.ZABBIX_API_TOKEN ||
    process.env.ZABBIX_API_KEY ||
    process.env.VITE_API_TOKEN ||
    process.env.VITE_API_KEY ||
    "",
  zabbixUser: process.env.ZABBIX_USER || process.env.VITE_ZABBIX_USER || "",
  zabbixPassword:
    process.env.ZABBIX_PASSWORD || process.env.VITE_ZABBIX_PASSWORD || "",
  nightOpsDefaultStartHour: Number(process.env.NIGHTOPS_DEFAULT_START_HOUR || 19),
  nightOpsDefaultEndHour: Number(process.env.NIGHTOPS_DEFAULT_END_HOUR || 7),
  nightOpsTimezone: process.env.NIGHTOPS_TIMEZONE || "America/Sao_Paulo",
  nightOpsMinDurationMinutes: Number(process.env.NIGHTOPS_MIN_DURATION_MINUTES || 5),
  nightOpsCorrelationWindowMinutes: Number(
    process.env.NIGHTOPS_CORRELATION_WINDOW_MINUTES || 10,
  ),
  nightOpsSameGroupAffectedHostsThreshold: Number(
    process.env.NIGHTOPS_SAME_GROUP_AFFECTED_HOSTS_THRESHOLD || 5,
  ),
  nightOpsCriticalKeywords: (
    process.env.NIGHTOPS_CRITICAL_KEYWORDS ||
    "OLT,POP,BGP,BACKBONE,CORE,TRANSPORTE,ENLACE"
  )
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
};

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) {
    return;
  }

  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readJsonBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        resolveBody(raw ? JSON.parse(raw) : {});
      } catch (error) {
        rejectBody(error);
      }
    });

    request.on("error", rejectBody);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  response.end(JSON.stringify(payload));
}

const zabbixClient = createZabbixServerClient(config);
const nightOpsStore = createNightOpsStore();
const nightOpsConfigStore = createNightOpsConfigStore({
  defaults: {
    defaultStartHour: config.nightOpsDefaultStartHour,
    defaultEndHour: config.nightOpsDefaultEndHour,
    timezone: config.nightOpsTimezone,
    minDurationMinutes: config.nightOpsMinDurationMinutes,
    correlationWindowMinutes: config.nightOpsCorrelationWindowMinutes,
    sameGroupAffectedHostsThreshold:
      config.nightOpsSameGroupAffectedHostsThreshold,
    criticalKeywords: config.nightOpsCriticalKeywords,
    autoEscalationEnabled: false,
  },
});
const nightOpsService = createNightOpsService({
  config,
  zabbixClient,
  store: nightOpsStore,
  configStore: nightOpsConfigStore,
});
const aiRouter = createAiRouter({
  config,
  zabbixClient,
  nightOpsService,
});

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      return sendJson(response, 204, {});
    }

    return await aiRouter.route(request, response, {
      readJsonBody,
      sendJson,
    });
  } catch (error) {
    return sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro interno.",
    });
  }
});

server.listen(port, () => {
  console.log(`AI agent server running at http://localhost:${port}/ai-api`);
});
