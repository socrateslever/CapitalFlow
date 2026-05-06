
import React from 'react';
import { MoreHorizontal, Lock } from 'lucide-react';
import { Loan, Installment } from '../../../../types';
import { CalculationResult } from '../../../../domain/finance/modalities/types';

interface InstallmentCardActionProps {
    isDisabled: boolean;
    isFullyFinalized: boolean;
    loan: Loan;
    originalInst: Installment;
    debt: CalculationResult;
    onNavigate?: () => void;
}

export const InstallmentCardAction: React.FC<InstallmentCardActionProps> = ({
    isDisabled,
    isFullyFinalized,
    loan,
    originalInst,
    debt,
    onNavigate
}) => {
    if (!isDisabled) {
        return (
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onNavigate?.();
                }}
                className="w-full py-3 rounded-full text-[10px] font-black uppercase transition-all bg-blue-600 text-white shadow-lg shadow-blue-600/40 flex items-center justify-center gap-2 hover:bg-blue-500 active:scale-95 text-wrap-safe leading-tight"
            >
                <MoreHorizontal size={14} className="shrink-0" /> Abrir Contrato
            </button>
        );
    }

    const isRenegotiated = originalInst.status === 'RENEGOCIADO';

    return (
        <div 
            onClick={(e) => {
                e.stopPropagation();
                onNavigate?.();
            }}
            className="w-full py-3 rounded-full text-[10px] font-black uppercase transition-all bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-700 transition-colors text-wrap-safe leading-tight"
        >
            <Lock size={12} className="shrink-0" /> {isFullyFinalized ? 'Contrato Finalizado' : isRenegotiated ? 'Renegociado' : 'Parcela Paga'}
        </div>
    );
};
