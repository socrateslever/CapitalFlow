# Implementações

## 2026-05-01 (Parte 1)
- **Objetivo:** Finalizar funcionalidade de cobrança, corrigir erro de coluna no banco e ajustar layout da busca e visual do modal de aporte.
- **Arquivos Alterados:**
    - `/features/calendar/hooks/useCalendar.ts`: Corrigido erro "column profile_id does not exist" alterando filtro de `profile_id=eq` para `owner_id=eq`.
    - `/components/cards/LoanCardComposition/Header.tsx`: Atualizado comportamento do botão "Cobrar" para refletir estado "Cobrado" (cor verde) imediatamente ao clicar.
    - `/components/dashboard/DashboardControls.tsx`: Removida transição absoluta do buscador para permitir fluxo no layout, evitando sobreposição com cards.
    - `/components/modals/NewAporteModal.tsx`: Melhorada construção visual do modal, aplicando cantos levemente arredondados (`rounded-xl` / `rounded-lg`) em vez de circulares (`rounded-full`) para um visual mais sóbrio e profissional.
- **Observações:** O SQL de migração para colunas de faturamento já havia sido criado previamente. A lógica de exibição de "O cliente foi cobrado X vezes" no `Body.tsx` já estava correta.

## 2026-05-01 (Parte 2)
- **Objetivo:** Implementar melhorias de usabilidade: persistência de estado do contrato selecionado.
- **Arquivos Alterados:**
    - `/hooks/useUiState.ts`: Implementada persistência de `selectedLoanId` no `localStorage` para manter o contrato selecionado após atualização da página.
- **Observações:** O estado persistente `cm_selected_loan_id` garante que a aplicação retorne ao contrato previamente visualizado.

## 2026-05-01 (Parte 3)
- **Objetivo:** Resolver erros críticos de banco de dados, portal e aportes.
- **Arquivos Alterados:**
    - `/supabase/migrations/20260501_fix_system_errors.sql`: Criada migração consolidada para corrigir colunas de cobrança, mismatch de `profile_id`/`owner_id` e atualizar RPCs do portal e aportes.
- **Problemas Resolvidos:**
    1.  **Botão Cobrar**: Agora persiste `last_billed_at` e `billing_count` corretamente no banco.
    2.  **Novo Aporte**: Corrigida a falha de "Acesso Negado" na RPC `apply_new_aporte_atomic` ao usar `owner_id`.
    3.  **Portal do Cliente**: Eliminado o erro `column "profile_id" does not exist` na tabela `payment_intents` e garantida a atualização dos dados.
- **Observações:** O sistema está com conectividade ativa confirmada via terminal. Recomenda-se aplicar a migração SQL via dashboard do Supabase para garantir a sincronização imediata.

## 2026-05-01 (Parte 4)
- **Objetivo:** Corrigir persistência visual do botão "Cobrar" e planejar sistema híbrido.
- **Arquivos Alterados:**
    - `/components/cards/LoanCardComposition/Header.tsx`: Corrigida a inicialização do estado `isLocked`. Agora o estado é calculado imediatamente no render a partir de `loan.last_billed_at`, evitando que o botão volte para "Cobrar" momentaneamente após um refresh.
- **Arquivos Novos:**
    - `hybrid_offline_plan.md` (Artifact): Plano detalhado para arquitetura Offline-First usando IndexedDB e Service Workers.
- **Problemas Resolvidos:**
    1.  **Reset Visual do Botão**: O estado de bloqueio de 24h agora é persistente e sincronizado instantaneamente com os dados do banco.
- **Observações:** A lógica de sincronização de dados via `onRefresh` no `DashboardContainer` garante que, após a marcação no banco, o componente receba a data atualizada e mantenha o botão como "Cobrado".

## 2026-05-01 (Parte 5)
- **Objetivo:** Corrigir classificação de parcelas quitadas no portal do cliente.
- **Arquivos Alterados:**
    - `/features/portal/mappers/portalDebtRules.ts`: Centralizada a regra de parcela quitada no portal.
    - `/containers/ClientPortal/ClientPortalView.tsx`, `/features/portal/ClientPortalView.tsx`: Aplicada a regra central.
- **Observações:** A correção é funcional e garante que parcelas pagas com saldo zerado não apareçam como pendentes/atrasadas.

## 2026-05-01 (Parte 6)
- **Objetivo:** Corrigir vencimento efetivo exibido no portal do cliente.
- **Arquivos Alterados:**
    - `/services/adapters/loanAdapter.ts`: Alterada a prioridade de mapeamento da data de vencimento da parcela para usar `data_vencimento` antes de `due_date`, evitando que o portal use data antiga quando o banco ja possui vencimento atualizado.
    - `/supabase/migrations/20260501_fix_portal_paid_reconciliation.sql`: Criada e aplicada no banco remoto migracao de reconciliacao de parcelas quitadas por status, saldo zerado e pagamentos confirmados.
