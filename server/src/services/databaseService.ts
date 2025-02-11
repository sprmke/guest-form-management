import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import type { GuestFormData } from '../types/guestForm';

export class DatabaseService {
  private static supabase = createClient(config.supabase.url, config.supabase.anonKey);

  static async saveGuestSubmission(formData: GuestFormData) {
    const { data, error } = await this.supabase
      .from('guest_submissions')
      .insert([{
        unit_owner: formData.unitOwner,
        tower_and_unit_number: formData.towerAndUnitNumber,
        owner_onsite_contact_person: formData.ownerOnsiteContactPerson,
        guest_facebook_name: formData.guestFacebookName,
        primary_guest_name: formData.primaryGuestName,
        guest_email: formData.guestEmail,
        guest_phone_number: formData.guestPhoneNumber,
        guest_address: formData.guestAddress,
        check_in_date: formData.checkInDate,
        check_out_date: formData.checkOutDate,
        check_in_time: formData.checkInTime,
        check_out_time: formData.checkOutTime,
        nationality: formData.nationality,
        number_of_adults: formData.numberOfAdults,
        number_of_children: formData.numberOfChildren,
        guest2_name: formData.guest2Name,
        guest3_name: formData.guest3Name,
        guest4_name: formData.guest4Name,
        guest5_name: formData.guest5Name,
        guest_special_requests: formData.guestSpecialRequests,
        find_us: formData.findUs,
        find_us_details: formData.findUsDetails,
        need_parking: formData.needParking,
        car_plate_number: formData.carPlateNumber,
        car_brand_model: formData.carBrandModel,
        car_color: formData.carColor,
        has_pets: formData.hasPets,
        pet_name: formData.petName,
        pet_breed: formData.petBreed,
        pet_age: formData.petAge,
        pet_vaccination_date: formData.petVaccinationDate
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to save guest submission');
    }

    return data;
  }
} 