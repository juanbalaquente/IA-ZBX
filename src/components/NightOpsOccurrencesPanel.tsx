import { Copy, MessageSquare, Siren, Users } from "lucide-react";
import type { NightOpsIncident } from "../types";

interface Props {
  incidents: NightOpsIncident[];
  copiedKey: string | null;
  onCopy: (key: string, text: string) => Promise<void>;
}

const severityStyles = {
  low: "bg-slate-800 text-slate-300",
  medium: "bg-sky-500/15 text-sky-300",
  high: "bg-amber-500/15 text-amber-300",
  critical: "bg-rose-500/15 text-rose-300",
};

function NightOpsOccurrencesPanel({ incidents, copiedKey, onCopy }: Props) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
          Ocorrencias detectadas
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-100">
          Fila operacional priorizada
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          Leitura simplificada do que exige acompanhamento, acao ou escalonamento neste momento.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {incidents.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-slate-400">
            Nenhuma ocorrencia detectada. Rode a analise para atualizar a fila operacional.
          </div>
        ) : (
          incidents.map((incident) => (
            <article
              key={incident.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${severityStyles[incident.severity]}`}>
                      {incident.severity}
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200">
                      {incident.durationMinutes} min
                    </span>
                    {incident.escalation.required ? (
                      <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
                        Escalonamento recomendado
                      </span>
                    ) : null}
                  </div>
                  <h4 className="mt-3 text-lg font-semibold text-slate-100">
                    {incident.title}
                  </h4>
                </div>

                <div className="flex flex-wrap gap-2">
                  {incident.internalMessage ? (
                    <button
                      type="button"
                      onClick={() => onCopy(`internal-${incident.id}`, incident.internalMessage)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200"
                    >
                      <Copy size={14} />
                      {copiedKey === `internal-${incident.id}` ? "Copiado!" : "Copiar msg. interna"}
                    </button>
                  ) : null}
                  {incident.customerMessage ? (
                    <button
                      type="button"
                      onClick={() => onCopy(`customer-${incident.id}`, incident.customerMessage)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200"
                    >
                      <Copy size={14} />
                      {copiedKey === `customer-${incident.id}` ? "Copiado!" : "Copiar msg. cliente"}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Impacto</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{incident.impact}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Causa provavel</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{incident.probableCause}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Siren size={16} />
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Evidencias principais</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(incident.evidence || []).slice(0, 3).map((item) => (
                      <p key={item} className="text-sm text-slate-200">- {item}</p>
                    ))}
                    {incident.evidence.length === 0 ? (
                      <p className="text-sm text-slate-400">Sem evidencias resumidas.</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Users size={16} />
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Acao recomendada</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(incident.recommendedActions || []).slice(0, 3).map((item) => (
                      <p key={item} className="text-sm text-slate-200">- {item}</p>
                    ))}
                    {incident.recommendedActions.length === 0 ? (
                      <p className="text-sm text-slate-400">Sem acao adicional sugerida.</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <MessageSquare size={16} />
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Comunicacao pronta</p>
                  </div>
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="text-xs text-slate-500">Interna</p>
                      <p className="mt-1 text-sm text-slate-200">
                        {incident.internalMessage || "Nao gerada."}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Cliente</p>
                      <p className="mt-1 text-sm text-slate-200">
                        {incident.customerMessage || "Nao gerada."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default NightOpsOccurrencesPanel;
