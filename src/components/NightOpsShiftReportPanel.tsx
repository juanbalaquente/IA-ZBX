import { ClipboardList, Copy, Download } from "lucide-react";
import type { NightOpsShiftReport, NightOpsStoredShiftReport } from "../types";

interface Props {
  report: NightOpsShiftReport | NightOpsStoredShiftReport | null;
  loading: boolean;
  copiedKey: string | null;
  onGenerate: () => Promise<void>;
  onCopy: (key: string, text: string) => Promise<void>;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Nao informado";
  }

  return new Date(value).toLocaleString("pt-BR");
}

function buildReportText(report: NightOpsShiftReport | NightOpsStoredShiftReport) {
  return [
    report.title,
    `Periodo: ${report.period.start} ate ${report.period.end}`,
    "",
    "Resumo:",
    report.summary,
    "",
    "Passagem de turno:",
    report.handoverText,
    "",
    "Recomendacoes:",
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
