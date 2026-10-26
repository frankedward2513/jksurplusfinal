import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { isValidEmail, isValidPassword } from '../utils/validation';
import { AlertCircle, ArrowRight, Loader2, Lock, Mail, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginAs, showFormAlert } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || !isValidPassword(password)) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await loginAs(email.trim(), password);
      showFormAlert('You have been successfully signed in!', 'success');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-md animate-fade-in sm:p-4">
      <div className="relative my-auto w-[95%] max-w-md rounded-3xl border border-orange-500/30 bg-stone-900/95 p-5 text-stone-100 shadow-2xl backdrop-blur-xl sm:p-7">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign in"
          className="absolute right-4 top-4 rounded-xl p-2 text-stone-400 transition hover:bg-stone-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-5 pr-8 text-center text-2xl font-black tracking-tight text-white">
          Sign In to JKsur+
        </h2>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-950/70 p-3 text-xs text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="staff-signin-email" className="mb-1 block text-xs font-semibold text-stone-300">
              Gmail / Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                id="staff-signin-email"
                type="email"
                autoComplete="username"
                required
                placeholder="yourname@gmail.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-orange-500/20 bg-stone-950/70 py-2.5 pl-10 pr-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="staff-signin-password" className="mb-1 block text-xs font-semibold text-stone-300">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                id="staff-signin-password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-orange-500/20 bg-stone-950/70 py-2.5 pl-10 pr-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition hover:from-orange-500 hover:to-amber-600 disabled:cursor-wait disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            <span>Sign In</span>
          </button>
        </form>

        <p className="mt-4 text-center text-xs font-medium text-amber-300">
          This is for staff and admin only
        </p>
      </div>
    </div>
  );
};
