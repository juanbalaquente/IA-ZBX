function normalizeZabbixApiUrl(rawUrl: string): string {
  try {
    const parsedUrl = new URL(rawUrl);
    if (parsedUrl.pathname.endsWith("/zabbix.php")) {
      parsedUrl.pathname = parsedUrl.pathname.replace(
        /\/zabbix\.php$/,
        "/api_jsonrpc.php",
      );
      parsedUrl.search = "";
    }
    return parsedUrl.toString();
  } catch {
    return rawUrl;
  }
}

export const apiConfig = {
  rawBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  normalizedBaseUrl: normalizeZabbixApiUrl(
    import.meta.env.VITE_API_BASE_URL ?? "",
  ),
  baseUrl: import.meta.env.DEV
    ? "/api"
    : normalizeZabbixApiUrl(import.meta.env.VITE_API_BASE_URL ?? ""),
  apiToken:
    import.meta.env.VITE_API_TOKEN ?? import.meta.env.VITE_API_KEY ?? "",
  user: import.meta.env.VITE_ZABBIX_USER ?? "",
  password: import.meta.env.VITE_ZABBIX_PASSWORD ?? "",
};

export const hasApiConfiguration = Boolean(apiConfig.rawBaseUrl) &&
  Boolean(apiConfig.apiToken || (apiConfig.user && apiConfig.password));

export const zabbixAlarmSeverities = [4, 5] as const;

export type ApiAuthMode = "api-token" | "user-login" | "unconfigured";

export interface ApiRuntimeSummary {
  rawBaseUrl: string;
  normalizedBaseUrl: string;
  requestBaseUrl: string;
  environment: "development" | "production";
  usesProxy: boolean;
  authMode: ApiAuthMode;
  hasToken: boolean;
  hasUser: boolean;
  hasPassword: boolean;
  hasRedundantAuthConfig: boolean;
  isConfigured: boolean;
}

export interface ApiConnectionResult {
  success: boolean;
  status: string;
  details?: string;
}

interface ZabbixRpcResponse<T> {
  jsonrpc: string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data: string;
  };
}

let cachedAuthToken: string | null = null;

function isApiTokenMode() {
  return Boolean(apiConfig.apiToken) && !(apiConfig.user && apiConfig.password);
}

export function getApiRuntimeSummary(): ApiRuntimeSummary {
  const hasToken = Boolean(apiConfig.apiToken);
  const hasUser = Boolean(apiConfig.user);
  const hasPassword = Boolean(apiConfig.password);
  const hasCredentialPair = hasUser && hasPassword;

  return {
    rawBaseUrl: apiConfig.rawBaseUrl || "Nao configurado",
    normalizedBaseUrl: apiConfig.normalizedBaseUrl || "Nao configurado",
    requestBaseUrl: apiConfig.baseUrl || "Nao configurado",
    environment: import.meta.env.DEV ? "development" : "production",
    usesProxy: import.meta.env.DEV,
    authMode: hasCredentialPair
      ? "user-login"
      : hasToken
        ? "api-token"
        : "unconfigured",
    hasToken,
    hasUser,
    hasPassword,
    hasRedundantAuthConfig: hasToken && hasCredentialPair,
    isConfigured: hasApiConfiguration,
  };
}

async function getAuthToken(): Promise<string | null> {
  if (isApiTokenMode()) {
    return apiConfig.apiToken;
  }

  if (cachedAuthToken) {
    return cachedAuthToken;
  }

  if (apiConfig.user && apiConfig.password) {
    const token = await callZabbix<string>(
      "user.login",
      {
        user: apiConfig.user,
        password: apiConfig.password,
      },
      { skipAuth: true },
    );
    cachedAuthToken = token;
    return token;
  }

  return null;
}

export async function callZabbix<T>(
  method: string,
  params: unknown = {},
  options: { skipAuth?: boolean } = {},
) {
  if (!apiConfig.rawBaseUrl) {
    throw new Error("A URL da API não está configurada.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const useApiToken = isApiTokenMode();
  const authToken = options.skipAuth ? null : await getAuthToken();

  if (useApiToken) {
    headers["X-API-KEY"] = apiConfig.apiToken;
    headers["X-Auth-Token"] = apiConfig.apiToken;
  }

  const body: Record<string, unknown> = {
    jsonrpc: "2.0",
    method,
    params,
    id: 1,
  };

  if (!options.skipAuth && !useApiToken) {
    body.auth = authToken ?? null;
  }

  const sendRequest = async (requestBody: Record<string, unknown>) => {
    const response = await fetch(apiConfig.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    return (await response.json()) as ZabbixRpcResponse<T>;
  };

  let json = await sendRequest(body);

  if (
    json.error &&
    useApiToken &&
    !options.skipAuth &&
    /not authorized/i.test(`${json.error.message} ${json.error.data}`) &&
    apiConfig.apiToken
  ) {
    const fallbackBody = {
      ...body,
      auth: apiConfig.apiToken,
    };

    json = await sendRequest(fallbackBody);
  }

  if (json.error) {
    throw new Error(`${json.error.message}: ${json.error.data}`);
  }

  return json.result as T;
}

export async function testApiConnection(): Promise<ApiConnectionResult> {
  if (!apiConfig.rawBaseUrl) {
    return {
      success: false,
      status: "A URL da API não está configurada.",
    };
  }

  if (!apiConfig.apiToken && !(apiConfig.user && apiConfig.password)) {
    return {
      success: false,
      status: "A chave da API ou as credenciais não estão configuradas.",
    };
  }

  try {
    const version = await callZabbix<string>("apiinfo.version");
    const hostCount = await callZabbix<number>("host.get", {
      output: ["hostid"],
      countOutput: true,
      filter: { status: 0 },
    });

    return {
      success: true,
      status: "Endpoint e autenticação funcionam corretamente.",
      details: JSON.stringify({ version, hostCount }, null, 2),
    };
  } catch (error) {
    return {
      success: false,
      status: "Erro ao conectar com a API ou autenticar.",
      details: (error as Error).message,
    };
  }
}

export async function getHostCount(): Promise<number> {
  return await callZabbix<number>("host.get", {
    output: ["hostid"],
    countOutput: true,
    filter: { status: 0 },
  });
}

export async function getProblemCount(): Promise<number> {
  return await callZabbix<number>("problem.get", {
    output: ["eventid"],
    countOutput: true,
    severities: zabbixAlarmSeverities,
    recent: true,
  });
}

export async function getEventCount(): Promise<number> {
  return await callZabbix<number>("event.get", {
    output: ["eventid"],
    countOutput: true,
    severities: zabbixAlarmSeverities,
  });
}

export async function getZabbixVersion(): Promise<string> {
  return await callZabbix<string>("apiinfo.version");
}
