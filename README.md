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
  - `GET /ai-api/nightops/config`
  - `GET /ai-api/nightops/history`
  - `GET /ai-api/nightops/shadow`
  - `GET /ai-api/nightops/shadow/metrics`
  - `GET /ai-api/nightops/reports`
  - `GET /ai-api/nightops/reports/latest`
  - `POST /ai-api/nightops/analyze`
  - `POST /ai-api/nightops/shift-report`
  - `PUT /ai-api/nightops/config`
  - `PUT /ai-api/nightops/shadow/:id/validation`
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
    nightops-config.json
    nightops-history.json
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

### Persistencia local do historico

O historico do NightOps agora fica salvo localmente em:

```text
server/data/nightops-history.json
```

Comportamento atual:

- o arquivo e criado automaticamente se nao existir;
- analises e incidentes de `POST /ai-api/nightops/analyze` sao persistidos;
- relatorios de `POST /ai-api/nightops/shift-report` sao persistidos;
- se o JSON estiver vazio ou invalido, o backend recria a estrutura padrao;
- se o JSON estiver corrompido, o backend cria um backup `.bak-<timestamp>` e segue com historico vazio.

Essa persistencia e adequada para MVP local, mas nao substitui armazenamento transacional.

### Configuracao ajustavel do Sentinel

As regras operacionais ajustaveis do NightOps ficam em:

```text
server/data/nightops-config.json
```

Hierarquia atual:

- `.env` e `.env.local` continuam como default inicial;
- `nightops-config.json` passa a ser a configuracao persistida e ajustavel pelo frontend;
- a tela `/nightops` permite editar os parametros sem alterar codigo.

Parametros atuais:

- horario inicial e final do turno;
- timezone;
- duracao minima para considerar incidente;
- janela de correlacao;
- limite de hosts afetados no mesmo grupo;
- palavras-chave criticas;
- `autoEscalationEnabled`, visivel mas mantido desativado nesta fase.
- `shadowModeEnabled`, ativo por padrao;
- `shadowModeRetentionDays`, para limpeza do historico de observacao.

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

#### `GET /ai-api/nightops/history`

Retorna o historico de incidentes persistidos:

```json
{
  "status": "ok",
  "items": [],
  "count": 0
}
```

Filtros opcionais via query string:

- `severity`
- `status`
- `start`
- `end`
- `escalationRequired`

#### `GET /ai-api/nightops/reports`

Retorna os relatorios de turno persistidos.

#### `GET /ai-api/nightops/reports/latest`

Retorna o ultimo relatorio salvo.

#### `GET /ai-api/nightops/shadow`

Retorna as decisoes registradas pelo Shadow Mode.

Filtros opcionais:

- `start`
- `end`
- `decision`
- `severity`
- `validationStatus`
- `wouldNotify`

#### `GET /ai-api/nightops/shadow/metrics`

Retorna metricas agregadas do Shadow Mode.

#### `PUT /ai-api/nightops/shadow/:id/validation`

Atualiza a validacao humana de uma decisao shadow.

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
- O historico do NightOps usa arquivo JSON local, sem concorrencia sofisticada nem locking distribuido.
- A configuracao operacional do NightOps tambem usa arquivo JSON local.
- O relatorio de turno usa as analises salvas no backend ativo.
- A qualidade da explicacao por IA depende do contexto compacto enviado ao modelo.
- Para evolucao futura, o recomendado e migrar a persistencia para SQLite ou PostgreSQL.

## Shadow Mode

O Shadow Mode e uma fase de observacao operacional:

- nao aciona ninguem;
- nao envia Telegram, WhatsApp, Discord ou e-mail;
- registra o que o sistema teria feito;
- permite validacao humana posterior;
- ajuda a medir falso positivo e falso negativo;
- e recomendado rodar por 7 a 15 dias antes de considerar qualquer notificacao externa.

Decisoes registradas:

- `ignore`
- `monitor`
- `recommend_escalation`

Cada decisao guarda tambem:

- severidade;
- justificativa;
- evidencias;
- confianca;
- se `wouldNotify` seria verdadeiro em uma fase futura;
- validacao humana com `pending`, `correct`, `false_positive`, `false_negative` ou `partially_correct`.

## Seguranca

- Nao exponha `GROQ_API_KEY` nem `OPENROUTER_API_KEY` no frontend.
- Nao comite `.env.local`.
- Nao use esta versao para acionamento automatico de campo, engenharia ou supervisao.

## Proximos passos

- Persistir historico NightOps em banco ou arquivo.
- Melhorar correlacao com tags/servicos reais do Zabbix.
- Adicionar filtros de periodo reais para eventos e problemas.
- Evoluir para workflow de aprovacao humana antes de qualquer acao externa.
