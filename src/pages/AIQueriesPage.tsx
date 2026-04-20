import { useState, type FormEvent } from "react";
import { Send, Sparkles } from "lucide-react";
import type { AIConversation } from "../types";
import { aiQuerySuggestions } from "../services/aiQueryService";
import { resolveOperationalQuery } from "../services/agentClient";
import AssistantMessage from "../components/AssistantMessage";

const initialConversation: AIConversation[] = [
  {
    role: "assistant",
    message:
      "Consultas disponiveis: hosts por nome, grupo, IP e status; alarmes por host; eventos por host; e visoes High/Disaster.",
    timestamp: "Agora",
  },
];

function getTimestampLabel() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AIQueriesPage() {
  const [history, setHistory] =
    useState<AIConversation[]>(initialConversation);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = input.trim();
    if (!text || loading) {
      return;
    }

    const timestamp = getTimestampLabel();

    setHistory((current) => [
      ...current,
      {
        role: "operator",
        message: text,
        timestamp,
      },
    ]);
    setInput("");
    setLoading(true);

    try {
      const result = await resolveOperationalQuery(text);
      setHistory((current) => [
        ...current,
        {
          role: "assistant",
          message: result.answer,
          timestamp: getTimestampLabel(),
          source: result.source,
          model: result.model,
          contextCounts: result.contextCounts,
        },
      ]);
    } catch (error) {
      setHistory((current) => [
        ...current,
        {
          role: "assistant",
          message: `Nao foi possivel responder agora: ${(error as Error).message}`,
          timestamp: getTimestampLabel(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Consultas IA
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-100">
                Operacao assistida por consulta
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                Esta tela usa um agente NOC com contexto real do Zabbix quando
                o servidor de IA esta ativo. Se o agente estiver indisponivel, o
                parser local assume a consulta como fallback.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
              Zabbix + agente NOC
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {aiQuerySuggestions.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleExampleClick(prompt)}
                className="rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs text-slate-300 transition hover:border-slate-700 hover:bg-slate-800"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
          <Sparkles size={16} />
          <span>Historico da conversa</span>
        </div>

        <div className="space-y-4">
          {history.map((entry, index) => (
            <article
              key={`${entry.timestamp}-${index}`}
              className={`rounded-3xl border p-4 ${
                entry.role === "assistant"
                  ? "border-slate-800 bg-slate-950/80"
                  : "border-sky-500/20 bg-sky-500/10"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  {entry.role === "assistant" ? "Assistente" : "Operador"}
                </span>
                <span className="text-xs text-slate-500">{entry.timestamp}</span>
              </div>
              {entry.role === "assistant" ? (
                <>
                  {entry.source ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
                        Fonte: {entry.source === "groq-agent" ? "Agente Groq" : "Parser local"}
                      </span>
                      {entry.model ? (
                        <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
                          Modelo: {entry.model}
                        </span>
                      ) : null}
                      {entry.contextCounts ? (
                        <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
                          Contexto: {entry.contextCounts.hosts} hosts,{" "}
                          {entry.contextCounts.problems} alarmes,{" "}
                          {entry.contextCounts.events} eventos
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <AssistantMessage message={entry.message} />
                </>
              ) : (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                  {entry.message}
                </p>
              )}
            </article>
          ))}

          {loading ? (
            <article className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Assistente
                </span>
                <span className="text-xs text-slate-500">Agora</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Consultando dados do Zabbix...
              </p>
            </article>
          ) : null}
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSend}>
          <textarea
            rows={4}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ex.: hosts com olt no nome e offline, hosts do grupo speednet, alarmes do host X"
            className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center gap-2 rounded-3xl bg-noc-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Consultando..." : "Enviar consulta"}
              <Send size={16} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AIQueriesPage;
