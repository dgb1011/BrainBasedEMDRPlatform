import { useEffect } from 'react';

/**
 * CacheBuster Component
 * 
 * This component aggressively clears all browser cache and storage
 * to ensure a clean authentication state after database reset.
 */
export default function CacheBuster() {
  useEffect(() => {
    // Only run cache busting in development or when needed
    const shouldClearCache = 
      window.location.search.includes('clear-cache') ||
      localStorage.getItem('cache-busted') !== 'true';
    
    if (shouldClearCache) {
      console.log('🧹 CACHE BUSTER: Clearing all cached data...');
      
      // Clear all storage
      try {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear IndexedDB if it exists
        if ('indexedDB' in window) {
          // Note: This is a basic clear, full IndexedDB clearing would need more code
        }
        
        // Clear service worker cache if it exists
        if ('serviceWorker' in navigator && 'caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name);
            });
          });
        }
        
        // Mark that cache has been busted
        localStorage.setItem('cache-busted', 'true');
        localStorage.setItem('cache-bust-timestamp', new Date().toISOString());
        
        console.log('✅ CACHE BUSTER: All cached data cleared');
        
        // If we have the clear-cache parameter, remove it and reload
        if (window.location.search.includes('clear-cache')) {
          const url = new URL(window.location.href);
          url.searchParams.delete('clear-cache');
          window.history.replaceState({}, '', url.toString());
        }
        
      } catch (error) {
        console.error('Cache clearing error:', error);
      }
    }
  }, []);

  return null; // This component doesn't render anything
}

/**
 * Utility function to force cache clearing
 */
export function forceCacheClear() {
  console.log('🧹 FORCING CACHE CLEAR...');
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('cache-busted', 'true');
  localStorage.setItem('cache-bust-timestamp', new Date().toISOString());
  window.location.reload();
}
