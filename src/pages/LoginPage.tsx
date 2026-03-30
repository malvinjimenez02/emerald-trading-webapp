import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { AuthSidebar } from '../components/auth/AuthSidebar';
import { SocialAuthButtons } from '../components/auth/SocialAuthButtons';
import { Eye, EyeOff, Check } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, error, clearError, isLoading } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0D1117] text-text">
      
      {/* Left Column (Image Placeholder) */}
      <div className="hidden lg:flex w-1/2 relative bg-[#0D1117] p-6">
        <AuthSidebar />
      </div>

      {/* Right Column (Auth Form) */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-[400px]">
          
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-[34px] font-bold tracking-tight text-white mb-3">
              Sign in to EMERALD
            </h1>
            <p className="text-body text-text-secondary">
              Enter your data to Sign in your account.
            </p>
          </div>

          {/* Social Logins */}
          <SocialAuthButtons mode="login" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <label className="block text-subhead text-text">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="you@email.com"
                className="emerald-input"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-subhead text-text">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="••••••••"
                  className="emerald-input pr-12"
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Controls Row: Remember me & Forget Password */}
            <div className="flex items-center justify-between pt-2">
              <button 
                type="button" 
                className="flex items-center gap-2 group"
                onClick={() => setRememberMe(!rememberMe)}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                  rememberMe ? 'bg-accent border-accent' : 'bg-transparent border-input-border group-hover:border-text-secondary'
                }`}>
                  {rememberMe && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </div>
                <span className="text-subhead text-text transition-colors">Remember me</span>
              </button>
              
              <button type="button" className="text-subhead text-text-secondary hover:text-white transition-colors">
                Forget Password?
              </button>
            </div>

            {error && (
              <p className="text-negative text-caption text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full bg-accent hover:bg-accent-dark text-white py-4 rounded-[20px] text-headline font-bold transition-all mt-6 shadow-[0_4px_32px_rgba(0,200,83,0.4)] hover:shadow-[0_4px_40px_rgba(0,200,83,0.6)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {isSubmitting || isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-10">
            <span className="text-subhead text-text-secondary">Don't have an account? </span>
            <Link to="/register" className="text-subhead text-white font-semibold hover:text-accent transition-colors">
              Sign up
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};
