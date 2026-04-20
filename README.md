# IA-ZBX - NOC AI Platform

Dashboard NOC com consultas assistidas por IA para operacao de ambiente Zabbix. O projeto usa React, TypeScript e Vite no frontend, consumindo a API JSON-RPC do Zabbix diretamente pelo navegador durante o desenvolvimento, com proxy local do Vite.

O foco do sistema e substituir telas baseadas em mock por dados reais do Zabbix e preparar uma camada intermediaria compatível com uma futura integracao MCP/IA.

## Participantes

- Juan Grochowski - D30224
- Awo Carvalho - D29997
- Wallacy Matheus - D27030
- Walen Kidely - D30213
- Zhou Chen - D29031
- Fernando Marques - D28363

## Status Atual

Implementado:

- Dashboard com dados reais de hosts, problemas e eventos.
- Integracao com Zabbix API:
  - `apiinfo.version`
  - `host.get`
  - `problem.get`
  - `event.get`
  - `trigger.get`
- Autenticacao por token ou login `user.login`.
- Fallback de token via `auth` no corpo quando necessario.
- Filtro operacional para alarmes `High` e `Disaster`.
- Paginas reais:
  - Dashboard
  - Hosts
  - Problemas
  - Enlaces/Triggers
  - Logs/Eventos
  - Consultas IA
  - Settings/Diagnostico
- Camada MCP simulada.
- Agente NOC opcional via Groq/Llama para consultas em linguagem natural.
- Parser local de consultas operacionais como fallback.
- Testes automatizados para a camada de IA.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router DOM
- Lucide React
- Vitest
- Zabbix JSON-RPC API
- Groq API opcional para agente IA

## Estrutura do Projeto

```text
src/
  adapters/
    zabbixAdapter.ts        # Normalizacao de respostas cruas do Zabbix para UI
  components/
    ActiveIssuesTable.tsx
    Header.tsx
    HostTable.tsx
    QueryConsole.tsx
    RecentEventsPanel.tsx
    Sidebar.tsx
    StatCard.tsx
    ZabbixMetricsPanel.tsx
    ZabbixStatusPanel.tsx
  hooks/
    useApiStatus.ts
    useDashboardData.ts
    useEvents.ts
    useHosts.ts
    useProblems.ts
    useSettingsDiagnostics.ts
    useTriggers.ts
    useZabbixMetrics.ts
  pages/
    AIQueriesPage.tsx
    DashboardPage.tsx
    HostsPage.tsx
    LinksPage.tsx
    LogsPage.tsx
    ProblemsPage.tsx
    SettingsPage.tsx
  services/
    api.ts                  # Cliente base Zabbix JSON-RPC
    agentClient.ts          # Cliente frontend do agente IA com fallback local
    aiQueryService.ts       # Parser e resolucao de consultas IA
    aiQueryService.test.ts  # Testes automatizados do parser
    mcpClient.ts            # Camada MCP simulada
    zabbixService.ts        # Servicos de alto nivel do Zabbix
  types/
    index.ts
  utils/
    retry.ts
server/
  aiAgentServer.mjs         # Backend local do agente NOC via Groq/Llama
```

## Requisitos

- Node.js 18 ou superior.
- npm.
- Uma instancia Zabbix acessivel pela maquina local.
- Token de API do Zabbix ou usuario/senha validos.

## Instalacao

```bash
npm install
```

## Configuracao de Ambiente

Crie um arquivo `.env.local` na raiz do projeto.

Exemplo com token:

```env
VITE_API_BASE_URL=https://seu-zabbix.com.br/zabbix/zabbix.php
VITE_API_TOKEN=seu_token_aqui
```

Exemplo com usuario e senha:

```env
VITE_API_BASE_URL=https://seu-zabbix.com.br/zabbix/zabbix.php
VITE_ZABBIX_USER=seu_usuario
VITE_ZABBIX_PASSWORD=sua_senha
```

Tambem e aceito:

```env
VITE_API_KEY=seu_token_aqui
```

### Agente IA via Groq

Para usar agente real na tela `/ia`, adicione tambem:

```env
GROQ_API_KEY=sua_chave_groq
GROQ_MODEL=llama-3.1-8b-instant
```

Opcionalmente, o backend do agente tambem aceita variaveis sem prefixo `VITE_`:

```env
ZABBIX_API_BASE_URL=https://seu-zabbix.com.br/zabbix/zabbix.php
ZABBIX_API_TOKEN=seu_token_zabbix
ZABBIX_USER=seu_usuario
ZABBIX_PASSWORD=sua_senha
AI_AGENT_PORT=8787
```

Se essas variaveis sem `VITE_` nao existirem, o servidor do agente usa as variaveis `VITE_API_BASE_URL`, `VITE_API_TOKEN`, `VITE_API_KEY`, `VITE_ZABBIX_USER` e `VITE_ZABBIX_PASSWORD` do `.env.local`.

