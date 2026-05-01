import React from 'react';
import { CheckCircle2, Handshake, Info, Layers } from 'lucide-react';
import { AgreementView } from '../../../features/agreements/components/AgreementView';
import { InstallmentGrid } from '../components/InstallmentGrid';
import { Loan, UserProfile, Installment, Agreement, AgreementInstallment } from '../../../types';
import { formatMoney } from '../../../utils/formatters';
import { getDueBadgeLabel, getDueBadgeStyle } from './helpers';

interface BodyProps {
    loan: Loan;
    activeUser: UserProfile | null;
    activeAgreement?: Agreement;
    onRefresh: () => void;
    onAgreementPayment: (loan: Loan, agreement: Agreement, inst: AgreementInstallment) => void;
    onReverseAgreementPayment?: (loan: Loan, agreement: Agreement, inst: AgreementInstallment) => void;
    orderedInstallments: Installment[];
    fixedTermStats: any;
    isPaid: boolean;
    isLate: boolean;
    isZeroBalance: boolean;
    isFullyFinalized: boolean;
    daysUntilDue: number;
    showProgress: boolean;
    strategy: any;
    isDailyFree: boolean;
    isFixedTerm: boolean;
    isStealthMode?: boolean;
    allLoans?: Loan[];
    onNavigate?: () => void;
    onLegalDocument?: (path: string) => void;
    daysBeforeDue?: number;
    hasActiveAgreement: boolean;
}

export const Body: React.FC<BodyProps> = ({
    hasActiveAgreement, loan, activeUser, activeAgreement, onRefresh, onAgreementPayment, onReverseAgreementPayment,
    orderedInstallments, fixedTermStats, isPaid, isLate, isZeroBalance, isFullyFinalized, daysUntilDue,
    showProgress, strategy, isDailyFree, isFixedTerm, isStealthMode, allLoans, onNavigate, onLegalDocument
}) => {
    // Encontrar contratos que foram unificados neste aqui
    const unifiedChildren = React.useMemo(() => {
        if (!allLoans || !loan.id) return [];
        const shortId = loan.id.slice(0, 8);
        return allLoans.filter(l => 
            l.notes?.includes(`Contrato migrado para a unificação ${shortId}`)
        );
    }, [allLoans, loan.id]);

    return (
        <div className="space-y-6 pt-2">
            {/* Seção de Resumo de Status (Visível apenas se expandido) */}
            <div className="flex flex-wrap items-center gap-2 pb-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/50 rounded-lg border border-slate-800/50">
                   <Info size={10} className="text-slate-500" />
                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Status Detalhado</span>
                </div>
                
                {isFullyFinalized ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 size={10} className="shrink-0" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Totalmente Quitado</span>
                    </div>
                ) : hasActiveAgreement ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                        <Handshake size={10} className="shrink-0" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Em Renegociação</span>
                    </div>
                ) : (
                    (() => {
                        const label = getDueBadgeLabel(daysUntilDue);
                        const { cls, icon } = getDueBadgeStyle(daysUntilDue);
                        return (
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm ${cls}`}>
                                {React.cloneElement(icon as React.ReactElement<any>, { size: 10 })}
                                <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
                            </div>
                        );
                    })()
                )}

                {loan.last_billed_at && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 size={10} className="shrink-0" />
                        <span className="text-[9px] font-black uppercase tracking-wider">
                            {new Date(loan.last_billed_at).toDateString() === new Date().toDateString() 
                              ? 'Cobrado Hoje' 
                              : `Cobrado em ${new Date(loan.last_billed_at).toLocaleDateString('pt-BR')}`}
                        </span>
                    </div>
                )}
            </div>

            {/* Seção de Unificação */}
            {unifiedChildren.length > 0 && (
                <div className="space-y-3 bg-slate-900/40 p-4 rounded-[1.5rem] border border-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                            <Layers size={14} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-white tracking-widest">Contratos Unificados</span>
                            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tight">Este contrato absorveu {unifiedChildren.length} sub-registros</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 mt-2">
                        {unifiedChildren.map(child => (
                            <div key={child.id} className="bg-slate-950/60 border border-slate-800/30 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 hover:border-indigo-500/30 transition-colors">
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-black text-white uppercase truncate">{child.debtorName}</span>
                                    <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                                        <span className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter">ID: {child.id.slice(0, 8)}</span>
                                        <span className="text-slate-800">•</span>
                                        <span className="text-[8px] text-emerald-500/80 font-black tracking-tight">{formatMoney(child.principal, isStealthMode)}</span>
                                    </div>
                                </div>
                                <div className="shrink-0 px-2 py-1 bg-slate-900/80 border border-slate-800/50 rounded-lg text-[7px] font-black text-slate-500 uppercase tracking-widest">
                                    Consolidado
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Banner de Acordo Ativo */}
            {hasActiveAgreement && (
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-900/10 border border-indigo-500/20 p-5 rounded-[2rem] shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                            <Handshake size={64} />
                        </div>
                        <div className="relative z-10 text-center">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2">Acordo de Renegociação Ativo</h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-[280px] mx-auto">
                                Pagamento priorizado via acordo. O fluxo original foi congelado para preservar o histórico.
                            </p>
                        </div>
                    </div>
                    
                    <AgreementView 
                        agreement={activeAgreement!}
                        loan={loan}
                        activeUser={activeUser}
                        onUpdate={onRefresh}
                        onPayment={(inst) => onAgreementPayment(loan, activeAgreement!, inst)}
                        onReversePayment={(inst) => onReverseAgreementPayment?.(loan, activeAgreement!, inst)}
                        onNavigate={onLegalDocument}
                    />
                </div>
            )}

            {/* Grid de Parcelas com Divisor em Gradiente */}
            <div className={hasActiveAgreement ? "pt-6" : ""}>
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.25em] whitespace-nowrap">
                        {hasActiveAgreement ? "Histórico Original" : "Cronograma de Parcelas"}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
                </div>
                
                <InstallmentGrid
                    loan={loan}
                    orderedInstallments={orderedInstallments}
                    fixedTermStats={fixedTermStats}
                    isPaid={isPaid}
                    isLate={isLate}
                    isZeroBalance={isZeroBalance}
                    isFullyFinalized={isFullyFinalized}
                    showProgress={showProgress}
                    strategy={strategy}
                    isDailyFree={isDailyFree}
                    isFixedTerm={isFixedTerm}
                    onAgreementPayment={onAgreementPayment}
                    isStealthMode={isStealthMode}
                    onNavigate={onNavigate}
                />
            </div>
        </div>
    );
};
