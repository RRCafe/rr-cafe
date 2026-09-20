import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkSchema() {
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    if (data && data.length > 0) {
      console.log('Columns in orders table:');
      console.log(Object.keys(data[0]));
    } else {
      console.log('No data found');
    }
  }
}

checkSchema();
