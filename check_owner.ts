
import { supabase } from './lib/supabase';

async function checkOwnerColumn() {
  try {
    const { data, error } = await supabase
      .from('contratos')
      .select('id, profile_id, owner_id')
      .limit(1);

    if (error) {
      console.log('Column check error:', error.message);
      
      // If profile_id failed, try only owner_id
      const { error: err2 } = await supabase.from('contratos').select('owner_id').limit(1);
      if (err2) console.log('owner_id also missing:', err2.message);
      else console.log('owner_id EXISTS');

      const { error: err3 } = await supabase.from('contratos').select('profile_id').limit(1);
      if (err3) console.log('profile_id also missing:', err3.message);
      else console.log('profile_id EXISTS');

    } else {
      console.log('Columns found:', Object.keys(data[0] || {}));
    }
  } catch (e: any) {
    console.error('Fatal:', e.message);
  }
}

checkOwnerColumn();