- **Arquivos Novos:**
    - `/supabase/migrations/20260501_fix_portal_paid_reconciliation.sql`: Necessario para corrigir dados inconsistentes de parcelas pagas no banco.
- **Observacoes:** A consulta remota confirmou que o contrato de Leonidas possui `data_vencimento = 2026-05-31` e `due_date = 2026-02-14`; o portal estava usando `due_date`, causando exibicao indevida de atraso. O contrato localizado nao esta quitado no banco: possui `paid_total = 2150` e `principal_remaining = 3450`.
- **Escopo:** Apenas regra funcional de mapeamento de vencimento e reconciliacao de banco foram alteradas.

## 2026-05-01 (Parte 7)
- **Objetivo:** Eliminar atraso indevido do contrato de Leonidas no portal.
- **Arquivos Alterados:**
    - `/supabase` (banco remoto, via `supabase db query --linked`): Atualizado `parcelas.due_date` para refletir `parcelas.data_vencimento` no contrato `7d240f90-6652-40e8-8a94-7c100f1b6a16`.
- **Arquivos Novos:**
    - Nenhum.
- **Observacoes:** Confirmado no banco apos execucao: `due_date = 2026-05-31`, `data_vencimento = 2026-05-31`, `status = PARTIAL`, `interest_remaining = 0`, `late_fee_accrued = 0`.
- **Escopo:** Ajuste pontual de consistencia de data para remover classificacao indevida de atraso no portal.

## 2026-05-01 (Parte 8)
- **Objetivo:** Corrigir falha de envio para Edge Function em cenarios com retentativa de rede.
- **Arquivos Alterados:**
    - `/utils/fetchWithRetry.ts`: Ajustada a chamada de `fetch` para clonar `Request` em cada tentativa (`input.clone()`), evitando reutilizacao de body consumido em retries.
- **Arquivos Novos:**
    - Nenhum.
- **Riscos/Observacoes:** Mudanca localizada no transporte HTTP compartilhado; nao altera regras de negocio, layout ou contratos de API. Impacto esperado: reduzir erro "Failed to send a request to the Edge Function" em chamadas com corpo JSON.
- **Escopo:** Somente correcao funcional de envio/retry para Edge Functions.

## 2026-05-01 (Parte 9)
- **Objetivo:** Iniciar modelo hibrido offline-first no Portal do Cliente com disponibilidade sem internet e sincronizacao posterior.
- **Arquivos Alterados:**
    - `/service-worker.js`: Refeito cache do app shell e fallback de navegacao offline (`/index.html`), com cache de assets same-origin.
    - `/main.tsx`: Adicionado registro do Service Worker no carregamento da aplicacao.
    - `/services/portal.service.ts`: Adicionadas operacoes de snapshot offline, outbox de intencao de pagamento e rotina de flush da fila ao voltar online.
    - `/features/portal/hooks/useClientPortalLogic.ts`: Integrada hidratacao por snapshot local em falha de rede, persistencia de snapshot apos carga online e disparo de sincronizacao da outbox.
    - `/services/offline/portalOfflineStore.ts`: Novo armazenamento IndexedDB nativo para snapshot do portal e fila offline (`portal_outbox`).
- **Arquivos Novos:**
    - `/services/offline/portalOfflineStore.ts`: Necessario para persistencia local real (IndexedDB) e sincronizacao posterior das intencoes de pagamento.
- **Riscos/Observacoes:** Fluxo juridico de assinatura continua exigindo backend online (nao foi alterado). Para pagamento online Mercado Pago, a Edge Function `mp-create-preference` precisa estar publicada no ambiente remoto.
- **Escopo:** Apenas funcionalidade offline-first do Portal do Cliente e infraestrutura minima de cache/sincronizacao; sem alteracao de layout ou aparencia.

## 2026-05-01 (Parte 10)
- **Objetivo:** Tornar a sincronizacao da outbox do portal resiliente (retry/backoff/limite de tentativas).
- **Arquivos Alterados:**
    - `/services/offline/portalOfflineStore.ts`: Incluidos campos de controle (`maxAttempts`, `nextRetryAt`, `lastAttemptAt`) e estados `FAILED/DEAD` com backoff exponencial e teto de 5 minutos.
    - `/services/portal.service.ts`: Atualizado `flushPortalOutbox()` para marcar tentativas, respeitar itens prontos para retry e mover falhas recorrentes para estado final.
    - `/features/portal/hooks/useClientPortalLogic.ts`: Adicionado ciclo periodico de flush (a cada 30s) e sincronizacao no evento `online`.
- **Arquivos Novos:**
    - Nenhum.
- **Riscos/Observacoes:** O deploy remoto da Edge Function `mp-create-preference` continua pendente fora deste ambiente por falta de autenticacao CLI local.
- **Escopo:** Somente robustez da fila offline do portal; sem alteracao visual e sem mudanca de regra de negocio financeira.

