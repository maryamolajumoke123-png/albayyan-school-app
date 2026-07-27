import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'server', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing config');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const snakeToCamel = (key) => key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
const mapKeysDeep = (input) => {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map(mapKeysDeep);
  if (typeof input !== 'object') return input;
  return Object.entries(input).reduce((acc, [key, value]) => {
    acc[snakeToCamel(key)] = mapKeysDeep(value);
    return acc;
  }, {});
};
const normalize = (data) => (Array.isArray(data) ? data.map(mapKeysDeep) : mapKeysDeep(data));
const createMapById = (items) => (items || []).reduce((acc, item) => {
  if (!item || item.id === undefined || item.id === null) return acc;
  acc[item.id] = item;
  return acc;
}, {});

const run = async () => {
  const { data: feeStructuresData, error: feeError } = await supabase.from('fee_structures').select('*').eq('id', 1);
  console.log('feeError', feeError);
  console.log('feeRaw', JSON.stringify(feeStructuresData, null, 2));
  const normalizedFees = normalize(feeStructuresData || []);
  console.log('feeNorm', JSON.stringify(normalizedFees, null, 2));
  const sessionIds = [...new Set((feeStructuresData || []).map((item) => item.session_id).filter(Boolean))];
  const termIds = [...new Set((feeStructuresData || []).map((item) => item.term_id).filter(Boolean))];
  console.log('sessionIds', sessionIds, 'termIds', termIds);
  const { data: sessionsData } = await supabase.from('sessions').select('*').in('id', sessionIds);
  const { data: termsData } = await supabase.from('terms').select('*').in('id', termIds);
  console.log('sessionsRaw', JSON.stringify(sessionsData, null, 2));
  console.log('termsRaw', JSON.stringify(termsData, null, 2));
  const normalizedSessions = normalize(sessionsData || []);
  const normalizedTerms = normalize(termsData || []);
  console.log('sessionsNorm', JSON.stringify(normalizedSessions, null, 2));
  console.log('termsNorm', JSON.stringify(normalizedTerms, null, 2));
  const sessionsById = createMapById(normalizedSessions);
  const termsById = createMapById(normalizedTerms);
  console.log('sessionById', sessionsById);
  console.log('termById', termsById);
  const hydrated = normalizedFees.map((item) => ({
    ...item,
    session: sessionsById[item.sessionId] || null,
    term: termsById[item.termId] || null,
  }));
  console.log('hydrated', JSON.stringify(hydrated, null, 2));
};
run().catch((e) => { console.error(e); process.exit(1); });