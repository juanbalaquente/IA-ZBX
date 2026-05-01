import { ClipboardList, History } from "lucide-react";
import type { NightOpsStoredShiftReport } from "../types";

interface AnalysisSummaryItem {
  id: string;
  generatedAt: string;
  title: string;
  occurrences: number;
  escalationRecommended: boolean;
  criticalCount: number;
}

interface Props {
  analyses: AnalysisSummaryItem[];
  reports: NightOpsStoredShiftReport[];
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function NightOpsRecentHistoryPanel({ analyses, reports }: Props) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
          Historico recente
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-100">
          Ultimas analises e relatorios
        </h3>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div>
          <div className="flex items-center gap-2">
            <History size={18} className="text-sky-300" />
            <p className="text-sm font-medium text-slate-200">Ultimas analises</p>
          </div>
          <div className="mt-4 space-y-3">
            {analyses.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">
                Nenhuma analise persistida ainda.
              </div>
            ) : (
              analyses.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100">{item.title}</h4>
                      <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.generatedAt)}</p>
                    </div>
                    {item.escalationRecommended ? (
                      <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
                        Escalonamento
                      </span>
                    ) : (
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                        Monitoramento
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-slate-300">
                    {item.occurrences} ocorrencia(s), {item.criticalCount} critica(s).
                  </p>
                </article>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-sky-300" />
            <p className="text-sm font-medium text-slate-200">Ultimos relatorios</p>
          </div>
          <div className="mt-4 space-y-3">
            {reports.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">
                Nenhum relatorio salvo ainda.
              </div>
            ) : (
              reports.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100">{item.title}</h4>
                      <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.generatedAt)}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                      {item.numbers.escalations} escal.
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{item.summary}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default NightOpsRecentHistoryPanel;
