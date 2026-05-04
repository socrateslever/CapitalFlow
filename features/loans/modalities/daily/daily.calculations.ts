import { LoanStatus, Installment } from '../../../../types';
import { addDaysUTC, parseDateOnlyUTC, toISODateOnlyUTC } from '../../../../utils/dateHelpers';
import { generateUUID } from '../../../../utils/generators';

export const calculateDailyFixedTermInstallments = (
  principal: number,
  monthlyRate: number,
  startDateStr: string,
  durationDaysStr: string,
  skipWeekends: boolean = false
): { installments: Installment[]; totalToReceive: number } => {
  const baseDate = parseDateOnlyUTC(startDateStr);
  const durationDays = Math.max(1, parseInt(durationDaysStr, 10) || 15);

  const totalInterest = principal * (monthlyRate / 100);
  const totalToReceive = parseFloat((principal + totalInterest).toFixed(2));
  const totalPrincipal = parseFloat(principal.toFixed(2));
  const totalInterestRounded = parseFloat(totalInterest.toFixed(2));

  const baseAmount = Math.floor((totalToReceive / durationDays) * 100) / 100;
  const basePrincipal = Math.floor((totalPrincipal / durationDays) * 100) / 100;
  const baseInterest = Math.floor((totalInterestRounded / durationDays) * 100) / 100;

  const installments: Installment[] = [];
  let allocatedAmount = 0;
  let allocatedPrincipal = 0;
  let allocatedInterest = 0;

  for (let number = 1; number <= durationDays; number++) {
    const isLast = number === durationDays;
    const amount = isLast ? parseFloat((totalToReceive - allocatedAmount).toFixed(2)) : baseAmount;
    const scheduledPrincipal = isLast ? parseFloat((totalPrincipal - allocatedPrincipal).toFixed(2)) : basePrincipal;
    const scheduledInterest = isLast ? parseFloat((totalInterestRounded - allocatedInterest).toFixed(2)) : baseInterest;
    const dueDate = addDaysUTC(baseDate, number, skipWeekends);

    allocatedAmount = parseFloat((allocatedAmount + amount).toFixed(2));
    allocatedPrincipal = parseFloat((allocatedPrincipal + scheduledPrincipal).toFixed(2));
    allocatedInterest = parseFloat((allocatedInterest + scheduledInterest).toFixed(2));

    installments.push({
      id: generateUUID(),
      dueDate: toISODateOnlyUTC(dueDate),
      amount,
      scheduledPrincipal,
      scheduledInterest,
      principalRemaining: scheduledPrincipal,
      interestRemaining: scheduledInterest,
      lateFeeAccrued: 0,
      avApplied: 0,
      paidPrincipal: 0,
      paidInterest: 0,
      paidLateFee: 0,
      paidTotal: 0,
      status: LoanStatus.PENDING,
      logs: [],
      number,
    });
  }

  return { installments, totalToReceive };
};

export const calculateNewDailyInstallments = (
  billingCycle: string,
  principal: number,
  rate: number,
  startDateStr: string,
  fixedDuration: string,
  existingId?: string,
  skipWeekends: boolean = false
): { installments: Installment[]; totalToReceive: number } => {
  const baseDate = parseDateOnlyUTC(startDateStr);
  const isCycle30 = billingCycle.includes('DAILY_30');

  let scheduledInterest = 0;
  let durationDays = 0;

  if (isCycle30) {
    scheduledInterest = principal * (rate / 100);
    durationDays = 30;
  }

  const totalToReceive = principal + scheduledInterest;
  const dueDate = addDaysUTC(baseDate, durationDays, skipWeekends);

  const installment: Installment = {
    id: existingId || generateUUID(),
    dueDate: toISODateOnlyUTC(dueDate),
    amount: parseFloat(totalToReceive.toFixed(2)),
    scheduledPrincipal: parseFloat(principal.toFixed(2)),
    scheduledInterest: parseFloat(scheduledInterest.toFixed(2)),
    principalRemaining: parseFloat(principal.toFixed(2)),
    interestRemaining: parseFloat(scheduledInterest.toFixed(2)),
    lateFeeAccrued: 0,
    avApplied: 0,
    paidPrincipal: 0,
    paidInterest: 0,
    paidLateFee: 0,
    paidTotal: 0,
    status: LoanStatus.PENDING,
    logs: [],
    number: 1,
  };

  return { installments: [installment], totalToReceive };
};

export const calculateLegacyDailyInstallments = (
  principal: number,
  rate: number,
  startDateStr: string,
  initialData: any,
  skipWeekends: boolean = false
) => {
  return calculateNewDailyInstallments(
    'DAILY',
    principal,
    rate,
    startDateStr,
    '30',
    initialData?.installments?.[0]?.id,
    skipWeekends
  );
};
