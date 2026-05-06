import { Loan, Installment, LoanPolicy } from "../../../../types";
import { getDaysDiff } from "../../../../utils/dateHelpers";
import { CalculationResult } from "../types";

const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

export const calculateMonthly = (loan: Loan, inst: Installment, policy: LoanPolicy): CalculationResult => {
    const daysLate = Math.max(0, getDaysDiff(inst.dueDate));
    
    // ✅ FALLBACK: Se a parcela não tem principal individual, usa o principal do contrato (Floating Debt)
    const principal = Number(inst?.principalRemaining) || Number(loan?.principal) || 0;
    
    // Usa o interestRemaining processado pelo rebuild.
    const interest = Number(inst?.interestRemaining) || 0;
    
    let fineFixed = 0;
    let fineDaily = 0;
    let currentLateFee = 0;

    // Calcula encargos apenas se houver saldo devedor e atraso
    if (daysLate > 0 && (principal + interest) > 0) {
        // Multa Fixa (%) - Baseada no saldo devedor total atual
        fineFixed = round((principal + interest) * (policy.finePercent / 100));
        
        // Juros Mora Diária (%)
        fineDaily = round((principal + interest) * (policy.dailyInterestPercent / 100) * daysLate);
        
        currentLateFee = round(fineFixed + fineDaily);
    }

    return {
        total: round(principal + interest + currentLateFee),
        principal,
        interest, // Retorna o saldo restante de juros, não o total do mês
        lateFee: currentLateFee,
        finePart: fineFixed,
        moraPart: fineDaily,
        baseForFine: round(principal + interest),
        daysLate
    };
};
