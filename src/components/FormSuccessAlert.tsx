import React from 'react';
import { useStore } from '../context/StoreContext';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export const FormSuccessAlert: React.FC = () => {
  const { formAlert, formAlertType, clearFormAlert } = useStore();

  if (!formAlert) return null;

  const Icon = formAlertType === 'success' ? CheckCircle2 : formAlertType === 'error' ? AlertCircle : Info;
  const colorClasses =
    formAlertType === 'success'
      ? 'border-emerald-500/40 bg-emerald-950/95 text-emerald-300'
      : formAlertType === 'error'
        ? 'border-red-500/40 bg-red-950/95 text-red-300'
        : 'border-orange-500/40 bg-stone-900/95 text-orange-300';

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
      <div
        role={formAlertType === 'error' ? 'alert' : 'status'}
        aria-live={formAlertType === 'error' ? 'assertive' : 'polite'}
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-orange-500/20 bg-stone-950/95 px-4 py-3 text-white shadow-2xl backdrop-blur-xl animate-bounce-in"
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${colorClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="min-w-0 flex-1 text-sm font-semibold text-stone-100">{formAlert}</p>
        <button
          type="button"
          onClick={clearFormAlert}
          className="shrink-0 rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-bold text-stone-100 transition hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          Done
        </button>
      </div>
    </div>
  );
};
