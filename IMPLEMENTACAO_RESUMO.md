# IMPLEMENTACAO_RESUMO

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
