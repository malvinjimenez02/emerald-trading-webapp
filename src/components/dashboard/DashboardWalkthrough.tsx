import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

interface WalkthroughSlide {
  title: string;
  description: string;
  imageSrc?: string;
}

const slides: WalkthroughSlide[] = [
  {
    title: 'Tu ventaja vive en los datos',
    description: 'La mayoría de los traders no fallan por el mercado — fallan porque nunca se estudian a sí mismos. Emerald te da la claridad para ver exactamente dónde ganas, dónde pierdes y cómo corregirlo..',
    imageSrc: '/SLIDE1.png',
  },
  {
    title: 'Cada trade registrado',
    description: 'Consulta tu historial completo con filtros por fecha, activo, dirección y resultado. Ordena por cualquier columna y encuentra exactamente lo que buscas en segundos.',
    imageSrc: '/SLIDE2.png',
  },
  {
    title: 'Cambia de Journal - Cambia de contexto',
    description: 'Sigue tu progreso por Journals. Mide cada paso de tu progreso de forma independiente y descubre cuáles son tus fortalezas y debilidades.',
    imageSrc: '/SLIDE3.png',
  },
];

interface DashboardWalkthroughProps {
  open: boolean;
  onClose: () => void;
}

const AUTO_ADVANCE_MS = 4500;

export const DashboardWalkthrough: React.FC<DashboardWalkthroughProps> = ({ open, onClose }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') setIndex((prev) => Math.min(prev + 1, slides.length - 1));
      if (event.key === 'ArrowLeft') setIndex((prev) => Math.max(prev - 1, 0));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const activeSlide = useMemo(() => slides[index], [index]);
  const isLast = index === slides.length - 1;

  useEffect(() => {
    if (!open || isLast) return;
    const timer = window.setTimeout(() => {
      setIndex((prev) => Math.min(prev + 1, slides.length - 1));
    }, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [open, index, isLast]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard walkthrough"
        className="w-full max-w-[860px] overflow-hidden rounded-2xl border border-divider bg-bg-surface shadow-[0_28px_100px_rgba(0,0,0,0.55)]"
      >
        <div className="relative p-4 md:p-5">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-text-secondary hover:bg-bg hover:text-text transition-colors"
            aria-label="Close walkthrough"
          >
            <X className="w-4 h-4" />
          </button>

          <div
            className={`rounded-xl border border-divider/70 overflow-hidden ${
              activeSlide.imageSrc
                ? 'bg-black'
                : 'h-[260px] md:h-[360px] bg-[radial-gradient(circle_at_50%_18%,rgba(16,226,97,0.16)_0%,rgba(16,226,97,0.06)_26%,rgba(11,15,22,0.7)_58%,rgba(6,9,15,0.96)_100%)] px-7 py-5 md:px-10 md:py-8'
            }`}
          >
            <div className={`${activeSlide.imageSrc ? '' : 'h-full overflow-hidden rounded-lg border border-white/10 bg-black/10'}`}>
              {activeSlide.imageSrc ? (
                <img
                  src={activeSlide.imageSrc}
                  alt={activeSlide.title}
                  className="block w-full h-auto"
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="relative">
                    <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border border-white/15 bg-gradient-to-br from-white/15 to-white/5 shadow-[0_10px_25px_rgba(0,0,0,0.5)]" />
                    <div className="absolute inset-0 m-auto w-10 h-10 md:w-14 md:h-14 rounded-full bg-bg border border-white/10" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 md:px-7 md:pb-6">
          <h3 className="text-[21px] md:text-[27px] leading-tight font-semibold text-white">{activeSlide.title}</h3>
          <p className="mt-2 text-[13px] md:text-[15px] leading-relaxed text-text-secondary max-w-[92%]">{activeSlide.description}</p>

          <div className="mt-6 md:mt-7 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {slides.map((_, dotIndex) => (
                <button
                  key={dotIndex}
                  onClick={() => setIndex(dotIndex)}
                  aria-label={`Go to slide ${dotIndex + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    dotIndex === index ? 'w-5 bg-text-secondary' : 'w-1.5 bg-divider hover:bg-text-tertiary'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="text-[13px] md:text-[14px] font-medium text-text-secondary hover:text-text transition-colors"
              >
                Skip
              </button>

              <button
                onClick={() => (isLast ? onClose() : setIndex(index + 1))}
                className="inline-flex items-center gap-2 rounded-lg border border-input-border bg-bg px-3 py-1.5 md:px-4 md:py-2 text-[13px] md:text-[14px] font-semibold text-white hover:border-accent/70 hover:text-accent transition-colors"
              >
                {isLast ? 'Get Started' : 'Next'}
                {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
