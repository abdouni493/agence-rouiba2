import { supabase } from '../supabase';
import { ReservationDetails, VehicleInspection, Payment, ProtectionAssurance } from '../types';

// Mappe un forfait d'assurance de protection embarqué (avec ses items + statut).
function mapProtectionAssurance(pa: any): ProtectionAssurance | undefined {
  if (!pa) return undefined;
  return {
    id: pa.id,
    name: pa.name,
    pricePerDay: Math.round(Number(pa.price_per_day) || 0),
    isActive: pa.is_active,
    createdAt: pa.created_at,
    items: (pa.protection_assurance_item_links || [])
      .map((link: any) => ({
        linkId: link.id,
        itemId: link.item?.id || null,
        name: link.item?.item_name || '',
        status: !!link.status,
        displayOrder: link.item?.display_order ?? 0,
      }))
      .sort((x: any, y: any) => (x.displayOrder ?? 0) - (y.displayOrder ?? 0)),
  };
}

// =========================================
// RESERVATIONS SERVICE
// =========================================
export class ReservationsService {
  // ========== RESERVATIONS ==========
  
  static async createReservation(data: {
    clientId: string;
    carId: string;
    departureDate: string;
    departureTime: string;
    departureAgencyId: string;
    returnDate: string;
    returnTime: string;
    returnAgencyId: string;
    pricePerDay: number;
    priceWeek?: number;
    priceMonth?: number;
    totalDays: number;
    totalPrice: number;
    deposit: number;
    discountAmount?: number;
    discountType?: 'percentage' | 'fixed';
    advancePayment?: number;
    remainingPayment: number;
    notes?: string;
    status?: string;
    cautionAmountDzd?: number;
    cautionCurrency?: 'DZD' | 'EUR';
    euroRate?: number;
    assuranceEnabled?: boolean;
    assurancePercentage?: number;
    protectionAssuranceId?: string | null;
    protectionAssuranceName?: string | null;
    protectionAssurancePrice?: number | null;
    createdBy?: string;
    createdByName?: string;
  }): Promise<{ id: string }> {
    // Colonnes garanties présentes dans le schéma reservations.
    const corePayload: Record<string, any> = {
      client_id: data.clientId,
      car_id: data.carId,
      departure_date: data.departureDate,
      departure_time: data.departureTime,
      departure_agency_id: data.departureAgencyId,
      return_date: data.returnDate,
      return_time: data.returnTime,
      return_agency_id: data.returnAgencyId,
      total_days: data.totalDays,
      total_price: data.totalPrice,
      deposit: data.deposit,
      discount_amount: data.discountAmount || 0,
      discount_type: data.discountType,
      advance_payment: data.advancePayment || 0,
      remaining_payment: data.remainingPayment,
      status: data.status || 'pending',
      notes: data.notes,
      caution_amount_dzd: data.cautionAmountDzd || data.deposit,
      euro_rate: data.euroRate || 145,
      protection_assurance_id: data.protectionAssuranceId || null,
      protection_assurance_name: data.protectionAssuranceName || null,
      protection_assurance_price: data.protectionAssurancePrice || 0,
      created_by: data.createdBy || null,
      created_by_name: data.createdByName || null,
    };

    // Colonnes optionnelles : elles n'existent que si la migration a été
    // appliquée. On les envoie, mais si la base ne les connaît pas encore on
    // réessaie sans elles pour ne pas bloquer la création de la réservation.
    const optionalPayload: Record<string, any> = {
      price_per_day: data.pricePerDay,
      price_week: data.priceWeek,
      price_month: data.priceMonth,
      caution_currency: data.cautionCurrency || 'DZD',
      assurance_enabled: data.assuranceEnabled || false,
      assurance_percentage: data.assurancePercentage ?? null,
    };

    let { data: reservation, error } = await supabase
      .from('reservations')
      .insert([{ ...corePayload, ...optionalPayload }])
      .select()
      .single();

    // PGRST204 / "column ... does not exist" => colonne optionnelle absente.
    if (error && this.isMissingColumnError(error)) {
      console.warn('reservations: colonnes optionnelles absentes, nouvelle tentative sans elles.', error.message);
      ({ data: reservation, error } = await supabase
        .from('reservations')
        .insert([corePayload])
        .select()
        .single());
    }

    if (error) throw error;
    return { id: reservation.id };
  }

  // Détecte une erreur PostgREST « colonne inconnue » (schéma incomplet).
  private static isMissingColumnError(error: any): boolean {
    if (!error) return false;
    return error.code === 'PGRST204'
      || /could not find .* column/i.test(error.message || '')
      || /column .* does not exist/i.test(error.message || '');
  }

