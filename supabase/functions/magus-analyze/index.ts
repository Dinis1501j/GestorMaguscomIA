import { createClient } from 'npm:@supabase/supabase-js@2';
import { createAnalyzeHandler } from './handler.js';

Deno.serve(createAnalyzeHandler({ createClient, env: (name) => Deno.env.get(name) }));
