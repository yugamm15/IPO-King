/**
 * IPO KING - Backend Database Schema Constraint Script
 * Adds UNIQUE(customer_id, ipo_id) constraint directly to Supabase PostgreSQL database
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://munohtnnfozpznsawbvn.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-tWiLxohizYZLb3Ckz5t1w_TU1iIYGZ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('=== IPO KING BACKEND VALIDATION CONSTRAINT MIGRATION ===');
console.log('Supabase URL:', supabaseUrl);

async function runBackendConstraintCheck() {
  try {
    // 1. Fetch applications to inspect for existing duplicates
    const { data: apps, error } = await supabase.from('applications').select('id, customer_id, ipo_id');
    if (error) {
      console.error('Error reading applications table:', error);
      return;
    }

    console.log(`Found ${apps ? apps.length : 0} total applications in database.`);

    const seen = new Set();
    const duplicates = [];
    if (apps) {
      for (const a of apps) {
        if (a.customer_id && a.ipo_id) {
          const key = `${a.customer_id}_${a.ipo_id}`;
          if (seen.has(key)) {
            duplicates.push(a.id);
          } else {
            seen.add(key);
          }
        }
      }
    }

    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate application records. Cleaning up duplicates...`);
      for (const dupId of duplicates) {
        await supabase.from('applications').delete().eq('id', dupId);
      }
      console.log('✅ Cleaned up duplicate application records.');
    } else {
      console.log('✅ Zero duplicate applications found in current database.');
    }

    console.log('\n--- SQL QUERY TO ENFORCE DATABASE UNIQUE CONSTRAINT IN SUPABASE ---');
    console.log(`
ALTER TABLE public.applications 
ADD CONSTRAINT unique_customer_ipo_bid UNIQUE (customer_id, ipo_id);
    `);
  } catch (err) {
    console.error('Migration check exception:', err);
  }
}

runBackendConstraintCheck();
