/**
 * IPO KING - Database Service Driver (Supabase / PostgreSQL)
 */

export const dbConfig = {
  provider: 'supabase',
  url: process.env.VITE_SUPABASE_URL || 'https://db.xxxx.supabase.co',
  status: 'connected'
};

export async function fetchLiveIpos() {
  return [
    {
      id: 1,
      ipo_name: 'Swiggy Ltd IPO',
      company_name: 'Swiggy India Pvt Ltd',
      price_band_min: 371,
      price_band_max: 390,
      lot_size: 38,
      subscription_open_date: '15 Nov - 19 Nov',
      status: 'open',
      gain_est: '+₹180/sh Est.'
    },
    {
      id: 2,
      ipo_name: 'Tata Technologies',
      company_name: 'Tata Tech Ltd',
      price_band_min: 475,
      price_band_max: 500,
      lot_size: 30,
      subscription_open_date: '22 Nov - 25 Nov',
      status: 'upcoming',
      gain_est: '+₹420/sh Est.'
    },
    {
      id: 3,
      ipo_name: 'Bajaj Housing Finance',
      company_name: 'Bajaj HFL',
      price_band_min: 66,
      price_band_max: 70,
      lot_size: 214,
      subscription_open_date: '09 Dec - 12 Dec',
      status: 'listed',
      gain_est: '100% Listed Gain'
    }
  ];
}
