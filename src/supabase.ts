import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://epzlwkfwwuamectyfymj.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_k7TKRMrpwowM3ybkzacdow_Szjf9sT2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