### Observacoes importantes

- `.env.local` esta no `.gitignore` e nao deve ser commitado.
- A URL pode apontar para `/zabbix.php`; o sistema normaliza para `/api_jsonrpc.php`.
- Em desenvolvimento, o Vite usa proxy `/api` para evitar problemas de CORS.

## Autenticacao Zabbix

O cliente suporta dois modos:

1. Token
   - Usa `VITE_API_TOKEN` ou `VITE_API_KEY`.
   - Envia headers `X-API-KEY` e `X-Auth-Token`.
   - Se o Zabbix rejeitar header puro, tenta fallback usando `auth` no corpo.

2. Usuario e senha
   - Usa `VITE_ZABBIX_USER` e `VITE_ZABBIX_PASSWORD`.
   - Executa `user.login`.
   - Usa o token de sessao retornado nas chamadas seguintes.

Se token e usuario/senha existirem ao mesmo tempo, o fluxo efetivo prioriza `user.login`.

## Comandos

Rodar desenvolvimento:

```bash
npm run dev
```

Rodar o agente IA local:

```bash
npm run ai:server
```

Para desenvolvimento com agente, use dois terminais:

```bash
npm run ai:server
```

```bash
npm run dev
```

Build de producao:

```bash
npm run build
```

Preview do build:

```bash
npm run preview
```

Testes automatizados:

```bash
npm run test
```

## Rotas

| Rota | Descricao |
| --- | --- |
| `/dashboard` | Visao geral operacional |
| `/hosts` | Inventario operacional de hosts |
| `/problems` | Alarmes ativos High/Disaster |
| `/links` | Triggers ativos tratados como visao de enlaces |
| `/logs` | Eventos recentes High/Disaster |
| `/ia` | Console de consultas operacionais |
| `/settings` | Diagnostico da integracao Zabbix |

## Agente IA

O projeto possui duas camadas para a tela `/ia`:

1. Agente NOC via Groq/Llama
   - Roda no backend local `server/aiAgentServer.mjs`.
   - Usa `GROQ_API_KEY`, que nunca deve ir para o frontend.
   - Consulta dados reais do Zabbix no servidor.
   - Envia ao modelo apenas um contexto operacional compacto.
   - Responde com analise em linguagem natural.

2. Parser local
   - Continua existindo em `src/services/aiQueryService.ts`.
   - Entra automaticamente como fallback se o agente estiver indisponivel.

Fluxo:

```text
Frontend /ia
  -> src/services/agentClient.ts
    -> /ai-api/query
      -> server/aiAgentServer.mjs
        -> Zabbix API
        -> Groq/Llama
    -> fallback: aiQueryService.ts
```

O proxy `/ai-api` do Vite aponta para `http://localhost:8787`.

## Dados Zabbix Utilizados

### Hosts

Fonte:

- `host.get`

Campos principais:

- `hostid`
- `host`
- `name`
- `status`
- `lastaccess`
- `maintenance_status`
- `interfaces.ip`
- `interfaces.main`
- `interfaces.type`
- `interfaces.available`
- `groups.name`

Status operacional:

- `interfaces.available = 1` -> `Online`
- `interfaces.available = 2` -> `Offline`
- `interfaces.available = 0` ou sem telemetria -> `Degradado`
- `host.status = 1` -> `Offline` / desabilitado
- `maintenance_status = 1` -> `Degradado`

### Problemas

Fonte:

- `problem.get`

Filtro:

- Severidades `4` e `5`
- Mapeamento:
  - `4` -> `High`
  - `5` -> `Disaster`

### Eventos

Fonte:

- `event.get`

Filtro:

- Severidades `4` e `5`

### Triggers

Fonte:

- `trigger.get`

Uso atual:

- Base para a tela `/links`.
- Atualmente representa triggers ativos, nao necessariamente enlaces modelados formalmente.

## Observacao Sobre a Tela de Enlaces

A tela `/links` usa `trigger.get` com triggers ativos e severidade alta para montar uma visao operacional.

Importante: ela ainda nao identifica enlace de forma semantica perfeita. Para isso, o ideal e padronizar no Zabbix algum criterio como:

- tag de trigger ou host, por exemplo `type=link` ou `service=enlace`
- host group dedicado
- template especifico de circuito/WAN
- item keys de interface, latencia, perda ou disponibilidade

## Camadas

### `services/api.ts`

Cliente baixo nivel da API Zabbix:

- normaliza URL
- configura proxy em desenvolvimento
- gerencia token/login
- executa chamadas JSON-RPC
- testa conexao
- expõe resumo de runtime para a tela de settings

### `services/zabbixService.ts`

Camada de servicos de alto nivel:

