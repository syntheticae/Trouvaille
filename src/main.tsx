// Clean up any stale Service Worker or CacheStorage in native Capacitor iOS/Android WebView
if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

import { StrictMode, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { AuthProvider } from './contexts/AuthContext'
import { SecurityLockProvider } from './contexts/SecurityLockContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { PrivacyProvider } from './contexts/PrivacyContext'
import { SpaceProvider } from './contexts/SpaceContext'
import App from './App.tsx'
import './index.css'

import { AlertCircle, RefreshCw, RotateCcw } from 'lucide-react'

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null, showDetails: boolean}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, showDetails: false };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Trouvaille] Uncaught runtime exception:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center p-6 bg-[#09090c] text-white select-none">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white/[0.04] border border-white/[0.12] backdrop-blur-2xl shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-white/[0.08] border border-white/[0.14] text-white">
              <AlertCircle size={22} strokeWidth={1.75} />
            </div>

            <div className="space-y-1">
              <h2 className="text-[17px] font-bold tracking-tight text-white">
                Encountered an Unexpected Glitch
              </h2>
              <p className="text-[12px] text-zinc-400 leading-relaxed">
                Trouvaille caught an interface error. Your financial records and local vault remain completely safe.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 rounded-xl text-[13px] font-bold bg-white text-black flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98"
              >
                <RefreshCw size={15} strokeWidth={2} />
                <span>Reload Trouvaille</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('TROUVAILLE_OFFLINE_CACHE_V1');
                  } catch {}
                  window.location.reload();
                }}
                className="w-full py-2.5 px-4 rounded-xl text-[12px] font-semibold text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <RotateCcw size={13} strokeWidth={1.75} />
                <span>Clear Cache & Restart</span>
              </button>
            </div>

            {this.state.error && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
                >
                  {this.state.showDetails ? "Hide Technical Details" : "View Technical Details"}
                </button>
                {this.state.showDetails && (
                  <pre className="mt-2 p-3 rounded-xl bg-black/50 border border-white/[0.08] text-left text-[10px] text-zinc-400 max-h-36 overflow-auto font-mono whitespace-pre-wrap">
                    {this.state.error?.toString()}
                    {"\n\n"}
                    {this.state.error?.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes fresh cache
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days persistent storage retention
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
})

const safeSyncStorage = {
  getItem: (key: string) => {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    } catch (err: any) {
      if (
        err?.name === 'QuotaExceededError' ||
        err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err?.code === 22
      ) {
        console.warn('[Trouvaille Cache] Storage quota exceeded. Evicting offline cache key...');
        try {
          window.localStorage.removeItem(key);
        } catch {}
      }
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch {}
  },
};

const persister = createSyncStoragePersister({
  storage: safeSyncStorage,
  key: 'TROUVAILLE_OFFLINE_CACHE_V1',
  throttleTime: 1000,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              if (query.state.status !== 'success') return false;
              const key = query.queryKey;
              const domain = key[0];
              // Only persist master root datasets to prevent exceeding 5MB localStorage limit
              if (domain === 'categories' || domain === 'wallets' || domain === 'bills' || domain === 'shortcuts') {
                return true;
              }
              if (domain === 'transactions') {
                // Only persist master all-transactions query, not repetitive slice queries (month, day, recent, trend)
                return key[1] === 'all';
              }
              return false;
            },
          },
        }}
      >
        <BrowserRouter>
          <AuthProvider>
            <SecurityLockProvider>
              <ThemeProvider>
                <ToastProvider>
                  <PrivacyProvider>
                    <SpaceProvider>
                      <App />
                    </SpaceProvider>
                  </PrivacyProvider>
                </ToastProvider>
              </ThemeProvider>
            </SecurityLockProvider>
          </AuthProvider>
        </BrowserRouter>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
