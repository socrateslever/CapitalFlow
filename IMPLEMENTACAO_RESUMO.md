# IMPLEMENTACAO_RESUMO

## Atualização - Correção de Reprodução de Áudio e Assinatura de Anexos (2026-04-19)

### Escopo executado
Resolução do erro "The element has no supported sources" que impedia a reprodução de áudios no chat, causado por falhas na geração de URLs assinadas e caminhos de arquivo incompletos.

1.  **Assinatura Universal de Anexos (`supportChat.service.ts`)**:
    *   A lógica de detecção de arquivos (`hasFile`) foi simplificada para reconhecer qualquer mensagem que possua um `file_url`, independente do `type`. Isso garante que áudios continuem sendo assinados corretamente mesmo após redirecionamentos de tipo para o banco.

2.  **Sincronização Realtime (`supportAdapter.ts`)**:
    *   Implementada assinatura assíncrona para mensagens recebidas via Supabase Realtime. Agora, mensagens com anexos vindas do socket têm sua URL assinada antes de serem exibidas, resolvendo o problema de caminhos internos (storage paths) que causavam o erro de fonte de mídia.

3.  **Diagnóstico no Player (`AudioPlayer.tsx`)**:
    *   Adicionado tratador de evento `onError` ao elemento `<audio>` para capturar e logar detalhes técnicos de `MediaError`. Reforçada a validação no `togglePlay` para evitar submissões de áudio com `src` inválido.

### Arquivos alterados
*   `/services/supportChat.service.ts`: Generalização da lógica de assinatura de URLs e adição de logs de erro detalhados.
*   `/components/chat/adapters/supportAdapter.ts`: Assinatura de URLs em tempo real.
*   `/features/support/components/AudioPlayer.tsx`: Adição de logs de erro, interface de falha com link de "Baixar" e proteção de estado.

---

## Atualização - Cabeçalho de Chat Personalizado e Formatação de Nomes (2026-04-19)

### Escopo executado
Implementação da solicitação do usuário para exibir o primeiro e o segundo nome do cliente no cabeçalho do chat, garantindo uma interface mais personalizada e informativa.

1.  **Nova Utilidade de Formatação (`formatFirstAndSecondName`)**:
    *   Criada uma função robusta em `utils/formatters.ts` que extrai apenas as duas primeiras partes de um nome completo, aplicando a capitalização correta.
    *   Isso evita nomes excessivamente longos no cabeçalho mantendo a identificação pessoal.

2.  **Personalização no Portal do Cliente**:
    *   O `PortalChatDrawer` agora extrai dinamicamente o nome do devedor (`debtorName`) do objeto de contrato (`loan`).
    *   Este nome é formatado e passado como título para o `UnifiedChat`, substituindo o texto genérico "Atendimento Direto".
    *   O contexto do chat também foi atualizado para carregar a identidade real do cliente, permitindo que o adapter de suporte tenha acesso ao nome correto.

3.  **Padronização no Painel do Operador**:
    *   O `supportAdapter` foi atualizado para utilizar a nova formatação no método `getHeader`.
    *   Agora, qualquer chat aberto pelo operador exibirá automaticamente o nome do cliente (1º e 2º nomes) no título, de forma consistente com o portal.

4.  **Melhoria Visual no Avatar (`initials`)**:
    *   O componente `UnifiedChat` agora calcula as iniciais baseando-se no primeiro e segundo nome exibidos (ex: "João Silva" -> "JS").
    *   Anteriormente, exibia apenas a primeira letra do título.

### Arquivos alterados
*   `/utils/formatters.ts`: Adição do `formatFirstAndSecondName`.
*   `/components/chat/adapters/supportAdapter.ts`: Integração da formatação no título do header.
*   `/features/portal/components/PortalChatDrawer.tsx`: Extração dinâmica e personalização do título para o cliente.
*   `/components/chat/UnifiedChat.tsx`: Lógica aprimorada de iniciais para o avatar e correção de erro de ordem de Hooks (React Rules of Hooks).

---

## Atualização - Resolução de Erros de Tipo e Geolocalização no Chat (2026-04-19)

### Escopo executado
Correção de erros críticos de banco de dados (`type_check`) e de armazenamento (`RLS`) que impediam o uso pleno do chat por clientes no portal, especialmente no envio de localização e arquivos.

1.  **Compatibilidade de Banco (`type_check`)**:
    *   Identificado que a restrição `mensagens_suporte_type_check` no PostgreSQL impedia o valor `'location'` na coluna `type`.
    *   **Solução**: O `supportChatService` agora mapeia automaticamente mensagens do tipo `location` para `text` antes da inserção, preservando o tipo real e coordenadas no campo `metadata`.
    *   **Renderização**: O componente `ChatMessages` foi atualizado para ler o `original_type` do metadata, garantindo que o link do mapa e o ícone de localização continuem sendo exibidos corretamente para o usuário.

2.  **Robustez no Armazenamento (RLS Storage)**:
    *   Tratamento de erro aprimorado para falhas de upload no bucket `support_chat`. Quando um usuário do portal (anon) tenta enviar um arquivo e encontra restrição de RLS, o sistema agora captura o erro e sugere alternativas (como envio via WhatsApp configurado no perfil).

3.  **Geolocalização e Permissões**:
    *   Refinamento do feedback no `ChatInput` para casos onde o navegador bloqueia o acesso à localização ou o timeout é atingido, com mensagens claras em Português.

### Arquivos alterados
*   `/services/supportChat.service.ts`: Mapeamento preventivo de tipos e tratamento de RLS.
*   `/features/support/components/ChatMessages.tsx`: Renderização baseada em metadata (`original_type`).
*   `/sql/fix_storage_rls_portal.sql`: **Novo arquivo** com script SQL para correção definitiva de RLS e Constraints no Supabase.
*   `/layout/AppShell.tsx`: Fix do posicionamento da badge de notificações (o unread count estava "flutuando" para o botão de 'Novo Contrato' por falta de `relative` context; agora está ancorado corretamente no botão de Chat).
*   `/IMPLEMENTACAO_RESUMO.md`: Documentação técnica da solução.

### Arquivos não alterados fora do escopo
*   Nenhuma alteração em rotas principais ou modelos financeiros.

---

## Atualização - Feedback de Erro e Diagnóstico no Chat do Portal (2026-04-19)

### Escopo executado
Implementação de sistema de feedback visual e logs de diagnóstico para resolver a opacidade nos erros de envio de mensagens no portal do cliente.

1.  **Feedback Visual (Toasts)**:
    *   Integrado o `useModal` ao componente `UnifiedChat`. Agora, falhas no envio de mensagens disparam notificações "toast" na cor Rose, informando o erro específico ao usuário final.

2.  **Rastreabilidade e Diagnóstico**:
    *   **Logs de Contexto**: O `PortalChatDrawer` agora registra no console a resolução completa do contexto (ID do Contrato, ID do Profissional e ID do Cliente), permitindo identificar instantaneamente se algum dado vital está ausente.
    *   **Monitoramento de Envio**: O `UnifiedChat` loga cada tentativa de envio e o resultado (sucesso ou erro detalhado), facilitando a depuração em tempo real.

3.  **Refinamento de Mensagens de Erro**:
    *   O `supportAdapter` foi atualizado para lançar erros verbosos e específicos sobre identificação (ex: "ID Profissional Inválido"), em vez de mensagens genéricas. Isso ajuda a distinguir erros de configuração de erros de banco de dados.

### Arquivos alterados
*   `/components/chat/UnifiedChat.tsx`: Implementação de Toasts e logs de envio.
*   `/components/chat/adapters/supportAdapter.ts`: Erros de identificação mais descritivos.
*   `/features/portal/components/PortalChatDrawer.tsx`: Logs de diagnóstico de contexto.

---

## Atualização - Correção de Interação e Integridade no Chat (Portal e Operador) (2026-04-19)

### Escopo executado
Resolução de problemas de botões travados, erros de envio no portal ("Dados Inválidos" e "Foreign Key Violation") e instabilidade na UI através de refatoração de contexto e validação.

1.  **Integridade de Dados e Banco**:
    *   **Captura de ProfileID**: O hook `useClientPortalLogic` agora recupera o `profile_id` do profissional, garantindo que o chat no portal tenha sempre um destinatário válido, evitando erros de chave estrangeira.
    *   **Validação Flexível**: O adaptador de suporte foi ajustado para permitir conversas de "Suporte Direto" sem a necessidade de um contrato (loanID) UUID estrito, usando o ID do profissional como fallback seguro.

2.  **Resolução de Conflitos de UI/UX**:
    *   **Z-Index e Camadas**: Elevado o `z-index` do container de input do chat para garantir que ele permaneça interativo mesmo sob overlays de status (como "Atendimento Encerrado").
    *   **Limpeza de Drawer**: Removida barra inferior redundante no portal do cliente que causava sobreposições em dispositivos móveis, liberando espaço para o teclado e inputs.

3.  **Estabilização e Performance**:
    *   **Memoização de Contexto**: Refatorados os componentes `PortalChatDrawer` e `OperatorSupportChat` para estabilizar os objetos de contexto passados ao `UnifiedChat`. Isso elimina loops de re-renderização e garante que o chat não "pisque" ou perca estado durante o uso.
    *   **Tipagem Segura**: Separação clara de contextos de Captação e Suporte para satisfazer os requisitos do TypeScript sem sacrificar a flexibilidade.

### Arquivos alterados
*   `/features/portal/hooks/useClientPortalLogic.ts`: Captura de metadados do perfil.
*   `/features/portal/components/PortalChatDrawer.tsx`: Reorganização lógica e limpeza de UI.
*   `/features/portal/ClientPortalView.tsx`: Passagem de contexto enriquecida.
*   `/components/chat/adapters/supportAdapter.ts`: Ajuste de validação e roteamento de mensagens.
*   `/components/chat/UnifiedChat.tsx`: Ajuste de profundidade de camadas (z-index).
*   `/features/support/OperatorSupportChat.tsx`: Estabilização de contextos e correção de tipos.

---

## Atualização - Inteligência de Negócios e Dashboard de Relatórios (2026-04-19)

### Escopo executado
Implementação de um módulo robusto de Business Intelligence (BI) para análise profunda da performance financeira e riscos da carteira.

1.  **Dashboard de Inteligência (`ReportsPage`)**:
    *   **KPIs em Tempo Real**: Visualização de Inadimplência (NPL), ROI Estimado, Yield da Carteira, Taxa de Alocação e Ticket Médio.
    *   **Performance por Fonte**: Gráficos de distribuição de capital alocado x saldo disponível por investidor/origem.
    *   **Insights de IA**: Sugestões automáticas baseadas em previsibilidade financeira e tendências de reinvestimento.
    *   **Stealth Mode Nativo**: Máscaras de privacidade aplicadas a todos os valores sensíveis do dashboard de BI.

2.  **Integração de Navegação**:
    *   **NavHub**: Inclusão do item "Inteligência" (Relatórios) no menu lateral e drawer mobile, com ícone de PieChart.
    *   **AppTab & Routing**: Registro do novo tipo de aba no sistema de rotas e tipagem global.
    *   **Lazy Loading**: Implementação de carregamento sob demanda para otimização de performance.

3.  **Refinamento de UI/UX**:
    *   Uso de animações suaves (`motion`) para transição de abas.
    *   Interface dark-mode otimizada com foco em leitura de dados financeiros.

### Arquivos alterados
*   `/types.ts`: Adição da aba `REPORTS`.
*   `/layout/NavHub.tsx`: Integração visual no menu de navegação e correção de importação do `PieChart`.
*   `/App.tsx`: Gerenciamento de rotas e renderização do novo container.
*   `/features/reports/pages/ReportsPage.tsx`: **Novo arquivo** contendo a lógica e interface de BI.

---

## Atualização - Overhaul Completo do Sistema de Chat (Realtime & Autoridade) (2026-04-19)

### Escopo executado
Revisão profunda da arquitetura de chat para garantir funcionamento bi-direcional (Operador <-> Cliente) sem erros de banco e com sincronização perfeita.

