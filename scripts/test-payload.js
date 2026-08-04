import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://munohtnnfozpznsawbvn.supabase.co';
const supabaseAnonKey = 'sb_publishable_-tWiLxohizYZLb3Ckz5t1w_TU1iIYGZ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPayloadInsert() {
  const payload = {
    ipo_name: 'S & Sons IPO',
    symbol: 'NSE: S&SONS',
    company_name: 'S & Sons Private Limited',
    price_band_min: 100,
    price_band_max: 120,
    lot_size: 50,
    subscription_open_date: 'Open Now',
    status: 'open',
    gain_est: '+₹150/sh Est.'
  };

  console.log('Inserting payload:', payload);
  const { data, error } = await supabase.from('ipos').insert([payload]).select();
  if (error) {
    console.error('Payload insert error:', error);
  } else {
    console.log('INSERT SUCCESS! Created row:', data[0]);
  }
}

testPayloadInsert();
