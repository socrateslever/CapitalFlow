
import { supabase } from './lib/supabase';

async function checkConnectivity() {
  console.log('Testing Supabase connectivity...');
  const { data, error } = await supabase.from('contratos').select('count', { count: 'exact', head: true });
  
  if (error) {
    console.error('Connection failed:', error.message);
    process.exit(1);
  } else {
    console.log('Connection successful! Total contracts:', data);
    process.exit(0);
  }
}

checkConnectivity();
