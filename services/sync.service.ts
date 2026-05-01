
import { supabase } from '../lib/supabase';
import { db } from '../lib/dexie';
import { mapLoanFromDB } from './adapters/dbAdapters';
import { maskPhone, maskDocument } from '../utils/formatters';
import { asNumber } from '../utils/safe';

export const syncService = {
  /**
   * Sincroniza todos os dados de um perfil do Supabase para o Dexie
   */
  async syncFullData(profileId: string, ownerId: string) {
    console.log('[SYNC] Iniciando sincronização completa...', { profileId, ownerId });
    
    try {
      // 1. Buscar tudo em paralelo para velocidade
      const [clientsRes, sourcesRes, loansRes, staffRes] = await Promise.all([
        supabase.from('clientes').select('*').eq('owner_id', ownerId),
        supabase.from('fontes').select('*').eq('profile_id', ownerId),
        supabase
          .from('contratos')
          .select('*, parcelas(*), transacoes(*), acordos_inadimplencia!loan_id(*, acordo_parcelas(*))')
          .eq('owner_id', ownerId),
        supabase.from('perfis').select('*').eq('owner_profile_id', ownerId)
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (sourcesRes.error) throw sourcesRes.error;
      if (loansRes.error) throw loansRes.error;

      // 2. Salvar Clientes
      const mappedClients = (clientsRes.data || []).map(c => ({
        ...c,
        phone: maskPhone(c.phone),
        document: maskDocument(c.document)
      }));
      await db.clientes.bulkPut(mappedClients);

      // 3. Salvar Fontes
      const mappedSources = (sourcesRes.data || []).map(s => ({
        ...s,
        balance: asNumber(s.balance)
      }));
      await db.fontes.bulkPut(mappedSources);

      // 4. Salvar Contratos e suas sub-entidades
      // No Dexie, preferimos salvar as parcelas e transações em tabelas separadas para performance de busca
      const allLoans: any[] = [];
      const allInstallments: any[] = [];
      const allTransactions: any[] = [];

      (loansRes.data || []).forEach(l => {
        // O contrato em si (sem o aninhamento pesado para a tabela de busca)
        const { parcelas, transacoes, acordos_inadimplencia, ...loanBase } = l;
        allLoans.push(loanBase);

        if (parcelas) allInstallments.push(...parcelas);
        if (transacoes) allTransactions.push(...transacoes);
      });

      await db.contratos.bulkPut(allLoans);
      if (allInstallments.length > 0) await db.parcelas.bulkPut(allInstallments);
      if (allTransactions.length > 0) await db.transacoes.bulkPut(allTransactions);

      // 5. Atualizar metadados de sincronização
      await db.sync_metadata.put({
        key: 'last_full_sync',
        last_sync: new Date().toISOString(),
        profile_id: profileId
      });

      console.log('[SYNC] Sincronização concluída com sucesso.');
      return true;
    } catch (error) {
      console.error('[SYNC] Erro durante a sincronização:', error);
      throw error;
    }
  },

  /**
   * Obtém os dados do Dexie de forma reativa (Source of Truth)
   */
  async getLocalData(ownerId: string) {
    const [loans, clients, sources] = await Promise.all([
      db.contratos.where('owner_id').equals(ownerId).toArray(),
      db.clientes.where('owner_id').equals(ownerId).toArray(),
      db.fontes.where('profile_id').equals(ownerId).toArray()
    ]);

    // Precisamos remontar os contratos com suas parcelas para manter compatibilidade com o frontend
    // Nota: Em um app gigante, faríamos isso sob demanda, mas aqui mantemos o contrato "gordo"
    const enrichedLoans = await Promise.all(loans.map(async (l) => {
      const [parcelas, transacoes] = await Promise.all([
        db.parcelas.where('loan_id').equals(l.id).toArray(),
        db.transacoes.where('loan_id').equals(l.id).toArray()
      ]);
      
      // Mapeia para o formato do Frontend usando o adapter existente
      return mapLoanFromDB({ ...l, parcelas, transacoes }, clients);
    }));

    return {
      loans: enrichedLoans,
      clients,
      sources
    };
  },

  /**
   * Enfileira uma operação para execução posterior (ou imediata se online)
   * Implementa o padrão "Optimistic UI + Background Sync"
   */
  async enqueueOperation(params: {
    table: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    data: any;
    id: string;
  }) {
    const { table, operation, data, id } = params;
    
    // 1. Atualizar Dexie IMEDIATAMENTE (Optimistic)
    const tableInstance = (db as any)[table];
    if (tableInstance) {
      if (operation === 'DELETE') await tableInstance.delete(id);
      else await tableInstance.put(data);
    }

    // 2. Adicionar na Fila de Escrita
    const queueItem = {
      id: crypto.randomUUID(),
      table,
      operation,
      data,
      targetId: id,
      timestamp: new Date().toISOString()
    };
    await db.write_queue.put(queueItem);

    // 3. Tentar processar a fila em background
    this.processQueue().catch(err => console.warn('[SYNC] Queue processing failed (offline?):', err));
    
    return true;
  },

  /**
   * Processa a fila de escritas pendentes
   */
  async processQueue() {
    const items = await db.write_queue.orderBy('timestamp').toArray();
    if (items.length === 0) return;

    console.log(`[SYNC] Processando fila de escrita (${items.length} itens)...`);

    for (const item of items) {
      try {
        let error = null;
        
        if (item.operation === 'UPDATE' || item.operation === 'INSERT') {
          const { error: err } = await supabase.from(item.table).upsert(item.data);
          error = err;
        } else if (item.operation === 'DELETE') {
          const { error: err } = await supabase.from(item.table).delete().eq('id', item.targetId);
          error = err;
        }

        if (error) throw error;

        // Se deu certo, remove da fila
        await db.write_queue.delete(item.id);
        console.log(`[SYNC] Item ${item.id} sincronizado.`);
      } catch (err) {
        console.error(`[SYNC] Falha ao sincronizar item ${item.id}:`, err);
        // Para o processamento da fila se houver erro (preserva ordem)
        break;
      }
    }
  }
};