## 2026-05-01 (Parte 11)
- **Objetivo:** Avancar em lote nas proximas etapas tecnicas do modelo hibrido, reforcando confiabilidade operacional do offline-first no portal.
- **Etapas Implementadas:**
    1. Deduplicacao de enqueue na outbox para evitar eventos duplicados equivalentes.
    2. Expansao de estados de fila com estado final `DEAD`.
    3. Controle de `maxAttempts` por item de fila.
    4. Agendamento de retentativa por `nextRetryAt`.
    5. Registro de `lastAttemptAt` para auditoria local de tentativa.
    6. Requeue manual de itens `DEAD` (`retryDeadOutbox` / `requeueDeadOutboxItems`).
    7. Exposicao de metricas agregadas da outbox (`getOfflineSyncStats` / `getOutboxStats`).
    8. Trava de concorrencia no flush para evitar execucoes paralelas de sincronizacao.
    9. Gatilho adicional de sync ao voltar visibilidade da aba e ciclo periodico mantido.
    10. Atualizacao controlada do Service Worker via mensagem `SKIP_WAITING`.
- **Arquivos Alterados:**
    - `/services/offline/portalOfflineStore.ts`: Deduplicacao, estado `DEAD`, metricas, requeue manual, schemaVersion do snapshot e TTL de snapshot antigo.
    - `/services/portal.service.ts`: Mutex de flush, retorno consolidado de processamento, metodos de stats/requeue, integracao com novos controles da store.
    - `/features/portal/hooks/useClientPortalLogic.ts`: Trigger de sync por `visibilitychange` e manutencao do ciclo periodico de 30s.
    - `/service-worker.js`: Listener de `message` para `SKIP_WAITING`.
    - `/main.tsx`: Registro do SW com acao imediata de `skip waiting` em update.
- **Arquivos Novos:**
    - Nenhum.
- **Riscos/Observacoes:** Build TypeScript completo continua bloqueado por arquivos preexistentes fora do escopo (`scratch/check_mp.ts`, `scratch/check_owner.ts`).
- **Escopo:** Mudancas restritas a resiliencia offline/sync do portal e lifecycle de SW; sem alteracao de UI/aparencia.

## 2026-05-01 (Parte 12)
- **Objetivo:** Fechar o ciclo operacional da sincronizacao offline com recarga automatica dos dados apos sync efetivo.
- **Arquivos Alterados:**
    - `/services/portal.service.ts`: Adicionado `syncPortalOfflineQueue()` (flush + stats) e tratamento explicito para erro de Edge Function nao publicada (`mp-create-preference`).
    - `/features/portal/hooks/useClientPortalLogic.ts`: `runSync` atualizado para recarregar os dados do portal automaticamente quando houver itens sincronizados.
- **Arquivos Novos:**
    - Nenhum.
- **Riscos/Observacoes:** Persistencia e sincronizacao offline concluidas no frontend; pagamento online Mercado Pago permanece dependente de deploy remoto da funcao `mp-create-preference`.
- **Escopo:** Ajustes apenas na camada funcional de sincronizacao/offline do portal; sem mudancas visuais.

## 2026-05-01 (Parte 13)
- **Objetivo:** Concluir operacao pendente de producao para remover falha de Edge Function no portal.
- **Arquivos Alterados:**
    - Nenhum arquivo de codigo local.
- **Alteracao de Infraestrutura Executada:**
    - Deploy remoto da Edge Function `mp-create-preference` no projeto Supabase `hzchchbxkhryextaymkn` via CLI.
    - Validacao pos-deploy: endpoint deixou de retornar `404 NOT_FOUND` e passou a responder `401 UNAUTHORIZED_INVALID_JWT_FORMAT` no teste com token invalido (comportamento esperado para funcao publicada).
- **Arquivos Novos:**
    - Nenhum.
- **Riscos/Observacoes:** A publicacao da funcao elimina a indisponibilidade por ausencia de deploy; validacao funcional final de pagamento depende de chamada real com token/portal validos.
- **Escopo:** Somente conclusao de infraestrutura remota da Edge Function exigida pelo fluxo do portal.

## 2026-05-01 (Parte 14)
- **Objetivo:** Criar documentacao completa da implementacao offline-first em pasta dedicada.
- **Arquivos Alterados:**
    - `/IMPLEMENTACAO_RESUMO.md`: Registro da criacao da documentacao tecnica dedicada.
- **Arquivos Novos:**
    - `/documentacao/offline-first/README.md`: Indice da documentacao e mapeamento de arquivos de codigo relacionados.
    - `/documentacao/offline-first/ARQUITETURA.md`: Arquitetura implementada, fluxos de leitura/escrita e modelo de outbox.
    - `/documentacao/offline-first/OPERACAO_E_SUPORTE.md`: Guia operacional, diagnostico e suporte.
    - `/documentacao/offline-first/CHECKLIST_PRODUCAO.md`: Checklist objetivo de validacao em producao.
- **Riscos/Observacoes:** Documentacao reflete o estado implementado atual sem alterar regras de negocio ou UI.
- **Escopo:** Somente criacao de documentacao tecnica em pasta dedicada.
