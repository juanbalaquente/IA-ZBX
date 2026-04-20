import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const port = Number(process.env.AI_AGENT_PORT || 8787);

loadEnvFile(".env.local");
loadEnvFile(".env");

const config = {
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  groqMaxTokens: Number(process.env.GROQ_MAX_TOKENS || 500),
  groqTemperature: Number(process.env.GROQ_TEMPERATURE || 0.2),
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
};

let cachedAuthToken = null;

const systemPrompt = [
  "Voce e um agente especialista de Network Operations Center para ambiente Zabbix.",
  "Responda sempre em portugues do Brasil, com linguagem operacional direta.",
  "Use apenas os dados fornecidos no contexto.",
  "Priorize alarmes High e Disaster, impacto e proxima acao.",
  "Nao invente hosts, IPs, grupos, severidades ou metricas.",
].join(" ");

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

function normalizeZabbixApiUrl(rawUrl) {
  try {
    const parsedUrl = new URL(rawUrl);
    if (parsedUrl.pathname.endsWith("/zabbix.php")) {
      parsedUrl.pathname = parsedUrl.pathname.replace(
        /\/zabbix\.php$/,
        "/api_jsonrpc.php",
      );
      parsedUrl.search = "";
    }
    return parsedUrl.toString();
  } catch {
    return rawUrl;
  }
}

function isTokenMode() {
  return Boolean(config.zabbixToken) &&
    !(config.zabbixUser && config.zabbixPassword);
}

async function getAuthToken() {
  if (isTokenMode()) {
    return config.zabbixToken;
  }

  if (cachedAuthToken) {
    return cachedAuthToken;
  }

  if (config.zabbixUser && config.zabbixPassword) {
    cachedAuthToken = await loginWithCredentials();
    return cachedAuthToken;
  }

  return null;
}

async function loginWithCredentials() {
  try {
    return await callZabbix(
      "user.login",
      {
        username: config.zabbixUser,
        password: config.zabbixPassword,
      },
      { skipAuth: true },
    );
  } catch (error) {
    if (!/unexpected parameter "username"|invalid parameter/i.test(error.message)) {
      throw error;
    }

    return await callZabbix(
      "user.login",
      {
        user: config.zabbixUser,
        password: config.zabbixPassword,
      },
      { skipAuth: true },
    );
  }
}

