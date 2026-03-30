import React from 'react';
import { Gem, Sparkles } from 'lucide-react';

export const AuthSidebar: React.FC = () => {
  const steps = [
    {
      icon: '✏️',
      title: 'Sign up your account',
      desc: 'Complete these easy steps to register your account.'
    },
    {
      icon: '🍭',
      title: 'Create your account',
      desc: 'Complete these easy steps to register your account.'
    },
    {
      icon: '🎉',
      title: 'Start trading with Emerald Trade',
      desc: 'Complete these easy steps to register your account.'
    }
  ];

  return (
    <div className="w-full h-full relative overflow-hidden rounded-[40px] bg-bg flex flex-col items-center justify-center p-8">
      {/* Dynamic Background Gradients mimicking the provided image */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/30 via-bg to-accent/5 opacity-90" />
      <div className="absolute top-0 right-0 w-3/4 h-1/2 bg-accent/20 blur-[100px] rounded-full" />
      <div className="absolute -bottom-[15%] -left-[10%] w-full h-1/2 bg-accent/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-6 right-8 text-white/20">
        <Sparkles className="w-8 h-8" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] pb-12">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Gem className="w-9 h-9 text-accent fill-accent/40" />
          <span className="text-[28px] font-bold text-white tracking-wide">Emerald Trade</span>
        </div>

        <h2 className="text-[36px] font-bold text-white text-center leading-tight mb-3">
          Get started with us
        </h2>

        <p className="text-text-secondary text-center mb-12 text-[15px]">
          Complete these easy steps to register your account.
        </p>

        <div className="relative px-2">
          {/* Vertical Track Line */}
          <div className="absolute left-[23px] top-6 bottom-6 w-px bg-divider/80"></div>

          <div className="space-y-6">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-5 relative z-10 w-full">
                {/* Timeline Dot */}
                <div className="w-8 h-8 rounded-full border-[2px] border-divider bg-bg flex items-center justify-center shrink-0 mt-3 shadow-md">
                  <div className="w-1.5 h-1.5 rounded-full bg-text-secondary"></div>
                </div>

                {/* Card */}
                <div className="bg-[#161B22]/50 border border-divider/40 rounded-[20px] p-5 flex-1 backdrop-blur-md transition-all hover:bg-bg-surface/80">
                  <h3 className="text-white text-[16px] font-semibold mb-1 flex items-center gap-2">
                    {step.icon} {step.title}
                  </h3>
                  <p className="text-text-secondary text-[13px]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
