import { buildIncidentAnalysisPrompt } from "./prompts/incidentAnalysisPrompt.mjs";
import { buildNocAnalystPrompt } from "./prompts/nocAnalystPrompt.mjs";
import { callAIProvider, getConfiguredProviderName } from "./providers/index.mjs";

function normalizeQuery(query) {
  return query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

function compactArray(items, limit, mapper) {
  return items.slice(0, limit).map(mapper);
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

function buildOperationalContext(query, snapshot) {
  const normalized = normalizeQuery(query);
  const includeHosts = /host|hosts|ip|grupo|online|offline|down|ativo|ativos|olt|pop|site|inventario/.test(normalized) ||
    !/problema|alarme|incidente|evento|log/.test(normalized);
  const includeProblems = /problema|problemas|alarme|alarmes|incidente|incidentes|high|disaster|desastre|critico|grave/.test(
    normalized,
  ) || !/host|hosts|evento|log/.test(normalized);
  const includeEvents = /evento|eventos|log|logs|recente|recentes|historico/.test(normalized);

  return {
    hosts: includeHosts
      ? compactArray(snapshot.hosts, 20, (host) => ({
          id: host.id,
          name: host.name,
          technicalName: host.technicalName,
          ip: host.ip,
          status: host.status,
          groups: host.groups.join(", ") || "Sem grupo",
          lastCheck: host.lastCheck,
        }))
      : [],
    problems: includeProblems
      ? compactArray(snapshot.problems, 12, (problem) => ({
          eventId: problem.eventid,
          host: problem.host,
          problem: problem.title,
          severity: problem.severity,
          acknowledged: problem.acknowledged ? "Sim" : "Nao",
          time: problem.startedAt,
          groups: problem.groups.join(", "),
        }))
      : [],
    events: includeEvents
      ? compactArray(snapshot.events, 12, (event) => ({
          eventId: event.eventid,
          host: event.hosts?.[0]?.name || event.hosts?.[0]?.host || "Sem host",
          event: event.name,
          severity: event.severity,
          time: event.time,
        }))
      : [],
  };
}

export function createAiRouter({ config, zabbixClient, nightOpsService }) {
  function getRequestUrl(request) {
    return new URL(request.url || "/", "http://localhost");
  }

  async function handleHealth(_request, response, sendJson) {
    let zabbixVersion = null;

    if (zabbixClient.hasConfiguration()) {
      try {
        zabbixVersion = await zabbixClient.getVersion();
      } catch {
        zabbixVersion = null;
      }
    }

    return sendJson(response, 200, {
      status: "ok",
      aiProvider: config.aiProvider || "groq",
      configuredProvider: getConfiguredProviderName(config),
      hasGroqKey: Boolean(config.groqApiKey),
      hasOpenRouterKey: Boolean(config.openRouterApiKey),
      hasZabbixConfig: zabbixClient.hasConfiguration(),
      model:
        config.aiProvider === "openrouter"
          ? config.openRouterModel
          : config.groqModel,
      zabbixVersion,
    });
  }

  async function handleQuery(request, response, sendJson, readJsonBody) {
    const body = await readJsonBody(request);
    const query = String(body.query || "").trim();

    if (!query) {
      return sendJson(response, 400, { error: "Query vazia." });
    }

    if (!zabbixClient.hasConfiguration()) {
      return sendJson(response, 503, { error: "Integracao Zabbix nao configurada." });
    }

    const snapshot = await zabbixClient.getOperationalSnapshot({
      hostLimit: 30,
      problemLimit: 20,
      eventLimit: 20,
    });
    const context = buildOperationalContext(query, snapshot);

    try {
      const aiResponse = await callAIProvider(config, {
        systemPrompt: buildNocAnalystPrompt(),
        userPrompt: [
          `Pergunta do operador: ${query}`,
          "",
          "Contexto operacional consultado no Zabbix:",
          JSON.stringify(context),
          "",
          "Responda com resumo, evidencias e proximas acoes.",
        ].join("\n"),
        temperature: 0.2,
        maxTokens: 700,
      });

      return sendJson(response, 200, {
        answer: aiResponse.content || "Sem resposta do agente.",
        source: aiResponse.provider === "openrouter" ? "openrouter-agent" : "groq-agent",
        model: aiResponse.model,
        contextCounts: {
          hosts: context.hosts.length,
          problems: context.problems.length,
          events: context.events.length,
        },
      });
    } catch (error) {
      return sendJson(response, 503, {
        error: error instanceof Error ? error.message : "Erro ao chamar provedor de IA.",
      });
    }
  }

  async function handleProblemAnalysis(request, response, sendJson, readJsonBody) {
    const body = await readJsonBody(request);
    const issue = body.issue || {};

    if (!issue.host || !issue.description || !issue.severity) {
      return sendJson(response, 400, { error: "Alarme invalido." });
    }

    try {
      const aiResponse = await callAIProvider(config, {
        systemPrompt: buildIncidentAnalysisPrompt(),
        userPrompt: [
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
        ].join("\n"),
        temperature: 0.1,
        maxTokens: 450,
      });

      const parsed = JSON.parse(stripJsonFence(aiResponse.content));

      return sendJson(response, 200, {
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
        source: aiResponse.provider === "openrouter" ? "openrouter-agent" : "groq-agent",
        model: aiResponse.model,
      });
    } catch {
      return sendJson(response, 200, fallbackProblemAnalysis(issue));
    }
  }

  async function handleNightOpsStatus(_request, response, sendJson) {
    return sendJson(response, 200, nightOpsService.getStatus());
  }

  async function handleNightOpsConfig(_request, response, sendJson) {
    return sendJson(response, 200, {
      status: "ok",
      config: nightOpsService.getConfig(),
    });
  }

  async function handleNightOpsConfigUpdate(request, response, sendJson, readJsonBody) {
    const body = await readJsonBody(request);

    try {
      const config = nightOpsService.updateConfig(body || {});
      return sendJson(response, 200, {
        status: "ok",
        config,
      });
    } catch (error) {
      return sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Configuracao invalida.",
      });
    }
  }

  async function handleNightOpsHistory(request, response, sendJson) {
    const requestUrl = getRequestUrl(request);
    const filters = {
      severity: requestUrl.searchParams.get("severity") || undefined,
      status: requestUrl.searchParams.get("status") || undefined,
      start: requestUrl.searchParams.get("start") || undefined,
      end: requestUrl.searchParams.get("end") || undefined,
      escalationRequired:
        requestUrl.searchParams.get("escalationRequired") || undefined,
    };
    const items = nightOpsService.listHistory(filters);

    return sendJson(response, 200, {
      status: "ok",
      items,
      count: items.length,
    });
  }

  async function handleNightOpsAnalyze(_request, response, sendJson) {
    const result = await nightOpsService.analyzeNightOps();
    return sendJson(response, 200, result);
  }

  async function handleNightOpsReports(request, response, sendJson) {
    const requestUrl = getRequestUrl(request);
    const items = nightOpsService.listShiftReports({
      start: requestUrl.searchParams.get("start") || undefined,
      end: requestUrl.searchParams.get("end") || undefined,
    });

    return sendJson(response, 200, {
      status: "ok",
      items,
      count: items.length,
    });
  }

  async function handleNightOpsLatestReport(_request, response, sendJson) {
    return sendJson(response, 200, nightOpsService.getLatestShiftReport());
  }

  async function handleNightOpsShiftReport(request, response, sendJson, readJsonBody) {
    const body = await readJsonBody(request);
    const report = await nightOpsService.createShiftReport(body || {});
    return sendJson(response, 200, report);
  }

  return {
    async route(request, response, helpers) {
      const { sendJson, readJsonBody } = helpers;

      const pathname = getRequestUrl(request).pathname;

      if (request.method === "GET" && pathname === "/ai-api/health") {
        return await handleHealth(request, response, sendJson);
      }

      if (request.method === "POST" && pathname === "/ai-api/query") {
        return await handleQuery(request, response, sendJson, readJsonBody);
      }

      if (request.method === "POST" && pathname === "/ai-api/analyze-problem") {
        return await handleProblemAnalysis(request, response, sendJson, readJsonBody);
      }

      if (request.method === "GET" && pathname === "/ai-api/nightops/status") {
        return await handleNightOpsStatus(request, response, sendJson);
      }

      if (request.method === "GET" && pathname === "/ai-api/nightops/config") {
        return await handleNightOpsConfig(request, response, sendJson);
      }

      if (request.method === "PUT" && pathname === "/ai-api/nightops/config") {
        return await handleNightOpsConfigUpdate(
          request,
          response,
          sendJson,
          readJsonBody,
        );
      }

      if (request.method === "GET" && pathname === "/ai-api/nightops/history") {
        return await handleNightOpsHistory(request, response, sendJson);
      }

      if (request.method === "GET" && pathname === "/ai-api/nightops/reports") {
        return await handleNightOpsReports(request, response, sendJson);
      }

      if (request.method === "GET" && pathname === "/ai-api/nightops/reports/latest") {
        return await handleNightOpsLatestReport(request, response, sendJson);
      }

      if (request.method === "POST" && pathname === "/ai-api/nightops/analyze") {
        return await handleNightOpsAnalyze(request, response, sendJson);
      }

      if (request.method === "POST" && pathname === "/ai-api/nightops/shift-report") {
        return await handleNightOpsShiftReport(request, response, sendJson, readJsonBody);
      }

      return sendJson(response, 404, { error: "Rota nao encontrada." });
    },
  };
}
