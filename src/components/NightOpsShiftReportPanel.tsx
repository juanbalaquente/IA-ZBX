import { ClipboardList, Copy, Download } from "lucide-react";
import type { NightOpsShiftReport, NightOpsStoredShiftReport } from "../types";

interface Props {
  report: NightOpsShiftReport | NightOpsStoredShiftReport | null;
  loading: boolean;
  copiedKey: string | null;
  onGenerate: () => Promise<void>;
  onCopy: (key: string, text: string) => Promise<void>;
  selectedMode: string;
  selectedPeriodLabel: string;
  manualStart: string;
  manualEnd: string;
  onModeChange: (mode: string) => void;
  onManualChange: (field: "start" | "end", value: string) => void;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Nao informado";
  }

  return new Date(value).toLocaleString("pt-BR");
}

function buildReportText(report: NightOpsShiftReport | NightOpsStoredShiftReport) {
  if (report.plainTextReport) {
    return report.plainTextReport;
  }

  return [
    report.title,
    `PERIODO: ${report.period.start} ate ${report.period.end}`,
    "",
    "RESUMO:",
    report.summary,
    "",
    "PASSAGEM DE TURNO:",
    report.handoverText,
    "",
    "RECOMENDACOES:",
    ...(report.recommendations.length > 0
      ? report.recommendations.map((item) => `- ${item}`)
      : ["- Nenhuma recomendacao adicional."]),
  ].join("\n");
}

function NightOpsShiftReportPanel({
  report,
  loading,
  copiedKey,
  onGenerate,
  onCopy,
  selectedMode,
  selectedPeriodLabel,
  manualStart,
  manualEnd,
  onModeChange,
  onManualChange,
}: Props) {
  const handleDownload = () => {
    if (!report) {
      return;
    }

    const blob = new Blob([buildReportText(report)], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `nightops-shift-report-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Relatorio do turno
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-100">
            Passagem pronta para o supervisor
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Gere o resumo operacional do turno, copie a passagem e registre rapidamente o que precisa seguir para a manha.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Periodo do relatorio</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["last_completed", "Ultimo plantao fechado"],
            ["current", "Plantao atual"],
            ["previous_day", "Plantao diurno anterior"],
            ["previous_night", "Plantao noturno anterior"],
            ["manual", "Periodo manual"],
          ].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onModeChange(mode)}
              className={`rounded-2xl px-3 py-2 text-xs font-medium transition ${
                selectedMode === mode
                  ? "bg-sky-400 text-slate-950"
                  : "border border-slate-700 bg-slate-900 text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {selectedMode === "manual" ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs text-slate-500">Inicio</span>
              <input
                type="datetime-local"
                value={manualStart}
                onChange={(event) => onManualChange("start", event.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs text-slate-500">Fim</span>
              <input
                type="datetime-local"
                value={manualEnd}
                onChange={(event) => onManualChange("end", event.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <p className="text-sm text-slate-300">
            Relatorio sera gerado para: {selectedPeriodLabel}
          </p>
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-3xl bg-noc-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ClipboardList size={16} />
            {loading ? "Gerando..." : "Gerar relatorio do turno"}
          </button>
        </div>
      </div>

      {!report ? (
        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-sm text-slate-400">
          Nenhum relatorio disponivel ainda. Gere o relatorio do turno para montar a passagem operacional.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Periodo</p>
              <p className="mt-2 text-sm text-slate-200">
                {formatDateTime(report.period.start)} ate {formatDateTime(report.period.end)}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                O relatorio lista apenas eventos ocorridos no periodo selecionado. Alarmes antigos sem alteracao aparecem apenas como pendencias herdadas.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Relatorio completo</p>
                <button
                  type="button"
                  onClick={() => onCopy("report-full", buildReportText(report))}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200"
                >
                  <Copy size={14} />
                  {copiedKey === "report-full" ? "Copiado!" : "Copiar relatorio completo"}
                </button>
              </div>
              <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">
                {buildReportText(report)}
              </pre>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Resumo</p>
                <button
                  type="button"
                  onClick={() => onCopy("report-summary", report.summary)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200"
                >
                  <Copy size={14} />
                  {copiedKey === "report-summary" ? "Copiado!" : "Copiar resumo"}
                </button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                {report.summary}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Passagem de turno</p>
                <button
                  type="button"
                  onClick={() => onCopy("report-handover", report.handoverText)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200"
                >
                  <Copy size={14} />
                  {copiedKey === "report-handover" ? "Copiado!" : "Copiar passagem"}
                </button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                {report.handoverText}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Ultimo relatorio gerado</p>
              <p className="mt-2 text-sm text-slate-200">
                {"generatedAt" in report && report.generatedAt
                  ? formatDateTime(report.generatedAt)
                  : "Gerado nesta sessao"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Totais</p>
              <p className="mt-2 text-sm text-slate-200">
                {report.periodEventCount ?? report.numbers.periodEventCount ?? report.numbers.totalProblems} ocorrencia(s) do periodo
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {report.inheritedPendingCount || 0} pendencia(s) herdada(s)
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Recomendacoes</p>
              <div className="mt-3 space-y-2">
                {report.recommendations.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma recomendacao adicional.</p>
                ) : (
                  report.recommendations.map((item) => (
                    <p key={item} className="text-sm text-slate-200">
                      - {item}
                    </p>
                  ))
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              <Download size={16} />
              Baixar .txt
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default NightOpsShiftReportPanel;
