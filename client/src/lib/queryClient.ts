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

  // Get JWT token from localStorage
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
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
    
    // Get JWT token from localStorage for authenticated requests
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(url, {
      headers,
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
      staleTime: 0, // No caching to prevent stale data issues
      gcTime: 0, // Immediate garbage collection
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Function to clear all query cache (useful after login/logout)
export function clearQueryCache() {
  console.log('🧹 Clearing React Query cache...');
  queryClient.clear();
}
