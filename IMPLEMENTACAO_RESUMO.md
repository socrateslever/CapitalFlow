# Implementações

## 2026-05-01 (Parte 1)
- **Objetivo:** Finalizar funcionalidade de cobrança, corrigir erro de coluna no banco e ajustar layout da busca e visual do modal de aporte.
- **Arquivos Alterados:**
    - `/features/calendar/hooks/useCalendar.ts`: Corrigido erro "column profile_id does not exist" alterando filtro de `profile_id=eq` para `owner_id=eq`.
    - `/components/cards/LoanCardComposition/Header.tsx`: Atualizado comportamento do botão "Cobrar" para refletir estado "Cobrado" (cor verde) imediatamente ao clicar.
    - `/components/dashboard/DashboardControls.tsx`: Removida transição absoluta do buscador para permitir fluxo no layout, evitando sobreposição com cards.
    - `/components/modals/NewAporteModal.tsx`: Melhorada construção visual do modal, aplicando cantos levemente arredondados (`rounded-xl` / `rounded-lg`) em vez de circulares (`rounded-full`) para um visual mais sóbrio e profissional.
- **Arquivos Novos:** 
    - Nenhum.
- **Observações:** O SQL de migração para colunas de faturamento já havia sido criado previamente. A lógica de exibição de "O cliente foi cobrado X vezes" no `Body.tsx` já estava correta.

## 2026-05-01 (Parte 2)
- **Objetivo:** Implementar melhorias de usabilidade: persistência de estado do contrato selecionado.
- **Arquivos Alterados:**
    - `/hooks/useUiState.ts`: Implementada persistência de `selectedLoanId` no `localStorage` para manter o contrato selecionado após atualização da página.
- **Arquivos Novos:** 
    - Nenhum.
- **Observações:** O estado persistente `cm_selected_loan_id` garante que a aplicação retorne ao contrato previamente visualizado (ao clicar em fechar contrato, o fluxo já redireciona/limpa pelo `App.tsx` logic). A persistência de rascunhos de modais e forms (drafts) requer implementação dedicada por modal e será avaliada se necessária nos próximos passos de evolução.

