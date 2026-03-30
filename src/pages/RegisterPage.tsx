import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { AuthSidebar } from '../components/auth/AuthSidebar';
import { SocialAuthButtons } from '../components/auth/SocialAuthButtons';
import { Eye, EyeOff } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, error, clearError, isLoading } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setLocalError("Passwords don't match");
      return;
    }

    setLocalError(null);
    clearError();
    setIsSubmitting(true);
    
    const success = await signUp(email, password);
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
              Register for EMERALD
            </h1>
            <p className="text-body text-text-secondary">
              Enter your details to create an account.
            </p>
          </div>

          {/* Social Logins */}
          <SocialAuthButtons mode="register" />

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

            <div className="space-y-2">
              <label className="block text-subhead text-text">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                className="emerald-input"
                required
              />
            </div>

            {(error || localError) && (
              <p className="text-negative text-caption text-center pt-2">{localError || error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full bg-accent hover:bg-accent-dark text-white py-4 rounded-[20px] text-headline font-bold transition-all mt-6 shadow-[0_4px_32px_rgba(0,200,83,0.4)] hover:shadow-[0_4px_40px_rgba(0,200,83,0.6)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {isSubmitting || isLoading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-10">
            <span className="text-subhead text-text-secondary">Already have an account? </span>
            <Link to="/login" className="text-subhead text-white font-semibold hover:text-accent transition-colors">
              Sign in
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};
