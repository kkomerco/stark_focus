// ErrorBoundary.tsx — bez niego uszkodzony payload AI biały ekran w całej aplikacji.
import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("Błąd renderu aplikacji:", error, info.componentStack);
  }

  override render(): React.ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-[#050505] text-[#EDEDED] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 p-6 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg text-center">
          <h1 className="text-sm font-mono font-black uppercase tracking-wider text-white">
            Awaria interfejsu
          </h1>
          <p className="text-xs font-mono text-neutral-400">
            Aplikacja napotkała nieoczekiwany błąd i przerwała renderowanie. Dane masz zapisane
            lokalnie — po odświeżeniu wrócą.
          </p>
          <p className="text-[10px] font-mono text-neutral-600 break-words">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
          >
            Odśwież
          </button>
        </div>
      </div>
    );
  }
}
