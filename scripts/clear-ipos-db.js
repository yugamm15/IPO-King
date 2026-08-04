import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://munohtnnfozpznsawbvn.supabase.co';
const supabaseAnonKey = 'sb_publishable_-tWiLxohizYZLb3Ckz5t1w_TU1iIYGZ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function clearIposTable() {
  console.log('Cleaning all legacy static rows from Supabase ipos table...');
  try {
    const { data, error } = await supabase.from('ipos').delete().neq('id', 0);
    if (error) {
      console.error('Delete error:', error);
      // Try string ID condition if id is UUID or int
      const { error: err2 } = await supabase.from('ipos').delete().gt('id', -1);
      console.log('Alternative delete result:', err2 || 'SUCCESS');
    } else {
      console.log('Successfully cleared ipos table from Supabase database!');
    }
  } catch (err) {
    console.error('Exception clearing ipos table:', err);
  }
}

clearIposTable();
