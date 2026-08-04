import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://munohtnnfozpznsawbvn.supabase.co';
const supabaseAnonKey = 'sb_publishable_-tWiLxohizYZLb3Ckz5t1w_TU1iIYGZ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findValidColumns() {
  const minimal = {
    ipo_name: 'Test IPO ' + Date.now(),
    price_band_min: 100,
    price_band_max: 120,
    lot_size: 50,
    status: 'open'
  };

  const { data, error } = await supabase.from('ipos').insert([minimal]).select();
  if (error) {
    console.error('Minimal insert error:', error);
  } else {
    console.log('SUCCESS! All valid database columns on ipos table:');
    console.log(Object.keys(data[0]));
    await supabase.from('ipos').delete().eq('id', data[0].id);
  }
}

findValidColumns();
