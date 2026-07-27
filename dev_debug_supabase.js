import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

dotenv.config({ path: join(__dirname, 'server', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase config');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const run = async () => {
  const sessionIds = [1];
  const termIds = [1];
  const sessionsResp = await supabase.from('sessions').select('*').in('id', sessionIds);
  const termsResp = await supabase.from('terms').select('*').in('id', termIds);
  console.log('sessionsResp', JSON.stringify(sessionsResp, null, 2));
  console.log('termsResp', JSON.stringify(termsResp, null, 2));
};

run().catch(e => {
  console.error('ERROR', e);
  process.exit(1);
});