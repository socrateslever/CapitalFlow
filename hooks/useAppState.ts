import { useState, useEffect, useCallback } from 'react';
import { supabase, getSynchronizedSession } from '../lib/supabase';
import { Loan, Client, CapitalSource, UserProfile, SortOption, AppTab, LoanStatusFilter } from '../types';
import { maskPhone, maskDocument } from '../utils/formatters';
import { mapLoanFromDB } from '../services/adapters/dbAdapters';
import { asString, asNumber } from '../utils/safe';

const DEFAULT_NAV: AppTab[] = ['DASHBOARD', 'CLIENTS', 'TEAM'] as AppTab[];
const DEFAULT_HUB: AppTab[] = ['SOURCES', 'LEGAL', 'PROFILE', 'LEADS', 'ACQUISITION'] as AppTab[];

const CACHE_KEY = (profileId: string) => `cm_cache_${profileId}`;
const CACHE_MAX_AGE = 12 * 60 * 60 * 1000; // 12 horas

type AppCacheSnapshot = {
  ts: number;
  activeUser: UserProfile;
  loans: Loan[];
  clients: Client[];
  sources: CapitalSource[];
  staffMembers: UserProfile[];
  navOrder: AppTab[];
  hubOrder: AppTab[];
};

const readCache = (profileId: string): AppCacheSnapshot | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY(profileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts) return null;
    if (Date.now() - parsed.ts > CACHE_MAX_AGE) return null;
    return parsed as AppCacheSnapshot;
  } catch {
    return null;
  }
};

const writeCache = (profileId: string, snap: Omit<AppCacheSnapshot, 'ts'>) => {
  try {
    const payload: AppCacheSnapshot = { ...snap, ts: Date.now() };
    localStorage.setItem(CACHE_KEY(profileId), JSON.stringify(payload));
  } catch (e) {
    console.warn('Falha ao salvar cache local', e);
  }
};

const DEMO_USER: UserProfile = {
  id: 'DEMO',
  profile_id: 'DEMO',
  name: 'Gestor Demo',
  fullName: 'Usuário de Demonstração',
  email: 'demo@capitalflow.app',
  businessName: 'Capital Demo',
  accessLevel: 'ADMIN',
  interestBalance: 1500,
  totalAvailableCapital: 50000,
  ui_nav_order: DEFAULT_NAV,
  ui_hub_order: DEFAULT_HUB,
  brandColor: '#2563eb',
  targetCapital: 100000,
};

const mapProfileFromDB = (data: any): UserProfile => {
  let hubOrder = Array.from(new Set(((data.ui_hub_order || DEFAULT_HUB) as string[]).filter(t => t !== 'MASTER'))) as AppTab[];

  if (Array.isArray(hubOrder) && !hubOrder.includes('ACQUISITION')) {
    hubOrder = [...hubOrder, 'ACQUISITION'];
  }

  return {
    id: data.id,
    profile_id: data.id, // Assuming profile_id is the same as id for the active user
    name: asString(data.nome_operador),
    fullName: asString(data.nome_completo),
    email: asString(data.usuario_email || data.email),
    document: asString(data.document),
    phone: asString(data.phone),
    address: asString(data.address),
    addressNumber: asString(data.address_number),
    neighborhood: asString(data.neighborhood),
    city: asString(data.city),
    state: asString(data.state),
    zipCode: asString(data.zip_code),
    businessName: asString(data.nome_empresa),
    accessLevel: (() => {
      const level = String(data.access_level);
      if (level === '1' || level === 'ADMIN') return 'ADMIN';
      if (level === '2' || level === 'OPERATOR') return 'OPERATOR';
      if (level === '3' || level === 'VIEWER') return 'VIEWER';
      return 'OPERATOR';
    })() as 'ADMIN' | 'OPERATOR' | 'VIEWER',
    interestBalance: asNumber(data.interest_balance),
    totalAvailableCapital: asNumber(data.total_available_capital),
    supervisor_id: data.supervisor_id,
    pixKey: asString(data.pix_key),
    photo: data.avatar_url,
    brandColor: '#2563eb',
    logoUrl: data.logo_url,
    contato_whatsapp: data.contato_whatsapp,
    defaultInterestRate: asNumber(data.default_interest_rate),
    defaultFinePercent: asNumber(data.default_fine_percent),
    defaultDailyInterestPercent: asNumber(data.default_daily_interest_percent),
    targetCapital: asNumber(data.target_capital),
    targetProfit: asNumber(data.target_profit),
    ui_nav_order: Array.from(new Set(((data.ui_nav_order || DEFAULT_NAV) as any[]).filter(t => t !== 'PERSONAL_FINANCE' && t !== 'AGENDA'))) as AppTab[],
    ui_hub_order: (hubOrder as any[]).filter(t => t !== 'PERSONAL_FINANCE' && t !== 'AGENDA') as AppTab[],
    createdAt: data.created_at
  };
};

