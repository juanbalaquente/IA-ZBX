import { AlertTriangle, Eye, Save } from "lucide-react";
import { useState } from "react";
import type {
  NightOpsShadowDecision,
  NightOpsShadowMetrics,
  NightOpsShadowValidationStatus,
} from "../types";

interface Props {
  enabled: boolean;
  metrics: NightOpsShadowMetrics;
  decisions: NightOpsShadowDecision[];
  onValidate: (
    id: string,
    payload: {
      status: Exclude<NightOpsShadowValidationStatus, "pending">;
      validatedBy?: string;
      notes?: string;
    },
  ) => Promise<void>;
}

const validationOptions: Array<Exclude<NightOpsShadowValidationStatus, "pending">> = [
  "correct",
  "false_positive",
  "false_negative",
  "partially_correct",
];

const decisionLabel = {
  ignore: "Ignorar",
  monitor: "Monitorar",
  recommend_escalation: "Recomendar escalonamento",
};

function NightOpsShadowPanel({ enabled, metrics, decisions, onValidate }: Props) {
  const [drafts, setDrafts] = useState<
    Record<string, { status: Exclude<NightOpsShadowValidationStatus, "pending">; validatedBy: string; notes: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const setDraftField = (
    id: string,
    field: "status" | "validatedBy" | "notes",
    value: string,
  ) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        status: current[id]?.status || "correct",
        validatedBy: current[id]?.validatedBy || "",
        notes: current[id]?.notes || "",
        [field]: value,
      },
    }));
  };

  const handleSave = async (id: string) => {
    const draft = drafts[id] || {
      status: "correct" as const,
      validatedBy: "",
      notes: "",
    };

    setSavingId(id);
    try {
      await onValidate(id, draft);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <Eye size={18} className="text-sky-300" />
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Shadow Mode
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            Observacao operacional
          </h3>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Status</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {enabled ? "Ativo" : "Inativo"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Decisoes</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">{metrics.total}</p>
          <p className="mt-1 text-xs text-slate-400">{metrics.pending} pendentes</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Escalonamentos simulados</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {metrics.recommendEscalation}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {metrics.wouldNotify} notificacoes hipoteticas
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Qualidade</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            FP {metrics.falsePositive} | FN {metrics.falseNegative}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {metrics.correct} corretas | {metrics.partiallyCorrect} parciais
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {decisions.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-400">
            Nenhuma decisao shadow registrada ainda.
          </div>
        ) : (
          decisions.slice(0, 10).map((item) => {
            const draft = drafts[item.id] || {
              status: "correct" as const,
              validatedBy: "",
              notes: "",
            };

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4"
              >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200">
                        {decisionLabel[item.decision]}
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200">
                        {item.severity}
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200">
                        validacao: {item.humanValidation.status}
                      </span>
                      {item.wouldNotify ? (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
                          wouldNotify=true
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm text-slate-200">{item.reason}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                    Confianca: {Math.round((item.confidence || 0) * 100)}%
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-xs text-slate-500">Status da validacao</span>
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        setDraftField(item.id, "status", event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    >
                      {validationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs text-slate-500">Validado por</span>
                    <input
                      type="text"
                      value={draft.validatedBy}
                      onChange={(event) =>
                        setDraftField(item.id, "validatedBy", event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs text-slate-500">Observacao</span>
                    <input
                      type="text"
                      value={draft.notes}
                      onChange={(event) =>
                        setDraftField(item.id, "notes", event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <AlertTriangle size={14} />
                    Shadow Mode registra apenas o que o sistema teria feito.
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSave(item.id)}
                    disabled={savingId === item.id}
                    className="inline-flex items-center gap-2 rounded-2xl bg-noc-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                  >
                    <Save size={14} />
                    {savingId === item.id ? "Salvando..." : "Salvar validacao"}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

export default NightOpsShadowPanel;
