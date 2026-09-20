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

  /**
   * A court's venue is its type's venue — the composite foreign key rejects
   * any other pairing — so it is derived here rather than accepted as input.
   */
  static async createFacility(facilityData: Omit<FacilityInsert, 'venue_id'>) {
    const { data: courtType, error: typeError } = await supabaseAdmin
      .from('court_types')
      .select('venue_id')
      .eq('id', facilityData.court_type_id)
      .maybeSingle();

    if (typeError) throw new Error(`Failed to create facility: ${typeError.message}`);
    if (!courtType) throw new Error('Failed to create facility: court type not found');

    const { data, error } = await supabaseAdmin
      .from('facilities')
      .insert({ ...facilityData, venue_id: courtType.venue_id })
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
