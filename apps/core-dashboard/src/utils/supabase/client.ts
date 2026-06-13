import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey);

// Export URL and key for use in components that need to make direct fetch calls
export { supabaseUrl, publicAnonKey };
export const apiUrl = `${supabaseUrl}/functions/v1/api`;