async function callZabbix(method, params = {}, options = {}) {
  if (!config.zabbixUrl) {
    throw new Error("Zabbix API URL nao configurada.");
  }

  const useToken = isTokenMode();
  const headers = {
    "Content-Type": "application/json",
  };

  if (useToken) {
    headers["X-API-KEY"] = config.zabbixToken;
    headers["X-Auth-Token"] = config.zabbixToken;
  }

  const authToken = options.skipAuth ? null : await getAuthToken();
  const body = {
    jsonrpc: "2.0",
    method,
    params,
    id: 1,
  };

  if (!options.skipAuth && !useToken) {
    body.auth = authToken;
  }

  const sendRequest = async (payload) => {
    const response = await fetch(normalizeZabbixApiUrl(config.zabbixUrl), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    return await response.json();
  };

  let json = await sendRequest(body);

  if (
    json.error &&
    useToken &&
    !options.skipAuth &&
    /not authorized/i.test(`${json.error.message} ${json.error.data}`) &&
    config.zabbixToken
  ) {
    json = await sendRequest({ ...body, auth: config.zabbixToken });
  }

  if (json.error) {
    throw new Error(`${json.error.message}: ${json.error.data}`);
  }

  return json.result;
}

function normalizeQuery(query) {
  return query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function severityLabel(severity) {
  const labels = {
    0: "Not classified",
    1: "Information",
    2: "Warning",
    3: "Average",
    4: "High",
    5: "Disaster",
  };

  return labels[Number(severity)] || "Unknown";
}

function truncateText(value, maxLength = 180) {
  const text = String(value || "");
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

function formatClock(clock) {
  const timestamp = Number(clock);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "Sem horario";
  }

  return new Date(timestamp * 1000).toLocaleString("pt-BR");
}

async function getHostsContext() {
  const hosts = await callZabbix("host.get", {
    output: ["hostid", "host", "name", "status", "lastaccess", "maintenance_status"],
    selectInterfaces: ["ip", "main", "type", "available"],
    selectGroups: ["name"],
    sortfield: "name",
    limit: 30,
  });

  return hosts.map((host) => {
    const mainInterface =
      host.interfaces?.find((item) => item.main === "1") || host.interfaces?.[0];
    const available = mainInterface?.available;
    const status = host.status === "1"
      ? "Offline"
      : available === "1"
        ? "Online"
        : available === "2"
          ? "Offline"
          : "Degradado";

    return {
      id: host.hostid,
      name: truncateText(host.name || host.host, 90),
      technicalName: truncateText(host.host, 90),
      ip: mainInterface?.ip || "Sem IP",
      status,
      groups: host.groups?.map((group) => group.name).join(", ") || "Sem grupo",
      lastCheck: formatClock(host.lastaccess),
    };
  });
}

async function getProblemsContext() {
  const problems = await callZabbix("problem.get", {
    output: ["eventid", "objectid", "name", "severity", "clock", "acknowledged"],
    severities: [4, 5],
    recent: true,
    sortfield: "eventid",
    sortorder: "DESC",
    limit: 5,
  });

  const triggerIds = problems
    .map((problem) => problem.objectid)
    .filter(Boolean);

  const triggers = triggerIds.length > 0
    ? await callZabbix("trigger.get", {
        output: ["triggerid", "description"],
        triggerids: [...new Set(triggerIds)],
        selectHosts: ["host", "name"],
        selectTags: "extend",
      })
    : [];

  const triggerMap = new Map(
    triggers.map((trigger) => [trigger.triggerid, trigger]),
  );

  return problems
    .sort((left, right) => Number(right.clock || 0) - Number(left.clock || 0))
    .map((problem) => {
    const trigger = triggerMap.get(problem.objectid) || {};
    const host = trigger.hosts?.[0];

    return {
      eventId: problem.eventid,
      host: truncateText(host?.name || host?.host || "Sem host", 90),
      problem: truncateText(problem.name, 180),
      severity: severityLabel(problem.severity),
      acknowledged: problem.acknowledged === "1" ? "Sim" : "Nao",
      time: formatClock(problem.clock),
      triggerDescription: truncateText(trigger.description || "Sem descricao", 120),
    };
  });
}

async function getEventsContext() {
  const events = await callZabbix("event.get", {
    output: ["eventid", "name", "clock", "severity", "source", "object", "objectid"],
    severities: [4, 5],
    selectHosts: ["host", "name"],
    sortfield: "eventid",
    sortorder: "DESC",
    limit: 8,
  });

  return events
    .sort((left, right) => Number(right.clock || 0) - Number(left.clock || 0))
    .map((event) => ({
      eventId: event.eventid,
      host: truncateText(event.hosts?.[0]?.name || event.hosts?.[0]?.host || "Sem host", 90),
      event: truncateText(event.name, 180),
      severity: severityLabel(event.severity),
      time: formatClock(event.clock),
    }));
}

async function buildOperationalContext(query) {
  const normalized = normalizeQuery(query);
  const needsHosts = /host|hosts|ip|grupo|online|offline|down|ativo|ativos|olt|pop|site|inventario/.test(
    normalized,
  );
  const needsProblems = /problema|problemas|alarme|alarmes|incidente|incidentes|high|disaster|desastre|critico|grave/.test(
    normalized,
  );
  const needsEvents = /evento|eventos|log|logs|recente|recentes|historico/.test(
    normalized,
  );

  const includeHosts = needsHosts || (!needsProblems && !needsEvents);
  const includeProblems = needsProblems || (!needsHosts && !needsEvents);
  const includeEvents = needsEvents;

  const [hosts, problems, events] = await Promise.all([
    includeHosts ? getHostsContext() : Promise.resolve([]),
    includeProblems ? getProblemsContext() : Promise.resolve([]),
    includeEvents ? getEventsContext() : Promise.resolve([]),
  ]);

  return { hosts, problems, events };
}

async function callGroqAgent(query, context) {
  if (!config.groqApiKey) {
    throw new Error("GROQ_API_KEY nao configurada.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.groqModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            `Pergunta do operador: ${query}`,
            "",
            "Contexto operacional consultado no Zabbix:",
            JSON.stringify(context),
            "",
            "Responda com resumo, evidencias e proximas acoes.",
          ].join("\n"),
        },
      ],
      max_tokens: config.groqMaxTokens,
      temperature: config.groqTemperature,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error?.message || "Erro ao chamar Groq.");
  }

  return json.choices?.[0]?.message?.content?.trim() || "Sem resposta do agente.";
}

