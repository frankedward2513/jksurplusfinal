import React from 'react';
import { Barcode as BarcodeIcon } from 'lucide-react';

export const BarcodeView: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <div className="p-8 rounded-3xl glass-panel text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-stone-900 border border-orange-500/30 shadow-lg shadow-orange-500/10">
          <BarcodeIcon className="w-8 h-8 text-orange-400" />
        </div>

        <h1 className="mt-5 text-2xl font-black text-white">Barcode Management</h1>
        <p className="mt-3 text-sm text-stone-300 max-w-xl mx-auto">
          Barcode generation has been disabled. The navigation button remains available, but the
          barcode generator itself is no longer active in this app.
        </p>
      </div>
    </div>
  );
};
