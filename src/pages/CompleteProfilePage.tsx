import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { validateName, validateJournalName, sanitizeIdentifier } from '../utils/validators';

export const CompleteProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, saveProfile, clearError, error, isLoading, hasCompletedProfile } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [journalName, setJournalName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (hasCompletedProfile) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, hasCompletedProfile, navigate]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const firstCheck = validateName(firstName, 'First name');
    if (!firstCheck.valid) { setLocalError(firstCheck.message ?? 'Invalid first name'); return; }

    const lastCheck = validateName(lastName, 'Last name');
    if (!lastCheck.valid) { setLocalError(lastCheck.message ?? 'Invalid last name'); return; }

    const journalCheck = validateJournalName(journalName);
    if (!journalCheck.valid) { setLocalError(journalCheck.message ?? 'Invalid journal name'); return; }

    const cleanFirstName = sanitizeIdentifier(firstName, 50);
    const cleanLastName = sanitizeIdentifier(lastName, 50);
    const cleanJournalName = sanitizeIdentifier(journalName, 80);

    setLocalError(null);
    setIsSubmitting(true);
    const success = await saveProfile(cleanFirstName, cleanLastName, cleanJournalName);
    setIsSubmitting(false);
    if (success) navigate('/dashboard', { replace: true });
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
            <h2 className="max-w-[420px] text-[46px] font-semibold leading-[1.06] tracking-[-0.02em] text-white">
              One last step to personalize your workspace.
            </h2>
          </div>
        </aside>

        <main className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-[420px]">
            <div className="mb-9 text-center lg:text-left">
              <h1 className="text-title1 text-white">Complete your profile</h1>
              <p className="mt-2 text-subhead text-text-secondary">
                This name appears in your header and activity context.
              </p>
            </div>

            <div className="mb-6 rounded-[12px] border border-divider bg-bg-surface/60 p-4">
              <p className="text-caption text-text-secondary">Signed in as</p>
              <p className="mt-1 text-subhead text-white break-all">{user?.email ?? 'Unknown email'}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-subhead text-text">First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Your first name"
                  className="w-full rounded-[8px] border border-input-border bg-inputBg px-4 py-2.5 text-subhead text-white placeholder:text-text-secondary/70 transition-all focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_rgba(16,226,97,0.15)]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-subhead text-text">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Your last name"
                  className="w-full rounded-[8px] border border-input-border bg-inputBg px-4 py-2.5 text-subhead text-white placeholder:text-text-secondary/70 transition-all focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_rgba(16,226,97,0.15)]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-subhead text-text">Journal name</label>
                <input
                  type="text"
                  value={journalName}
                  onChange={(e) => setJournalName(e.target.value)}
                  placeholder="e.g. My Trading Journal"
                  className="w-full rounded-[8px] border border-input-border bg-inputBg px-4 py-2.5 text-subhead text-white placeholder:text-text-secondary/70 transition-all focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_rgba(16,226,97,0.15)]"
                  required
                />
              </div>

              {(localError || error) && <p className="text-caption text-negative">{localError || error}</p>}

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full rounded-[8px] border border-input-border bg-transparent py-2.5 text-subhead font-medium text-white transition-all hover:border-accent/70 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting || isLoading ? 'Saving profile...' : 'Continue'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};