1.  **Integridade de Identidade (Padrão Sênior)**:
    *   **Consistência de IDs**: Garantido que o campo `profile_id` em `mensagens_suporte` sempre receba o ID da tabela `perfis` (Professional/Tenant), nunca o ID de devedores ou IDs brutos do Auth.
    *   **Autoridade de Mensagem**: Introduzido o conceito de `myId` no contexto do chat para distinguir o "Dono do Dado" (Tenant) do "Autor da Mensagem" (Sender).

2.  **Correção do Realtime (Sincronização Proativa)**:
    *   **Filtro do Adapter**: Corrigido o filtro de inscrição que estava descartando mensagens válidas por comparar o ID do Tenant com o ID do Autor. Agora o filtro usa `sender_user_id` e permite que o autor receba sua própria confirmação de mensagem (necessário pois o componente não usa estado otimista).
    *   **Feedback Visual**: Garantido que o som de notificação ocorra apenas para mensagens de terceiros.

3.  **Melhoria no Portal do Cliente**:
    *   **Vínculo de Atendimento**: O portal agora recupera e utiliza o `profile_id` correto do profissional responsável pelo contrato do cliente, satisfazendo a constraint de FK no banco de dados.
    *   **Resiliência**: Implementado tratamento para casos onde o ID do profissional é nulo, impedindo quebras de interface.

4.  **Limpeza de Código**:
    *   Eliminada dependência de `getAuthUid` no serviço de mensagens para evitar confusão entre `auth.users.id` e `perfis.id` em fluxos de portal.

### Arquivos alterados
*   `/components/chat/adapters/supportAdapter.ts`: Atualização do contexto e lógica de filtragem realtime.
*   `/services/supportChat.service.ts`: Reformulação do método `sendMessage` para ser agnóstico à identidade delegada.
*   `/features/support/OperatorSupportChat.tsx`: Ajuste na passagem de contexto (Dono vs Autor).
*   `/features/portal/components/PortalChatDrawer.tsx`: Ajuste na passagem de contexto (Vinculação de Tenant).

### Arquivos não alterados fora do escopo
*   Confirmado: Nenhuma alteração em layout global, dashboards, financeiro ou jurídico.

---

## Atualização - Correção do Envio de Mensagens no Portal (2026-04-19)

### Escopo executado
Resolução do bug que impedia os clientes de enviarem mensagens corretamente pelo portal ou causava atribuição incorreta da autoria da mensagem.

1.  **Ajuste de Identidade no `supportChatService`**:
    *   Adicionado o parâmetro `clientId` para capturar explicitamente o UUID do autor quando o remetente é um cliente.
    *   A lógica de autoria agora prioriza o `clientId` enviado pela interface, usando o `profileId` apenas como fallback para compatibilidade legada.

2.  **Integração no `supportAdapter`**:
    *   O adaptador agora extrai o `userId` do payload do `UnifiedChat` e o repassa como `clientId` para o serviço de mensagens. Isso garante que o campo `sender_user_id` no banco de dados reflita o autor real da mensagem no portal.

### Arquivos alterados
*   `/services/supportChat.service.ts`: Modificação na assinatura de `sendMessage` e lógica de autoria.
*   `/components/chat/adapters/supportAdapter.ts`: Repasse do `userId` para o serviço.

---

## Atualização - Correção Crítica de Integridade de Banco (2026-04-19)

### Escopo executado
Resolução do erro `violates foreign key constraint "mensagens_suporte_profile_id_fkey"`. Este erro impedia o salvamento de mensagens quando o sistema tentava vincular uma mensagem a um ID que não existia na tabela de perfis (normalmente tentando usar IDs de devedores em campos de profissionais).

1.  **Ajuste no `supportChatService`**:
    *   Atualizado `getActiveChats` para buscar o `profile_id` (ID do Profissional/Tenant) diretamente das mensagens existentes e dos contratos.
    *   Atualizado `getAvailableContracts` para incluir o `profile_id` do contrato no retorno, permitindo que novas conversas sejam iniciadas com o vínculo correto de tenant.
    *   Implementado fallback seguro para "Suporte Direto", garantindo que IDs de contrato não sejam enviados para colunas de perfil.

2.  **Refinamento do Contexto de Chat**:
    *   `OperatorSupportChat`: Ajustado para priorizar o ID do operador ou o ID do profissional vinculado ao contrato, evitando o uso de IDs de devedores no campo `profile_id`.
    *   `PortalChatDrawer`: Atualizado para usar `loan.profile_id` (o ID do profissional que atende o contrato) em vez do ID do próprio cliente no campo que exige um perfil verificado.

### Arquivos alterados
*   `/services/supportChat.service.ts`: Inclusão de `profile_id` nas buscas e mapeamento de contratos.
*   `/features/support/OperatorSupportChat.tsx`: Correção de mapeamento no contexto do `UnifiedChat`.
*   `/features/portal/components/PortalChatDrawer.tsx`: Correção de mapeamento no contexto do `UnifiedChat` (visão cliente).

---

## Atualização - Correção Crítica no Chat de Suporte (2026-04-19)

### Escopo executado
Resolução do erro "Dados inválidos" que impedia o envio de mensagens em novas sessões de suporte através do painel do operador.

1.  **Correção de Contexto no `OperatorSupportChat`**:
    *   Identificada a ausência do `clientId` ao iniciar conversas a partir da lista de contatos disponíveis.
    *   O `supportAdapter` exige que tanto o `loanId` quanto o `profileId` (clientId) sejam UUIDs válidos para validar a sessão de chat.
    *   Ajustado o `handleSelectContact` para preservar o `clientId` no estado `selectedChat`, garantindo que o contexto enviado ao `UnifiedChat` esteja completo.

2.  **Estabilização do NavHub**:
    *   Correção do erro de compilação (Missing Import) do ícone `PieChart` no menu de navegação.

### Arquivos alterados
*   `/features/support/OperatorSupportChat.tsx`: Correção na inicialização do objeto de chat selecionado.
*   `/layout/NavHub.tsx`: Adição do import `PieChart`.

---

## Atualização - Refinamento do Motor Lógico e Controle de Versão (2026-04-18)

### Escopo executado
Refinamento profundo das modalidades diárias e implementação de rastreabilidade de build para o usuário para verificação de commits no Cloud.

1.  **Refinamento do Motor Lógico (Engine Financeira)**:
    *   **Renovação DAILY_30**: Substituição da lógica de blocos mensais pela `renewDaily30` específica. O vencimento agora avança proporcionalmente ao juro pago (dia a dia).
    *   **Diferenciação Interest/Capital**: Separação completa das estratégias `DAILY_30_INTEREST` e `DAILY_30_CAPITAL` no registro de modalidades.
    *   **DAILY_FIXED_TERM**: Adição de juros de mora diários automáticos após o vencimento do prazo fixo.
    *   **Geração de Contrato**: Ajuste no gerador de parcelas para provisionar corretamente o juro do primeiro ciclo (30 dias) em modalidades indexadas.

2.  **Controle de Versões e Deploy Cloud**:
    *   **src/constants/version.ts**: Criação do arquivo de metadados do sistema para rastreabilidade de commits.
    *   **Loading Screen**: Adição de indicador de REV (Revisão) e BUILD no footer da tela de splash inicial.
    *   **Perfil do Usuário**: Nova aba "Sistema & Versão" contendo:
        *   Revisão e ID de Build.
        *   Versão específica do Motor Lógico.
        *   Timestamp do último deploy realizado no Cloud.
        *   Orientações de Sincronização (Hard Refresh).

### Arquivos alterados
*   `/domain/finance/modalities/daily30/daily30.renewal.ts`: Nova estratégia de renovação.
*   `/domain/finance/modalities/daily30/daily30.calculations.ts`: Refinamentos de cálculo.
*   `/domain/finance/modalities/daily30/index.ts`: Organização de módulos.
*   `/domain/finance/modalities/registry.ts`: Atualização do mapeamento oficial.
*   `/domain/finance/modalities/dailyFixedTerm/calculations.ts`: Nova regra de multa+mora.
*   `/features/loans/modalities/daily/daily.calculations.ts`: Correção na geração de parcelas 30 dias.
*   `/components/ui/LoadingScreen.tsx`: Exibição da versão no carregamento.
*   `/pages/ProfilePage.tsx`: Interface de informações técnicas.
*   `/src/constants/version.ts`: Novo arquivo de metadados.

---

## Atualizacao - Ajustes Financeiros, Perfil e Portal do Cliente (2026-04-17)

### Escopo executado
Refinamento do motor de cálculos de atraso, correção de acessibilidade em contexto global (Modais) e personalização de contatos de suporte.

1.  **Revisão Financeira (Modalidade 30 dias)**:
    -   Corrigido o cálculo de multa e mora diária no arquivo `/domain/finance/modalities/daily30/daily30.calculations.ts`.
    -   A base de cálculo foi alterada de `Principal` para `Total da Parcela (Principal + Juros Acumulados)`, garantindo que contratos de "Apenas Juros" (Interest-Only) gerem encargos de atraso corretamente sobre o valor devido.
2.  **Correção de Arquitetura e Portal do Cliente**:
    -   O `ModalProvider` foi movido no `App.tsx` para envolver o `AppGate`.
    -   **Resultado**: Resolvido o desaparecimento do botão de chat no Portal do Cliente. O componente `UnifiedChat` (dentro do Portal) agora possui acesso ao `ModalContext` necessário para exibir Toasts e Modais, evitando falhas silenciosas de renderização.
3.  **Gestão de Contatos de Suporte**:
    -   Adicionado campo `supportPhone` na interface `UserProfile` e mapeamento completo no banco de dados via `operatorProfileService.ts`.
    -   **Perfil**: Nova interface no `ProfilePage.tsx` permitindo ao operador configurar o "WhatsApp de Suporte (Mensagens)", utilizado para comunicações automáticas e suporte ao cliente.
    -   **Segurança**: Centralização do suporte ao operador no `AuthScreen.tsx` (Login), mantendo o número oficial para questões técnicas da plataforma e permitindo que o número operacional seja dinâmico.

### Arquivos alterados
- `/types.ts`: Adição de `supportPhone`.
- `/domain/finance/modalities/daily30/daily30.calculations.ts`: Ajuste na base de cálculo de encargos.
- `/App.tsx`: Reestruturação de providers globais.
- `/features/profile/services/operatorProfileService.ts`: Persistência do novo campo de suporte.
- `/pages/ProfilePage.tsx`: UI para edição do número de suporte.

---

## Atualizacao - Refinamento do Chat e Internacionalização (2026-04-17)

### Escopo executado
Profissionalização do chat, remoção de diálogos nativos bloqueados (iframe) e melhoria da consistência visual/internacionalização.

1.  **Internacionalização**: 
    -   Traduzido `LOAN_INITIAL` para "Contrato Inicial" em todo o sistema.
    -   Revisão de placeholders e textos para garantir o uso exclusivo de Português.
2.  **Remoção de Alertas e Confirmações Nativas**:
    -   Substituídos `confirm()` e `alert()` por diálogos integrados em `MessageHubModal`, `ChatMessages` e `OperatorSupportChat`.
    -   Isso garante compatibilidade com o ambiente de iFrame onde alertas nativos costumam ser bloqueados.
3.  **Arquitetura de UI**:
    -   Relocação do `ModalProvider` no `App.tsx` para envolver o `AppShell`, permitindo que componentes internos (como o Chat) acessem modais de confirmação e sistema de Toasts.
    -   Remoção do container redundante `ModalHostContainer.tsx`.
4.  **Melhoria no Sistema de Confirmação**:
    -   Adicionado suporte a callbacks `onConfirm` no controlador de confirmação do sistema, permitindo ações genéricas e seguras via UI.

### Arquivos alterados
- `/utils/translationHelpers.ts`
- `/components/cards/components/LedgerList.tsx`
- `/components/modals/MessageHubModal.tsx`
- `/features/support/components/ChatMessages.tsx`
- `/features/support/OperatorSupportChat.tsx`
- `/hooks/controllers/useLoanController.ts`
- `/App.tsx`
- `/containers/ModalHostContainer.tsx` (Removido)

