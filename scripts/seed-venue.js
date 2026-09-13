const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding venues and facilities...");

  try {
    // 1. Seed Venue
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .insert({
        name: 'GameOn Main Arena',
        address: '123 Sports Avenue, City Center',
        timezone: 'Asia/Kolkata',
        is_active: true
      })
      .select()
      .single();

    if (venueError) throw venueError;
    console.log("Created Venue:", venue.name);

    // 2. Fetch Sports (Assuming they were seeded via schema.sql)
    const { data: sports, error: sportsError } = await supabase.from('sports').select('*');
    if (sportsError || !sports || sports.length === 0) throw new Error("Sports not found. Did you run schema.sql?");
    
    const getSportId = (name) => {
      const sport = sports.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
      if (!sport) throw new Error(`Sport ${name} not found in DB`);
      return sport.id;
    };

    const badmintonId = getSportId('badminton');
    const pickleballId = getSportId('pickleball');
    const cricketId = getSportId('cricket');
    const boxId = getSportId('box'); // "Box Football / Cricket"

    // 3. Seed Facilities according to VENUE_DETAILS.md
    const facilities = [
      // Badminton: 3 Non-AC Synthetic Floor Courts
      { venue_id: venue.id, sport_id: badmintonId, name: 'Badminton Court 1 (Synthetic)', is_indoor: true, has_ac: false, surface_type: 'synthetic', price_per_hour: 400 },
      { venue_id: venue.id, sport_id: badmintonId, name: 'Badminton Court 2 (Synthetic)', is_indoor: true, has_ac: false, surface_type: 'synthetic', price_per_hour: 400 },
      { venue_id: venue.id, sport_id: badmintonId, name: 'Badminton Court 3 (Synthetic)', is_indoor: true, has_ac: false, surface_type: 'synthetic', price_per_hour: 400 },
      // Badminton: 2 AC Wooden Floor Courts
      { venue_id: venue.id, sport_id: badmintonId, name: 'Badminton Court 4 (Wooden/AC)', is_indoor: true, has_ac: true, surface_type: 'wooden', price_per_hour: 600 },
      { venue_id: venue.id, sport_id: badmintonId, name: 'Badminton Court 5 (Wooden/AC)', is_indoor: true, has_ac: true, surface_type: 'wooden', price_per_hour: 600 },

      // Pickleball: 2 Outdoor Courts
      { venue_id: venue.id, sport_id: pickleballId, name: 'Pickleball Outdoor 1', is_indoor: false, has_ac: false, surface_type: 'synthetic', price_per_hour: 500 },
      { venue_id: venue.id, sport_id: pickleballId, name: 'Pickleball Outdoor 2', is_indoor: false, has_ac: false, surface_type: 'synthetic', price_per_hour: 500 },
      // Pickleball: 2 Indoor AC Courts
      { venue_id: venue.id, sport_id: pickleballId, name: 'Pickleball Indoor 1 (AC)', is_indoor: true, has_ac: true, surface_type: 'synthetic', price_per_hour: 800 },
      { venue_id: venue.id, sport_id: pickleballId, name: 'Pickleball Indoor 2 (AC)', is_indoor: true, has_ac: true, surface_type: 'synthetic', price_per_hour: 800 },

      // Cricket Practice Nets: 3 Outdoor (Non-AC)
      { venue_id: venue.id, sport_id: cricketId, name: 'Cricket Net 1 (Outdoor)', is_indoor: false, has_ac: false, surface_type: 'turf', price_per_hour: 300 },
      { venue_id: venue.id, sport_id: cricketId, name: 'Cricket Net 2 (Outdoor)', is_indoor: false, has_ac: false, surface_type: 'turf', price_per_hour: 300 },
      { venue_id: venue.id, sport_id: cricketId, name: 'Cricket Net 3 (Outdoor)', is_indoor: false, has_ac: false, surface_type: 'turf', price_per_hour: 300 },
      // Cricket Practice Nets: 2 Indoor (Non-AC)
      { venue_id: venue.id, sport_id: cricketId, name: 'Cricket Net 4 (Indoor)', is_indoor: true, has_ac: false, surface_type: 'turf', price_per_hour: 450 },
      { venue_id: venue.id, sport_id: cricketId, name: 'Cricket Net 5 (Indoor)', is_indoor: true, has_ac: false, surface_type: 'turf', price_per_hour: 450 },

      // Box Football / Cricket: 1 Outdoor Box
      { venue_id: venue.id, sport_id: boxId, name: 'Mega Turf Box (Outdoor)', is_indoor: false, has_ac: false, surface_type: 'turf', price_per_hour: 1500 },
    ];

    const { error: facError } = await supabase.from('facilities').insert(facilities);
    if (facError) throw facError;

    console.log(`Successfully seeded ${facilities.length} facilities!`);

    // 4. Seed Operating Hours (Open 6AM to 10PM everyday)
    const hours = [];
    for (let day = 0; day <= 6; day++) {
      hours.push({
        venue_id: venue.id,
        day_of_week: day,
        open_time: '06:00:00',
        close_time: '22:00:00',
        slot_duration_minutes: 60
      });
    }

    const { error: hoursError } = await supabase.from('operating_hours').insert(hours);
    if (hoursError) throw hoursError;
    
    console.log(`Successfully seeded operating hours!`);

  } catch (err) {
    console.error("Error seeding DB:", err);
  }
}

seed();
