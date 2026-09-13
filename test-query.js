require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, booking_date, start_time, end_time, amount_paid, status, payment_status,
      facilities (
        id, name,
        venues ( name, location, image_url ),
        sports ( name )
      )
    `)
    .limit(1);
  console.log(error || data);
}
run();
