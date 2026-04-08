import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, error, clearError, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    clearError();

    const success = await signIn(email, password);
    if (success) {
      navigate('/dashboard', { replace: true });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="grid min-h-screen lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="relative hidden overflow-hidden border-r border-divider/70 bg-[#06090f] lg:block">
          <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:12px_12px]" />
          <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(16,226,97,0.10)_0%,rgba(6,9,15,0.88)_45%,rgba(6,9,15,0.98)_100%)]" />
          <div className="absolute -bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#d9792a]/35 blur-[120px]" />

          <Link
            to="/"
            className="absolute left-10 top-8 inline-flex items-center gap-2 text-subhead text-white/75 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>

          <div className="relative z-10 mx-auto flex h-full max-w-[560px] flex-col items-center justify-center px-14 text-center">
            <img src="/header-logo.svg" alt="Emerald" className="mb-8 h-12 w-auto drop-shadow-[0_0_18px_rgba(16,226,97,0.35)]" />
            <h2 className="max-w-[380px] text-[46px] font-semibold leading-[1.06] tracking-[-0.02em] text-white">
              Trade smarter without slowing down.
            </h2>
          </div>
        </aside>

        <main className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-[420px]">
            <div className="mb-9 text-center lg:text-left">
              <h1 className="text-title1 text-white">Sign in to your account</h1>
              <p className="mt-2 text-subhead text-text-secondary">Connect to Emerald with:</p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="flex w-full items-center justify-center gap-2.5 rounded-[8px] border border-input-border bg-transparent py-2.5 text-subhead text-white transition-colors hover:border-accent/60"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                </svg>
                Continue with Google
              </button>

              <button
                type="button"
                onClick={() => {}}
                className="flex w-full items-center justify-center gap-2.5 rounded-[8px] border border-input-border bg-transparent py-2.5 text-subhead text-white transition-colors hover:border-accent/60"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 98 96" className="h-4 w-4 fill-white">
                  <path d="M48.9 0C21.9 0 0 22 0 49.2c0 21.7 14 40.1 33.5 46.6 2.5.5 3.4-1.1 3.4-2.4 0-1.2 0-4.4-.1-8.7-13.6 3-16.5-6.6-16.5-6.6-2.2-5.7-5.4-7.2-5.4-7.2-4.4-3 .3-2.9.3-2.9 4.9.3 7.5 5.1 7.5 5.1 4.3 7.5 11.4 5.3 14.2 4 .4-3.2 1.7-5.3 3-6.5-10.9-1.2-22.3-5.5-22.3-24.4 0-5.4 1.9-9.8 5-13.2-.5-1.2-2.2-6.2.5-13 0 0 4.1-1.3 13.4 5 3.9-1.1 8-1.7 12.1-1.7 4.1 0 8.2.6 12.1 1.7 9.3-6.3 13.4-5 13.4-5 2.7 6.8 1 11.8.5 13 3.1 3.4 5 7.8 5 13.2 0 19-11.4 23.1-22.4 24.4 1.8 1.6 3.3 4.7 3.3 9.4 0 6.8-.1 12.3-.1 14 0 1.3.9 2.9 3.4 2.4C84 89.3 98 70.9 98 49.2 98 22 76.1 0 48.9 0z" />
                </svg>
                Continue with GitHub
              </button>

              <button
                type="button"
                onClick={() => {}}
                className="flex w-full items-center justify-center gap-2.5 rounded-[8px] border border-input-border bg-transparent py-2.5 text-subhead text-white transition-colors hover:border-accent/60"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" className="h-4 w-4">
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                Continue with Microsoft
              </button>
            </div>

            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-divider" />
              <span className="text-caption text-text-secondary">Or continue with email</span>
              <div className="h-px flex-1 bg-divider" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-subhead text-text">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="youremail@email.com"
                  className="w-full rounded-[8px] border border-input-border bg-inputBg px-4 py-2.5 text-subhead text-white placeholder:text-text-secondary/70 transition-all focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_rgba(16,226,97,0.15)]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-subhead text-text">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-[8px] border border-input-border bg-inputBg px-4 py-2.5 pr-11 text-subhead text-white placeholder:text-text-secondary/70 transition-all focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_rgba(16,226,97,0.15)]"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-caption text-negative">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full rounded-[8px] border border-input-border bg-transparent py-2.5 text-subhead font-medium text-white transition-all hover:border-accent/70 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting || isLoading ? 'Signing in...' : 'Continue'}
              </button>
            </form>

            <div className="mt-8 text-subhead text-text-secondary">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-semibold text-accent transition-colors hover:text-accent-dark">
                Sign up
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
