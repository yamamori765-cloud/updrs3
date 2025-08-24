// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 環境変数が未設定でも落ちないようにガード
export const supabase = (url && anon) ? createClient(url, anon) : null;