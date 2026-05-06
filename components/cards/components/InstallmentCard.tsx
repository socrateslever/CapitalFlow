
import React, { memo } from 'react';
import { Loan, Installment } from '../../../types';
import { InstallmentViewModel } from './InstallmentGrid.logic';

// Importação dos Componentes Atômicos
import { InstallmentCardFixedTermPanel } from './installmentCard/InstallmentCardFixedTermPanel';
import { InstallmentCardHeader } from './installmentCard/InstallmentCardHeader';
import { InstallmentCardTimeline } from './installmentCard/InstallmentCardTimeline';
import { InstallmentCardStatus } from './installmentCard/InstallmentCardStatus';
import { InstallmentCardAmounts } from './installmentCard/InstallmentCardAmounts';
import { InstallmentCardAction } from './installmentCard/InstallmentCardAction';

interface InstallmentCardProps {
    vm: InstallmentViewModel;
    loan: Loan; 
    fixedTermStats: any; 
    strategy: any; 
    isStealthMode?: boolean;
    onNavigate?: () => void;
}

const InstallmentCardComponent: React.FC<InstallmentCardProps> = ({
    vm,
    loan,
    fixedTermStats,
    strategy,
    isStealthMode,
    onNavigate
}) => {
    const { 
        originalInst, isFixedTerm, isFixedTermDone, isZeroBalance, isLateInst, isPrepaid, isActionDisabled, isPaid,
        statusColor, statusText, displayDueDate, paidUntilDate, realIndex, showProgress, debt, isFullyFinalized
    } = vm;

    const isRenegotiated = originalInst.status === 'RENEGOCIADO';

    const containerClasses = `responsive-card rounded-2xl border flex flex-col justify-between h-full ${
        isRenegotiated ? 'bg-slate-900/80 border-slate-700/50' :
        isPaid || isFixedTermDone || isZeroBalance ? 'bg-emerald-500/5 border-emerald-500/20' : 
        isLateInst ? 'bg-rose-500/5 border-rose-500/20' : 
        isPrepaid ? 'bg-emerald-500/10 border-emerald-500/30' : 
        'bg-slate-950 border-slate-800'
    }`;

    if (isFixedTerm && fixedTermStats) {
        return (
            <div id={originalInst.id} className={containerClasses}>
                <InstallmentCardFixedTermPanel fixedTermStats={fixedTermStats} isStealthMode={isStealthMode} />
                <InstallmentCardStatus text={statusText} colorClass={statusColor} />
                <InstallmentCardAmounts 
                    debt={debt} 
                    originalAmount={originalInst.amount}
                    isPrepaid={isPrepaid} 
                    isLateInst={isLateInst} 
                    isPaid={isPaid} 
                    isStealthMode={isStealthMode} 
                />
                <InstallmentCardAction isDisabled={isActionDisabled} isFullyFinalized={isFullyFinalized} loan={loan} originalInst={originalInst} debt={debt} onNavigate={onNavigate} />
            </div>
        );
    }

    return (
        <div id={originalInst.id} className={containerClasses}>
            <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div>
                    <InstallmentCardHeader realIndex={realIndex} showProgress={showProgress} renewalCount={originalInst.renewalCount} />
                    <InstallmentCardTimeline 
                        loan={loan}
                        originalInst={originalInst}
                        displayDueDate={displayDueDate}
                        paidUntilDate={paidUntilDate}
                        strategy={strategy}
                        isPrepaid={isPrepaid}
                        isLateInst={isLateInst}
                        isPaid={isPaid}
                    />
                </div>
            </div>
            <InstallmentCardStatus text={statusText} colorClass={statusColor} />
            <InstallmentCardAmounts 
                debt={debt} 
                originalAmount={originalInst.amount}
                isPrepaid={isPrepaid} 
                isLateInst={isLateInst} 
                isPaid={isPaid} 
                isStealthMode={isStealthMode} 
            />
            <InstallmentCardAction isDisabled={isActionDisabled} isFullyFinalized={isFullyFinalized} loan={loan} originalInst={originalInst} debt={debt} onNavigate={onNavigate} />
        </div>
    );
};

// COMPARAÇÃO CUSTOMIZADA OTIMIZADA E CORRIGIDA
const arePropsEqual = (prev: InstallmentCardProps, next: InstallmentCardProps) => {
    if (prev.isStealthMode !== next.isStealthMode) return false;

    // Correção: Verificar se as datas mudaram (ex: renovação altera start_date e due_date)
    // Se a data de vencimento calculada mudou, deve renderizar
    if (prev.vm.displayDueDate !== next.vm.displayDueDate) return false;
    
    // Se a data do contrato mudou (renovação mensal move o start_date), deve renderizar a Timeline
    if (prev.loan.startDate !== next.loan.startDate) return false;

    const pInst = prev.vm.originalInst;
    const nInst = next.vm.originalInst;

    if (
        pInst.id !== nInst.id ||
        pInst.status !== nInst.status ||
        pInst.amount !== nInst.amount ||
        pInst.principalRemaining !== nInst.principalRemaining ||
        pInst.interestRemaining !== nInst.interestRemaining ||
        pInst.lateFeeAccrued !== nInst.lateFeeAccrued ||
        pInst.dueDate !== nInst.dueDate
    ) {
        return false;
    }

    if (
        prev.vm.statusText !== next.vm.statusText ||
        prev.vm.statusColor !== next.vm.statusColor ||
        prev.vm.isActionDisabled !== next.vm.isActionDisabled
    ) {
        return false;
    }

    if (prev.vm.isFixedTerm) {
        if (
            prev.fixedTermStats?.paidDays !== next.fixedTermStats?.paidDays ||
            prev.fixedTermStats?.progressPercent !== next.fixedTermStats?.progressPercent
        ) {
            return false;
        }
    }

    return true;
};

export const InstallmentCard = memo(InstallmentCardComponent, arePropsEqual);