function stripJsonFence(raw) {
  const text = String(raw || "").trim();
  if (!text.startsWith("```")) {
    return text;
  }

  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function fallbackProblemAnalysis(issue) {
  return {
    summary: `${issue.host}: ${issue.description}`,
    urgency: issue.severity === "Disaster" ? "immediate" : "soon",
    likelyCause:
      "Analise automatica indisponivel. Validar o alarme diretamente no Zabbix e no equipamento afetado.",
    evidence: [
      `Host: ${issue.host}`,
      `Severidade: ${issue.severity}`,
      `Horario: ${issue.time}`,
      `Status: ${issue.status}`,
    ],
    recommendedActions: [
      "Validar disponibilidade do host no Zabbix.",
      "Checar conectividade, energia e interface do equipamento.",
      "Atualizar a equipe apos a primeira validacao.",
    ],
    whatsappMessage: `ALERTA ZABBIX\nSeveridade: ${issue.severity}\nHost: ${issue.host}\nProblema: ${issue.description}\nAcao: validar disponibilidade, conectividade e energia do equipamento.`,
    source: "local-parser",
  };
}

async function analyzeProblem(issue) {
  if (!config.groqApiKey) {
    return fallbackProblemAnalysis(issue);
  }

  const prompt = [
    "Analise este alarme Zabbix e responda somente JSON valido, sem markdown.",
    "Estrutura obrigatoria:",
    '{"summary":"...","urgency":"immediate|soon|monitor","likelyCause":"...","evidence":["..."],"recommendedActions":["..."],"whatsappMessage":"..."}',
    "Alarme:",
    JSON.stringify({
      host: issue.host,
      description: issue.description,
      severity: issue.severity,
      status: issue.status,
      time: issue.time,
    }),
  ].join("\n");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.groqModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 450,
      temperature: 0.1,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error?.message || "Erro ao chamar Groq.");
  }

  const content = json.choices?.[0]?.message?.content || "";
  const parsed = JSON.parse(stripJsonFence(content));

  return {
    summary: String(parsed.summary || `${issue.host}: ${issue.description}`),
    urgency: ["immediate", "soon", "monitor"].includes(parsed.urgency)
      ? parsed.urgency
      : issue.severity === "Disaster"
        ? "immediate"
        : "soon",
    likelyCause: String(parsed.likelyCause || "Causa provavel nao informada."),
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence.map(String) : [],
    recommendedActions: Array.isArray(parsed.recommendedActions)
      ? parsed.recommendedActions.map(String)
      : [],
    whatsappMessage: String(parsed.whatsappMessage || ""),
    source: "groq-agent",
    model: config.groqModel,
  };
}

async function handleQuery(request, response) {
  const body = await readJsonBody(request);
  const query = String(body.query || "").trim();

  if (!query) {
    return sendJson(response, 400, { error: "Query vazia." });
  }

  const context = await buildOperationalContext(query);
  const answer = await callGroqAgent(query, context);

  return sendJson(response, 200, {
    answer,
    source: "groq-agent",
    model: config.groqModel,
    contextCounts: {
      hosts: context.hosts.length,
      problems: context.problems.length,
      events: context.events.length,
    },
  });
}

async function handleProblemAnalysis(request, response) {
  const body = await readJsonBody(request);
  const issue = body.issue || {};

  if (!issue.host || !issue.description || !issue.severity) {
    return sendJson(response, 400, { error: "Alarme invalido." });
  }

  try {
    return sendJson(response, 200, await analyzeProblem(issue));
  } catch {
    return sendJson(response, 200, fallbackProblemAnalysis(issue));
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

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      return sendJson(response, 204, {});
    }

    if (request.method === "GET" && request.url === "/ai-api/health") {
      return sendJson(response, 200, {
        status: "ok",
        hasGroqKey: Boolean(config.groqApiKey),
        hasZabbixConfig: Boolean(
          config.zabbixUrl &&
            (config.zabbixToken || (config.zabbixUser && config.zabbixPassword)),
        ),
        model: config.groqModel,
      });
    }

    if (request.method === "POST" && request.url === "/ai-api/query") {
      return await handleQuery(request, response);
    }

    if (request.method === "POST" && request.url === "/ai-api/analyze-problem") {
      return await handleProblemAnalysis(request, response);
    }

    return sendJson(response, 404, { error: "Rota nao encontrada." });
  } catch (error) {
    return sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro interno.",
    });
  }
});

server.listen(port, () => {
  console.log(`AI agent server running at http://localhost:${port}/ai-api`);
});