export const useAppState = (activeProfileId: string | null, onProfileNotFound?: () => void) => {
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sources, setSources] = useState<CapitalSource[]>([]);
  const [staffMembers, setStaffMembers] = useState<UserProfile[]>([]);
  const [navOrder, setNavOrder] = useState<AppTab[]>(DEFAULT_NAV);
  const [hubOrder, setHubOrder] = useState<AppTab[]>(DEFAULT_HUB);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Restore missing states
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<AppTab>('DASHBOARD');
  const [statusFilter, setStatusFilter] = useState<LoanStatusFilter>('TODOS');
  const [sortOption, setSortOption] = useState<SortOption>('DUE_DATE_ASC');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [clientSearchTerm, setClientSearchTerm] = useState<string>('');
  const [profileEditForm, setProfileEditForm] = useState<UserProfile | null>(null);

  const fetchFullData = useCallback(async (profileId: string) => {
    if (!profileId || profileId === 'null' || profileId === 'undefined') return;

    const { data: { session } } = await getSynchronizedSession();
    const searchId = profileId === 'DEMO' ? 'DEMO' : profileId;

    if (searchId === 'DEMO') {
      setActiveUser(DEMO_USER);
      setProfileEditForm(DEMO_USER);
      return;
    }
    
    setIsLoadingData(true);
    setLoadError(null);

    try {
      // 1. Resolver Perfil (Ainda precisamos do Supabase para saber quem é o owner)
      const { data: dbProfiles, error: profileErr } = await supabase
        .from('perfis')
        .select('*')
        .or(`id.eq.${searchId},user_id.eq.${session?.user?.id || ''}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (profileErr) throw profileErr;
      const profileData = dbProfiles?.[0];
      if (!profileData) throw new Error('Perfil não encontrado');

      const u = mapProfileFromDB(profileData);
      const ownerId = profileData.owner_profile_id || profileData.supervisor_id || profileData.id;
      
      setActiveUser(u);
      setProfileEditForm(u);

      // 2. Carregar do Dexie (MUITO RÁPIDO - OFFLINE FIRST)
      const { syncService } = await import('../services/sync.service');
      const local = await syncService.getLocalData(ownerId);
      
      if (local.loans.length > 0) {
        setLoans(local.loans);
        setClients(local.clients);
        setSources(local.sources);
        setIsLoadingData(false); // Já temos dados para mostrar!
      }

      // 3. Sincronizar em Background
      try {
        await syncService.syncFullData(searchId, ownerId);
        
        // 4. Recarregar após sync para garantir consistência
        const updated = await syncService.getLocalData(ownerId);
        setLoans(updated.loans);
        setClients(updated.clients);
        setSources(updated.sources);
      } catch (syncErr) {
        console.warn('[useAppState] Falha no sync background (provavelmente offline):', syncErr);
        // Não jogamos erro se já temos dados locais
        if (local.loans.length === 0) throw syncErr;
      }

    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setLoadError(err.message || 'Erro de conexão.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!activeProfileId || activeProfileId === 'undefined' || activeProfileId === 'null') {
      setActiveUser(null);
      setLoadError(null);
      return;
    }

    const cached = readCache(activeProfileId);

    if (cached?.activeUser) {
      setActiveUser(cached.activeUser);
      setProfileEditForm(cached.activeUser);
      setNavOrder(cached.navOrder);
      setHubOrder(cached.hubOrder);
      setClients(cached.clients);
      setSources(cached.sources);
      setLoans(cached.loans);
      setStaffMembers(cached.staffMembers);

      // 🔥 CORREÇÃO: Cache agora é apenas um "placeholder" inicial.
      // Sempre buscamos do banco ao carregar, a menos que o cache seja extremamente recente (30s).
      const cacheAge = Date.now() - cached.ts;
      if (cacheAge > 30 * 1000) {
        fetchFullData(activeProfileId);
      }
    } else {
      fetchFullData(activeProfileId);
    }
  }, [activeProfileId]);

  const saveNavConfig = async (newNav: AppTab[], newHub: AppTab[]) => {
    if (!activeUser) return;
    setNavOrder(newNav);
    setHubOrder(newHub);
    const updatedUser = { ...activeUser, ui_nav_order: newNav, ui_hub_order: newHub };
    setActiveUser(updatedUser);

    if (profileEditForm?.id === activeUser.id) {
      setProfileEditForm(updatedUser);
    }

    if (activeUser.id !== 'DEMO') {
        try {
            await supabase.from('perfis').update({ ui_nav_order: newNav, ui_hub_order: newHub }).eq('id', activeUser.id);
        } catch (e) { console.error(e); }
    }
  };

  return {
    loans, setLoans,
    clients, setClients,
    sources, setSources,
    activeUser, setActiveUser,
    staffMembers, systemUsers: staffMembers,
    navOrder,
    hubOrder,
    isLoadingData, setIsLoadingData,
    loadError, setLoadError,
    fetchFullData,
    // Returned extra states
    selectedStaffId, setSelectedStaffId,
    activeTab, setActiveTab,
    statusFilter, setStatusFilter,
    sortOption, setSortOption,
    searchTerm, setSearchTerm,
    clientSearchTerm, setClientSearchTerm,
    profileEditForm, setProfileEditForm,
    saveNavConfig
  };
};