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
    if (!profileId || profileId === 'null' || profileId === 'undefined') {
      console.log("[useAppState] profileId inválido, abortando fetch");
      return;
    }

    // Antes de buscar dados, verifica se a sessão do Supabase ainda é válida
    const { data: { session } } = await getSynchronizedSession();
    
    // 🔥 CORREÇÃO: Resiliência na identificação do perfil.
    // O ID solicitado pode ser um UUID aleatório ou o ID do próprio Auth User.
    // Buscamos um perfil que coincida com o ID solicitado ou que pertença ao usuário logado.
    const searchId = profileId === 'DEMO' ? 'DEMO' : profileId;

    if (searchId === 'DEMO') {
      setActiveUser(DEMO_USER);
      setProfileEditForm(DEMO_USER);
      setNavOrder(DEFAULT_NAV);
      setHubOrder(DEFAULT_HUB);
      return;
    }
    
    setIsLoadingData(true);
    setLoadError(null);

    try {
      let query = supabase.from('perfis').select('*');
      
      if (searchId === 'DEMO') {
        query = query.eq('id', 'DEMO');
      } else if (session?.user) {
        // Busca o perfil pelo ID solicitado OU pelo ID do usuário logado (Foreign Key)
        // 🔥 CORREÇÃO: Removidas aspas duplas desnecessárias que podem quebrar o PostgREST em alguns contextos.
        query = query.or(`id.eq.${searchId},user_id.eq.${session.user.id}`);
      } else {
        query = query.eq('id', searchId);
      }

      const { data: dbProfiles, error } = await query
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        setLoadError(error.message);
        setIsLoadingData(false);
        return;
      }

      const profileData = dbProfiles?.[0];

      if (!profileData) {
        // 🔥 SEGURANÇA MÁXIMA: Se o perfil não existe no banco, criamos um virtual em memória
        // para que o usuário NUNCA seja expulso do sistema se estiver autenticado no Auth.
        console.warn("[useAppState] Perfil não encontrado no banco. Usando perfil virtual.");
        
        const virtualUser: UserProfile = {
          id: searchId,
          profile_id: searchId,
          name: session?.user?.email?.split('@')[0] || 'Novo Gestor',
          fullName: session?.user?.email?.split('@')[0] || 'Novo Gestor',
          email: session?.user?.email || '',
          accessLevel: 'ADMIN',
          interestBalance: 0,
          totalAvailableCapital: 0,
          ui_nav_order: DEFAULT_NAV,
          ui_hub_order: DEFAULT_HUB,
          brandColor: '#2563eb',
        };

        setActiveUser(virtualUser);
        setProfileEditForm(virtualUser);
        setIsLoadingData(false);
        return;
      }

      const u = mapProfileFromDB(profileData);

      const ownerId = profileData.owner_profile_id || profileData.supervisor_id || profileData.id;
      console.log("RESOLVED_OWNER", ownerId);

      const [clientsRes, sourcesRes, loansRes] = await Promise.all([
        supabase.from('clientes').select('*').eq('owner_id', ownerId),
        supabase.from('fontes').select('*').eq('profile_id', ownerId),
        supabase
          .from('contratos')
          .select('*, parcelas(*), transacoes(*), acordos_inadimplencia!loan_id(*, acordo_parcelas(*))')
          .eq('owner_id', ownerId)
      ]);

      if (clientsRes.error) console.error("Erro Clientes:", clientsRes.error);
      if (sourcesRes.error) console.error("Erro Fontes:", sourcesRes.error);
      if (loansRes.error) console.error("Erro Contratos:", loansRes.error);

      if (loansRes.error && loansRes.error.code !== 'PGRST116') {
        throw new Error(`Erro ao carregar contratos: ${loansRes.error.message}`);
      }

      const mappedClients = (clientsRes.data || []).map((c: any) => ({
        ...c,
        phone: maskPhone(c.phone),
        document: maskDocument(c.document)
      }));

      const mappedSources = (sourcesRes.data || []).map((s: any) => ({
        ...s,
        balance: asNumber(s.balance)
      }));

      const mappedLoans = (loansRes.data || []).map((l: any) =>
        mapLoanFromDB(l, clientsRes.data || [])
      );

      let mappedStaff: UserProfile[] = [];

      const { data: staffData } = await supabase
        .from('perfis')
        .select('*')
        .eq('owner_profile_id', ownerId)
        .order('nome_operador', { ascending: true });

      if (staffData) {
        mappedStaff = staffData.map(s => mapProfileFromDB(s));
      }

      setActiveUser(u);
      setProfileEditForm(u);
      setNavOrder((u.ui_nav_order || DEFAULT_NAV) as AppTab[]);
      setHubOrder((u.ui_hub_order || DEFAULT_HUB) as AppTab[]);
      setClients(mappedClients);
      setSources(mappedSources);
      setLoans(mappedLoans);
      setStaffMembers(mappedStaff);

      writeCache(searchId, {
        activeUser: u,
        clients: mappedClients,
        sources: mappedSources,
        loans: mappedLoans,
        staffMembers: mappedStaff,
        navOrder: u.ui_nav_order || DEFAULT_NAV,
        hubOrder: u.ui_hub_order || DEFAULT_HUB
      });

    } catch (err: any) {
      const errMsg = err.message || String(err);
      console.error('Erro ao carregar dados:', err);

      // Se for erro de timeout ou rede, tenta sinalizar de forma clara
      if (
        errMsg?.includes('timeout') || 
        errMsg?.includes('Aborted') || 
        errMsg?.includes('Failed to fetch') ||
        errMsg?.includes('Load failed')
      ) {
        setLoadError('Erro de conexão ou tempo limite excedido. Verifique sua rede e tente atualizar a página.');
        return;
      }

      // Se for erro de token inválido, sinaliza necessidade de reauth
      if (
        errMsg?.includes('Refresh Token') || 
        errMsg?.includes('JWT') ||
        err.code === 'PGRST301' // JWT expired
      ) {
        setLoadError('SESSAO_EXPIRADA');
        return;
      }

      setLoadError(errMsg || 'Erro de conexão.');
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

      // Só busca novamente se o cache tiver mais de 5 minutos
      const cacheAge = Date.now() - cached.ts;
      if (cacheAge > 5 * 60 * 1000) {
        setTimeout(() => {
          fetchFullData(activeProfileId);
        }, 1000);
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