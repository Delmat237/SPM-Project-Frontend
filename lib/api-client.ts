const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customOptions } = options;

  // Build URL with query params if any
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, val);
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Set default headers and inject JWT from localStorage
  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has("Content-Type") && !(customOptions.body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }

  // Les endpoints d'authentification (login, register, reset-password…) sont publics :
  // on ne doit JAMAIS y attacher de token, sinon un token expiré ferait échouer le login
  // avec un 403 renvoyé par le JwtAuthenticationFilter avant même le traitement du login.
  const isAuthEndpoint = endpoint.startsWith("/api/auth/");

  if (typeof window !== "undefined" && !isAuthEndpoint) {
    const token = localStorage.getItem("token");
    if (token) {
      // A valid JWT has exactly 2 periods (header.payload.signature)
      if (token.split(".").length === 3) {
        requestHeaders.set("Authorization", `Bearer ${token}`);
      } else {
        localStorage.removeItem("token");
      }
    }
  }

  const response = await fetch(url, {
    ...customOptions,
    headers: requestHeaders,
  });

  let responseData: unknown;
  const contentType = response.headers.get("content-type");
  
  if (contentType && contentType.includes("application/json")) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    // Token expiré ou invalide → nettoyer la session et rediriger vers le login
    if ((response.status === 401 || response.status === 403) && typeof window !== "undefined") {
      if (!isAuthEndpoint) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/auth/login";
        return new Promise(() => {/* redirect en cours */}) as Promise<T>;
      }
    }

    // Extract message from standard Spring Boot error responses
    const rd = responseData as Record<string, unknown> | null;
    const errorMessage =
      (rd && typeof rd === "object" && ((rd.message as string) || (rd.error as string))) ||
      `Erreur HTTP ${response.status}`;

    throw new ApiError(errorMessage, response.status, responseData);
  }

  return responseData as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: "GET" }),
    
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
    
  delete: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
