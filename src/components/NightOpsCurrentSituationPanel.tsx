import { AlertTriangle, RefreshCcw } from "lucide-react";
import type { NightOpsStatus } from "../types";

interface Props {
  status: NightOpsStatus;
  analyzing: boolean;
  onAnalyze: () => Promise<void>;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sem analise ainda";
  }

  return new Date(value).toLocaleString("pt-BR");
}

function NightOpsCurrentSituationPanel({ status, analyzing, onAnalyze }: Props) {
  const hasCritical = status.summary.criticalIncidents > 0;
  const hasEscalation = status.summary.escalationRecommended > 0;
  const attentionCount =
    status.summary.criticalIncidents + status.summary.warningIncidents;

  const headline = hasCritical
    ? "Atencao: ha ocorrencia critica com escalonamento recomendado."
    : "Sem incidente critico ativo no momento.";

  const supportingText = hasEscalation
    ? `${status.summary.escalationRecommended} ocorrencia(s) com recomendacao de escalonamento.`
    : "Nenhuma recomendacao de escalonamento no momento.";

  return (
    <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Situacao atual
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-100">
            {headline}
          </h3>
          <p className="mt-2 text-sm text-slate-400">{supportingText}</p>
        </div>

        <button
          type="button"
          onClick={onAnalyze}
          disabled={analyzing}
          className="inline-flex items-center gap-2 rounded-3xl bg-noc-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw size={16} />
          {analyzing ? "Analisando..." : "Atualizar analise"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className={`rounded-2xl border p-4 ${hasCritical ? "border-rose-500/30 bg-rose-500/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Critico ativo</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {hasCritical ? "Sim" : "Nao"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Escalonamento</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {hasEscalation ? "Recomendado" : "Nao recomendado"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Problemas analisados</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {status.summary.activeProblems}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Ocorrencias com atencao</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {attentionCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Ultima analise</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {formatDateTime(status.generatedAt)}
          </p>
        </div>
      </div>

      {hasCritical ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <AlertTriangle size={16} />
          Priorize a revisao das ocorrencias detectadas abaixo antes da passagem de turno.
        </div>
      ) : null}
    </section>
  );
}

export default NightOpsCurrentSituationPanel;
