import React, { useState } from 'react';
import { Mail, User, Lock, X, KeyRound } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (token: string, username: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isRegister ? `${API_BASE}/api/v1/auth/register` : `${API_BASE}/api/v1/auth/login`;
    const payload = isRegister ? { username, email, password } : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && data.errors) {
          throw new Error(data.errors[0].message);
        }
        throw new Error(data.message || 'Authentication failed');
      }

      // Success
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.user.username);
      onAuthSuccess(data.token, data.user.username);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#121218] border border-white/10 rounded-2xl p-8 w-full max-w-[440px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-4 right-4 bg-transparent border-none text-white/40 cursor-pointer p-1 rounded hover:text-white hover:bg-white/5" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center mb-3">
            <KeyRound size={24} className="text-[#8b5cf6]" />
          </div>
          <h2 className="text-xl font-extrabold m-0 mb-1.5 text-white">{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="text-xs m-0 text-white/40">
            {isRegister ? 'Sign up to secure your sneaker drops' : 'Log in to manage your inventory hold reservations'}
          </p>
        </div>

        {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-2.5 rounded-lg text-sm text-center mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegister && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-white/60 tracking-wider" htmlFor="auth-username">Username</label>
              <div className="relative flex items-center">
                <User size={18} className="absolute left-3 text-white/25" />
                <input
                  id="auth-username"
                  type="text"
                  placeholder="johndoe"
                  className="w-full bg-[#09090c] border border-white/10 rounded-lg py-2.5 pl-10 pr-3.5 text-white placeholder-zinc-500 focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/50 focus:outline-none transition-all duration-200"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-white/60 tracking-wider" htmlFor="auth-email">Email Address</label>
            <div className="relative flex items-center">
              <Mail size={18} className="absolute left-3 text-white/25" />
              <input
                id="auth-email"
                type="email"
                placeholder="name@example.com"
                className="w-full bg-[#09090c] border border-white/10 rounded-lg py-2.5 pl-10 pr-3.5 text-white placeholder-zinc-500 focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/50 focus:outline-none transition-all duration-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-white/60 tracking-wider" htmlFor="auth-password">Password</label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-3 text-white/25" />
              <input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                className="w-full bg-[#09090c] border border-white/10 rounded-lg py-2.5 pl-10 pr-3.5 text-white placeholder-zinc-500 focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/50 focus:outline-none transition-all duration-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-lg cursor-pointer transition-all duration-200 ease-out border border-transparent outline-none bg-[#8b5cf6] text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:bg-[#a78bfa] hover:-translate-y-0.5 hover:shadow-[0_0_22px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:-translate-y-0 disabled:shadow-none">
            {loading ? 'Processing...' : isRegister ? 'Register' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-5 text-xs text-zinc-400">
          <span>{isRegister ? 'Already have an account?' : "Don't have an account?"}</span>
          <button onClick={() => { setIsRegister(!isRegister); setError(null); }} className="bg-transparent border-none text-[#c084fc] font-bold cursor-pointer ml-1.5 p-0 hover:underline">
            {isRegister ? 'Sign In' : 'Register Now'}
          </button>
        </div>
      </div>
    </div>
  );
};