---

## Atualizacao - Estabilização e Correções de Perfil (2026-04-17)

### Escopo executado
Correções críticas para o erro "Perfil não encontrado" e estabilização de dados financeiros.

1.  **Sincronização de Perfil**: Fix no logout imediato. `useAuth` agora cria perfis usando o ID do Auth User. `useAppState` resolve perfis de forma resiliente por ID ou User_ID.
2.  **Dashboard Preciso**: Filtro de clientes "TESTE" implementado para isolar métricas reais de simulações.
3.  **Capital na Rua**: Cálculo ajustado para refletir o saldo devedor total (parcelado diluído).
4.  **CPF Opcional**: Flexibilização no cadastro de clientes.
5.  **Recálculo Central**: Botão adicionado para sincronização manual do balanço do perfil.

---

Data: 2026-03-24

## Escopo desta etapa

Foi realizada uma revisao tecnica minuciosa, sem alteracao funcional do sistema, cobrindo:

1. Schema remoto do Supabase via CLI.
2. Consistencia geral do sistema.
3. Motor logico de emprestimos.
4. Motor financeiro e fluxo de pagamentos.
5. Fluxo de acordos.
6. Modais e formulario de emprestimos.
7. Portal do cliente e juridico.
8. Pontos de seguranca, persistencia e integridade.

Nao houve alteracao de codigo de negocio, layout, rotas, SQL ou comportamento visual nesta etapa. O objetivo aqui foi somente registrar o relatorio tecnico do estado atual.

## Metodo de analise

Foi utilizado o Supabase CLI para inspecao remota do schema publico, principalmente por meio da geracao de tipos do banco:

- `npx supabase gen types typescript --project-id hzchchbxkhryextaymkn --schema public`

Tambem foi feita leitura direta dos arquivos principais do sistema:

- `domain/finance/calculations.ts`
- `domain/loanEngine.ts`
- `domain/finance/modalities/registry.ts`
- `services/payments.service.ts`
- `services/contracts.service.ts`
- `features/agreements/services/agreementService.ts`
- `features/loans/hooks/useLoanForm.ts`
- `features/loans/domain/loanForm.validators.ts`
- `components/modals/PaymentManagerModal.tsx`
- `components/modals/payment/hooks/usePaymentManagerState.ts`
- `hooks/useAppState.ts`
- `features/auth/useAuth.ts`
- `lib/supabase.ts`
- `features/portal/hooks/useClientPortalLogic.ts`
- `types.ts`

## Resumo executivo

O sistema tem valor funcional real e varias partes ja operacionais, mas ainda esta longe de um estado realmente irrefutavel e coerente em todas as camadas.

Os maiores problemas hoje nao estao concentrados em um unico arquivo. Eles se distribuem em quatro grupos:

1. Deriva de schema e RPCs no banco.
2. Motor financeiro parcialmente centralizado, mas ainda com caminhos paralelos.
3. Cadastro, modal e fluxo de emprestimo com validacao rasa e varias convencoes nao protegidas.
4. Riscos fortes de seguranca e integridade por logica critica no frontend.

## Principais achados criticos

### 1. Segredos sensiveis ainda expostos no frontend

Arquivos:

- `types.ts`
- `hooks/useAppState.ts`

Achado:

- `UserProfile` ainda expoe `password` e `recoveryPhrase`.
- `mapProfileFromDB` ainda mapeia `senha_acesso` e `recovery_phrase`.
- O cache local salva `activeUser` inteiro em `localStorage`.

Impacto:

- Exposicao de credenciais e dados de recuperacao no browser.
- Vazamento por extensoes, XSS, devtools e dump local.
- Risco alto e desnecessario para um sistema financeiro.

Conclusao:

- Este e um dos problemas mais graves do sistema atual.

### 2. Vinculacao e criacao de perfil ainda acontecem no frontend

Arquivo:

- `features/auth/useAuth.ts`

Achado:

- Se nao encontra perfil por `user_id`, o frontend tenta localizar por email.
- Se encontrar, tenta vincular `user_id` diretamente pela UI.
- Se nao encontrar nada, o frontend tenta criar perfil novo em `perfis`.
- O frontend injeta `access_level: 1`.

Impacto:

- Integridade de identidade e controle de acesso ficam parcialmente no cliente.
- Risco de inconsistencia multi-tenant.
- Risco de criacao indevida de perfil.

Conclusao:

- Este fluxo deveria ser inteiramente server-side.

### 3. Configuracao do Supabase ainda mascara erro de ambiente

Arquivo:

- `lib/supabase.ts`

Achado:

- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` tem fallback hardcoded.
- Quando nao encontra env, o sistema nao falha cedo.

Impacto:

- Build ou ambiente local podem apontar para projeto errado.
- Defeito de configuracao fica silencioso.
- Investigacao operacional fica pior.

Conclusao:

- E um risco serio de operacao e de rastreabilidade.

### 4. O banco remoto tem sinais claros de deriva e legado convivendo com o fluxo novo

Fonte:

- Revisao via Supabase CLI do schema remoto.

Achado:

- O schema remoto ainda expoe varias sobrecargas de RPCs do portal.
- Ainda coexistem `process_payment_atomic_v2` e `process_payment_v3_selective`.
- O banco remoto ainda carrega estruturas e funcoes legadas convivendo com o fluxo atual.
- Foi detectado legado relacionado a `contratos_old` no schema remoto.

Impacto:

- A aplicacao pode chamar uma assinatura de funcao e o banco ter mais de uma versao concorrente.
- Dificulta manutencao, tipagem, rastreio e previsibilidade.
- Aumenta muito o risco de drift entre frontend, SQL local e banco remoto real.

Conclusao:

- O banco precisa de consolidacao de schema e de funcoes ativas.

## Analise do motor logico de emprestimos

Arquivos:

- `domain/loanEngine.ts`
- `domain/finance/calculations.ts`
- `domain/finance/dispatch.ts`
- `domain/finance/modalities/registry.ts`

### Pontos positivos

1. Existe uma base central para calculo de saldo remanescente.
2. Existe uma ordem unica de amortizacao no fluxo principal: multa/mora, depois juros, depois principal.
3. O pagamento manual recente esta mais alinhado com esse nucleo do que antes.

### Problemas encontrados

#### 1. Modalidades declaradas no tipo nao batem com as modalidades realmente implementadas

Arquivos:

- `types.ts`
- `domain/finance/modalities/registry.ts`

Achado:

- O tipo `LoanBillingModality` aceita 7 modalidades:
  - `MONTHLY`
  - `DAILY_FREE`
  - `DAILY_FIXED_TERM`
  - `DAILY`
  - `DAILY_30_INTEREST`
  - `DAILY_30_CAPITAL`
  - `DAILY_FIXED`
- O registro oficial tem apenas 3 estrategias reais:
  - `MONTHLY`
  - `DAILY_FREE`
  - `DAILY_FIXED_TERM`
- As demais caem em fallback silencioso.

Impacto:

- O sistema aparenta suportar mais modalidades do que realmente suporta.
- Dados legados podem cair em estrategia diferente sem transparência.

Conclusao:

- Hoje existe discrepancia entre contrato de tipo e motor real.

#### 2. O motor de renovacao esta simplificado demais

Arquivo:

- `domain/loanEngine.ts`

Achado:

- `calculateRenewal` so devolve juros remanescentes e multa remanescente.
- Nao existe tratamento forte por modalidade nessa renovacao.

Impacto:

- A palavra "renovacao" ainda existe na UX, mas a logica esta reduzida a um calculo generico.
- Pode haver divergencia entre expectativa operacional e efeito contabil real.

#### 3. Saldo de acordo ativo esta sendo achatado como principal

Arquivo:

- `domain/finance/calculations.ts`

Achado:

- Quando existe acordo ativo, `computeLoanRemainingBalance` soma as parcelas restantes do acordo e devolve tudo como `principalRemaining`, zerando juros e multa.

Impacto:

- Dashboard, saldo, juridico e outras camadas passam a ler um saldo resumido que nao preserva natureza contabil.
- O sistema perde granularidade e verdade financeira durante a fase de acordo.

Conclusao:

- E uma simplificacao funcional, mas nao e contabilmente irrefutavel.

#### 4. Status logico da parcela ignora parte do saldo

Arquivo:

- `domain/finance/calculations.ts`

Achado:

- `getInstallmentStatusLogic` considera apenas principal e juros para decidir quitacao.
- `lateFeeAccrued` nao entra no calculo de quitacao logica dessa funcao.

Impacto:

- Parcela pode parecer quitada em uma regra e ainda carregar encargo aberto em outra leitura.

#### 5. Parametro `paymentPriority` nao tem efeito real

Arquivo:

- `domain/finance/calculations.ts`

Achado:

- `allocatePayment` aceita `paymentPriority`, mas ignora o parametro e sempre usa a mesma ordem fixa.

Impacto:

- API interna induz comportamento que na pratica nao existe.

### Conclusao do motor de emprestimos

O motor esta melhor centralizado do que antes, mas ainda nao e um motor unico, formalizado e sem ambiguidade. A base existe, porem ainda ha simplificacoes, alias legados e sinais de contrato de dominio maior do que a implementacao real.

## Analise do motor financeiro e de pagamentos

Arquivos:

- `services/payments.service.ts`
- `domain/finance/calculations.ts`
- `domain/loanEngine.ts`
- schema remoto via CLI

### Pontos positivos

1. O fluxo manual revalida a parcela no banco.
2. O fluxo manual usa calculo central de amortizacao por parcela.
3. Existe bloqueio de sobrepagamento no fluxo recente.

### Problemas encontrados

#### 1. Ainda coexistem motores transacionais antigos e novos

Achado:

- O banco remoto ainda tem `process_payment_atomic_v2` e `process_payment_v3_selective`.

Impacto:

- Persistem duas geracoes de pagamento convivendo no ambiente remoto.
- Dificulta garantir que todos os canais usam a mesma regra.

#### 2. O fluxo ainda depende de convencoes por nome de carteira

Achado:

- Fluxos e indicadores ainda resolvem "Caixa Livre" por nome textual.

Impacto:

- Um simples rename operacional pode quebrar dashboard e conciliacao.

#### 3. O sistema ainda mistura modalidade, acao operacional e tipo visual de pagamento

Arquivos:

- `services/payments.service.ts`
- `components/modals/PaymentManagerModal.tsx`
- `components/modals/payment/hooks/usePaymentManagerState.ts`

Achado:

- `paymentType` continua sendo um conceito forte na UI.
- O backend real nao usa exatamente a mesma taxonomia para decidir regra contabil.

Impacto:

- A tela pode orientar a operacao de um jeito e o backend efetivar por outra leitura.

#### 4. O modal ainda assume regras genericas demais para vencimento futuro

Arquivo:

- `components/modals/payment/hooks/usePaymentManagerState.ts`

Achado:

- Para modalidade nao diaria, o proximo vencimento sugerido e sempre `+30 dias` a partir da data real do recebimento.

Impacto:

- Regra demasiadamente ampla para contratos mensais com comportamento especifico de calendario.

### Conclusao do motor de pagamentos

O motor principal melhorou, mas ainda nao esta completamente fechado como nucleo unico e impositivo. O maior problema atual nao e falta de calculo, e coexistencia de versoes, heuristicas de UI e dependencia de convencoes operacionais.

## Analise dos acordos

Arquivo:

- `features/agreements/services/agreementService.ts`

### Problemas encontrados

#### 1. O acordo ainda muta varias tabelas diretamente no frontend

Achado:

- Criacao, quebra, ativacao, pagamento e estorno de acordo fazem varias operacoes diretas em tabelas pelo cliente.

Impacto:

- Acordo nao passa pelo mesmo kernel transacional do pagamento principal.
- Maior risco de inconsistencias parciais.

#### 2. O acordo duplica logica financeira fora do nucleo principal

Achado:

- O servico de acordo recalcula abatimentos e status por conta propria.

Impacto:

- Divergencia potencial entre saldo do contrato e saldo do acordo.

#### 3. O sistema mistura nomenclaturas e colunas duplicadas no dominio de acordo

Achado:

- Ha combinacoes como:
  - `amount` e `valor`
  - `paid_amount` e `valor_pago`
  - `PENDING`, `PENDENTE`, `PAID`, `PAGO`

Impacto:

- Mais dificil padronizar consulta, mapper e regressao.

### Conclusao dos acordos

Hoje o acordo funciona, mas esta muito exposto a drift, porque carrega muita logica fora do mesmo kernel financeiro principal.

## Analise do formulario e dos modais de emprestimos

Arquivos:

- `features/loans/hooks/useLoanForm.ts`
- `features/loans/domain/loanForm.validators.ts`
- `features/loans/domain/loanForm.mapper.ts`
- `components/forms/LoanFormFinancialSection.tsx`
- `components/modals/PaymentManagerModal.tsx`
- `components/modals/payment/hooks/usePaymentManagerState.ts`

### Achados no formulario de emprestimo

#### 1. Validacao atual e rasa demais para um sistema financeiro

Arquivo:

- `features/loans/domain/loanForm.validators.ts`

Achado:

- So valida:
  - nome
  - telefone
  - principal
  - taxa
  - data inicial

Faltam validacoes de:

- modalidade especifica
- coerencia da primeira parcela
- documento do cliente
- origem de capital
- custo de funding
- regra para prazo fixo
- consistencia entre total a receber e agenda de parcelas

Impacto:

- O modal aceita estados que podem ser operacionais, mas nao consistentes.

#### 2. O formulario mistura sugestao automatica com override manual sem reconciliar tudo

Arquivo:

- `features/loans/hooks/useLoanForm.ts`

Achado:

- A primeira data de vencimento e sugerida automaticamente.
- Na edicao, ele carrega a data real da parcela 1.
- No submit, ele gera o contrato e depois sobrescreve a primeira parcela manualmente.

Impacto:

- Pode haver diferenca entre preview, schedule gerado e parcela persistida.

#### 3. O create de contrato ainda depende de inserts diretos

Arquivo:

- `services/contracts.service.ts`

Achado:

- O cadastro grava contrato, parcelas e extrato direto pelo cliente.

Impacto:

- Mais superficie de inconsistencias se qualquer etapa falhar parcialmente.

#### 4. O lancamento inicial do contrato e classificado como `LEND_MORE`

Arquivo:

- `services/contracts.service.ts`

Achado:

- O contrato novo registra a primeira saida de caixa como `LEND_MORE`.

Impacto:

- Semantica ruim para auditoria e relatorios.
- Dificulta diferenciar emprestimo inicial de aporte posterior.

### Achados no modal de pagamento

#### 1. O modal ainda entrega decisoes que parecem centrais, mas sao heuristicas de tela

Arquivos:

- `components/modals/PaymentManagerModal.tsx`
- `components/modals/payment/hooks/usePaymentManagerState.ts`

Achado:

- "capitalizar"
- "manter pendente"
- "renovacao"
- sugestao de proximo vencimento

tudo isso aparece com peso de regra de negocio, mas nao existe o mesmo nivel de formalizacao unica no backend.

Impacto:

- Risco de o operador achar que a decisao exibida e a verdade absoluta do motor, quando parte dela ainda e convencao de UX.

#### 2. O modal continua muito acoplado a `paymentType`

Achado:

- `FULL`, `RENEW_INTEREST`, `RENEW_AV`, `LEND_MORE`, `CUSTOM`, `PARTIAL_INTEREST`

Impacto:

- Taxonomia visual ainda central no fluxo.
- Nao ha separacao limpa entre:
  - modalidade do contrato
  - acao operacional
  - persistencia financeira

### Conclusao dos modais de emprestimo e pagamento

Os modais funcionam, mas ainda nao estao coerentes com o nivel de rigor esperado para um sistema financeiro. O principal problema nao e aparencia, e falta de contrato forte entre UI, validacao e persistencia.

## Analise do portal do cliente e juridico

Arquivos:

- `features/portal/hooks/useClientPortalLogic.ts`
- `services/legalDocument.service.ts`
- estruturas remotas do portal vistas via CLI

### Achados

#### 1. O portal ainda carrega restos de UX operacional improprios

Arquivo:

- `features/portal/hooks/useClientPortalLogic.ts`

Achado:

- Ainda usa `alert`.
- Ainda usa `window.confirm`.
- Ainda expoe exclusao de documento a partir do portal.

Impacto:

- UX rustica.
- Risco operacional indevido para o cliente final.

#### 2. O portal ainda aponta para um viewer proprio de documento em vez de estar totalmente consolidado em um fluxo unico

Arquivo:

- `features/portal/hooks/useClientPortalLogic.ts`

Achado:

- `handleViewDocument` abre `/portal/document/${doc.view_token}`.

Impacto:

- Mantem possibilidade de duplicidade de fluxo entre portal e assinatura publica.

#### 3. O banco remoto do portal/juridico mostra sobrecarga excessiva de funcoes

Fonte:

- schema remoto via CLI

Achado:

- Existem varias assinaturas para `portal_list_contracts`, `portal_list_docs` e `portal_sign_document`.

Impacto:

- Tipagem e chamada ficam mais sensiveis a drift.
- Dificulta saber qual assinatura e realmente canonica.

### Conclusao do portal/juridico

O portal esta funcional em partes, mas ainda carrega resquicios de implementacao antiga, surface area maior do que deveria e excesso de assinaturas SQL para funcoes centrais.

## Consistencia geral do banco remoto

Fonte:

- revisao do schema publico via Supabase CLI

### Achados principais

1. O banco remoto e rico, mas tem acoplamento com legado.
2. Ha varias tabelas e funcoes que convivem com campos duplicados por traducao ou migracao gradual.
3. Ha sobrecarga excessiva de RPCs centrais.
4. O schema nao parece consolidado em uma camada unica e limpa.

### Sinais especificos de deriva

1. RPCs centrais com varias assinaturas ao mesmo tempo.
2. Presenca simultanea de nomes em portugues e ingles.
3. Campos paralelos no mesmo dominio.
4. Indicio remoto de legado relacionado a `contratos_old`.

### Conclusao do schema

O banco esta operacional, mas nao esta "limpo". Existe risco real de o codigo local passar a depender de um formato, enquanto o banco remoto ainda preserva historicos e sobrecargas que mudam o comportamento efetivo.

## Consistencia geral do sistema

### O que esta relativamente bem

1. Existe um nucleo de calculo reutilizavel.
2. O fluxo manual de pagamento esta melhor do que estava.
3. O sistema tem modelagem suficiente para operar o negocio de verdade.
4. O dashboard e o extrato ja leem parte do estado central.

### O que ainda esta inconsistente

1. Dominio maior do que a implementacao real.
2. Banco remoto com muito legado convivendo com a camada nova.
3. Fluxos criticos ainda distribuidos entre frontend e SQL.
4. Validacao fraca em criacao e edicao de emprestimo.
5. Seguranca ruim para dados sensiveis de perfil.
6. Portal/juridico ainda com restos de fluxo antigo.

## O que precisa melhorar primeiro

### Prioridade 1

1. Remover `password` e `recoveryPhrase` do frontend e do cache local.
2. Tirar criacao/vinculacao de perfil do frontend.
3. Fazer `lib/supabase.ts` falhar cedo sem fallback hardcoded.

### Prioridade 2

1. Consolidar um unico contrato de modalidade.
2. Formalizar quais modalidades existem de verdade.
3. Eliminar fallback silencioso para modalidades legadas.

### Prioridade 3

1. Consolidar um unico kernel transacional para pagamento e acordo.
2. Reduzir mutacoes diretas de multiplas tabelas pelo frontend.
3. Formalizar o tratamento contabil de acordo ativo sem achatamento do saldo.

### Prioridade 4

1. Reforcar validacao do formulario/modal de emprestimo.
2. Revisar coerencia entre preview, primeira parcela, agenda gerada e persistencia.
3. Corrigir nomenclatura do evento inicial do contrato.

### Prioridade 5

1. Limpar RPCs sobrecarregadas e legado do portal/juridico.
2. Reduzir a quantidade de fluxos paralelos para documento e assinatura.
3. Tirar acoes sensiveis do lado do cliente do portal.

## Parecer final

O CapitalFlow tem substancia e ja atende partes reais do processo, mas o estado atual ainda exige consolidacao para se tornar tecnicamente confiavel em nivel senior para operacao financeira sensivel.

O problema central hoje nao e "falta de recurso". O problema e consistencia:

1. Consistencia de schema.
2. Consistencia de dominio.
3. Consistencia entre modal, regra de negocio e persistencia.
4. Consistencia de seguranca.

Se a meta for deixar o sistema realmente robusto, a ordem correta nao e embelezar telas nem criar mais camada visual. A ordem correta e:

1. fechar a base de seguranca,
2. consolidar o dominio financeiro,
3. endurecer criacao e edicao de emprestimos,
4. limpar o banco e as RPCs,
5. so depois continuar acabamento de UX.

## Arquivos analisados nesta etapa

- `types.ts`
- `hooks/useAppState.ts`
- `lib/supabase.ts`
- `features/auth/useAuth.ts`
- `domain/finance/calculations.ts`
- `domain/loanEngine.ts`
- `domain/finance/modalities/registry.ts`
- `services/payments.service.ts`
- `services/contracts.service.ts`
- `features/agreements/services/agreementService.ts`
- `features/loans/hooks/useLoanForm.ts`
- `features/loans/domain/loanForm.validators.ts`
- `features/loans/domain/loanForm.mapper.ts`
- `components/modals/PaymentManagerModal.tsx`
- `components/modals/payment/hooks/usePaymentManagerState.ts`
- `features/portal/hooks/useClientPortalLogic.ts`

## Confirmacao de escopo

1. Nenhum arquivo funcional foi alterado nesta etapa.
2. Nenhum SQL foi alterado nesta etapa.
3. Nenhuma rota, layout, modal, regra de negocio ou componente visual foi alterado nesta etapa.
4. O unico arquivo alterado foi este resumo, para registrar o relatorio solicitado.

---

## Atualizacao de implementacao

Data: 2026-03-24

### Escopo executado

Foi iniciada a correcao solicitada em tres pontos especificos do juridico:

1. Centralizacao real da exclusao de registros juridicos.
2. Padronizacao do botao voltar na tela de `ConfissaoDividaView`.
3. Suporte operacional para selecionar varios registros e excluir em lote ou excluir todos os registros elegiveis do contrato.

### Arquivos alterados nesta implementacao

#### `features/legal/services/legalService.ts`

Mudancas:

1. A regra de exclusao segura deixou de ficar espalhada no componente.
2. Foram adicionados os metodos:
   - `deleteDocuments`
   - `deleteLoanDocuments`
   - `deleteDocument` agora delegando para a regra central
3. A exclusao em lote agora:
   - sanitiza IDs
   - verifica status do documento
   - bloqueia exclusao de documentos fora de `PENDENTE/PENDING`
   - bloqueia exclusao quando ja existem assinaturas
   - remove logs antes de remover os documentos elegiveis
4. Foi mantido o metodo legado antigo apenas como referencia interna, sem uso no fluxo atual.

Impacto:

- O componente deixou de decidir sozinho o que pode ou nao pode ser excluido.
- A regra de seguranca de exclusao ficou concentrada no servico juridico.

#### `features/legal/components/ConfissaoDividaView.tsx`

Mudancas:

1. O botao voltar foi ajustado para o padrao visual usado no juridico:
   - botao compacto
   - icone isolado
   - mesma linguagem do restante do modulo
2. A secao `06 Registros do Contrato` passou a operar com:
   - selecao apenas de registros elegiveis para exclusao
   - `Selecionar Varios`
   - `Limpar Seleção` quando todos os elegiveis ja estiverem selecionados
   - `Excluir Selecionados`
   - `Excluir Todos`
3. O carregamento dos registros agora limpa automaticamente selecoes invalidas apos refresh.
4. A exclusao individual e em lote passou a usar o servico centralizado, com retorno correto de:
   - removidos
   - bloqueados por seguranca
5. O checkbox deixou de permitir selecao em documentos nao elegiveis para exclusao.

Impacto:

- O operador agora tem controle real sobre varios registros ao mesmo tempo.
- A UX da secao deixou de depender de loops soltos no componente.
- O fluxo de exclusao ficou coerente com a regra de seguranca do backend frontend.

### Validacao executada

1. `npx tsc --noEmit --skipLibCheck --moduleResolution bundler --jsx react-jsx --target ES2022 --module ESNext features/legal/components/ConfissaoDividaView.tsx features/legal/services/legalService.ts types.ts`
   - resultado: OK
2. `npm run lint`
   - resultado: ainda falha
   - motivo: erros preexistentes fora deste escopo em arquivos de perfil:
     - `features/profile/services/operatorProfileService.ts`
     - `hooks/controllers/useAdminController.ts`
     - `hooks/controllers/useProfileController.ts`

### Observacoes

1. A exclusao total do contrato continua segura:
   - documentos assinados ou fora do estado pendente permanecem preservados
   - o operador recebe aviso quando parte do lote fica bloqueada
2. A centralizacao feita aqui cobre a operacao de exclusao dos registros juridicos, que era o ponto funcional da tela solicitado nesta etapa.
3. Ainda existe codigo legado local nao usado dentro do servico juridico. Ele nao interfere no fluxo atual, mas pode ser limpo depois em uma etapa exclusiva de limpeza tecnica.

### Confirmacao de escopo

1. Nao foram alteradas rotas.
2. Nao foi criado arquivo novo.
3. Nao foi alterado layout global.
4. Nao foi alterada logica de outras telas fora do juridico.

---

## Atualizacao de implementacao

Data: 2026-03-24

### Escopo executado

Correcao do erro:

- `[CRITICAL] Variavel de ambiente obrigatoria ausente: VITE_SUPABASE_URL`

### Arquivos alterados nesta implementacao

#### `lib/supabase.ts`

Mudancas:

1. A leitura de ambiente deixou de depender apenas de `import.meta.env`.
2. Foi adicionado `readEnv()` para ler:
   - `import.meta.env`
   - `process.env`, quando disponivel
3. Foi removida a escrita direta de HTML em `document.body` ao falhar a leitura.
4. O comportamento de erro critico foi mantido, mas agora com leitura de ambiente mais robusta e sem quebrar o DOM na marra.

Impacto:

- Corrige o falso negativo de ambiente ausente em cenarios validos.
- Mantem a falha explicita quando a variavel realmente nao existe.
- Evita que o bootstrap destrua visualmente a pagina ao montar erro direto no `body`.

### Validacao executada

1. `npx tsc --noEmit --skipLibCheck --moduleResolution bundler --jsx react-jsx --target ES2022 --module ESNext lib/supabase.ts`
   - resultado: OK

### Observacoes

1. O projeto ja possui `.env.local` com `VITE_SUPABASE_URL`.
2. A correcao aplicada foi no leitor de ambiente, nao no arquivo `.env.local`.
3. Nao houve alteracao de layout, rotas ou regra de negocio.

### Confirmacao de escopo

1. Apenas a leitura de ambiente do cliente Supabase principal foi alterada.
2. Nenhuma outra tela ou fluxo funcional foi modificado nesta etapa.

---

## Atualizacao de implementacao

Data: 2026-03-24

### Escopo executado

Correcao do travamento inicial com tela azul por configuracao local incorreta do Supabase.

### Arquivos alterados nesta implementacao

#### `.env.local`

Mudancas:

1. A `VITE_SUPABASE_ANON_KEY` local foi corrigida.
2. O valor anterior estava inconsistente com a chave anon real usada pelo projeto.

Impacto:

- Corrige o bootstrap do cliente Supabase no ambiente local.
- Remove a principal causa restante de falha de inicializacao apos a correcao do leitor de ambiente.

### Validacao executada

1. Conferencia direta da `VITE_SUPABASE_ANON_KEY` em `.env.local`
   - resultado: OK
2. `npx tsc --noEmit --skipLibCheck --moduleResolution bundler --jsx react-jsx --target ES2022 --module ESNext lib/supabase.ts`
   - resultado: OK

### Observacoes

1. Depois dessa correcao, o servidor Vite precisa ser reiniciado para reler `.env.local`.
2. Esta etapa nao alterou logica de negocio, layout, rotas ou SQL.

### Confirmacao de escopo

1. Apenas a configuracao local e o registro no resumo foram atualizados.
2. Nenhum outro fluxo foi alterado nesta etapa.

---

## Atualizacao de implementacao

Data: 2026-03-24

### Escopo executado

Correcao do editor juridico para centralizar corretamente a folha, colocar a regua e os marcadores de margem dentro da mesma area visual e permitir ajuste real das margens com uso total da pagina.

### Arquivos alterados nesta implementacao

#### `features/legal/components/DocumentEditor.tsx`

Mudancas:

1. A estrutura da area de edicao foi refeita para centralizar o conjunto completo da folha, incluindo regua horizontal, regua vertical e canto de origem.
2. O zoom passou a escalar o conjunto inteiro da pagina em vez de escalar apenas o `contentEditable`.
3. As reguas deixaram de ficar fora do fluxo visual e agora acompanham exatamente o papel em qualquer nivel de zoom.
4. Foram adicionados reguladores reais de margem por arraste para esquerda, direita, superior e inferior.
5. As margens continuam editaveis por campos numericos, mas agora sao limitadas por validacao para nao colapsar a area util do documento.
6. A folha editavel passou a usar a extensao completa do A4, com a area util variando de acordo com as margens definidas pelo operador.
7. O aviso operacional do rodape foi ajustado para refletir o novo comportamento de edicao por regua e por configuracao da pagina.

Impacto:

- Corrige a sensacao de desalinhamento da folha no simulador juridico.
- Faz a regua representar a pagina real, nao apenas um elemento decorativo deslocado.
- Permite usar toda a extensao da folha reduzindo margens ate o limite valido.
- Mantem a tela do juridico ao redor intacta, concentrando a mudanca apenas no editor.

### Validacao executada

1. `npx tsc --noEmit --pretty false --jsx react-jsx --moduleResolution bundler --module esnext --target es2020 --lib DOM,ES2020 --allowSyntheticDefaultImports --esModuleInterop features/legal/components/DocumentEditor.tsx`
   - resultado: OK

### Observacoes

1. Esta etapa altera apenas o editor da minuta e seus controles diretos de pagina.
2. Nao houve alteracao em SQL, portal, rotas, autenticacao ou logica financeira.

### Confirmacao de escopo

1. Apenas `features/legal/components/DocumentEditor.tsx` e este resumo foram alterados nesta etapa.
2. Nenhum arquivo fora do escopo do editor juridico foi modificado intencionalmente.

---

## Atualizacao de implementacao

Data: 2026-03-24

### Escopo executado

Reforco do editor da minuta juridica para fazer os botoes de formatacao atuarem de forma consistente sobre a selecao real do texto, permitir alinhamento por bloco, recuo de paragrafo, listas, tamanho/fonte, marcador visual de paragrafo e uso mais livre da area util da pagina.

### Arquivos alterados nesta implementacao

#### `features/legal/components/DocumentEditor.tsx`

Mudancas:

1. O editor passou a preservar a selecao do texto ao clicar no toolbar.
2. Os comandos de negrito, italico, sublinhado, listas, cor e destaque continuaram via `execCommand`, mas agora com restauracao de selecao e persistencia mais consistente.
3. O alinhamento de texto deixou de depender da folha forcar tudo como justificado e passou a atuar por bloco selecionado.
4. Foram adicionados controles funcionais para:
   - alinhamento esquerda, centro, direita e justificado
   - lista com marcadores
   - lista numerada
   - diminuir/aumentar recuo de paragrafo
   - mostrar/ocultar marcador de paragrafo
5. O ajuste de fonte, tamanho e espacamento passou a atuar sobre a selecao ou sobre os blocos do documento, em vez de ficar so como aparencia momentanea.
6. A folha continua centralizada com reguas e margens editaveis, preservando a correção da etapa anterior.

Impacto:

- O texto da minuta agora pode ser movido para esquerda, centro, direita ou justificado dentro da area util da pagina.
- O operador consegue trabalhar o paragrafo com mais controle, sem perder a selecao ao usar os botoes.
- O marcador visual de paragrafo ajuda a revisar a estrutura do texto sem alterar o conteudo salvo.

### Validacao executada

1. `npx tsc --noEmit --pretty false --jsx react-jsx --moduleResolution bundler --module esnext --target es2020 --lib DOM,ES2020 --allowSyntheticDefaultImports --esModuleInterop features/legal/components/DocumentEditor.tsx`
   - resultado: OK

### Observacoes

1. Esta etapa ficou restrita ao editor da minuta.
2. Nao houve alteracao em SQL, portal, autenticacao, layout global ou motor financeiro.

### Confirmacao de escopo

1. Apenas `features/legal/components/DocumentEditor.tsx` e este resumo foram alterados nesta etapa.
2. Nenhum arquivo fora do escopo do editor juridico foi modificado intencionalmente.

---

## Análise Detalhada dos Motores e Páginas Principais (Março 2026)

Esta análise foi realizada para mapear o funcionamento interno dos componentes críticos do CapitalFlow, identificando a integração entre UI, lógica de domínio e persistência.

### 1. Motores de Domínio (Engines)

#### 1.1 Motor de Empréstimos (`domain/loanEngine.ts` & `domain/finance/calculations.ts`)
*   **Responsabilidade**: Cálculo de saldos, amortizações e projeções financeiras.
*   **Lógica de Amortização**: Segue a ordem prioritária `Multa/Mora -> Juros -> Principal`. Esta regra é impositiva em todo o sistema.
*   **Reconstrução de Estado**: O sistema utiliza o histórico de transações (ledger) para reconstruir o estado atual do contrato, garantindo uma trilha de auditoria (audit trail) confiável.
*   **Integração com Acordos**: Gerencia a complexidade de contratos em renegociação, calculando proporções de saldo para manter a integridade das categorias contábeis.

#### 1.2 Motor Financeiro e de Pagamentos (`services/payments.service.ts`)
*   **Responsabilidade**: Processamento transacional de recebimentos e amortizações.
*   **Atomicidade**: Utiliza RPCs do Supabase (`process_payment_v3_selective`) para garantir que múltiplas tabelas sejam atualizadas de forma atômica.
*   **Idempotência**: Implementa chaves UUID para evitar processamento duplicado de pagamentos.
*   **Ponto de Atenção**: A resolução da fonte de capital "Caixa Livre" via comparação de strings de nome é um ponto de fragilidade que deve ser substituído por IDs fixos ou flags.

#### 1.3 Motor de Acordos (`features/agreements/services/agreementService.ts`)
*   **Responsabilidade**: Criação, quebra e gestão de renegociações (acordos).
*   **Fluxo de Quebra**: Reverte o contrato para o estado original e abate os valores pagos no acordo seguindo a ordem de amortização padrão.
*   **Ponto de Atenção**: Atualmente utiliza múltiplas chamadas sequenciais ao banco, o que representa risco de inconsistência. Deve ser migrado para RPCs atômicos.

#### 1.4 Módulo Jurídico (`features/legal/services/legalService.ts`)
*   **Responsabilidade**: Geração de documentos (Confissão, Promissória), gestão de assinaturas digitais e auditoria.
*   **Acionamento Jurídico**: Utiliza a regra `isLegallyActionable` do `loanEngine`, que filtra contratos com saldo em aberto e pelo menos uma parcela vencida.
*   **Fluxo de Documentos**:
    *   **Geração**: Utiliza templates pré-definidos preenchidos com dados do contrato/cliente.
    *   **Edição**: `LegalDocumentEditorPage` usa TinyMCE para ajustes finos.
    *   **Assinatura**: Integração com serviços de assinatura (links gerados no frontend).
*   **Segurança e Auditoria**: Implementa registro de IP, User Agent e Hash SHA-256 para cada assinatura, garantindo validade jurídica.
*   **Ponto de Atenção**: A montagem dos documentos e cálculos de saldo para confissão ocorrem no frontend, o que é um risco de integridade.
*   **Ponto de Atenção**: Uso frequente de `window.confirm` e `window.open` em componentes como `ConfissaoDividaView`.
*   **Ponto de Atenção**: A geração de documentos é parcialmente atômica (RPC + Update manual do HTML). Se o segundo passo falhar, o documento fica sem conteúdo renderizado.

### 2. Páginas e Fluxos de Interface

#### 2.1 Página de Clientes (`pages/ClientsPage.tsx`)
*   **Escopo**: Gestão completa da base de clientes.
*   **Motor**: Usa `useClientController` para operações CRUD.
*   **Integração**: Vincula o cliente aos seus diversos contratos, permitindo uma visão consolidada da dívida por CPF/CNPJ.
*   **Privacidade**: Implementa máscaras de dados (CPF/Telefone) para o "Stealth Mode", embora os dados completos residam no estado do frontend.

#### 2.2 Página de Pagamento e Detalhes (`pages/ContractDetailsPage.tsx`)
*   **Escopo**: Interface principal de operação financeira por contrato.
*   **Motor de Pagamento**:
    *   Utiliza `payments.service.ts` para processar recebimentos via RPC no Supabase.
    *   Suporta estornos e renegociações.
    *   Exibe o "Ledger" (livro razão) do contrato, garantindo transparência em cada transação.
*   **Integração**: Conecta a UI diretamente ao `loanEngine` para mostrar o impacto de pagamentos em tempo real (ex: "Quitação Total", "Renovação").
*   **Gestão de Encargos**: Permite o perdão seletivo de multas ou juros antes da confirmação do recebimento.
*   **Riscos**: Múltiplos pagamentos simultâneos podem gerar inconsistência se não houver travas (locks) no banco de dados.

#### 2.3 Página Jurídica (`pages/LegalPage.tsx` & `pages/LegalContractPage.tsx`)
*   **Escopo**: Central de recuperação de crédito e gestão documental.
*   **Funcionalidades**: Geração em lote de documentos, editor de minutas customizadas (TinyMCE) e acompanhamento de assinaturas.
*   **UX**: Utiliza KPIs específicos (Volume Negociado, Recuperado) para o setor jurídico.
*   **Ponto Crítico**: Uso de `window.confirm` e `window.open` diretamente, o que foge dos padrões modernos de SPA e segurança de iframe.

### 3. Conclusão da Análise
O sistema possui uma base lógica sólida, mas sofre com a dispersão de regras entre frontend e backend em alguns módulos (especialmente Acordos). A prioridade deve ser a **centralização da lógica crítica em RPCs** e a **remoção de dependências de strings** para identificação de entidades contábeis.

---

## Atualizacao de implementacao

Data: 2026-03-24

### Escopo executado

Melhoria visual e de integridade nos documentos juridicos:

1.  **Correcao do Rodapé**: O texto "Página 1 de 1. Hash de Integridade: DOCUMENTO_PENDENTE..." foi substituído por uma seção de "CERTIFICAÇÃO DIGITAL" mais profissional, exibindo o Hash SHA-256 completo (ou "AGUARDANDO_ASSINATURA") e numeração de página adequada.
2.  **Refinamento dos Campos de Autenticação**:
    *   Os blocos de assinatura agora possuem um layout mais robusto e "limpo".
    *   A estampa de assinatura digital (quadro verde) foi redesenhada para ser mais elegante, com borda lateral e fundo suave, garantindo que as informações de validade (MP 2.200-2/2001, Data, IP e Hash) fiquem legíveis e bem apresentadas.
    *   Adicionado `min-height` e ajustes de posicionamento para evitar que assinaturas sobreponham o texto do documento ou quebrem o layout de forma desordenada.
    *   Inclusão de placeholders `[PREENCHER]` ou linhas de assinatura claras para campos não preenchidos.
3.  **Padronização entre Templates**: As melhorias foram aplicadas de forma consistente em `DocumentTemplates.ts`, `ConfissaoDividaTemplate.ts` e `ConfissaoDividaV2Template.ts`.

### Arquivos alterados nesta implementacao

- `features/legal/templates/DocumentTemplates.ts`: Atualização do rodapé e blocos de assinatura do template base.
- `features/legal/templates/ConfissaoDividaTemplate.ts`: Refatoração da função `renderSignatureBlock` e rodapé.
- `features/legal/templates/ConfissaoDividaV2Template.ts`: Refatoração da função `renderSignatureBlock` e adição de rodapé de conformidade.

### 📋 Fila do que falta (Próximos Passos)

Conforme solicitado, segue a lista priorizada de pendências técnicas e funcionais identificadas:

1.  **Segurança de Dados Sensíveis**:
    *   Remover `password` e `recoveryPhrase` do objeto `UserProfile` no frontend.
    *   Garantir que o `localStorage` não armazene credenciais em texto claro.
2.  **Integridade Financeira (Backend)**:
    *   Migrar os cálculos de saldo devedor (hoje em `calculations.ts` no frontend) para RPCs no Supabase para garantir uma "fonte única da verdade" irrefutável.
    *   Implementar RPCs atômicas para a criação de contratos e geração de documentos (evitando estados parciais).
3.  **Experiência do Usuário (UX)**:
    *   Substituir todos os `window.confirm` e `window.alert` por componentes de Modal customizados do sistema.
    *   Substituir `window.open` por um fluxo de visualização interno ou modal de PDF.
4.  **Reforço de Validação**:
    *   Implementar validações rigorosas no backend para criação de perfis e novos empréstimos (evitando injeção de dados inconsistentes via API).
5.  **Saneamento de Banco de Dados**:
    *   Limpar RPCs legadas e duplicadas no schema remoto.
    *   Padronizar nomenclaturas (Inglês vs Português) e remover colunas redundantes.

### Confirmacao de escopo

1.  As alterações foram estritamente visuais e de apresentação nos templates de documentos.
2.  Não houve alteração na lógica de negócio ou persistência de dados.
3.  O sistema permanece operacional e as mudanças visam apenas a qualidade da entrega jurídica.

---
## 2026-03-28 - Correcao efetiva do modal de resgate do Caixa Livre

### Objetivo

Restaurar o funcionamento real do botao `Resgatar` do card `Caixa Livre`, sem alterar a aparencia do sistema.

### Arquivos alterados

1. `components/modals/ModalHost.tsx`
   - Inclusao do `FinanceModalsWrapper` no host principal de modais.
   - Isso volta a renderizar os modais financeiros do sistema, incluindo `WITHDRAW`, `SOURCE_FORM`, `ADD_FUNDS` e `PAYMENT`.

2. `IMPLEMENTACAO_RESUMO.md`
   - Registro objetivo desta frente de correcao.

### Arquivos criados

Nenhum nesta etapa.

### Motivo tecnico da falha

O botao `Resgatar` disparava corretamente `ui.openModal('WITHDRAW')`, mas o `ModalHost` nao montava o `FinanceModalsWrapper`.
Com isso, o estado do modal era atualizado, porem nenhum componente renderizava o modal financeiro correspondente.

### Risco e impacto

- Mudanca contida ao host de modais.
- Nenhuma alteracao visual foi aplicada.
- Nenhuma regra de negocio do resgate foi alterada nesta etapa.
- A correcao restaura a integracao real entre clique do botao, estado de modal e renderizacao do fluxo de resgate.

### Validacao executada

1. Confirmado no codigo que `DashboardContainer` chama `ui.openModal('WITHDRAW')`.
2. Confirmado no codigo que `FinanceModalsWrapper` renderiza `FinanceModals`.
3. Confirmado no codigo que `FinanceModals` contem o modal `WITHDRAW`.
4. Corrigido o `ModalHost` para montar o wrapper financeiro.

### Confirmacao de escopo

Somente o host de modais foi corrigido para restaurar o fluxo do resgate.
Nada fora do escopo funcional do modal financeiro foi alterado intencionalmente.

---
## 2026-03-28 - Ajuste direto no host de modais financeiros

### Objetivo

Eliminar a dependencia intermediaria de wrapper para garantir a montagem direta dos modais financeiros no host principal.

### Arquivos alterados

1. `components/modals/ModalHost.tsx`
   - Substituida a montagem do `FinanceModalsWrapper` pela montagem direta de `FinanceModals`.
   - O objetivo foi remover uma camada intermediaria e garantir que o modal `WITHDRAW` seja decidido diretamente pelo proprio grupo de modais financeiros.

2. `IMPLEMENTACAO_RESUMO.md`
   - Registro desta correcao adicional.

### Arquivos criados

Nenhum nesta etapa.

### Motivo tecnico

Como o botao continuou sem funcionamento perceptivel, o host principal foi simplificado para montar diretamente `FinanceModals`, reduzindo o risco de falha por encadeamento de wrappers.

### Risco e impacto

- Escopo contido ao host de modais.
- Nenhuma alteracao visual.
- Nenhuma mudanca de regra de negocio.
- A decisao de renderizar `WITHDRAW` passa a ocorrer diretamente no grupo financeiro.

### Confirmacao de escopo

Nenhum arquivo fora do fluxo do host de modais financeiros foi alterado nesta etapa.

---
## 2026-03-28 - Correcao funcional do resgate e do filtro Arquivados

### Objetivo

Corrigir o fluxo funcional do botao `Resgatar` e restaurar o filtro `Arquivados` no dashboard.

### Arquivos alterados

1. `hooks/controllers/useSourceController.ts`
   - Corrigido o tratamento do destino do resgate.
   - Valor vazio agora e interpretado como saque externo, em vez de ser tratado como fonte invalida.

2. `domain/filters/loanFilters.ts`
   - Adicionado o caso `ARQUIVADOS` na logica principal de filtro.

3. `utils/loanFilterResolver.ts`
   - Contratos arquivados agora recebem classificacao explicita `ARQUIVADO`.

4. `types.ts`
   - Incluido `ARQUIVADOS` no tipo `LoanStatusFilter`.

5. `IMPLEMENTACAO_RESUMO.md`
   - Registro desta frente de correcao.

### Arquivos criados

Nenhum nesta etapa.

### Motivo tecnico

- O resgate podia falhar mesmo com o modal aberto porque o campo de destino iniciava vazio e era tratado como `sourceId` invalido.
- O filtro `Arquivados` existia na interface, mas nao tinha implementacao na regra real.
- Alem disso, contratos arquivados eram classificados como `IGNORAR`, impedindo a exibicao na aba correspondente.

### Validacao executada

1. `npx tsc -b --pretty false`
   - resultado: OK

### Confirmacao de escopo

Somente o fluxo funcional do resgate e a logica do filtro `Arquivados` foram alterados.
Nenhuma mudanca visual foi aplicada.

---
## 2026-03-29 - Reorganizacao do sino de notificacoes

### Objetivo

Corrigir a experiencia do sino de notificacoes, removendo duplicacoes visuais, restaurando o gesto de deslizar para apagar e evitando rajada de som/entrada simultanea de alertas.

### Arquivos alterados

1. `hooks/useAppNotifications.ts`
   - Implementada fila interna para inserir notificacoes em sequencia, em vez de despejar varias de uma vez.
   - Melhorada a deduplicacao entre notificacoes ja visiveis e notificacoes ainda na fila.
   - Mantido o fluxo existente de leitura e descarte.

2. `layout/HeaderBar.tsx`
   - Refeito o painel visual das notificacoes do sino.
   - Removido o botao de simulacao que poluia a interface.
   - Removida a duplicacao visual de acoes de remover.
   - Restaurado o gesto de deslizar para a esquerda para apagar da visualizacao.
   - Cards de notificacao ficaram mais limpos, amigaveis e previsiveis.

3. `utils/notificationSound.ts`
   - Adicionado throttle compartilhado para impedir disparo sonoro em rajada.
   - Reuso de `AudioContext` para evitar instancias excessivas.

4. `IMPLEMENTACAO_RESUMO.md`
   - Registro desta frente de correcao.

### Arquivos criados

Nenhum nesta etapa.

### Motivo tecnico

- As notificacoes eram adicionadas diretamente no estado e podiam aparecer todas ao mesmo tempo.
- O som podia disparar repetidamente em intervalo muito curto.
- O dropdown tinha acao visual duplicada e um botao de teste exposto ao usuario final.
- O gesto de deslizar existia de forma confusa e visualmente poluida.

### Validacao executada

1. `npx tsc -b --pretty false`
   - resultado: OK

### Confirmacao de escopo

Somente o sistema do sino de notificacoes foi alterado nesta etapa.
Nenhuma outra tela ou fluxo fora desse escopo foi modificado intencionalmente.

---
## 2026-03-29 - Correcao do RLS em `perfis` no fluxo de autenticacao

### Objetivo

Eliminar o erro `new row violates row-level security policy for table "perfis"` durante criacao/ativacao de conta, sem afrouxar as politicas do banco.

### Arquivos alterados

1. `features/auth/AuthScreen.tsx`
   - Removido o uso direto de `upsert` em `perfis` logo apos o `signUp`.
   - Adicionadas rotinas para aguardar a sessao autenticada e a linha criada pelo trigger do banco.
   - O frontend agora atualiza a linha ja provisionada em `perfis`, em vez de tentar inserir novamente.
   - O fluxo de ativacao de membro ganhou mensagens mais claras quando a sessao segura ainda nao esta pronta.

2. `IMPLEMENTACAO_RESUMO.md`
   - Registro desta correcao.

### Arquivos criados

Nenhum nesta etapa.

### Motivo tecnico

- O banco ja possui trigger para criar a linha em `public.perfis` quando nasce um usuario em `auth.users`.
- O frontend estava tentando fazer `upsert` imediatamente em seguida.
- Quando a sessao autenticada ainda nao estava disponivel no cliente, o `INSERT` do `upsert` batia no RLS da tabela `perfis`.
- A correcao passa a respeitar o modelo real do banco: trigger cria, frontend apenas atualiza.

### Validacao executada

1. `npx tsc -b --pretty false`
   - resultado: OK

### Confirmacao de escopo

Somente o fluxo de autenticacao em `features/auth/AuthScreen.tsx` foi alterado nesta etapa.
Nenhuma politica SQL, notificacao, layout ou regra financeira foi modificada.

---
## 2026-03-29 - Refinamento visual do painel do sino

### Objetivo

Deixar o painel de notificacoes mais compacto, com mais personalidade visual e com rolagem interna real, evitando crescimento indefinido do dropdown.

### Arquivos alterados

1. `layout/HeaderBar.tsx`
   - Painel do sino ficou mais estreito e menos pesado visualmente.
   - Cabecalho ganhou identidade visual ligada a cor principal do perfil.
   - Cards de notificacao foram compactados para reduzir altura e excesso de massa.
   - A area central do painel agora funciona como bloco flex com `overflow-y`, mantendo rolagem interna em vez de expandir indefinidamente.

2. `hooks/useAppNotifications.ts`
   - Adicionado limite de seguranca para a lista visivel de notificacoes, evitando crescimento sem controle em memoria e interface.

3. `IMPLEMENTACAO_RESUMO.md`
   - Registro desta melhoria.

### Arquivos criados

Nenhum nesta etapa.

### Motivo tecnico

- O dropdown estava largo e com cards altos demais.
- A sensacao visual era de painel pesado e sem hierarquia.
- Com varias notificacoes, a experiencia degradava porque a lista seguia crescendo demais.
- A nova versao usa altura maxima, rolagem interna real e composicao mais enxuta.

### Validacao executada

1. `npx tsc -b --pretty false`
   - resultado: OK

### Confirmacao de escopo

Somente o painel do sino e a lista local de notificacoes foram alterados nesta etapa.
Nenhuma regra de autenticacao, financeiro ou outras telas foi modificada.

---
## 2026-03-29 - Higienizacao de e-mail no fluxo do convidado

### Objetivo

Corrigir a rejeicao de e-mails visualmente validos no momento de criar/ativar o usuario convidado.

### Arquivos alterados

1. `features/auth/AuthScreen.tsx`
   - Adicionada normalizacao de e-mail para remover `mailto:`, espacos invisiveis, espacos internos e delimitadores copiados por engano.
   - O fluxo de ativacao do convidado agora valida o e-mail antes do `signUp`.
   - O fluxo de criacao de conta e de recuperacao tambem passou a reaproveitar a mesma higienizacao.
   - Campos de e-mail do convidado, criacao e recuperacao passaram a limpar a entrada ja na digitacao.

2. `IMPLEMENTACAO_RESUMO.md`
   - Registro desta correcao.

### Arquivos criados

Nenhum nesta etapa.

### Motivo tecnico

- O erro reportado era `Email address "bruno.ister@gmail.com" is invalid`.
- Nesse tipo de caso, o texto aparenta estar correto, mas pode carregar aspas, prefixo `mailto:`, espacos internos ou caracteres invisiveis de copia e cola.
- O frontend agora envia ao Supabase apenas um e-mail higienizado e previamente validado.

### Validacao executada

1. `npx tsc -b --pretty false`
   - resultado: OK

### Confirmacao de escopo

Somente o fluxo de e-mail dentro do `AuthScreen` foi alterado nesta etapa.
Nenhuma regra financeira, notificacao ou SQL foi modificada.

---
## 2026-03-29 - Correcao de labels quebrados no cabecalho

### Objetivo

Corrigir textos do header que apareceram com encoding quebrado na interface.

### Arquivos alterados

1. `layout/HeaderBar.tsx`
   - Corrigidos os labels `Captação`, `Jurídico` e `Olá` que estavam aparecendo com caracteres corrompidos.

2. `IMPLEMENTACAO_RESUMO.md`
   - Registro desta correcao.

### Arquivos criados

Nenhum nesta etapa.

### Motivo tecnico

- O arquivo do cabeçalho carregava algumas strings com encoding quebrado.
- Isso afetava diretamente os rótulos visíveis dos botões e a saudação do usuário.

### Validacao executada

1. `npx tsc -b --pretty false`
   - resultado: OK

### Confirmacao de escopo

Somente os textos quebrados do `HeaderBar` foram alterados nesta etapa.
Nenhuma estrutura de navegação ou regra funcional foi modificada.

---
## 2026-04-04 - Correção de UI no Header do LoanCard (Mobile)

### Objetivo

Corrigir o corte dos nomes dos devedores em contratos na versão mobile, garantindo que o nome completo seja visível e a tag de status seja posicionada no canto superior direito do card.

### Arquivos alterados

1. `/components/cards/LoanCardComposition/Header.tsx`
   - Adicionado `relative` ao container principal para permitir posicionamento absoluto.
   - Removida a classe `truncate` do `h3` do nome do devedor para permitir quebra de linha (apoiado pela utility `client-name` que possui `white-space: normal`).
   - Adicionado `pr-20` ao container do nome em telas pequenas (`sm:pr-0`) para reservar espaço para o badge absoluto e evitar sobreposição.
   - Movido o `Badge` para um container com posicionamento absoluto (`absolute top-0 right-0`).

### Arquivos criados

Nenhum nesta etapa.

### Motivo técnico

- A classe `truncate` forçava `white-space: nowrap`, cortando nomes longos mesmo com espaço disponível.
- O posicionamento flex anterior fazia com que o badge competisse por espaço horizontal com o nome, agravando o corte em telas estreitas.
- O posicionamento absoluto do badge no "canto superior direito" (conforme solicitado) libera o fluxo horizontal para o nome do devedor.

### Validação executada

1. `npx tsc -b --pretty false`
   - resultado: OK

### Confirmação de escopo

Somente o layout do cabeçalho do `LoanCard` foi alterado para resolver o problema de UI reportado. Nenhuma regra de negócio ou fluxo de dados foi modificado.

---

## 2026-04-04 - Melhoria no Sistema de Notificações (Toasts)

### Objetivo

Melhorar a exibição das notificações em pilha (toasts), reduzindo seu tamanho, destaque excessivo e ocupação de espaço, especialmente na versão mobile, garantindo uma experiência menos intrusiva.

### Arquivos alterados

1. `/hooks/useToast.ts`
   - Migração completa para a biblioteca `sonner`.
   - Remoção do estado local `toast` e do `useEffect` de timeout manual.
   - A função `showToast` agora dispara notificações via `sonnerToast`, mantendo a compatibilidade com os tipos existentes (`success`, `error`, `info`, `warning`).
   - Preservação da lógica de bipe sonoro para erros e avisos.

2. `/App.tsx`
   - Configuração do componente `Toaster` com:
     - `expand={false}` e `visibleToasts={3}` para empilhamento inteligente.
     - `position="top-right"` no desktop.
     - `mobileOffset={{ bottom: '80px' }}` para evitar sobreposição com elementos do topo no mobile.
     - Estilização customizada via `toastOptions` para um design mais compacto, com fundo semi-transparente, desfoque (blur) e bordas sutis.

3. `/layout/AppShell.tsx`
   - Remoção da renderização manual de toasts via `framer-motion` e `AnimatePresence`.
   - Limpeza de código redundante que ocupava espaço no topo da tela.

4. `/features/auth/AuthScreen.tsx`
   - Remoção da renderização manual de toasts na tela de login/autenticação.
   - Unificação do comportamento de notificações em toda a aplicação.

### Motivo técnico

- A renderização manual anterior ocupava muito espaço e não possuía um sistema de empilhamento eficiente.
- O uso de `sonner` permite um controle refinado sobre a pilha de notificações, reduzindo a obstrução visual.
- O posicionamento no mobile foi ajustado para a parte inferior para evitar conflitos com o cabeçalho e elementos de navegação superiores.

### Validação executada

1. `npx tsc -b --pretty false`
   - resultado: OK

### Confirmação de escopo

- Não foram alteradas rotas.
- Não foram criados arquivos novos.
- Não houve alteração na lógica de negócio ou persistência.
- A funcionalidade de notificações foi preservada, apenas a forma de exibição foi otimizada e unificada.

---

## 2026-04-04 - Redução de Tamanho dos Alertas do Dashboard

### Objetivo

Reduzir o tamanho dos banners de alerta no Dashboard ("Atenção Necessária" e "Saldo Baixo"), tornando-os menos intrusivos e mais integrados ao layout, atendendo ao feedback de que as notificações estavam muito grandes.

### Arquivos alterados

1. `/features/dashboard/DashboardAlerts.tsx`
   - Redução da altura do container de `h-20` para `h-14`.
   - Redução do padding interno de `p-4` para `p-2.5`.
   - Redução do gap entre ícone e texto de `gap-4` para `gap-3`.
   - Redução do arredondamento de `rounded-2xl` para `rounded-xl`.
   - Redução do tamanho do ícone de `24` para `18` e seu padding de `p-3` para `p-2`.
   - Ajuste das fontes para tamanhos menores e limitação da mensagem a apenas 1 linha (`line-clamp-1`).
   - Simplificação visual com a remoção de uma camada decorativa redundante.

### Motivo técnico

- Os banners de alerta originais ocupavam muito espaço vertical, empurrando o conteúdo principal para baixo.
- A nova escala mantém a visibilidade e o contraste (cores vibrantes), mas com uma pegada física muito menor, melhorando a harmonia visual do Dashboard.

### Validação executada

1. `npx tsc -b --pretty false`
   - resultado: OK

### Confirmação de escopo

- Alteração puramente estética e de layout no componente de alertas do Dashboard.
- Nenhuma alteração em regras de negócio ou lógica de disparo de alertas.

---

## 2026-04-04 - Alertas Ultra-Compactos no Dashboard

### Objetivo

Reduzir drasticamente a ocupação de espaço dos alertas do Dashboard, transformando-os de banners de largura total em mini-cards compactos e elegantes, atendendo ao feedback de que ainda estavam grandes.

### Arquivos alterados

1. `/features/dashboard/DashboardAlerts.tsx`
   - **Largura Inteligente:** O alerta deixou de ser `w-full` (largura total) para ser `w-fit` (ajustado ao conteúdo), centralizado no mobile e alinhado à esquerda no desktop.
   - **Altura Mínima:** Reduzida para `h-10` (40px).
   - **Layout em Linha Única:** Título e mensagem agora compartilham a mesma linha, separados por um divisor sutil.
   - **Estética Refinada:** Uso de `backdrop-blur-md` e fundos semi-transparentes para um visual mais moderno e menos "pesado".
   - **Micro-interações:** Ícones e botões de fechar reduzidos para escalas mínimas (`14px` e `12px`).

### Motivo técnico

- O design anterior de "banner" criava uma barreira visual muito forte.
- O novo formato de "pílula" ou "mini-card" comunica a urgência sem dominar a interface, permitindo que o usuário veja mais conteúdo do Dashboard simultaneamente.

### Validação executada

1. `npx tsc -b --pretty false`
   - resultado: OK

### Confirmação de escopo

- Refatoração visual do componente de alertas.
- Mantida a funcionalidade de "drag to dismiss" e o timer de 24h.

---

## 2026-04-04 - Ajuste de Arredondamento (Mobile)

### Objetivo

Ajustar o arredondamento de elementos da interface mobile (abas de navegação do Dashboard e barra de filtros) para serem menos "circulares" e mais condizentes com o padrão visual do sistema, conforme solicitado pelo usuário.

### Arquivos alterados

1. `/pages/DashboardPage.tsx`
   - Alterado `rounded-2xl` para `rounded-xl` no container de abas mobile.
   - Alterado `rounded-xl` para `rounded-lg` nos botões internos.
2. `/components/dashboard/DashboardControls.tsx`
   - Alterado `rounded-2xl` para `rounded-xl` no container da barra de filtros.
   - Alterado `rounded-xl` para `rounded-lg` nos botões de filtro.

### Motivo técnico

- O arredondamento `2xl` em elementos pequenos ou estreitos criava um aspecto de "pílula" (totalmente circular nas pontas) que destoava de outros componentes do sistema que utilizam um arredondamento mais moderado.

### Validação executada

1. `npm run lint`
   - resultado: OK

---

## Atualização de Implementação

Data: 2026-04-04

### Escopo executado

Refinamento da UI do Dashboard e lógica de "Caixa Livre" (Free Cash):

1.  **Unificação da Lógica de Detecção de "Caixa Livre"**:
    *   Padronização da detecção de fontes de lucro/caixa livre em `domain/dashboard/stats.ts` e `hooks/controllers/useSourceController.ts`.
    *   Soma dos saldos de todas as fontes identificadas como "Caixa Livre" (ou termos equivalentes: lucro, disponível, balance).
    *   Inclusão do `interestBalance` do perfil do usuário como fallback/complemento ao saldo das fontes.

2.  **Precisão no Resgate de Lucros**:
    *   Atualização do `handleWithdrawProfit` em `useSourceController.ts` para priorizar o saque da fonte "Caixa Livre" se houver saldo suficiente.
    *   Fallback automático para o saldo do perfil (`interestBalance`) caso a fonte não tenha saldo suficiente ou não exista.
    *   Exibição do saldo combinado (Fontes + Perfil) no modal de resgate em `ModalGroups.tsx`.

3.  **Refinamento Estético do Modal de Resgate**:
    *   Modernização da interface do modal "Resgatar Lucros" em `ModalGroups.tsx`.
    *   Substituição de arredondamentos totais (`rounded-full`) por curvas mais suaves (`rounded-2xl` e `rounded-3xl`).
    *   Adição de gradientes, sombras coloridas e micro-interações nos botões.
    *   Melhoria na tipografia e labels dos campos de entrada.

4.  **Refinamento de Alertas do Dashboard**:
    *   Redução da intrusividade e tamanho dos banners de alerta em `features/dashboard/DashboardAlerts.tsx`.
    *   Ajuste de altura (`h-10` para `h-8`), redução de padding e escala de animação para uma presença mais discreta na interface.
    *   Melhoria na consistência visual dos alertas com o restante do dashboard.

### Arquivos alterados nesta implementação

#### `/domain/dashboard/stats.ts`
*   Unificação da lógica de detecção de fontes de lucro.
*   Soma de saldos de fontes e perfil para o `interestBalance` exibido no dashboard.

#### `/hooks/controllers/useSourceController.ts`
*   Refatoração do `handleWithdrawProfit` para suportar saque combinado (Fonte + Perfil).
*   Priorização de saque via RPC `withdraw_profit_caixa_livre` quando há saldo na fonte.

#### `/components/modals/ModalGroups.tsx`
*   Atualização da exibição do saldo disponível para resgate, somando fontes e perfil.

#### `/features/dashboard/DashboardAlerts.tsx`
*   Redução de tamanho e intrusividade dos alertas.
*   Ajustes finos de animação e layout para maior polimento.

### Validação executada
*   Verificação visual da consistência de saldos entre o card "Caixa Livre" e o modal de resgate.
*   Teste de lógica de saque priorizando fontes de capital.
*   Ajuste fino de responsividade e estética dos alertas.

### Confirmação de escopo
*   Não foram alteradas rotas ou layout global.
*   As mudanças focaram estritamente no dashboard e na precisão financeira do "Caixa Livre".

---

## Atualização de Implementação

Data: 2026-04-15

### Escopo executado

Ocultação das funcionalidades de **Captação** e **Equipe** para simplificação da interface, mantendo o código preservado para futura reativação.

### Arquivos alterados nesta implementação

#### `layout/NavHub.tsx`
- Filtragem da lista `displayOrder` para remover as abas `TEAM` e `ACQUISITION`.

#### `layout/BottomNav.tsx`
- Remoção de `ACQUISITION` e `TEAM` da lista `mobileTabs`.
- Comentada a lógica que adicionava a aba `TEAM` para usuários não-staff.

#### `App.tsx`
- Comentados os blocos de renderização das abas `TEAM` e `ACQUISITION`.
- Isso desativa o acesso às páginas correspondentes mesmo que a aba seja selecionada programaticamente.

#### `hooks/useAppNotifications.ts`
- Comentados os ouvintes em tempo real (Supabase Realtime) para as tabelas `leads` e `campaign_chat_messages`.
- Isso evita o processamento de notificações de captação em background.

#### `features/support/components/ChatSidebar.tsx`
- Comentadas as abas `TEAM` e `CAPTACAO` no menu lateral do chat de suporte.

### Validação executada

1. Verificação visual: Os itens de menu sumiram tanto no Desktop quanto no Mobile.
2. Verificação de rotas: As abas não são mais renderizadas.
3. Verificação de performance: Menos ouvintes ativos no Supabase.

### Confirmação de escopo

1. Nenhum código foi deletado permanentemente.
2. Nenhuma alteração em banco de dados ou regras de negócio.
3. Foco exclusivo na ocultação de interface e gatilhos de notificação.

---

### 15/04/2026 - Correção do Botão de Resgate (Withdraw)
- **Objetivo**: Restaurar o funcionamento do botão "Resgatar" no card de lucro do Dashboard.
- **Arquivos Alterados**:
  - `pages/DashboardPage.tsx`: Agora chama `ui.openModal('WITHDRAW')` diretamente.
  - `containers/DashboardContainer.tsx`: Passa o objeto `ui` para a página.
  - `components/cards/ProfitCard.tsx`: Removido `stopPropagation` que poderia interferir no clique.
  - `hooks/useUiState.ts`: Adicionada limpeza dos campos de resgate ao fechar modais.
  - `components/modals/ModalGroups.tsx`: Melhorada a robustez da renderização do modal de resgate.
- **Resultado**: O modal de resgate deve abrir consistentemente ao clicar no botão "Resgatar".

### 15/04/2026 - Ajuste de Balanço e Lucro Projetado
- **Objetivo**: Corrigir a percepção de valores no Dashboard, focando em Lucro em vez de Montante Total, e garantir a visibilidade do modal de resgate.
- **Arquivos Alterados**:
  - `domain/dashboard/stats.ts`: 
    - `totalReceived` agora calcula apenas o **Lucro Realizado** (juros + multas).
    - `expectedProfit` agora calcula o **Lucro Total Estimado** (Lucro Realizado + Lucro a Receber).
    - `receivedThisMonth` agora conta apenas o lucro do mês.
  - `pages/DashboardPage.tsx`: Atualizados os labels para "Lucro Realizado" e "Lucro Total (Est.)".
  - `App.tsx`: Movido `ModalHostContainer` para fora do `AppShell` e adicionado `z-[9999]` para garantir visibilidade absoluta dos modais.
  - `components/cards/ProfitCard.tsx`: Adicionado `z-index` aos botões de resgate.
- **Resultado**: Os números agora refletem a rentabilidade real da operação e o botão de resgate foi blindado contra problemas de sobreposição de layout.

### 17/04/2026 - Correção de Loop de Inicialização e Resiliência
- **Objetivo**: Resolver o problema onde o app ficava preso em "Sincronizando Sistema..." indefinidamente.
- **Arquivos Alterados**:
  - `hooks/useAppState.ts`: 
    - Corrigida a sintaxe do filtro `.or()` no Supabase (removidas aspas duplas desnecessárias).
    - Melhorado o tratamento de erros em `fetchFullData` para capturar timeouts e erros de rede.
  - `features/auth/useAuth.ts`: 
    - Adicionado um **Safety Timeout** de 15 segundos que força `bootFinished = true` caso o processo de login/perfil do Supabase trave.
  - `components/AppGate.tsx`: 
    - Adicionada tela de erro crítica para falhas de carregamento de dados, permitindo ao usuário tentar novamente ou voltar ao login em vez de ficar preso na tela de carregamento.
- **Resultado**: O aplicativo agora possui mecanismos de fail-safe que garantem o carregamento ou a exibição de um erro claro, eliminando o travamento silencioso na inicialização.

### 17/04/2026 - Correção de Erros de Sincronização e Resiliência de Rede
- **Objetivo**: Resolver erros intermitentes de "Failed to fetch" e melhorar o diagnóstico de falhas em tempo real.
- **Arquivos Alterados**:
  - `utils/fetchWithRetry.ts`: 
    - Erros de rede agora incluem a URL de destino na mensagem, permitindo identificar exatamente qual serviço está falhando.
    - Adicionado log de aviso (warn) detalhando o endpoint em cada tentativa de reconexão.
  - `index.html`: 
    - Atualizada a **Content Security Policy (CSP)** para incluir domínios de APIs externas necessárias que estavam sendo bloqueadas pelo navegador: `api.tiny.cloud` (notas), `*.asaas.com` e `*.mercadopago.com` (pagamentos).
  - `hooks/useAppState.ts`: 
    - Expandido o tratamento de erros para reconhecer padrões como "Failed to fetch" e "Load failed", exibindo uma mensagem amigável com orientação de recarregamento para o usuário.
- **Resultado**: Redução de erros silenciosos bloqueados pelo navegador e melhoria na capacidade de diagnóstico de problemas de conexão externa.

### 17/04/2026 - Correção de Conflito de Sessão e Auth Stability
- **Objetivo**: Resolver erros críticos de "Lock broken" e "lock stolen" no Supabase Auth que travavam a inicialização do app.
- **Arquivos Alterados**:
  - `lib/supabase.ts`: 
    - Implementado o utilitário `getSynchronizedSession` que usa uma Promise compartilhada para de-duplicar chamadas concorrentes ao servidor de autenticação.
    - Isso evita que múltiplos componentes "briguem" pelo bloqueio (lock) do localStorage durante o boot.
  - `utils/fetchWithRetry.ts`: 
    - Otimizada a estratégia de retentativa para URLs de `/auth/v1/`.
    - Reduzido o número de retentativas e o delay inicial para evitar que chamadas de autenticação segurem bloqueios por tempo excessivo, o que causava o erro de "lock stolen".
  - `features/auth/useAuth.ts`: 
    - Migradas todas as chamadas de `supabase.auth.getSession()` para o novo `getSynchronizedSession()`.
    - Atualizado o mapeador de erros para tratar mensagens de conflito de lock de forma amigável para o usuário.
- **Resultado**: Inicialização do aplicativo muito mais estável e livre de erros de contenção de sessão em ambientes de recarregamento rápido.

