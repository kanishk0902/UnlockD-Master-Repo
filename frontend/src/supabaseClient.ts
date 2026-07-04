import { createClient } from '@supabase/supabase-js';

// 1. Paste your keys here directly inside the quotes
const supabaseUrl = 'https://aysukrermimenpcvqjbu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5c3VrcmVybWltZW5wY3ZxamJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMTEyMjksImV4cCI6MjA5ODY4NzIyOX0.cu0MOy9wPlztteWpqZDo58STQmPm7OZ67ljTuwlMnU4';

// 2. Add this temporary log to prove React sees them!
console.log("TESTING KEYS:", supabaseUrl, supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);