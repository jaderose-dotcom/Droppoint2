import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rknljzmudnoymuszcuxo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbmxqem11ZG5veW11c3pjdXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MjA5NTQsImV4cCI6MjA4ODA5Njk1NH0.GhJclw36p-EsjxoPQgPwzSWnuwPKNi1AzJPCAV9iiMY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
