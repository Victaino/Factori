
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ryayjrklrfffoucnuvez.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5YXlqcmtscmZmZm91Y251dmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDQ0NzEsImV4cCI6MjA4MDE4MDQ3MX0.4KkNCmNvAioeiN-ryzqsFdzJjXd4n9PghGnu0ju5lnA';

export const supabase = createClient(supabaseUrl, supabaseKey);
