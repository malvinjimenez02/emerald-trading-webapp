import React from 'react';

interface RCalculatorWidgetProps {
  oneR: number | null;
  rrPlanned: number | null;
  rExecuted: number | null;
  duration: string | null;
  isReady: boolean;
}

const RCalculatorWidget: React.FC<RCalculatorWidgetProps> = ({ oneR, rrPlanned, rExecuted, duration, isReady }) => {
  const formatOneR = (val: number) => {
    if (val >= 10) return Math.round(val).toString();
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-[#0D1117] border border-[#242C3A] rounded-lg p-3 mb-2.5">
      {!isReady ? (
        <div className="text-center text-[11px] text-[#505866] py-2">
          Llena Precio de entrada y Stop Loss para ver el cálculo de R
        </div>
      ) : (
        <>
          <div className="text-[9px] font-bold text-[#505866] uppercase tracking-[0.1em] mb-2">
            R calculado en vivo
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            {/* 1R Value */}
            <div className="bg-[#212836] rounded-md p-2 px-2.5">
              <div className="text-[9px] text-[#505866] mb-0.5">1R =</div>
              <div className="text-[14px] font-bold text-[#10E261]">
                {formatOneR(oneR!)} pts
              </div>
            </div>

            {/* RR Planned */}
            <div className="bg-[#212836] rounded-md p-2 px-2.5">
              <div className="text-[9px] text-[#505866] mb-0.5">R:R planeado</div>
              <div className={`text-[14px] font-bold ${rrPlanned !== null ? 'text-[#10E261]' : 'text-[#505866]'}`}>
                {rrPlanned !== null ? `+${rrPlanned}R` : '—'}
              </div>
            </div>

            {/* Duration */}
            <div className="bg-[#212836] rounded-md p-2 px-2.5">
              <div className="text-[9px] text-[#505866] mb-0.5">Duración</div>
              <div className={`text-[13px] font-bold ${duration !== null ? 'text-[#747D8A]' : 'text-[#505866]'}`}>
                {duration || '—'}
              </div>
            </div>
          </div>

          <div className="border-top border-[#242C3A] my-2" style={{ borderTopWidth: 1 }} />

          <div className="flex justify-between items-center">
            <div className="text-[11px] text-[#747D8A]">R ejecutado</div>
            <div>
              {rExecuted !== null ? (
                <div 
                  className="text-[20px] font-bold"
                  style={{ 
                    color: rExecuted > 0.1 ? '#10E261' : rExecuted < -0.1 ? '#F85149' : '#F0883E' 
                  }}
                >
                  {rExecuted > 0 ? `+${rExecuted}R` : `${rExecuted}R`}
                </div>
              ) : (
                <div className="text-[11px] text-[#505866]">Llena el precio de salida</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RCalculatorWidget;
