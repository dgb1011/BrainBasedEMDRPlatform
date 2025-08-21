import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Flexible API request helper that supports both call styles:
// 1) apiRequest('/api/path', 'POST', body)
// 2) apiRequest('POST', '/api/path', body)
export async function apiRequest(
  a: string,
  b?: string | unknown,
  c?: unknown,
): Promise<Response> {
  let method: string;
  let url: string;
  let data: unknown | undefined;

  if (a.startsWith('/')) {
    // Style 1: (url, method?, data?)
    url = a;
    method = (typeof b === 'string' ? b : 'GET') as string;
    data = typeof b === 'string' ? c : b;
  } else {
    // Style 2: (method, url, data?)
    method = a;
    url = String(b || '/');
    data = c;
  }

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = (queryKey[0] as string) || '/';
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
