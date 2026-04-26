import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Handshake,
  ChevronDown,
  Wallet,
  Hash
} from 'lucide-react';
import { Loan } from '../../../types';
import { formatMoney, formatShortName } from '../../../utils/formatters';
import { getDueBadgeLabel, getDueBadgeStyle } from './helpers';

interface HeaderProps {
  loan: Loan;
  debtorNameSafe: string;
  isFullyFinalized: boolean;
  isLate: boolean;
  hasActiveAgreement: boolean;
  daysUntilDue: number; // regra: >0 faltam dias, 0 hoje, <0 vencido
  nextDueDate: string | null | undefined;
  iconStyle: string;
  isStealthMode?: boolean;
  isExpanded?: boolean;
  currentDebt?: number; // Valor total real (Principal + Juros + Multa)
  onToggleExpand?: () => void;
  onNavigate?: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  loan,
  debtorNameSafe,
  isFullyFinalized,
  isLate,
  hasActiveAgreement,
  daysUntilDue,
  iconStyle,
  isStealthMode,
  isExpanded,
  currentDebt,
  onToggleExpand,
  onNavigate
}) => {
  const isOverdueByDays = daysUntilDue < 0;
  
  const getBillingCycleLabel = (cycle: string) => {
    switch (cycle) {
      case 'MONTHLY': return 'Mensal';
      case 'DAILY': return 'Diário';
      case 'DAILY_FREE': return 'Diário (Livre)';
      case 'DAILY_FIXED_TERM': return 'Diário (Prazo Fixo)';
      default: return cycle;
    }
  };

  // Mostra sempre o saldo devedor atual (Regressão de valor) conforme solicitado
  let displayAmount = currentDebt ?? loan.totalToReceive;
  let amountLabel = 'Dívida Atual';

  if (isFullyFinalized) {
      displayAmount = 0;
      amountLabel = 'Quitado';
  }

  // Badges refinados
  let Badge = null;
  if (isFullyFinalized) {
    Badge = (
      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md border border-emerald-500/20">
        <CheckCircle2 size={8} />
        <span className="text-[7px] font-black uppercase tracking-wider">Finalizado</span>
      </div>
    );
  } else if (hasActiveAgreement) {
    Badge = (
      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20">
        <Handshake size={8} />
        <span className="text-[7px] font-black uppercase tracking-wider">Renegociado</span>
      </div>
    );
  } else if (isOverdueByDays) {
    const { cls } = getDueBadgeStyle(daysUntilDue);
    Badge = (
      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border ${cls}`}>
        <AlertTriangle size={8} />
        <span className="text-[7px] font-black uppercase tracking-wider">Atrasado</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col min-h-[6rem] justify-between relative">
      {/* Top Section: Avatar/Icon + Name + Badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onNavigate?.(loan.id);
              }}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all hover:scale-105 active:scale-95 border border-slate-700/50 ${iconStyle}`}
              title="Abrir Contrato"
            >
              {isFullyFinalized ? <CheckCircle2 size={18} /> : (isOverdueByDays || isLate) ? <AlertTriangle size={18} /> : <Calendar size={18} />}
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.();
              }}
              className="absolute -bottom-1 -right-1 bg-slate-900 rounded-lg p-1 border border-slate-700 hover:bg-slate-800 transition-colors z-10 shadow-lg"
            >
              {isExpanded ? <ChevronDown size={12} className="text-white rotate-180 transition-transform"/> : <ChevronDown size={12} className="text-white transition-transform"/>}
            </button>
          </div>

          <div className="min-w-0 flex flex-col flex-1 pr-20 sm:pr-0">
            <div className="flex items-center gap-2">
              <h3 className="client-name font-black text-white uppercase leading-tight tracking-tight flex-1">
                {formatShortName(debtorNameSafe)}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              <span className="bg-slate-800/50 px-1.5 rounded-sm">{getBillingCycleLabel(loan.billingCycle)}</span>
              <span className="text-slate-700">•</span>
              <div className="flex items-center gap-0.5 opacity-70">
                <Hash size={8} />
                <span>{loan.id.substring(0, 6)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0">
          {Badge}
        </div>
      </div>

      {/* Bottom Section: Amount Label + Value */}
      <div className="flex items-end justify-between pt-2 border-t border-slate-800/30 mt-1">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Wallet size={10} className="opacity-50" />
            <span className="text-[8px] font-black uppercase tracking-[0.15em]">{amountLabel}</span>
          </div>
          {isOverdueByDays && (
            <span className="text-[9px] font-black text-rose-500/80 uppercase tracking-tighter">
              {getDueBadgeLabel(daysUntilDue)}
            </span>
          )}
        </div>
        
        <div className="flex flex-col items-end">
          <span className={`text-lg sm:text-xl font-black tracking-tighter transition-all ${
            (isOverdueByDays || (isLate && !hasActiveAgreement)) 
              ? 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]' 
              : isFullyFinalized 
                ? 'text-emerald-400' 
                : 'text-white'
          }`}>
            {formatMoney(displayAmount, isStealthMode)}
          </span>
        </div>
      </div>
    </div>
  );
};