  static async addCautionAmountDzdColumn(): Promise<void> {
    try {
      // This is a helper to ensure the column exists
      // In production, this should be run as a migration
      const { error } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE reservations ADD COLUMN IF NOT EXISTS caution_amount_dzd NUMERIC'
      }).catch(() => ({ error: null })); // Silently fail if column already exists
    } catch (e) {
      // Silently fail - column might already exist
    }
  }

  // Récupère toutes les agences indexées par id (utilisé pour rattacher
  // manuellement l'agence de départ/retour aux réservations, faute de FK).
  private static async getAgenciesById(): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabase.from('agencies').select('*');
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((a: any) => { if (a?.id) map[a.id] = a; });
      return map;
    } catch (e) {
      console.warn('Could not load agencies for reservation embedding:', e);
      return {};
    }
  }

  static async getReservations(filters?: {
    status?: string;
    clientId?: string;
    carId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ReservationDetails[]> {
    let query = supabase
      .from('reservations')
      .select(`
        *,
        client:clients(*),
        car:cars(*),
        vehicle_inspections(
          *,
          inspection_responses(
            *,
            checklist_item:inspection_checklist_items(*)
          )
        ),
        reservation_services(*),
        payments(*),
        protection_assurance:protection_assurances!reservations_protection_assurance_fkey(
          id, name, price_per_day, is_active, created_at,
          protection_assurance_item_links(
            id, status, item:protection_assurance_items(id, item_name, display_order)
          )
        )
      `);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    if (filters?.carId) {
      query = query.eq('car_id', filters.carId);
    }
    if (filters?.startDate) {
      query = query.gte('departure_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('return_date', filters.endDate);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reservations:', error);
      throw error;
    }

    // Les colonnes departure_agency_id / return_agency_id sont de simples `text`
    // (pas de clé étrangère vers `agencies`), donc PostgREST ne peut pas les
    // embarquer. On récupère les agences à part et on les rattache par id pour
    // conserver l'affichage du nom d'agence.
    const agenciesById = await this.getAgenciesById();
    (data || []).forEach((res: any) => {
      res.departure_agency = agenciesById[res.departure_agency_id] || null;
      res.return_agency = agenciesById[res.return_agency_id] || null;
    });

    // Debug: Log raw data to check if creator fields exist
    if (data && data.length > 0) {
      console.log('📦 Raw reservation data from DB (first item):', {
        id: data[0].id,
        created_by: data[0].created_by,
        created_by_name: data[0].created_by_name,
        allKeys: Object.keys(data[0])
      });
    }

    return (data || []).map(res => ({
      id: res.id,
      clientId: res.client_id,
      departure_agency_id: res.departure_agency_id,
      return_agency_id: res.return_agency_id,
      client: res.client ? {
        id: res.client.id,
        firstName: res.client.first_name || res.client.firstName,
        lastName: res.client.last_name || res.client.lastName,
        phone: res.client.phone,
        email: res.client.email,
        dateOfBirth: res.client.date_of_birth || res.client.dateOfBirth,
        placeOfBirth: res.client.place_of_birth || res.client.placeOfBirth,
        profilePhoto: res.client.profile_photo || res.client.profilePhoto,
        wilaya: res.client.wilaya,
        completeAddress: res.client.complete_address || res.client.completeAddress,
        idCardNumber: res.client.id_card_number || res.client.idCardNumber,
        licenseNumber: res.client.license_number || res.client.licenseNumber,
        licenseExpirationDate: res.client.license_expiration_date || res.client.licenseExpirationDate,
        licenseDeliveryDate: res.client.license_delivery_date || res.client.licenseDeliveryDate,
        licenseDeliveryPlace: res.client.license_delivery_place || res.client.licenseDeliveryPlace,
        documentType: res.client.document_type || res.client.documentType,
        documentNumber: res.client.document_number || res.client.documentNumber,
        documentDeliveryDate: res.client.document_delivery_date || res.client.documentDeliveryDate,
        documentExpirationDate: res.client.document_expiration_date || res.client.documentExpirationDate,
        documentDeliveryAddress: res.client.document_delivery_address || res.client.documentDeliveryAddress,
        createdAt: res.client.created_at,
      } : null,
      carId: res.car_id,
      car: res.car ? {
        id: res.car.id,
        brand: res.car.brand,
        model: res.car.model,
        registration: res.car.plate_number || res.car.registration,
        year: res.car.year,
        color: res.car.color,
        energy: res.car.energy,
        transmission: res.car.transmission,
        seats: res.car.seats,
        doors: res.car.doors,
        priceDay: res.car.price_per_day,
        priceWeek: res.car.price_week,
        priceMonth: res.car.price_month,
        deposit: res.car.deposit,
        images: res.car.image_url ? [res.car.image_url] : [],
        mileage: res.car.mileage || 0,
        vin: res.car.vin,
      } : null,
      step1: {
        carId: res.car_id,
        departureDate: res.departure_date,
        departureTime: res.departure_time,
        departureAgency: res.departure_agency_id,
        returnDate: res.return_date,
        returnTime: res.return_time,
        returnAgency: res.return_agency_id,
        differentReturnAgency: res.departure_agency_id !== res.return_agency_id,
      },
      step2: {
        firstName: res.client?.first_name || res.client?.firstName || '',
        lastName: res.client?.last_name || res.client?.lastName || '',
        phone: res.client?.phone || '',
        email: res.client?.email || '',
        dateOfBirth: res.client?.dateOfBirth,
        placeOfBirth: res.client?.placeOfBirth,
        licenseNumber: res.client?.licenseNumber || '',
        licenseExpiration: res.client?.licenseExpirationDate,
        licenseDelivery: res.client?.licenseDeliveryDate,
        licenseDeliveryPlace: res.client?.licenseDeliveryPlace,
        additionalDocType: res.client?.documentType === 'none' ? undefined : (res.client?.documentType as any),
        additionalDocNumber: res.client?.documentNumber,
        additionalDocDelivery: res.client?.documentDeliveryDate,
        additionalDocExpiration: res.client?.documentExpirationDate,
        additionalDocDeliveryAddress: res.client?.documentDeliveryAddress,
        wilaya: res.client?.wilaya || '',
        completeAddress: res.client?.completeAddress,
        scannedDocuments: res.client?.scannedDocuments,
        photo: res.client?.profilePhoto,
      },
      totalDays: res.total_days,
      totalPrice: res.total_price,
      deposit: res.deposit,
      discountAmount: res.discount_amount || 0,
      discountType: res.discount_type,
      advancePayment: res.advance_payment || 0,
      remainingPayment: res.remaining_payment,
      tvaApplied: res.tva_applied || false,
      additionalFees: res.additional_fees || 0,
      status: res.status,
      notes: res.notes,
      conditions: res.conditions_text,
      createdAt: res.created_at,
      activatedAt: res.activated_at,
      completedAt: res.completed_at,
      // Caution and Assurance fields
      cautionAmountDzd: res.caution_amount_dzd || res.deposit,
      cautionCurrency: res.caution_currency || 'DZD',
      euroRate: res.euro_rate || 145,
      assuranceEnabled: res.assurance_enabled || false,
      assurancePercentage: res.assurance_percentage,
      // Forfait d'assurance de protection sélectionné
      protectionAssuranceId: res.protection_assurance_id || undefined,
      protectionAssuranceName: res.protection_assurance_name || undefined,
      protectionAssurancePrice: res.protection_assurance_price != null ? Number(res.protection_assurance_price) : undefined,
      protectionAssurance: mapProtectionAssurance(res.protection_assurance),
      departureInspection: (() => {
        const departureInspections = res.vehicle_inspections?.filter((i: any) => i.type === 'departure') || [];
        if (departureInspections.length === 0) return undefined;
        const latest = departureInspections.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        return {
          id: latest.id,
          reservationId: latest.reservation_id,
          type: latest.type,
          mileage: latest.mileage,
          fuelLevel: latest.fuel_level,
          location: res.departure_agency?.name || latest.agency_id || '',
          date: latest.date,
          time: latest.time,
          interiorPhotos: latest.interior_photo ? [latest.interior_photo] : [],
          exteriorPhotos: [
            latest.exterior_front_photo,
            latest.exterior_rear_photo,
            ...(latest.other_photos || []),
          ].filter(Boolean),
          inspectionItems: (latest.inspection_responses || []).map((resp: any) => ({
            id: resp.checklist_item?.id || resp.checklist_item_id,
            responseId: resp.id,
            name: resp.checklist_item?.item_name || '',
            checked: resp.status,
            category: resp.checklist_item?.category === 'securite' ? 'security' :
                     resp.checklist_item?.category === 'equipements' ? 'equipment' :
                     resp.checklist_item?.category === 'confort' ? 'comfort' : 'cleanliness'
          })),
          notes: latest.notes,
          createdAt: latest.created_at,
          signature: latest.client_signature
        };
      })(),
      returnInspection: (() => {
        const returnInspections = res.vehicle_inspections?.filter((i: any) => i.type === 'return') || [];
        if (returnInspections.length === 0) return undefined;
        const latest = returnInspections.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        return {
          id: latest.id,
          reservationId: latest.reservation_id,
          type: latest.type,
          mileage: latest.mileage,
          fuelLevel: latest.fuel_level,
          location: res.return_agency?.name || latest.agency_id || '',
          date: latest.date,
          time: latest.time,
          interiorPhotos: latest.interior_photo ? [latest.interior_photo] : [],
          exteriorPhotos: [
            latest.exterior_front_photo,
            latest.exterior_rear_photo,
            ...(latest.other_photos || []),
          ].filter(Boolean),
          inspectionItems: (latest.inspection_responses || []).map((resp: any) => ({
            id: resp.checklist_item?.id || resp.checklist_item_id,
            responseId: resp.id,
            name: resp.checklist_item?.item_name || '',
            checked: resp.status,
            category: resp.checklist_item?.category === 'securite' ? 'security' :
                     resp.checklist_item?.category === 'equipements' ? 'equipment' :
                     resp.checklist_item?.category === 'confort' ? 'comfort' : 'cleanliness'
          })),
          notes: latest.notes,
          createdAt: latest.created_at,
          signature: latest.client_signature
        };
      })(),
      additionalServices: res.reservation_services || [],
      payments: res.payments || [],
      excessMileage: res.excess_mileage,
      missingFuel: res.missing_fuel,
      createdBy: res.created_by,
      createdByName: res.created_by_name,
    })).map(mapped => {
      console.log('✅ Mapped reservation:', {
        id: mapped.id,
        createdBy: mapped.createdBy,
        createdByName: mapped.createdByName
      });
      return mapped;
    });
  }

  static async getReservationById(id: string): Promise<ReservationDetails> {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        client:clients(*),
        car:cars(*),
        vehicle_inspections(
          *,
          inspection_responses(
            *,
            checklist_item:inspection_checklist_items(*)
          )
        ),
        reservation_services(*),
        payments(*),
        protection_assurance:protection_assurances!reservations_protection_assurance_fkey(
          id, name, price_per_day, is_active, created_at,
          protection_assurance_item_links(
            id, status, item:protection_assurance_items(id, item_name, display_order)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      clientId: data.client_id,
      client: data.client ? {
        id: data.client.id,
        firstName: data.client.first_name || data.client.firstName,
        lastName: data.client.last_name || data.client.lastName,
        phone: data.client.phone,
        email: data.client.email,
        profilePhoto: data.client.profile_photo || data.client.profilePhoto,
        dateOfBirth: data.client.date_of_birth || data.client.dateOfBirth,
        placeOfBirth: data.client.place_of_birth || data.client.placeOfBirth,
        wilaya: data.client.wilaya,
        completeAddress: data.client.complete_address || data.client.completeAddress,
        idCardNumber: data.client.id_card_number || data.client.idCardNumber,
        licenseNumber: data.client.license_number || data.client.licenseNumber,
        licenseExpirationDate: data.client.license_expiration_date || data.client.licenseExpirationDate,
        licenseDeliveryDate: data.client.license_delivery_date || data.client.licenseDeliveryDate,
        licenseDeliveryPlace: data.client.license_delivery_place || data.client.licenseDeliveryPlace,
        documentType: data.client.document_type || data.client.documentType,
        documentNumber: data.client.document_number || data.client.documentNumber,
        documentDeliveryDate: data.client.document_delivery_date || data.client.documentDeliveryDate,
        documentExpirationDate: data.client.document_expiration_date || data.client.documentExpirationDate,
        documentDeliveryAddress: data.client.document_delivery_address || data.client.documentDeliveryAddress,
        createdAt: data.client.created_at,
      } : null,
      carId: data.car_id,
      car: data.car ? {
        id: data.car.id,
        brand: data.car.brand,
        model: data.car.model,
        registration: data.car.plate_number || data.car.registration,
        year: data.car.year,
        color: data.car.color,
        energy: data.car.energy,
        transmission: data.car.transmission,
        seats: data.car.seats,
        doors: data.car.doors,
        priceDay: data.car.price_per_day,
        priceWeek: data.car.price_week,
        priceMonth: data.car.price_month,
        deposit: data.car.deposit,
        images: data.car.image_url ? [data.car.image_url] : [],
        mileage: data.car.mileage || 0,
        vin: data.car.vin,
      } : null,
      step1: {
        carId: data.car_id,
        departureDate: data.departure_date,
        departureTime: data.departure_time,
        departureAgency: data.departure_agency_id,
        returnDate: data.return_date,
        returnTime: data.return_time,
        returnAgency: data.return_agency_id,
        differentReturnAgency: data.departure_agency_id !== data.return_agency_id,
      },
      step2: {
        firstName: data.client?.first_name || data.client?.firstName || '',
        lastName: data.client?.last_name || data.client?.lastName || '',
        phone: data.client?.phone || '',
        email: data.client?.email || '',
        dateOfBirth: data.client?.date_of_birth || data.client?.dateOfBirth,
        placeOfBirth: data.client?.place_of_birth || data.client?.placeOfBirth,
        licenseNumber: data.client?.license_number || data.client?.licenseNumber || '',
        licenseExpiration: data.client?.license_expiration_date || data.client?.licenseExpirationDate,
        licenseDelivery: data.client?.license_delivery_date || data.client?.licenseDeliveryDate,
        licenseDeliveryPlace: data.client?.license_delivery_place || data.client?.licenseDeliveryPlace,
        additionalDocType: (data.client?.document_type || data.client?.documentType) === 'none' ? undefined : (data.client?.document_type || data.client?.documentType),
        additionalDocNumber: data.client?.document_number || data.client?.additionalDocNumber,
        additionalDocDelivery: data.client?.document_delivery_date || data.client?.additionalDocDelivery,
        additionalDocExpiration: data.client?.document_expiration_date || data.client?.additionalDocExpiration,
        additionalDocDeliveryAddress: data.client?.document_delivery_address || data.client?.additionalDocDeliveryAddress,
        wilaya: data.client?.wilaya || '',
        completeAddress: data.client?.complete_address || data.client?.completeAddress,
        scannedDocuments: data.client?.scanned_documents || data.client?.scannedDocuments,
        photo: data.client?.profile_photo || data.client?.profilePhoto,
      },
      additionalServices: data.reservation_services || [],
      payments: data.payments || [],
      excessMileage: data.excess_mileage,
      missingFuel: data.missing_fuel,
      additionalFees: data.additional_fees || 0,
      tvaApplied: data.tva_applied || false,
      deposit: data.deposit,
      totalDays: data.total_days,
      totalPrice: data.total_price,
      discountAmount: data.discount_amount || 0,
      discountType: data.discount_type,
      advancePayment: data.advance_payment || 0,
      remainingPayment: data.remaining_payment,
      status: data.status,
      createdAt: data.created_at,
      activatedAt: data.activated_at,
      completedAt: data.completed_at,
      notes: data.notes,
      conditions: data.conditions_text,
      assuranceEnabled: data.assurance_enabled || false,
      assurancePercentage: data.assurance_percentage,
      protectionAssuranceId: data.protection_assurance_id || undefined,
      protectionAssuranceName: data.protection_assurance_name || undefined,
      protectionAssurancePrice: data.protection_assurance_price != null ? Number(data.protection_assurance_price) : undefined,
      protectionAssurance: mapProtectionAssurance(data.protection_assurance),
      departureInspection: (() => {
        // Get latest departure inspection (most recent by created_at)
        const departureInspections = data.vehicle_inspections?.filter((i: any) => i.type === 'departure') || [];
        if (departureInspections.length === 0) return undefined;
        const latest = departureInspections.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        return {
          id: latest.id,
          reservationId: latest.reservation_id,
          type: latest.type,
          mileage: latest.mileage,
          fuelLevel: latest.fuel_level,
          location: latest.agency_id || '',
          date: latest.date,
          time: latest.time,
          interiorPhotos: latest.interior_photo ? [latest.interior_photo] : [],
          exteriorPhotos: [
            latest.exterior_front_photo,
            latest.exterior_rear_photo,
            ...(latest.other_photos || []),
          ].filter(Boolean),
          inspectionItems: (latest.inspection_responses || []).map((resp: any) => ({
            id: resp.checklist_item?.id || resp.checklist_item_id,
            responseId: resp.id,
            name: resp.checklist_item?.item_name || '',
            checked: resp.status,
            category: resp.checklist_item?.category === 'securite' ? 'security' :
                     resp.checklist_item?.category === 'equipements' ? 'equipment' :
                     resp.checklist_item?.category === 'confort' ? 'comfort' : 'cleanliness'
          })),
          notes: latest.notes,
          createdAt: latest.created_at,
          signature: latest.client_signature
        };
      })(),
      returnInspection: (() => {
        // Get latest return inspection (most recent by created_at)
        const returnInspections = data.vehicle_inspections?.filter((i: any) => i.type === 'return') || [];
        if (returnInspections.length === 0) return undefined;
        const latest = returnInspections.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        return {
          id: latest.id,
          reservationId: latest.reservation_id,
          type: latest.type,
          mileage: latest.mileage,
          fuelLevel: latest.fuel_level,
          location: latest.agency_id || '',
          date: latest.date,
          time: latest.time,
          interiorPhotos: latest.interior_photo ? [latest.interior_photo] : [],
          exteriorPhotos: [
            latest.exterior_front_photo,
            latest.exterior_rear_photo,
            ...(latest.other_photos || []),
          ].filter(Boolean),
          inspectionItems: (latest.inspection_responses || []).map((resp: any) => ({
            id: resp.checklist_item?.id || resp.checklist_item_id,
            responseId: resp.id,
            name: resp.checklist_item?.item_name || '',
            checked: resp.status,
            category: resp.checklist_item?.category === 'securite' ? 'security' :
                     resp.checklist_item?.category === 'equipements' ? 'equipment' :
                     resp.checklist_item?.category === 'confort' ? 'comfort' : 'cleanliness'
          })),
          notes: latest.notes,
          createdAt: latest.created_at,
          signature: latest.client_signature
        };
      })(),
      createdBy: data.created_by,
      createdByName: data.created_by_name,
    };
  }

  static async updateReservation(id: string, updates: Partial<{
    carId: string;
    clientId: string;
    departureDate: string;
    returnDate: string;
    departureTime: string;
    returnTime: string;
    totalDays: number;
    status: string;
    discountAmount: number;
    discountType: string;
    advancePayment: number;
    remainingPayment: number;
    notes: string;
    conditionsText?: string;
    tvaApplied: boolean;
    additionalFees: number;
    totalPrice: number;
    deposit: number;
    activatedAt?: string;
    completedAt?: string;
    cautionAmountDzd: number;
    cautionCurrency: 'DZD' | 'EUR';
    euroRate: number;
    assuranceEnabled: boolean;
    assurancePercentage: number;
    protectionAssuranceId: string | null;
    protectionAssuranceName: string | null;
    protectionAssurancePrice: number | null;
  }>): Promise<void> {
    const updateData: any = {};

    // Only include fields that are actually provided
    // Booking details
    if (updates.carId !== undefined) updateData.car_id = updates.carId;
    if (updates.clientId !== undefined) updateData.client_id = updates.clientId;
    if (updates.departureDate !== undefined) updateData.departure_date = updates.departureDate;
    if (updates.returnDate !== undefined) updateData.return_date = updates.returnDate;
    if (updates.departureTime !== undefined) updateData.departure_time = updates.departureTime;
    if (updates.returnTime !== undefined) updateData.return_time = updates.returnTime;
    if (updates.totalDays !== undefined) updateData.total_days = updates.totalDays;
    
    // Status & Financial fields
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.discountAmount !== undefined) updateData.discount_amount = updates.discountAmount;
    if (updates.discountType !== undefined) updateData.discount_type = updates.discountType;
    if (updates.advancePayment !== undefined) updateData.advance_payment = updates.advancePayment;
    if (updates.remainingPayment !== undefined) updateData.remaining_payment = updates.remainingPayment;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.conditionsText !== undefined) updateData.conditions_text = updates.conditionsText;
    if (updates.tvaApplied !== undefined) updateData.tva_applied = updates.tvaApplied;
    if (updates.additionalFees !== undefined) updateData.additional_fees = updates.additionalFees;
    if (updates.totalPrice !== undefined) updateData.total_price = updates.totalPrice;
    if (updates.deposit !== undefined) updateData.deposit = updates.deposit;
    if (updates.activatedAt !== undefined) updateData.activated_at = updates.activatedAt;
    if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;
    // Caution and Assurance fields
    if (updates.cautionAmountDzd !== undefined) updateData.caution_amount_dzd = updates.cautionAmountDzd;
    if (updates.cautionCurrency !== undefined) updateData.caution_currency = updates.cautionCurrency;
    if (updates.euroRate !== undefined) updateData.euro_rate = updates.euroRate;
    if (updates.assuranceEnabled !== undefined) updateData.assurance_enabled = updates.assuranceEnabled;
    if (updates.assurancePercentage !== undefined) updateData.assurance_percentage = updates.assurancePercentage;
    if (updates.protectionAssuranceId !== undefined) updateData.protection_assurance_id = updates.protectionAssuranceId;
    if (updates.protectionAssuranceName !== undefined) updateData.protection_assurance_name = updates.protectionAssuranceName;
    if (updates.protectionAssurancePrice !== undefined) updateData.protection_assurance_price = updates.protectionAssurancePrice;

    // Some optional columns (caution_amount_dzd, price_per_day, …) only exist once the
    // matching migration has been applied. PostgREST answers with PGRST204 and names the
    // offending column, so drop it and retry rather than losing the whole update.
    const MAX_MISSING_COLUMN_RETRIES = 8;

    for (let attempt = 0; ; attempt++) {
      const { error } = await supabase
        .from('reservations')
        .update(updateData)
        .eq('id', id);

      if (!error) return;

      const missingColumn = ReservationsService.getMissingColumn(error, updateData);
      if (!missingColumn || attempt >= MAX_MISSING_COLUMN_RETRIES) throw error;

      console.warn(`⚠️ reservations.${missingColumn} is missing from the schema — saving without it.`);
      delete updateData[missingColumn];

      if (Object.keys(updateData).length === 0) return;
    }
  }

  /**
   * Reads the column name out of a PostgREST "schema cache" error (PGRST204) and returns it
   * when we actually sent that column, so the caller can retry without it.
   */
  private static getMissingColumn(error: any, updateData: Record<string, any>): string | null {
    if (error?.code !== 'PGRST204') return null;
    const quoted = /'([^']+)' column/.exec(error?.message ?? '');
    const column = quoted?.[1];
    return column && column in updateData ? column : null;
  }

  static async activateReservation(id: string): Promise<void> {
    const { error } = await supabase
      .from('reservations')
      .update({
        status: 'active',
        activated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  static async completeReservation(data: {
    reservationId: string;
    carId: string;
    returnMileage: number;
    excessMileage?: number;
    notes?: string;
  }): Promise<void> {
    try {
      console.log('📋 Starting completion process for reservation:', data.reservationId);

      // Validate inputs
      if (!data.reservationId || !data.carId || data.returnMileage === undefined) {
        throw new Error('Missing required fields: reservationId, carId, or returnMileage');
      }

      // Update the car's mileage
      console.log('🚗 Updating car mileage...');
      const { error: carError } = await supabase
        .from('cars')
        .update({ mileage: data.returnMileage })
        .eq('id', data.carId);

      if (carError) {
        console.error('❌ Car update failed:', carError);
        throw new Error(`Failed to update car mileage: ${carError.message}`);
      }
      console.log('✅ Car mileage updated');

      // Update reservation with completion data
      console.log('📋 Updating reservation status to completed...');
      const updateData: any = {
        status: 'completed',
        completed_at: new Date().toISOString(),
        missing_fuel: 0,
      };

      if (data.excessMileage !== undefined) updateData.excess_mileage = data.excessMileage;
      if (data.notes) updateData.notes = data.notes;

      const { error } = await supabase
        .from('reservations')
        .update(updateData)
        .eq('id', data.reservationId);

      if (error) {
        console.error('❌ Reservation update failed:', error);
        throw new Error(`Failed to complete reservation: ${error.message}`);
      }

      console.log('✅ Reservation completion successful');
    } catch (error: any) {
      console.error('❌ Error in completeReservation:', error);
      throw error;
    }
  }

  static async cancelReservation(id: string): Promise<void> {
    // First, get the reservation to find the car ID
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('car_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Update reservation status to cancelled
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) throw error;

    // With period-based availability, we no longer need to update car status globally
    // The car status is no longer used for availability checks - only date overlaps matter
  }

  static async deleteReservation(id: string): Promise<void> {
    // First, get the reservation to find the car ID
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('car_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Delete the reservation
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // With period-based availability, we no longer need to update car status globally
    // The car status is no longer used for availability checks - only date overlaps matter
  }

  // ========== VEHICLE INSPECTIONS ==========

  static async createInspection(data: {
    reservationId: string;
    type: 'departure' | 'return';
    mileage: number;
    fuelLevel: 'full' | 'half' | 'quarter' | 'eighth' | 'empty';
    agencyId: string;
    date: string;
    time: string;
    notes?: string;
    exteriorFrontPhotoUrl?: string;
    exteriorRearPhotoUrl?: string;
    interiorPhotoUrl?: string;
    otherPhotosUrls?: string[];
    clientSignatureUrl?: string;
  }): Promise<{ id: string }> {
    const { data: inspection, error } = await supabase
      .from('vehicle_inspections')
      .upsert([{
        reservation_id: data.reservationId,
        type: data.type,
        mileage: data.mileage,
        fuel_level: data.fuelLevel,
        agency_id: data.agencyId,
        date: data.date,
        time: data.time,
        notes: data.notes,
        exterior_front_photo: data.exteriorFrontPhotoUrl,
        exterior_rear_photo: data.exteriorRearPhotoUrl,
        interior_photo: data.interiorPhotoUrl,
        other_photos: data.otherPhotosUrls || [],
        client_signature: data.clientSignatureUrl,
      }], { onConflict: 'reservation_id,type' })
      .select()
      .single();

    if (error) throw error;
    return { id: inspection.id };
  }

  static async getInspection(id: string): Promise<VehicleInspection> {
    const { data, error } = await supabase
      .from('vehicle_inspections')
      .select(`
        *,
        inspection_responses(
          *,
          checklist_item:inspection_checklist_items(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      reservationId: data.reservation_id,
      type: data.type,
      mileage: data.mileage,
      fuelLevel: data.fuel_level,
      location: data.agency_id,
      date: data.date,
      time: data.time,
      interiorPhotos: data.interior_photo ? [data.interior_photo] : [],
      exteriorPhotos: [
        data.exterior_front_photo,
        data.exterior_rear_photo,
        ...(data.other_photos || []),
      ].filter(Boolean),
      inspectionItems: data.inspection_responses || [],
      notes: data.notes,
      createdAt: data.created_at,
    };
  }

  static async saveInspectionResponse(inspectionId: string, checklistItemId: string, status: boolean, note?: string): Promise<void> {
    const { error } = await supabase
      .from('inspection_responses')
      .upsert(
        {
          inspection_id: inspectionId,
          checklist_item_id: checklistItemId,
          status,
          note,
        },
        { onConflict: 'inspection_id,checklist_item_id' }
      );

    if (error) throw error;
  }

  static async getChecklistItems(): Promise<any[]> {
    const { data, error } = await supabase
      .from('inspection_checklist_items')
      .select('*')
      .order('category')
      .order('display_order');

    if (error) throw error;
    return data || [];
  }

  static async addCustomChecklistItem(category: string, itemName: string): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('inspection_checklist_items')
      .insert([{
        category,
        item_name: itemName,
        display_order: 999, // Add at end
      }])
      .select()
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  static async deleteChecklistItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('inspection_checklist_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ========== RESERVATION SERVICES ==========

  static async addService(data: {
    reservationId: string;
    category: 'decoration' | 'equipment' | 'insurance' | 'service' | 'driver';
    serviceName: string;
    description?: string;
    price: number;
    driverId?: string;
  }): Promise<{ id: string }> {
    const { data: service, error } = await supabase
      .from('reservation_services')
      .insert([{
        reservation_id: data.reservationId,
        category: data.category,
        service_name: data.serviceName,
        description: data.description,
        price: data.price,
        driver_id: data.driverId,
      }])
      .select()
      .single();

    if (error) throw error;
    return { id: service.id };
  }

  static async deleteService(serviceId: string): Promise<void> {
    const { error } = await supabase
      .from('reservation_services')
      .delete()
      .eq('id', serviceId);

    if (error) throw error;
  }

  static async getServices(reservationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('reservation_services')
      .select('*')
      .eq('reservation_id', reservationId);

    if (error) throw error;
    return data || [];
  }

  static async updateReservationServices(reservationId: string, services: any[]): Promise<void> {
    // First, delete all existing services for this reservation
    const { error: deleteError } = await supabase
      .from('reservation_services')
      .delete()
      .eq('reservation_id', reservationId);

    if (deleteError) throw deleteError;

    // Then, add the new services
    if (services.length > 0) {
      const servicesToInsert = services.map(service => ({
        reservation_id: reservationId,
        category: service.category,
        service_name: service.service_name || service.name || service.serviceName,
        description: service.description,
        price: service.price,
        driver_id: service.driver_id || service.driverId,
        driver_caution: service.driver_caution || service.driverCaution || 0
      }));

      const { error: insertError } = await supabase
        .from('reservation_services')
        .insert(servicesToInsert);

      if (insertError) throw insertError;
    }
  }

  // ========== PAYMENTS ==========

  static async addPayment(data: {
    reservationId: string;
    amount: number;
    paymentMethod: 'cash' | 'card' | 'transfer' | 'check';
    date: string;
    note?: string;
  }): Promise<{ id: string }> {
    const { data: payment, error } = await supabase
      .from('payments')
      .insert([{
        reservation_id: data.reservationId,
        amount: data.amount,
        method: data.paymentMethod,
        date: data.date,
        note: data.note,
      }])
      .select()
      .single();

    if (error) throw error;
    return { id: payment.id };
  }

  static async getPayments(reservationId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      reservationId: p.reservation_id,
      amount: p.amount,
      date: p.date,
      method: p.method,
      note: p.note,
      createdAt: p.created_at,
    }));
  }

  static async deletePayment(paymentId: string): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (error) throw error;
  }

  // ========== PHOTO UPLOAD UTILITIES ==========

  static async uploadInspectionPhoto(
    file: File,
    reservationId: string,
    photoType: 'exterior-front' | 'exterior-rear' | 'interior' | 'other'
  ): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `inspection-${reservationId}-${photoType}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('inspection')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from('inspection')
      .getPublicUrl(data.path);

    return publicUrl.publicUrl;
  }

  static async deleteInspectionFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from('inspection')
      .remove([filePath]);

    if (error) throw error;
  }
}
