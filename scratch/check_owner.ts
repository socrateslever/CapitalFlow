
import { supabase } from './lib/supabase';

async function checkOwnerColumn() {
  const { data, error } = await supabase
    .from('contratos')
    .select('id, profile_id, owner_id')
    .limit(1);

  if (error) {
    console.log('Column check error:', error.message);
  } else {
    console.log('Columns found:', Object.keys(data[0] || {}));
  }
}

checkOwnerColumn();
