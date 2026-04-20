import { Clipboard, Search, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useProblems } from "../hooks/useProblems";
import HelpTooltip from "../components/HelpTooltip";
import {
  analyzeProblemWithAgent,
  type ProblemAIAnalysis,
} from "../services/agentClient";

const severityFilters = ["Todos", "Disaster", "High"] as const;
const statusFilters = [
  "Todos",
  "Aberto",
  "Em andamento",
  "Verificado",
] as const;

const severityStyles = {
  Disaster: "bg-rose-500/15 text-rose-300",
  High: "bg-amber-500/15 text-amber-300",
  Medium: "bg-sky-500/15 text-sky-300",
  Low: "bg-slate-800 text-slate-300",
};

function ProblemsPage() {
  const [searchParams] = useSearchParams();
  const initialHostFilter = searchParams.get("host") ?? "";
  const [search, setSearch] = useState(initialHostFilter);
  const [severity, setSeverity] =
    useState<(typeof severityFilters)[number]>("Todos");
  const [status, setStatus] = useState<(typeof statusFilters)[number]>("Todos");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ProblemAIAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisCopied, setAnalysisCopied] = useState(false);
  const { issues, loading, error, retry } = useProblems();

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchesSearch = [issue.host, issue.description].some((value) =>
        value.toLowerCase().includes(search.toLowerCase()),
      );
      const matchesSeverity =
        severity === "Todos" || issue.severity === severity;
      const matchesStatus = status === "Todos" || issue.status === status;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [issues, search, severity, status]);

  useEffect(() => {
    if (filteredIssues.length === 0) {
      setSelectedIssueId(null);
      return;
    }

    if (!selectedIssueId) {
      setSelectedIssueId(filteredIssues[0].id);
      return;
    }

    const selectedStillExists = filteredIssues.some(
      (issue) => issue.id === selectedIssueId,
    );

    if (!selectedStillExists) {
      setSelectedIssueId(filteredIssues[0].id);
    }
  }, [filteredIssues, selectedIssueId]);

  const selectedIssue = filteredIssues.find(
    (issue) => issue.id === selectedIssueId,
  );
  const disasterCount = issues.filter(
    (issue) => issue.severity === "Disaster",
  ).length;
  const highCount = issues.filter((issue) => issue.severity === "High").length;

  useEffect(() => {
    setSearch(initialHostFilter);
  }, [initialHostFilter]);

  useEffect(() => {
    setAnalysis(null);
    setAnalysisCopied(false);
  }, [selectedIssueId]);

  const handleAnalyzeIssue = async () => {
    if (!selectedIssue || analysisLoading) {
      return;
    }

    setAnalysisLoading(true);
    setAnalysisCopied(false);

    try {
      setAnalysis(await analyzeProblemWithAgent(selectedIssue));
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleCopyWhatsapp = async () => {
    if (!analysis?.whatsappMessage) {
      return;
    }

    try {
      await navigator.clipboard.writeText(analysis.whatsappMessage);
      setAnalysisCopied(true);
    } catch {
      setAnalysisCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Problemas
              </p>
              <HelpTooltip
                label="Explicar central de problemas"
                text="Lista somente alarmes High e Disaster vindos do Zabbix. A tela e focada na fila operacional que exige atencao do NOC/CGR."
              />
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">
              Central de alarmes operacionais
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Visao detalhada dos alarmes High e Disaster, com busca,
              filtros e painel de detalhe para triagem operacional.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Total
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-100">
                {issues.length}
              </p>
            </div>
            <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-rose-300/80">
                Disaster
              </p>
              <p className="mt-3 text-3xl font-semibold text-rose-100">
                {disasterCount}
              </p>
            </div>
            <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-300/80">
                High
              </p>
              <p className="mt-3 text-3xl font-semibold text-amber-100">
                {highCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block w-full max-w-xl">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por host ou descricao do alarme"
                className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 py-3 pl-12 pr-4 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
              />
            </label>

            <div className="text-sm text-slate-400">
              {filteredIssues.length} de {issues.length} alarmes exibidos
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <HelpTooltip
                label="Explicar filtro de severidade"
                text="Filtra a fila por criticidade. Disaster representa maior criticidade operacional; High indica alto impacto, mas abaixo de desastre."
              />
              {severityFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSeverity(filter)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    severity === filter
                      ? "bg-noc-accent text-slate-950"
                      : "border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <HelpTooltip
                label="Explicar filtro de status"
                text="Filtra pelo estado operacional normalizado no frontend, como Aberto, Em andamento ou Verificado, conforme dados retornados pelo Zabbix."
              />
              {statusFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatus(filter)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    status === filter
                      ? "bg-slate-100 text-slate-950"
                      : "border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} />
              <p>Falha ao carregar a central de alarmes.</p>
            </div>
            <button
              type="button"
              onClick={retry}
              className="rounded-full border border-rose-500 bg-rose-500/20 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/30"
            >
              Tentar novamente
            </button>
          </div>
          <p className="mt-3 text-xs text-rose-200">{error}</p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Alarmes
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-100">
                Fila operacional
              </h3>
            </div>
            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
              High + Disaster
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-slate-400">
              Carregando alarmes do Zabbix...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="px-3 py-3">Severidade</th>
                    <th className="px-3 py-3">Host</th>
                    <th className="px-3 py-3">Problema</th>
                    <th className="px-3 py-3">Horario</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Acao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredIssues.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-slate-500"
                      >
                        Nenhum alarme encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    filteredIssues.map((issue) => (
                      <tr
                        key={issue.id}
                        className={`transition-colors hover:bg-slate-950/60 ${
                          selectedIssueId === issue.id ? "bg-slate-950/80" : ""
                        }`}
                      >
                        <td className="px-3 py-4 font-semibold">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs ${
                              severityStyles[issue.severity]
                            }`}
                          >
                            {issue.severity}
                          </span>
                        </td>
                        <td className="px-3 py-4">{issue.host}</td>
                        <td className="px-3 py-4 text-slate-300">
                          {issue.description}
                        </td>
                        <td className="px-3 py-4">{issue.time}</td>
                        <td className="px-3 py-4">
                          <span className="inline-flex rounded-full bg-slate-900/80 px-3 py-1 text-xs text-slate-300">
                            {issue.status}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedIssueId(issue.id)}
                            className="rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
                          >
                            Ver detalhe
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Detalhe
            </p>
            <HelpTooltip
              label="Explicar detalhe do alarme"
              text="Mostra o contexto do alarme selecionado e permite acionar o agente para gerar resumo, causa provavel, acoes recomendadas e mensagem de escalonamento."
              side="left"
            />
          </div>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            Contexto do alarme
          </h3>

          {!selectedIssue ? (
            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-400">
              Selecione um alarme para visualizar o detalhamento operacional.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAnalyzeIssue}
                  disabled={analysisLoading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-3xl bg-noc-accent px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Sparkles size={16} />
                  {analysisLoading ? "Analisando com IA..." : "Analisar com IA"}
                </button>
                <HelpTooltip
                  label="Explicar analise com IA"
                  text="Envia o alarme selecionado ao agente local. O agente usa Groq quando configurado e retorna diagnostico, evidencias, proximas acoes e texto pronto para WhatsApp."
                  side="left"
                />
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Host
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {selectedIssue.host}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Severidade
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs ${
                      severityStyles[selectedIssue.severity]
                    }`}
                  >
                    {selectedIssue.severity}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Status
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {selectedIssue.status}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Horario
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {selectedIssue.time}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Descricao
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  {selectedIssue.description}
                </p>
              </div>

              {analysis ? (
                <div className="space-y-4 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="rounded-full border border-cyan-500/20 bg-slate-950 px-3 py-1 text-cyan-200">
                      Fonte: {analysis.source === "groq-agent" ? "Agente Groq" : "Fallback local"}
                    </span>
                    {analysis.model ? (
                      <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1">
                        Modelo: {analysis.model}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1">
                      Urgencia: {analysis.urgency}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">
                      Resumo IA
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-100">
                      {analysis.summary}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      Causa provavel
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      {analysis.likelyCause}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      Evidencias
                    </p>
                    <div className="mt-2 space-y-2">
                      {analysis.evidence.map((item) => (
                        <div
                          key={item}
                          className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      Acoes recomendadas
                    </p>
                    <div className="mt-2 space-y-2">
                      {analysis.recommendedActions.map((item) => (
                        <div
                          key={item}
                          className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        WhatsApp
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyWhatsapp}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:bg-slate-900"
                      >
                        <Clipboard size={14} />
                        {analysisCopied ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                      {analysis.whatsappMessage}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

export default ProblemsPage;
