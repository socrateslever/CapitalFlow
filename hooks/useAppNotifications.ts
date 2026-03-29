import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loan, LoanStatus, CapitalSource } from '../types';
import { loanEngine, isLegallyActionable } from '../domain/loanEngine';
import { getDaysDiff, isValidDate } from '../utils/dateHelpers';
import { notificationService } from '../services/notification.service';
import { getInstallmentStatusLogic } from '../domain/finance/calculations';
import { playNotificationSound } from '../utils/notificationSound';

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  createdAt: number;
  isPersistent?: boolean;
  onClick?: () => void;
  action_url?: string;
  item_type?: string;
  item_id?: string;
  metadata?: any;
}

interface NotificationProps {
  loans: Loan[];
  sources: CapitalSource[];
  activeUser: any;
  showToast: any;
  setActiveTab: (tab: any) => void;
  setSelectedLoanId: (id: string | null) => void;
  disabled?: boolean;
}

export const useAppNotifications = ({
  loans,
  sources,
  activeUser,
  showToast,
  setActiveTab,
  setSelectedLoanId,
  disabled,
}: NotificationProps) => {
  const checkTimer = useRef<any>(null);
  const permissionAsked = useRef(false);
  const notifiedDueLoans = useRef<Set<string>>(new Set());
  const notifiedUnsignedLegal = useRef<Set<string>>(new Set());
  const lastUserId = useRef<string | null>(null);
  const [dismissedMap, setDismissedMap] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('cm_dismissed_notifications') || '{}');
    } catch {
      return {};
    }
  });

  const isDismissed = (type?: string, id?: string) => {
    if (!type || !id) return false;
    const key = `${type}_${id}`;
    const dismissedAt = dismissedMap[key];
    if (!dismissedAt) return false;
    
    const now = Date.now();
    const twelveHours = 12 * 60 * 60 * 1000;
    return (now - dismissedAt) < twelveHours;
  };

  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  const addNotification = (notif: Omit<InAppNotification, 'id' | 'createdAt'>) => {
    if (isDismissed(notif.item_type, notif.item_id)) return;

    setNotifications(prev => {
      // Evita duplicatas exatas recentes (mesmo titulo e mensagem)
      const isDuplicate = prev.some(n => n.title === notif.title && n.message === notif.message && (Date.now() - n.createdAt < 60000));
      if (isDuplicate) return prev;
      
      return [{
        ...notif,
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        createdAt: Date.now()
      }, ...prev];
    });
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => {
      const target = prev.find(n => n.id === id);
      if (target?.item_type && target?.item_id) {
        const key = `${target.item_type}_${target.item_id}`;
        const newMap = { ...dismissedMap, [key]: Date.now() };
        setDismissedMap(newMap);
        localStorage.setItem('cm_dismissed_notifications', JSON.stringify(newMap));
      }
      return prev.filter(n => n.id !== id);
    });
  };

  const resetNotifiedCaches = () => {
    notifiedDueLoans.current = new Set();
    notifiedUnsignedLegal.current = new Set();
  };

  const loansRef = useRef<Loan[]>(loans);
  useEffect(() => {
    loansRef.current = loans;
  }, [loans]);

  // 1. Monitoramento em Tempo Real (Eventos Críticos de Negócio)
  useEffect(() => {
    if (!activeUser || disabled) return;

    const channel = supabase
      .channel('global-urgent-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payment_intents',
          filter: `profile_id=eq.${activeUser.id}`,
        },
        (payload) => {
          if (payload.new.status === 'PENDENTE') {
            const onClick = () => {
                setActiveTab('CONTRACT_DETAILS');
                setSelectedLoanId(payload.new.loan_id);
            };
            notificationService.notify(
              'Intenção de Pagamento Recebida!',
              'Um cliente enviou uma intenção de pagamento.',
              onClick
            );
            addNotification({
                title: 'Intenção de Pagamento Recebida!',
                message: 'Um cliente enviou uma intenção de pagamento.',
                type: 'success',
                item_type: 'pagamento',
                item_id: payload.new.id,
                metadata: { loan_id: payload.new.loan_id }
            });
            showToast('Nova intenção de pagamento recebida!', 'success');
          }
        }
      )
      // EVENTO REALTIME: Mudança em parcelas (vencimento/atraso)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'parcelas',
          filter: `profile_id=eq.${activeUser.id}`,
        },
        (payload) => {
          const loan = loansRef.current.find((l) => l.id === payload.new.loan_id);
          if (
            loan &&
            loanEngine.computeLoanStatus(loan) === 'OVERDUE' &&
            !loan.activeAgreement
          ) {
            const onClick = () => {
                setActiveTab('LEGAL');
                setSelectedLoanId(loan.id);
            };
            notificationService.notify(
              'Ação Jurídica Necessária',
              `Contrato de ${loan.debtorName} está VENCIDO e sem assinatura.`,
              onClick
            );
            addNotification({
                title: 'Ação Jurídica Necessária',
                message: `Contrato de ${loan.debtorName} está VENCIDO e sem assinatura.`,
                type: 'warning',
                item_type: 'documento',
                item_id: loan.id,
                metadata: { loan_id: loan.id }
            });
          }
        }
      )
      // EVENTO REALTIME: Novo Lead de Captação
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `profile_id=eq.${activeUser.id}`,
        },
        (payload) => {
          const onClick = () => {
              setActiveTab('LEADS');
          };
          notificationService.notify(
            'Novo Lead de Captação!',
            `O cliente ${payload.new.nome} iniciou uma simulação.`,
            onClick
          );
          addNotification({
              title: 'Novo Lead de Captação!',
              message: `O cliente ${payload.new.nome} iniciou uma simulação.`,
              type: 'info',
              item_type: 'lead',
              item_id: payload.new.id
          });
          showToast(`Novo lead: ${payload.new.nome}`, 'success');
        }
      )
      // EVENTO REALTIME: Nova Mensagem no Chat de Captação
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campaign_chat_messages',
          filter: `profile_id=eq.${activeUser.id}`,
        },
        (payload) => {
          if (payload.new.sender === 'LEAD') {
            const onClick = () => {
                setActiveTab('LEADS');
            };
            notificationService.notify(
              'Nova Mensagem de Lead',
              `Mensagem recebida no chat de captação.`,
              onClick
            );
            addNotification({
                title: 'Nova Mensagem de Lead',
                message: `Mensagem recebida no chat de captação.`,
                type: 'info',
                item_type: 'lead',
                item_id: payload.new.lead_id
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUser, disabled, setActiveTab, setSelectedLoanId, showToast]);

  // 2. Monitoramento Periódico (Vencimentos e Saldo)
  const runScan = async () => {
    if (disabled || !activeUser) return;

    if (!permissionAsked.current) {
      permissionAsked.current = true;
      notificationService.requestPermission();
    }

    // A) Contratos vencendo HOJE (Alerta Matinal)
    if (loans?.length) {
      loans.forEach((loan) => {
        if (!loan || (loan as any).isArchived) return;

        const installments = (loan as any).installments || [];
        installments.forEach((inst: any) => {
          if (!inst?.id || !inst?.dueDate || !isValidDate(inst.dueDate)) return;

          const status = getInstallmentStatusLogic(inst);
          if (status === LoanStatus.PAID) return;

          const diff = getDaysDiff(inst.dueDate);

          // Notifica apenas no dia exato e uma única vez por sessão
          if (diff === 0 && !notifiedDueLoans.current.has(inst.id)) {
            notifiedDueLoans.current.add(inst.id);
            const onClick = () => {
                setActiveTab('CONTRACT_DETAILS');
                setSelectedLoanId(loan.id);
            };
            notificationService.notify(
              'Cobrança do Dia',
              `O contrato de ${loan.debtorName} vence hoje. Fique atento!`,
              onClick
            );
            addNotification({
                title: 'Cobrança do Dia',
                message: `O contrato de ${loan.debtorName} vence hoje. Fique atento!`,
                type: 'info',
                item_type: 'parcela',
                item_id: inst.id,
                metadata: { loan_id: loan.id }
            });
          }
        });
      });
    }

    // B) Jurídico: Vencidos sem assinatura (Notificação de Cobrança)
    if (loans?.length) {
      loans.forEach((loan) => {
        // HARDENING: usa função isolada para evitar erro de HMR
        if (
          isLegallyActionable(loan) &&
          !(loan as any).activeAgreement &&
          !notifiedUnsignedLegal.current.has(loan.id)
        ) {
          notifiedUnsignedLegal.current.add(loan.id);
          const onClick = () => {
              setActiveTab('LEGAL');
              setSelectedLoanId(loan.id);
          };
          notificationService.notify(
            'Ação Jurídica Necessária',
            `Contrato de ${loan.debtorName} está VENCIDO e sem confissão de dívida assinada.`,
            onClick
          );
          addNotification({
              title: 'Ação Jurídica Necessária',
              message: `Contrato de ${loan.debtorName} está VENCIDO e sem confissão de dívida assinada.`,
              type: 'warning',
              item_type: 'documento',
              item_id: loan.id,
              metadata: { loan_id: loan.id }
          });
        }
      });
    }

    // C) Saldo Crítico (Risco Operacional)
    (sources || []).forEach((source: any) => {
      if (!source?.id) return;
      const balance = Number(source.balance || 0);

      // Alerta apenas se cair abaixo de 50 reais (Extrema urgencia de caixa)
      if (balance < 50 && balance > -1000) {
        if (isDismissed('carteira', source.id)) return;

        // Adiciona notificação in-app persistente
        addNotification({
          title: 'Saldo Crítico',
          message: `A fonte de capital "${source.name}" está com saldo muito baixo (${balance.toFixed(2)}).`,
          type: 'error',
          isPersistent: true,
          item_type: 'carteira',
          item_id: source.id
        });
      }
    });
  };

  useEffect(() => {
    if (!activeUser || disabled) return;

    const currentId = String(activeUser?.id || '');
    if (lastUserId.current !== currentId) {
      lastUserId.current = currentId;
      resetNotifiedCaches();
      permissionAsked.current = false;
    }

    const delay = setTimeout(runScan, 5000);
    checkTimer.current = setInterval(runScan, 600000);

    return () => {
      clearTimeout(delay);
      if (checkTimer.current) clearInterval(checkTimer.current);
    };
  }, [activeUser, disabled, loans.length]);

  return { manualCheck: runScan, notifications, removeNotification, addNotification };
};
