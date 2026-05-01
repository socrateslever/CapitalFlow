
import { supabase } from './lib/supabase';

async function checkMPConfig() {
  const { data: profiles } = await supabase.from('perfis').select('id, user_id').limit(5);
  console.log('Sample profiles:', profiles);

  const { data: config, error } = await supabase.from('perfis_config_mp').select('*').limit(5);
  if (error) {
    console.log('Error accessing perfis_config_mp:', error.message);
  } else {
    console.log('MP Configs found:', config?.length || 0);
  }
}

checkMPConfig();
