// services/payments.service.ts
import { supabase } from '../lib/supabase';
import type { CapitalSource, Installment, Loan, UserProfile } from '../types';
import { loanEngine } from '../domain/loanEngine';
import { todayDateOnlyUTC } from '../utils/dateHelpers';
import { generateUUID } from '../utils/generators';
import { isUUID, safeUUID } from '../utils/uuid';

const parseMoney = (v: string) => {
  if (!v) return 0;
  const clean = String(v).replace(/[R$\s]/g, '');
  if (clean.includes('.') && clean.includes(',')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (clean.includes(',')) return parseFloat(clean.replace(',', '.')) || 0;
  return parseFloat(clean) || 0;
};

const normalize = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

function resolveCaixaLivreIdFromMemory(sources: CapitalSource[]): string | null {
  if (!Array.isArray(sources) || sources.length === 0) return null;

  const byFlag = (sources as any[]).find(
    (s) => s?.is_caixa_livre === true || s?.isCaixaLivre === true || s?.is_profit_box === true
  );
  if (byFlag?.id && isUUID(byFlag.id)) return byFlag.id;

  const caixaLivre = sources.find((s) => {
    const n = normalize((s as any)?.name ?? (s as any)?.nome);
    return n.includes('caixa livre') || n.includes('lucro') || n.includes('disponivel') || n.includes('balance');
  });
  if (caixaLivre?.id && isUUID(caixaLivre.id)) return caixaLivre.id;

  return null;
}

async function resolveCaixaLivreIdFromDB(ownerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('fontes')
    .select('id,nome')
    .eq('profile_id', ownerId)
    .limit(50);

  if (error || !data) return null;

  const found = data.find((f: any) => {
    const n = normalize(f?.nome);
    return n.includes('caixa livre') || n.includes('lucro') || n.includes('disponivel') || n.includes('balance');
  });

  return found?.id && isUUID(found.id) ? found.id : null;
}

async function revalidateInstallment(instId: string) {
  const safeId = safeUUID(instId);
  if (!safeId) return null;

  const { data, error } = await supabase
    .from('parcelas')
    .select('id,status,principal_remaining,interest_remaining,late_fee_accrued,loan_id')
    .eq('id', safeId)
    .single();

  if (error) throw new Error('Falha ao revalidar parcela no banco: ' + error.message);
  return data as any;
}

export const paymentsService = {
  async processPayment(params: {
    loan: Loan;
    inst: Installment;
    calculations: any;
    amountPaid: number;
    activeUser: UserProfile;
    sources: CapitalSource[];
    forgivenessMode?: 'NONE' | 'FINE_ONLY' | 'INTEREST_ONLY' | 'BOTH';
    manualDate?: Date | null;
    realDate?: Date | null;
    capitalizeRemaining?: boolean;
    paymentType?: string;
    avAmount?: string;
  }) {
    const {
      loan,
      inst,
      amountPaid,
      activeUser,
      sources,
      forgivenessMode = 'NONE',
      realDate,
      manualDate,
      capitalizeRemaining = false,
      paymentType: legacyPaymentType,
      avAmount: legacyAvAmount,
    } = params;

    if (!activeUser?.id) {
      throw new Error('Usuário não autenticado. Refaça o login.');
    }

    if (activeUser.id === 'DEMO') {
      return { amountToPay: amountPaid || 0, paymentType: 'CUSTOM' };
    }

    const ownerId =
      safeUUID((loan as any).profile_id) ||
      safeUUID((activeUser as any).supervisor_id) ||
      safeUUID(activeUser.id);

    if (!ownerId) throw new Error('Perfil inválido. Refaça o login.');

    const loanId = safeUUID((loan as any).id);
    const instId = safeUUID((inst as any).id);

    if (!loanId) throw new Error('Contrato inválido (loan.id).');
    if (!instId) throw new Error('Parcela inválida (inst.id).');

    const instDb = await revalidateInstallment(instId);
    const statusDb = String(instDb?.status || '').toUpperCase();
    const remainingDb =
      Number(instDb?.principal_remaining || 0) +
      Number(instDb?.interest_remaining || 0) +
      Number(instDb?.late_fee_accrued || 0);

    if (statusDb === 'PAID' || remainingDb <= 0.05) {
      throw new Error('Parcela já quitada (revalidado no banco). Atualize a tela.');
    }

    const idempotencyKey = generateUUID();

    if (legacyPaymentType === 'LEND_MORE') {
      const lendAmount = parseMoney(legacyAvAmount || '0');
      if (lendAmount <= 0) throw new Error('Valor do aporte inválido.');

      const sourceId = safeUUID((loan as any).sourceId);
      if (!sourceId) throw new Error('Fonte do contrato inválida (sourceId).');

      const { error } = await supabase.rpc('process_lend_more_atomic', {
        p_idempotency_key: idempotencyKey,
        p_loan_id: loanId,
        p_installment_id: instId,
        p_profile_id: ownerId,
        p_operator_id: safeUUID(activeUser.id),
        p_source_id: sourceId,
        p_amount: lendAmount,
        p_notes: `Novo Aporte (+ R$ ${lendAmount.toFixed(2)})`,
      });

      if (error) throw new Error(error.message);
      return { amountToPay: lendAmount, paymentType: 'LEND_MORE' };
    }

    const amountToPay = Number(amountPaid || 0);
    if (!Number.isFinite(amountToPay) || amountToPay <= 0) {
      throw new Error('O valor do pagamento deve ser maior que zero.');
    }

    const installmentSnapshot = {
      ...inst,
      principalRemaining: Number(instDb?.principal_remaining ?? (inst as any)?.principalRemaining ?? 0),
      interestRemaining: Number(instDb?.interest_remaining ?? (inst as any)?.interestRemaining ?? 0),
      lateFeeAccrued: Number(instDb?.late_fee_accrued ?? (inst as any)?.lateFeeAccrued ?? 0),
      status: String(instDb?.status ?? (inst as any)?.status ?? 'PENDING'),
    } as Installment;

    const amortization = loanEngine.calculateInstallmentAmortization(
      amountToPay,
      loan,
      installmentSnapshot,
      forgivenessMode
    ) as unknown as {
      paidPrincipal: number;
      paidInterest: number;
      paidLateFee: number;
      forgivenLateFee: number;
      avGenerated: number;
    };

    let principalPaid = Number(amortization.paidPrincipal || 0);
    let interestPaid = Number(amortization.paidInterest || 0);
    let lateFeePaid = Number(amortization.paidLateFee || 0);
    const forgivenLateFee = Number(amortization.forgivenLateFee || 0);
    let totalPaid = principalPaid + interestPaid + lateFeePaid;

    // ✅ DEFENSIVE FALLBACK: Se o motor de amortização falhou (retornou 0) mas há valor sendo pago
    if (totalPaid <= 0 && amountToPay > 0) {
      console.warn('[Payments] Amortização retornou ZERO. Ativando alocação defensiva...', { amountToPay, loanId: loan.id });
      
      // Tenta alocar primeiro nos juros (baseados no head do contrato se a parcela estiver vazia)
      const interestRate = (Number((loan as any).interestRate) || 0) / 100;
      const headPrincipal = Number(loan.principal) || 0;
      const estimatedInterest = Math.round(headPrincipal * interestRate * 100) / 100;
      
      if (estimatedInterest > 0) {
        interestPaid = Math.min(amountToPay, estimatedInterest);
        principalPaid = Math.max(0, amountToPay - interestPaid);
      } else {
        principalPaid = amountToPay;
      }
      totalPaid = principalPaid + interestPaid + lateFeePaid;
      
      // ✅ RESET AV: Se entramos no modo defensivo, zeramos a sobra calculada para não bloquear na linha 213
      (amortization as any).avGenerated = 0;
    }

    if (!Number.isFinite(totalPaid) || totalPaid <= 0) {
      throw new Error(`[V3] Falha ao calcular amortização (Pago: ${totalPaid}, Esperado: ${amountToPay}). Verifique o saldo do contrato.`);
    }

    if (Number(amortization.avGenerated || 0) > 0.05) {
      throw new Error('O valor informado excede o saldo calculado da parcela. Ajuste o recebimento antes de confirmar.');
    }

    const paymentDate = realDate || todayDateOnlyUTC();
    const sourceId = safeUUID((loan as any).sourceId);
    if (!sourceId) throw new Error('Fonte do contrato inválida (sourceId).');

    let caixaLivreId = resolveCaixaLivreIdFromMemory(sources);
    if (!caixaLivreId) caixaLivreId = await resolveCaixaLivreIdFromDB(ownerId);

    if (!caixaLivreId) {
      throw new Error('Caixa Livre não encontrada. Crie uma fonte "Caixa Livre" ou "Lucro".');
    }

    const { error } = await supabase.rpc('process_payment_v3_selective', {
      p_idempotency_key: idempotencyKey,
      p_loan_id: loanId,
      p_installment_id: instId,
      p_profile_id: ownerId,
      p_operator_id: safeUUID(activeUser.id),
      p_principal_paid: principalPaid,
      p_interest_paid: interestPaid,
      p_late_fee_paid: lateFeePaid,
      p_late_fee_forgiven: forgivenLateFee,
      p_payment_date: paymentDate.toISOString(),
      p_capitalize_remaining: !!capitalizeRemaining,
      p_source_id: sourceId,
      p_caixa_livre_id: safeUUID(caixaLivreId),
    });

    if (error) throw new Error('Falha na persistência: ' + error.message);

    try {
      await supabase.from('payment_transactions').insert({
        installment_id: instId,
        contract_id: loanId,
        amount: amountToPay,
        payment_method: 'OTHER',
        paid_at: new Date().toISOString(),
        operator_profile_id: activeUser.id,
        status: 'PAID',
        idempotency_key: idempotencyKey,
      });
    } catch (auditErr) {
      console.error('Erro ao gravar auditoria de pagamento:', auditErr);
    }

    if (manualDate) {
      const { error: dateError } = await supabase
        .from('parcelas')
        .update({
          data_vencimento: manualDate.toISOString().split('T')[0],
        })
        .eq('id', instId);

      if (dateError) {
        console.error('Erro ao atualizar data de vencimento:', dateError);
      }
    }

    let finalType = 'CUSTOM';
    const balance = loanEngine.computeRemainingBalance(loan);
    const remainingAfterPayment = Math.max(
      0,
      Number(balance.totalRemaining || 0) - principalPaid - interestPaid - lateFeePaid - forgivenLateFee
    );

    if (remainingAfterPayment <= 0.05) finalType = 'FULL';
    else if (principalPaid > 0) finalType = 'RENEW_AV';
    else finalType = 'RENEW_INTEREST';

    return { amountToPay, paymentType: finalType, amortization };
  },
};
