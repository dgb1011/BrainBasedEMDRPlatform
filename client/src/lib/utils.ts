import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function apiRequest(path: string, method: string = 'GET', body?: any) {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  // If path already starts with /api, use it as-is
  // Otherwise, prepend the base URL
  let url = path;
  if (base && !path.startsWith('/api')) {
    url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`API ${method} ${path} failed: ${res.status}`);
  return res;
}