- `getHostsDetailed()`
- `getProblemsDetailed()`
- `getEvents()`
- `getTriggers()`

### `adapters/zabbixAdapter.ts`

Normaliza dados crus do Zabbix para os tipos usados pela UI:

- severidade numerica para texto
- timestamps para formato amigavel
- interface principal do host
- status operacional
- host/grupo/IP

### `services/mcpClient.ts`

Camada intermediaria simulando MCP.

Hoje apenas chama `zabbixService`, mas foi separada para no futuro ser substituida por uma API MCP real.

### `services/agentClient.ts`

Cliente do frontend para o agente IA:

- chama `/ai-api/query`
- recebe a resposta do agente Groq/Llama
- cai no parser local quando o agente nao responde

### `server/aiAgentServer.mjs`

Backend local do agente NOC:

- le `.env.local` e `.env`
- consulta Zabbix diretamente no servidor
- monta contexto compacto com hosts, alarmes e eventos
- chama Groq usando API compativel com OpenAI Chat Completions
- retorna resposta operacional para a tela `/ia`

### `services/aiQueryService.ts`

Parser simples de consultas operacionais.

Ele interpreta consultas como:

- hosts por nome
- hosts por IP
- hosts por grupo
- hosts por status
- filtros compostos
- contagem
- limite de resultados
- alarmes por host
- eventos por host
- negacao simples
- ausencia de alarmes

## Exemplos de Consultas IA

Hosts:

```text
quais hosts estao offline?
quantos hosts com olt no nome estao ativos?
top 10 hosts com olt no nome
hosts com olt no nome e offline
hosts com olt no nome que nao estao offline
quais hosts tem o IP 10.200.12.114?
hosts do grupo speednet offline
hosts do grupo speednet sem alarmes disaster
```

Alarmes:

```text
resuma os alarmes ativos
mostre alarmes disaster
liste 10 alarmes high
quais alarmes do host 10031-260GS_ARENA_MRV?
```

Eventos:

```text
liste os eventos recentes
liste 10 eventos recentes
quais eventos do host arena?
```

## Testes

A camada de IA tem testes automatizados com Vitest:

```bash
npm run test
```

Cenarios cobertos:

- busca por termo no nome
- combinacao nome + status
- busca por IP
- grupo + status
- limite com `top N`
- negacao de status
- hosts sem alarmes disaster
- alarmes por host
- eventos por host

## Build

```bash
npm run build
```

O build executa:

1. TypeScript
2. Vite build

## Seguranca

Nao comite:

- `.env.local`
- tokens
- senhas
- dumps de API
- logs com informacoes sensiveis

Arquivos ja ignorados:

- `.env`
- `.env.local`
- `node_modules`
- `dist`
- `*.log`
- `.vite`

## Fluxo de Desenvolvimento Recomendado

1. Ajustar codigo.
2. Rodar testes:

   ```bash
   npm run test
   ```

3. Rodar build:

   ```bash
   npm run build
   ```

4. Testar manualmente no navegador:

   ```bash
   npm run dev
   ```

5. Fazer commit.

## Proximos Passos Tecnicos

Prioridades recomendadas:

- Extrair o parser de consultas para um modulo puro separado.
- Melhorar o vinculo entre hosts e problemas usando IDs ou um mapa mais confiavel do Zabbix.
- Implementar criterio real para identificar enlaces.
- Adicionar filtros de periodo em eventos.
- Adicionar ordenacao por criterios como recente, nome, severidade.
- Evoluir `mcpClient.ts` para uma integracao MCP real.
- Adicionar mais testes para consultas de negacao, ausencia, ordenacao e limites.

## Troubleshooting

### Tela mostra erro de conexao

Verifique:

- `VITE_API_BASE_URL`
- token ou usuario/senha
- acesso de rede ao Zabbix
- se a URL foi normalizada corretamente para `/api_jsonrpc.php`

### Zabbix retorna "Not authorized"

Possiveis causas:

- token invalido
- token sem permissao
- usuario sem permissao
- API esperando `auth` no corpo em vez de header

O cliente ja tenta fallback de token via `auth`, mas em alguns ambientes pode ser melhor usar `VITE_ZABBIX_USER` e `VITE_ZABBIX_PASSWORD`.

### Busca IA nao retorna o esperado

Rode:

```bash
npm run test
```

Depois valide manualmente em `/ia` com consultas simples antes de testar filtros compostos.

### Agente IA nao responde

Verifique:

- `npm run ai:server` esta rodando em outro terminal
- `GROQ_API_KEY` existe no `.env.local`
- a rota `http://localhost:8787/ai-api/health` responde
- o Vite esta rodando com `npm run dev`

Se o agente falhar, a tela `/ia` usa automaticamente o parser local.

## Licenca

Projeto privado/interno. Defina uma licenca antes de distribuir publicamente.
