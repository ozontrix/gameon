import { supabaseAdmin } from '../db/supabase';
import { Database } from '@/types/database.types';

type VenueInsert = Database['public']['Tables']['venues']['Insert'];
type FacilityInsert = Database['public']['Tables']['facilities']['Insert'];
type VenueUpdate = Database['public']['Tables']['venues']['Update'];
type FacilityUpdate = Database['public']['Tables']['facilities']['Update'];

export class AdminService {
  // --- Venues ---

  static async createVenue(venueData: VenueInsert) {
    const { data, error } = await supabaseAdmin
      .from('venues')
      .insert(venueData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create venue: ${error.message}`);
    }
    return data;
  }

  static async updateVenue(id: string, venueData: VenueUpdate) {
    const { data, error } = await supabaseAdmin
      .from('venues')
      .update(venueData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update venue: ${error.message}`);
    }
    return data;
  }

  static async getVenues() {
    const { data, error } = await supabaseAdmin
      .from('venues')
      .select('*')
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch venues: ${error.message}`);
    }
    return data;
  }

  // --- Facilities ---

  static async createFacility(facilityData: FacilityInsert) {
    const { data, error } = await supabaseAdmin
      .from('facilities')
      .insert(facilityData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create facility: ${error.message}`);
    }
    return data;
  }

  static async updateFacility(id: string, facilityData: FacilityUpdate) {
    const { data, error } = await supabaseAdmin
      .from('facilities')
      .update(facilityData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update facility: ${error.message}`);
    }
    return data;
  }

  static async getFacilities(venueId?: string) {
    let query = supabaseAdmin.from('facilities').select('*');
    
    if (venueId) {
      query = query.eq('venue_id', venueId);
    }

    const { data, error } = await query.order('name');

    if (error) {
      throw new Error(`Failed to fetch facilities: ${error.message}`);
    }
    return data;
  }
}
