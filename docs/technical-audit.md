# Technical Audit - NOC AI Platform

## Escopo Da Leitura

Foram revisados frontend React/TypeScript, camada Zabbix JSON-RPC, adapters, hooks, paginas, componentes, parser local, cliente do agente, servidor local de IA e configuracao de build/testes.

## Arquitetura Encontrada

Fluxo principal:

```text
React pages/components
  -> hooks
    -> zabbixService
      -> api.callZabbix
        -> Zabbix JSON-RPC
```

Fluxo IA:

```text
/ia
  -> agentClient
    -> /ai-api/query
      -> server/aiAgentServer.mjs
        -> Zabbix JSON-RPC
        -> Groq/Llama
    -> fallback aiQueryService
```

Analise de alarme:

```text
/problems
  -> agentClient.analyzeProblemWithAgent
    -> /ai-api/analyze-problem
      -> Groq/Llama
    -> fallback local
```

## Pontos Fortes

- Integracao real com Zabbix via `host.get`, `problem.get`, `event.get`, `trigger.get` e `apiinfo.version`.
- Autenticacao flexivel com token e `user.login`, incluindo compatibilidade `username`/`user`.
- Camada de adapter separa parcialmente resposta crua do Zabbix da UI.
- Agente IA isolado em backend local, sem expor chave Groq no frontend.
- Parser local mantido como fallback operacional.
- Testes automatizados ja cobrem parte importante do parser.
- UI possui rotas operacionais separadas para dashboard, hosts, problemas, enlaces, logs, IA e settings.

## Fragilidades E Riscos

- Ainda ha uso de `any` em services/adapters, reduzindo seguranca de tipo contra mudancas da API Zabbix.
- Hooks de dados repetem bastante codigo de loading/error/retry.
- Algumas queries do Zabbix usam ordenacao por campos que variam entre versoes; `problem.get` ja precisou fallback para evitar erro.
- A tela de dashboard fazia consultas independentes das paginas especificas, gerando duplicidade quando o operador navega bastante.
- Algumas acoes de UI eram decorativas ou pouco acionaveis, como botao de configuracoes no header e botao de detalhe no dashboard.
- A tela de enlaces ainda representa triggers ativos, nao enlaces semanticamente identificados.
- O agente usa contexto compacto por limite de tokens; isso e correto para o free tier, mas pode causar respostas baseadas em amostra.
- Mensagens e textos tem alguns sinais de encoding inconsistente em arquivos antigos.
- Nao havia linting configurado no projeto ate esta auditoria.

## Bugs/Edge Cases Identificados

- `apiinfo.version` precisa ser chamado sem `auth`; corrigido antes desta auditoria.
- `user.login` pode exigir `username` em vez de `user`; corrigido antes desta auditoria.
- `event.get` no server de IA ainda usava `sortfield: "clock"`, potencialmente sujeito ao mesmo problema visto em `problem.get`.
- Header tinha botao "Configuracoes" sem navegacao.
- `ActiveIssuesTable` exibia "Atualizado ha 2 min" fixo, mesmo sem refresh real.
- Copia via `navigator.clipboard` pode falhar em contextos nao seguros ou bloqueados pelo navegador.
- Hooks de carregamento podem tentar setar estado depois de unmount em alguns fluxos.

## Oportunidades NOC/CGR

- Criar visao de top ofensores por host e grupo.
- Adicionar classificacao de impacto operacional por tipo de alarme.
- Gerar runbook simples por categoria: ICMP, interface, GPON/OLT, energia, BGP, latencia/perda.
- Consolidar alarmes repetidos por host.
- Dar resumo executivo para supervisao/CGR.
- Evidenciar proximas acoes e mensagem pronta para escalonamento.
- Melhorar identificacao real de enlaces via tags, templates ou grupos no Zabbix.

## Prioridades Aplicadas Nesta Rodada

1. Criar camada de dominio para insights operacionais reutilizaveis.
2. Adicionar testes para classificacao, top ofensores, runbook e saude por grupo.
3. Melhorar dashboard com painel de triagem NOC/CGR.
4. Corrigir acoes de UI sem destino claro.
5. Fortalecer server IA contra versoes diferentes do Zabbix.
6. Documentar estado final e debitos remanescentes.
