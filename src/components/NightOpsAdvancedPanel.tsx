import { Eye, Save, Settings2 } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import NightOpsShadowPanel from "./NightOpsShadowPanel";
import type {
  NightOpsConfig,
  NightOpsShadowDecision,
  NightOpsShadowMetrics,
  NightOpsShadowValidationStatus,
} from "../types";

interface Props {
  config: NightOpsConfig;
  keywordsInput: string;
  hostGroupsInput: string;
  criticalHostPatternsInput: string;
  alwaysIncludeHostPatternsInput: string;
  shadowDecisions: NightOpsShadowDecision[];
  shadowMetrics: NightOpsShadowMetrics;
  configSaving: boolean;
  configMessage: string | null;
  onConfigNumberChange: (field: keyof NightOpsConfig) => (event: ChangeEvent<HTMLInputElement>) => void;
  onConfigTextChange: (field: keyof NightOpsConfig) => (event: ChangeEvent<HTMLInputElement>) => void;
  onConfigCheckboxChange: (field: keyof NightOpsConfig) => (event: ChangeEvent<HTMLInputElement>) => void;
  onKeywordsChange: (value: string) => void;
  onHostGroupsChange: (value: string) => void;
  onCriticalHostPatternsChange: (value: string) => void;
  onAlwaysIncludeHostPatternsChange: (value: string) => void;
  onSaveConfig: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onValidateShadowDecision: (
    id: string,
    payload: {
      status: Exclude<NightOpsShadowValidationStatus, "pending">;
      validatedBy?: string;
      notes?: string;
    },
  ) => Promise<void>;
}

function NightOpsAdvancedPanel({
  config,
  keywordsInput,
  hostGroupsInput,
  criticalHostPatternsInput,
  alwaysIncludeHostPatternsInput,
  shadowDecisions,
  shadowMetrics,
  configSaving,
  configMessage,
  onConfigNumberChange,
  onConfigTextChange,
  onConfigCheckboxChange,
  onKeywordsChange,
  onHostGroupsChange,
  onCriticalHostPatternsChange,
  onAlwaysIncludeHostPatternsChange,
  onSaveConfig,
  onValidateShadowDecision,
}: Props) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
          Configuracoes e auditoria
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-100">
          Area de supervisao do Sentinel
        </h3>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Shadow Mode</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {config.shadowModeEnabled ? "Ativo" : "Inativo"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Pendentes</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {shadowMetrics.pending}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Falso positivo</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {shadowMetrics.falsePositive}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Falso negativo</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {shadowMetrics.falseNegative}
          </p>
        </div>
      </div>

      <details className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center gap-2 text-slate-100">
            <Eye size={16} className="text-sky-300" />
            <span className="font-medium">Auditoria do Sentinel</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Validacao humana das decisoes de observacao do Shadow Mode.
          </p>
        </summary>
        <div className="mt-4">
          <NightOpsShadowPanel
            enabled={config.shadowModeEnabled}
            metrics={shadowMetrics}
            decisions={shadowDecisions}
            onValidate={onValidateShadowDecision}
          />
        </div>
      </details>

      <details className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center gap-2 text-slate-100">
            <Settings2 size={16} className="text-sky-300" />
            <span className="font-medium">Configuracoes do Sentinel</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Parametros operacionais ajustaveis. Recomendado para supervisao.
          </p>
        </summary>

        {configMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            {configMessage}
          </div>
        ) : null}

        <form className="mt-4 space-y-4" onSubmit={onSaveConfig}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Horario inicial do turno</span>
              <input type="number" min={0} max={23} value={config.defaultStartHour} onChange={onConfigNumberChange("defaultStartHour")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Horario final do turno</span>
              <input type="number" min={0} max={23} value={config.defaultEndHour} onChange={onConfigNumberChange("defaultEndHour")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Timezone</span>
              <input type="text" value={config.timezone} onChange={onConfigTextChange("timezone")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Duracao minima do incidente</span>
              <input type="number" min={1} value={config.minDurationMinutes} onChange={onConfigNumberChange("minDurationMinutes")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Janela de correlacao</span>
              <input type="number" min={1} value={config.correlationWindowMinutes} onChange={onConfigNumberChange("correlationWindowMinutes")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Limite de hosts no mesmo grupo</span>
              <input type="number" min={1} value={config.sameGroupAffectedHostsThreshold} onChange={onConfigNumberChange("sameGroupAffectedHostsThreshold")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Retencao do Shadow Mode (dias)</span>
              <input type="number" min={1} max={365} value={config.shadowModeRetentionDays} onChange={onConfigNumberChange("shadowModeRetentionDays")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Maximo de pendencias herdadas</span>
              <input type="number" min={0} max={20} value={config.maxCarryOverItemsInReport} onChange={onConfigNumberChange("maxCarryOverItemsInReport")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Severidade minima de pendencia herdada</span>
              <input type="text" value={config.carryOverMinSeverity} onChange={onConfigTextChange("carryOverMinSeverity")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
              <input type="checkbox" checked={config.shadowModeEnabled} onChange={onConfigCheckboxChange("shadowModeEnabled")} className="h-4 w-4 rounded border-slate-700 bg-slate-900" />
              <span className="text-sm text-slate-200">Shadow Mode habilitado</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
              <input type="checkbox" checked={config.includeCarryOverInMainReport} onChange={onConfigCheckboxChange("includeCarryOverInMainReport")} className="h-4 w-4 rounded border-slate-700 bg-slate-900" />
              <span className="text-sm text-slate-200">Incluir pendencias herdadas no relatorio principal</span>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-400">Palavras-chave criticas</span>
            <input type="text" value={keywordsInput} onChange={(event) => onKeywordsChange(event.target.value)} placeholder="OLT, POP, BGP, BACKBONE, CORE" className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-400">Padroes de hosts criticos</span>
            <input
              type="text"
              value={criticalHostPatternsInput}
              onChange={(event) => onCriticalHostPatternsChange(event.target.value)}
              placeholder="X9"
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-400">Sempre incluir hosts que contenham</span>
            <input
              type="text"
              value={alwaysIncludeHostPatternsInput}
              onChange={(event) => onAlwaysIncludeHostPatternsChange(event.target.value)}
              placeholder="X9"
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-400">Grupos de hosts permitidos</span>
            <textarea
              value={hostGroupsInput}
              onChange={(event) => onHostGroupsChange(event.target.value)}
              rows={7}
              placeholder={"1000-SERVIDORES\n10031-SPEEDNET\n10031-SPEEDNET/BACKBONE"}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400"
            />
          </label>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-amber-100">Auto escalation</p>
                <p className="mt-1 text-xs text-amber-200">
                  Visivel para configuracao futura, mas bloqueado nesta versao. Nenhum acionamento automatico sera executado.
                </p>
              </div>
              <label className="inline-flex items-center gap-3 text-sm text-slate-300">
                <input type="checkbox" checked={false} disabled readOnly className="h-4 w-4 rounded border-slate-700 bg-slate-900" />
                Desativado
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={configSaving} className="inline-flex items-center gap-2 rounded-3xl bg-noc-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60">
              <Save size={16} />
              {configSaving ? "Salvando..." : "Salvar configuracoes"}
            </button>
          </div>
        </form>
      </details>
    </section>
  );
}

export default NightOpsAdvancedPanel;
