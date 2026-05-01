# IA-ZBX - NOC AI Platform

IA-ZBX e um painel NOC para Zabbix com frontend React/Vite e um backend local de IA. Nesta versao, o projeto ganhou o modulo `NOC Sentinel / NightOps`, que funciona como um analista NOC noturno automatizado: correlaciona alarmes ativos, aplica regras deterministicas, recomenda escalonamento e gera passagem de turno.

Importante: esta versao nao aciona pessoas automaticamente. Ela apenas analisa, classifica, recomenda e gera mensagens/relatorios para validacao humana.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router DOM
- Lucide React
- Vitest
- Zabbix JSON-RPC API
- Groq opcional
- OpenRouter opcional

## O que existe hoje

- Integracao real com Zabbix:
  - `apiinfo.version`
  - `host.get`
  - `problem.get`
  - `event.get`
  - `trigger.get`
- Paginas existentes preservadas:
  - `/dashboard`
  - `/hosts`
  - `/problems`
  - `/links`
  - `/logs`
  - `/ia`
  - `/settings`
- Nova pagina:
  - `/nightops`
- Backend local de IA com endpoints antigos preservados:
  - `GET /ai-api/health`
  - `POST /ai-api/query`
  - `POST /ai-api/analyze-problem`
- Novos endpoints NightOps:
  - `GET /ai-api/nightops/status`
  - `POST /ai-api/nightops/analyze`
  - `POST /ai-api/nightops/shift-report`
- Fallback local preservado em `src/services/aiQueryService.ts`

## Estrutura principal

```text
src/
  pages/
    NightOpsPage.tsx
  services/
    agentClient.ts
    aiQueryService.ts
    nightOpsClient.ts
    zabbixService.ts
  types/
    index.ts
server/
  ai/
    aiRouter.mjs
    prompts/
    providers/
  data/
    nightOpsStore.mjs
  nightops/
    correlationEngine.mjs
    escalationRules.mjs
    incidentClassifier.mjs
    nightOpsService.mjs
    shiftReportService.mjs
  zabbix/
    zabbixServerClient.mjs
  aiAgentServer.mjs
```

## Requisitos

- Node.js 18+
- npm
- Acesso a uma instancia Zabbix
- Token de API ou usuario/senha do Zabbix

## Instalacao

```bash
npm install
```

## Configuracao

Crie `.env.local` na raiz. Exemplo minimo:

```env
VITE_API_BASE_URL=https://seu-zabbix.com.br/zabbix/zabbix.php
VITE_API_TOKEN=seu_token_aqui

AI_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant

OPENROUTER_API_KEY=
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_SITE_URL=http://localhost:5173
OPENROUTER_APP_NAME=IA-ZBX

NIGHTOPS_DEFAULT_START_HOUR=19
NIGHTOPS_DEFAULT_END_HOUR=7
NIGHTOPS_TIMEZONE=America/Sao_Paulo
NIGHTOPS_MIN_DURATION_MINUTES=5
NIGHTOPS_CORRELATION_WINDOW_MINUTES=10
```

Tambem sao aceitas variaveis sem prefixo `VITE_` no backend:

```env
ZABBIX_API_BASE_URL=https://seu-zabbix.com.br/zabbix/zabbix.php
ZABBIX_API_TOKEN=
ZABBIX_USER=
ZABBIX_PASSWORD=
AI_AGENT_PORT=8787
```

## Provedores de IA

### Groq

Padrao de compatibilidade.

```env
AI_PROVIDER=groq
GROQ_API_KEY=sua_chave
GROQ_MODEL=llama-3.1-8b-instant
```

### OpenRouter / Claude

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sua_chave
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_SITE_URL=http://localhost:5173
OPENROUTER_APP_NAME=IA-ZBX
```

Comportamento:

- Se `AI_PROVIDER` nao for definido, o backend tenta `groq`.
- Se o provedor configurado falhar, o frontend continua com fallback local em `/ia`.
- Chaves de IA ficam apenas no backend.

## Como rodar

Desenvolvimento:

```bash
npm run dev
```

Servidor local do agente:

```bash
npm run ai:server
```

Use dois terminais durante o desenvolvimento:

```bash
npm run ai:server
```

```bash
npm run dev
```

O proxy `/ai-api` do Vite aponta para `http://localhost:8787`.

## NightOps / NOC Sentinel

O modulo NightOps:

- busca problemas ativos no Zabbix;
- consulta hosts e eventos relacionados;
- classifica incidentes com regras fixas;
- correlaciona alarmes por grupo, host, severidade, horario e palavras-chave;
- usa IA apenas para explicacao, causa provavel, mensagens e resumo;
- gera relatorio de turno.

### Regras deterministicas atuais

- `Disaster` com duracao acima do limite recomenda escalonamento.
- `High/Disaster` com muitos hosts do mesmo grupo vira incidente correlacionado e pode recomendar escalonamento.
- palavras-chave como `OLT`, `POP`, `Backbone`, `BGP`, `Core`, `Transporte`, `Link` e `Enlace` elevam prioridade.
- normalizacao em menos de 3 minutos tende a virar ruido/monitoramento.
- host isolado de baixo alcance nao vira acionamento critico automaticamente.

### Limite operacional desta versao

O sistema recomenda escalonamento, mas nao deve acionar pessoas automaticamente sem validacao humana.

## Endpoints

### Saude e IA

- `GET /ai-api/health`
- `POST /ai-api/query`
- `POST /ai-api/analyze-problem`

### NightOps

#### `GET /ai-api/nightops/status`

Retorna a ultima analise salva em memoria:

```json
{
  "status": "ok",
  "generatedAt": "2026-04-30T22:00:00.000Z",
  "summary": {
    "activeProblems": 3,
    "criticalIncidents": 1,
    "warningIncidents": 1,
    "ignoredNoise": 1,
    "escalationRecommended": 1
  },
  "incidents": []
}
```

#### `POST /ai-api/nightops/analyze`

Executa a analise NightOps completa.

#### `POST /ai-api/nightops/shift-report`

Body opcional:

```json
{
  "start": "2026-04-30T19:00:00-03:00",
  "end": "2026-05-01T07:00:00-03:00"
}
```

Sem body, usa o periodo noturno padrao configurado.

## Testes e build

Testes:

```bash
npm run test
```

Build:

```bash
npm run build
```

Cobertura minima adicionada:

- parser local de IA
- `incidentClassifier`
- `correlationEngine`
- `escalationRules`
- `shiftReportService`

## Validacao recomendada

1. Suba o agente com `npm run ai:server`.
2. Suba o frontend com `npm run dev`.
3. Valide:
   - `/ia`
   - `/problems`
   - `/nightops`
4. Em `/nightops`, rode:
   - `Analisar agora`
   - `Gerar relatorio do turno`

## Limitacoes

- A correlacao usa grupos, nomes e palavras-chave como fallback; nao depende de tags perfeitas do Zabbix.
- O store do NightOps e em memoria local do processo.
- O relatorio de turno usa as analises salvas no backend ativo.
- A qualidade da explicacao por IA depende do contexto compacto enviado ao modelo.

## Seguranca

- Nao exponha `GROQ_API_KEY` nem `OPENROUTER_API_KEY` no frontend.
- Nao comite `.env.local`.
- Nao use esta versao para acionamento automatico de campo, engenharia ou supervisao.

## Proximos passos

- Persistir historico NightOps em banco ou arquivo.
- Melhorar correlacao com tags/servicos reais do Zabbix.
- Adicionar filtros de periodo reais para eventos e problemas.
- Evoluir para workflow de aprovacao humana antes de qualquer acao externa.
