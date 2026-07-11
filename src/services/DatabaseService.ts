import { supabase } from '../supabase';
import { sessionService } from '../utils/sessionService';
import { Car, Client, Agency, Worker, WorkerAdvance, WorkerAbsence, WorkerPayment, StoreExpense, VehicleExpense, MaintenanceAlert, WebsiteOrder, ReservationDetails, SpecialOffer, ContactInfo, WebsiteSettings, PromoCode } from '../types';

// Generic database service functions
export class DatabaseService {
  // Cars
  // ─── Helpers ─────────────────────────────────────────────────────────────
  /** Shared DB-row → Car mapper (ne fixe PAS le statut de disponibilité). */
  private static mapDbCar(dbCar: any): Car {
    return {
      id: dbCar.id || '',
      brand: dbCar.brand,
      model: dbCar.model,
      registration: dbCar.plate_number,
      year: dbCar.year,
      color: dbCar.color || 'Premium',
      vin: dbCar.vin || '',
      energy: dbCar.energy || 'Essence',
      transmission: dbCar.transmission || 'Automatique',
      seats: dbCar.seats || 5,
      doors: dbCar.doors || 4,
      priceDay: Math.round(Number(dbCar.price_per_day)),
      priceWeek: Math.round(Number(dbCar.price_week || dbCar.price_per_day * 2)),
      priceMonth: Math.round(Number(dbCar.price_month || dbCar.price_per_day * 4)),
      deposit: Math.round(Number(dbCar.deposit || dbCar.price_per_day * 2)),
      images: dbCar.image_url ? [dbCar.image_url] : ['https://picsum.photos/seed/car/400/300'],
      mileage: dbCar.mileage || 0,
      // Conserve 'maintenance' si c'est ce que la DB contient ;
      // sinon on laisse 'disponible' comme valeur par défaut (sera recalculé par getCarsWithRealStatus).
      status: dbCar.status === 'maintenance' ? 'maintenance' : 'disponible',
      // === true : reste false tant que la migration n'a pas ajouté la colonne
      isHiddenFromSite: dbCar.is_hidden_from_site === true,
    };
  }

  /** Shared DB-row → SpecialOffer mapper (la ligne doit inclure le join car:cars(*)). */
  private static mapDbSpecialOffer(row: any): SpecialOffer {
    return {
      id: row.id,
      carId: row.car_id,
      car: this.mapDbCar(row.car || {}),
      oldPrice: Math.round(Number(row.old_price)),
      newPrice: Math.round(Number(row.new_price)),
      note: row.note,
      isActive: row.is_active,
      createdAt: row.created_at,
      label: row.label || undefined,
      discountType: row.discount_type || undefined,
      discountValue: row.discount_value != null ? Number(row.discount_value) : undefined,
      startDate: row.start_date || undefined,
      endDate: row.end_date || undefined,
    };
  }

  // ─── Cars ────────────────────────────────────────────────────────────────
  static async getCars(): Promise<Car[]> {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Le statut retourné ici est soit 'maintenance' (saisi manuellement en DB) soit
    // 'disponible' (placeholder). Utilise getCarsWithRealStatus() pour le statut calculé.
    return (data || []).map(dbCar => this.mapDbCar(dbCar));
  }

  /**
   * Retourne toutes les voitures avec leur statut RÉEL calculé à partir
   * des réservations actives.
   * - 'active'   couvre referenceDate → 'louer'
   * - 'confirmed' | 'pending' couvrent referenceDate → 'reserve'
   * - DB status === 'maintenance' → 'maintenance'
   * - sinon → 'disponible'
   *
   * @param referenceDate  Date de référence au format YYYY-MM-DD (défaut : aujourd'hui)
   */
  static async getCarsWithRealStatus(referenceDate?: string): Promise<Car[]> {
    const today = referenceDate || new Date().toISOString().substring(0, 10);

    // Récupère toutes les voitures et toutes les réservations en parallèle
    const [cars, reservationsResult] = await Promise.all([
      this.getCars(),
      supabase
        .from('reservations')
        .select('car_id, departure_date, return_date, status')
        .in('status', ['active', 'confirmed', 'pending']),
    ]);

    const allReservations = reservationsResult.data || [];

    return cars.map(car => {
      // 'maintenance' est l'unique statut saisi manuellement — on ne le recalcule pas
      if (car.status === 'maintenance') return car;

      const carRes = allReservations.filter(r => r.car_id === car.id);

      const coversToday = (res: any) => {
        const dep = (res.departure_date || '').substring(0, 10);
        const ret = (res.return_date || '').substring(0, 10);
        return dep <= today && today <= ret;
      };

      const activeRes    = carRes.find(r => r.status === 'active'    && coversToday(r));
      const reservedRes  = carRes.find(r => (r.status === 'confirmed' || r.status === 'pending') && coversToday(r));

      let realStatus: Car['status'] = 'disponible';
      if (activeRes)   realStatus = 'louer';
      else if (reservedRes) realStatus = 'reserve';

      return { ...car, status: realStatus };
    });
  }

  /**
   * Retourne les voitures réellement disponibles pour une période donnée.
   * N'utilise PAS car.status pour filtrer — seul le chevauchement de réservations compte.
   * Les voitures en maintenance sont exclues.
   */
  static async getAvailableCars(departureDate?: string, returnDate?: string): Promise<Car[]> {
    const allCars = await this.getCars();

    // Exclure les voitures en maintenance (seul statut saisi manuellement)
    const nonMaintenance = allCars.filter(car => car.status !== 'maintenance');

    // Si aucune plage de dates, toutes les voitures non en maintenance sont disponibles
    if (!departureDate || !returnDate) {
      return nonMaintenance;
    }

    // Récupère les réservations qui bloquent la disponibilité
    const { data: allReservations, error } = await supabase
      .from('reservations')
      .select('car_id, departure_date, return_date')
      .in('status', ['pending', 'confirmed', 'active']);

    if (error) {
      console.error('Error fetching reservations:', error);
      return nonMaintenance;
    }

    const departureTime = new Date(departureDate).getTime();
    const returnTime    = new Date(returnDate).getTime();

    // Exclut les voitures dont une réservation chevauche la période demandée
    return nonMaintenance.filter(car => {
      const carReservations = (allReservations || []).filter(r => r.car_id === car.id);
      return !carReservations.some(reservation => {
        const resStart = new Date(reservation.departure_date).getTime();
        const resEnd   = new Date(reservation.return_date).getTime();
        return departureTime < resEnd && returnTime > resStart;
      });
    });
  }

  static async getReservedCarsForPeriod(departureDate: string, returnDate: string): Promise<Array<{
    id: string;
    carId: string;
    brand: string;
    model: string;
    image: string;
    departureDate: string;
    returnDate: string;
    clientName: string;
  }>> {
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        id,
        car_id,
        departure_date,
        return_date,
        client:clients(first_name, last_name),
        car:cars(brand, model, image_url)
      `)
      .in('status', ['pending', 'confirmed', 'active']);

    if (error) {
      console.error('Error fetching reservations:', error);
      return [];
    }

    const departureTime = new Date(departureDate).getTime();
    const returnTime = new Date(returnDate).getTime();

    // Filter reservations that overlap with the provided date range
    const overlappingReservations = (reservations || []).filter(res => {
      const resStart = new Date(res.departure_date).getTime();
      const resEnd = new Date(res.return_date).getTime();
      return departureTime < resEnd && returnTime > resStart;
    });

    return overlappingReservations.map(res => ({
      id: res.id,
      carId: res.car_id,
      brand: res.car?.brand || '',
      model: res.car?.model || '',
      image: res.car?.image_url || 'https://picsum.photos/seed/car/400/300',
      departureDate: res.departure_date,
      returnDate: res.return_date,
      clientName: `${res.client?.first_name || ''} ${res.client?.last_name || ''}`,
    }));
  }

  static async createCar(car: Omit<Car, 'id' | 'created_at'>): Promise<Car> {
    const { data, error } = await supabase
      .from('cars')
      .insert([car])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateCar(id: string, updates: Partial<Car>): Promise<Car> {
    const { data, error } = await supabase
      .from('cars')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteCar(id: string): Promise<void> {
    const { error } = await supabase
      .from('cars')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Périodes déjà réservées (pending/confirmed/active) pour UNE voiture,
   * au format YYYY-MM-DD — utilisées pour bloquer les dates du calendrier public.
   * Essaie d'abord la RPC get_reserved_periods (SECURITY DEFINER, accessible aux
   * visiteurs anonymes malgré la RLS), puis retombe sur une lecture directe.
   */
  static async getReservedDateRangesForCar(carId: string): Promise<{ from: string; to: string }[]> {
    const mapRows = (rows: any[]) =>
      (rows || [])
        .filter(r => r.departure_date && r.return_date)
        .map(r => ({
          from: String(r.departure_date).substring(0, 10),
          to: String(r.return_date).substring(0, 10),
        }));

    try {
      const { data, error } = await supabase.rpc('get_reserved_periods', { p_car_id: carId });
      if (!error && Array.isArray(data)) return mapRows(data);
    } catch {
      // RPC absente (migration non appliquée) — on tente la lecture directe
    }

    const { data, error } = await supabase
      .from('reservations')
      .select('departure_date, return_date')
      .eq('car_id', carId)
      .in('status', ['pending', 'confirmed', 'active']);

    if (error) {
      console.warn('getReservedDateRangesForCar failed:', error.message);
      return [];
    }
    return mapRows(data || []);
  }

  /** Masque / affiche une voiture sur le site public (colonne is_hidden_from_site). */
  static async setCarVisibility(id: string, isHidden: boolean): Promise<void> {
    const { error } = await supabase
      .from('cars')
      .update({ is_hidden_from_site: isHidden })
      .eq('id', id);

    if (error) {
      if ((error.message || '').includes('is_hidden_from_site')) {
        throw new Error(
          "La colonne is_hidden_from_site n'existe pas encore. Exécutez la migration supabase/migrations/20260702_offers_visibility.sql dans le SQL Editor de Supabase."
        );
      }
      throw error;
    }
  }

  // Clients
  static async getClients(): Promise<Client[]> {
    // Add retry logic for rate limiting
    const maxRetries = 2;
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Map snake_case to camelCase
        return (data || []).map(client => ({
          id: client.id,
          firstName: client.first_name,
          lastName: client.last_name,
          phone: client.phone,
          email: client.email,
          dateOfBirth: client.date_of_birth,
          placeOfBirth: client.place_of_birth,
          idCardNumber: client.id_card_number,
          licenseNumber: client.license_number,
          licenseExpirationDate: client.license_expiration_date,
          licenseDeliveryDate: client.license_delivery_date,
          licenseDeliveryPlace: client.license_delivery_place,
          documentType: client.document_type,
          documentNumber: client.document_number,
          documentDeliveryDate: client.document_delivery_date,
          documentExpirationDate: client.document_expiration_date,
          documentDeliveryAddress: client.document_delivery_address,
          wilaya: client.wilaya,
          completeAddress: client.complete_address,
          profilePhoto: client.profile_photo,
          scannedDocuments: client.scanned_documents,
          createdAt: client.created_at,
          agencyId: client.agency_id,
        }));
      } catch (error: any) {
        lastError = error;
        const message = error.message || '';
        
        // Check if it's a rate limit error
        if (message.includes('429') || message.includes('Too Many Requests')) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000;
            console.warn(`[DatabaseService] Rate limited on getClients, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // For other errors, throw immediately
        throw error;
      }
    }
    
    throw lastError;
  }


  /** Mappe une ligne clients (snake_case) vers le modèle Client (camelCase). */
  private static mapClientRow(client: any): Client {
    return {
      id: client.id,
      firstName: client.first_name,
      lastName: client.last_name,
      phone: client.phone,
      email: client.email,
      dateOfBirth: client.date_of_birth,
      placeOfBirth: client.place_of_birth,
      idCardNumber: client.id_card_number,
      licenseNumber: client.license_number,
      licenseExpirationDate: client.license_expiration_date,
      licenseDeliveryDate: client.license_delivery_date,
      licenseDeliveryPlace: client.license_delivery_place,
      documentType: client.document_type,
      documentNumber: client.document_number,
      documentDeliveryDate: client.document_delivery_date,
      documentExpirationDate: client.document_expiration_date,
      documentDeliveryAddress: client.document_delivery_address,
      wilaya: client.wilaya,
      completeAddress: client.complete_address,
      profilePhoto: client.profile_photo,
      scannedDocuments: client.scanned_documents,
      createdAt: client.created_at,
      agencyId: client.agency_id,
    } as Client;
  }

  /** Les N derniers clients créés (affichage initial de la sélection client). */
  static async getRecentClients(limit: number = 6): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(c => this.mapClientRow(c));
  }

  /** Recherche serveur (nom, prénom ou téléphone) sur TOUTE la base clients. */
  static async searchClients(query: string, limit: number = 30): Promise<Client[]> {
    const q = query.trim();
    if (!q) return [];
    // Échappe les caractères spéciaux du pattern PostgREST
    const safe = q.replace(/[%_,()]/g, ' ').trim();
    if (!safe) return [];

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,phone.ilike.%${safe}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(c => this.mapClientRow(c));
  }

  static async createClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    // Map camelCase to snake_case for database
    const dbClient = {
      first_name: client.firstName,
      last_name: client.lastName,
      phone: client.phone,
      email: client.email,
      date_of_birth: client.dateOfBirth || null,
      place_of_birth: client.placeOfBirth,
      id_card_number: client.idCardNumber || null,
      license_number: client.licenseNumber,
      license_expiration_date: client.licenseExpirationDate || null,
      license_delivery_date: client.licenseDeliveryDate || null,
      license_delivery_place: client.licenseDeliveryPlace,
      document_type: client.documentType,
      document_number: client.documentNumber,
      document_delivery_date: client.documentDeliveryDate || null,
      document_expiration_date: client.documentExpirationDate || null,
      document_delivery_address: client.documentDeliveryAddress,
      wilaya: client.wilaya,
      complete_address: client.completeAddress,
      profile_photo: client.profilePhoto,
      scanned_documents: client.scannedDocuments,
      agency_id: client.agencyId,
    };

    const { data, error } = await supabase
      .from('clients')
      .insert([dbClient])
      .select()
      .single();

    if (error) throw error;

    // Map back to camelCase for the return
    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      phone: data.phone,
      email: data.email,
      dateOfBirth: data.date_of_birth,
      placeOfBirth: data.place_of_birth,
      idCardNumber: data.id_card_number,
      licenseNumber: data.license_number,
      licenseExpirationDate: data.license_expiration_date,
      licenseDeliveryDate: data.license_delivery_date,
      licenseDeliveryPlace: data.license_delivery_place,
      documentType: data.document_type,
      documentNumber: data.document_number,
      documentDeliveryDate: data.document_delivery_date,
      documentExpirationDate: data.document_expiration_date,
      documentDeliveryAddress: data.document_delivery_address,
      wilaya: data.wilaya,
      completeAddress: data.complete_address,
      profilePhoto: data.profile_photo,
      scannedDocuments: data.scanned_documents,
      createdAt: data.created_at,
      agencyId: data.agency_id,
    };
  }

  static async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    // Map camelCase to snake_case for database
    const dbUpdates: any = {};
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.dateOfBirth !== undefined) dbUpdates.date_of_birth = updates.dateOfBirth;
    if (updates.placeOfBirth !== undefined) dbUpdates.place_of_birth = updates.placeOfBirth;
    if (updates.idCardNumber !== undefined) dbUpdates.id_card_number = updates.idCardNumber;
    if (updates.licenseNumber !== undefined) dbUpdates.license_number = updates.licenseNumber;
    if (updates.licenseExpirationDate !== undefined) dbUpdates.license_expiration_date = updates.licenseExpirationDate;
    if (updates.licenseDeliveryDate !== undefined) dbUpdates.license_delivery_date = updates.licenseDeliveryDate;
    if (updates.licenseDeliveryPlace !== undefined) dbUpdates.license_delivery_place = updates.licenseDeliveryPlace;
    if (updates.documentType !== undefined) dbUpdates.document_type = updates.documentType;
    if (updates.documentNumber !== undefined) dbUpdates.document_number = updates.documentNumber;
    if (updates.documentDeliveryDate !== undefined) dbUpdates.document_delivery_date = updates.documentDeliveryDate;
    if (updates.documentExpirationDate !== undefined) dbUpdates.document_expiration_date = updates.documentExpirationDate;
    if (updates.documentDeliveryAddress !== undefined) dbUpdates.document_delivery_address = updates.documentDeliveryAddress;
    if (updates.wilaya !== undefined) dbUpdates.wilaya = updates.wilaya;
    if (updates.completeAddress !== undefined) dbUpdates.complete_address = updates.completeAddress;
    if (updates.profilePhoto !== undefined) dbUpdates.profile_photo = updates.profilePhoto;
    if (updates.scannedDocuments !== undefined) dbUpdates.scanned_documents = updates.scannedDocuments;
    if (updates.agencyId !== undefined) dbUpdates.agency_id = updates.agencyId;

    const { data, error } = await supabase
      .from('clients')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Map back to camelCase for the return
    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      phone: data.phone,
      email: data.email,
      dateOfBirth: data.date_of_birth,
      placeOfBirth: data.place_of_birth,
      idCardNumber: data.id_card_number,
      licenseNumber: data.license_number,
      licenseExpirationDate: data.license_expiration_date,
      licenseDeliveryDate: data.license_delivery_date,
      licenseDeliveryPlace: data.license_delivery_place,
      documentType: data.document_type,
      documentNumber: data.document_number,
      documentDeliveryDate: data.document_delivery_date,
      documentExpirationDate: data.document_expiration_date,
      documentDeliveryAddress: data.document_delivery_address,
      wilaya: data.wilaya,
      completeAddress: data.complete_address,
      profilePhoto: data.profile_photo,
      scannedDocuments: data.scanned_documents,
      createdAt: data.created_at,
      agencyId: data.agency_id,
    };
  }

  static async deleteClient(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
  // Agencies
  static async getAgencies(): Promise<Agency[]> {
    const { data, error } = await supabase
      .from('agencies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createAgency(agency: Omit<Agency, 'id' | 'created_at'>): Promise<Agency> {
    // ensure an id exists (supabase table does not auto-generate)
    const withId = {
      ...agency,
      id: (agency as any).id || crypto.randomUUID(),
    };

    const { data, error } = await supabase
      .from('agencies')
      .insert([withId])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateAgency(id: string, updates: Partial<Agency>): Promise<Agency> {
    const { data, error } = await supabase
      .from('agencies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteAgency(id: string): Promise<void> {
    const { error } = await supabase
      .from('agencies')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Workers
  static async getWorkers(): Promise<Worker[]> {
    const { data, error } = await supabase
      .from('workers')
      .select(`
        *,
        advances:worker_advances(*),
        absences:worker_absences(*),
        payments:worker_payments(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map snake_case to camelCase
    return (data || []).map(worker => ({
      id: worker.id,
      fullName: worker.full_name,
      dateOfBirth: worker.date_of_birth,
      phone: worker.phone,
      email: worker.email,
      address: worker.address,
      profilePhoto: worker.profile_photo,
      type: worker.type,
      paymentType: worker.payment_type,
      baseSalary: worker.base_salary,
      username: worker.username,
      password: worker.password,
      advances: worker.advances || [],
      absences: worker.absences || [],
      payments: worker.payments || [],
      createdAt: worker.created_at,
    }));
  }

  static async createWorker(worker: Omit<Worker, 'id' | 'createdAt' | 'advances' | 'absences' | 'payments'>): Promise<Worker> {
    console.log('[DatabaseService] Creating worker:', worker.email);

    const email = (worker.email || '').trim().toLowerCase();
    const password = worker.password || '';

    // When we have an email + password, create a REAL, email-confirmed Supabase
    // Auth account for the worker via the server-side admin_create_worker() RPC.
    // Doing it server-side means:
    //   • the worker is created already CONFIRMED, so he can sign in immediately
    //     with signInWithPassword() (no "email not confirmed" error),
    //   • the admin's own session is NOT switched to the new worker,
    //   • the full HR row (username, date of birth, address, …) is stored too.
    if (email && password) {
      // Make sure the admin's JWT is attached so the RPC's is_admin() check
      // passes (the RPC refuses anonymous callers to prevent privilege abuse).
      const authed = await sessionService.ensureSupabaseSession();
      if (!authed) {
        throw new Error('ADMIN_SESSION_REQUIRED');
      }

      const { data: newWorkerId, error: rpcError } = await supabase.rpc('admin_create_worker', {
        p_email: email,
        p_password: password,
        p_full_name: worker.fullName,
        p_username: worker.username || null,
        p_phone: worker.phone || null,
        p_date_of_birth: worker.dateOfBirth || null,
        p_address: worker.address || null,
        p_type: worker.type || 'worker',
        p_role_id: null,
        p_photo_url: worker.profilePhoto || null,
        p_base_salary: worker.baseSalary ?? null,
        p_payment_type: worker.paymentType || null,
        p_permissions: [],
      });

      if (rpcError) {
        console.error('[DatabaseService] admin_create_worker failed:', rpcError);
        throw rpcError;
      }

      console.log('[DatabaseService] Worker created successfully:', newWorkerId);

      // Fetch the freshly created row so we return the full, DB-shaped worker.
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('id', newWorkerId)
        .single();

      if (error || !data) {
        // The worker WAS created; only the read-back failed. Return what we know.
        console.warn('[DatabaseService] Worker created but read-back failed:', error);
        return {
          id: (newWorkerId as string) || '',
          fullName: worker.fullName,
          dateOfBirth: worker.dateOfBirth,
          phone: worker.phone,
          email,
          address: worker.address,
          profilePhoto: worker.profilePhoto,
          type: worker.type,
          paymentType: worker.paymentType,
          baseSalary: worker.baseSalary,
          username: worker.username,
          password: worker.password,
          advances: [],
          absences: [],
          payments: [],
          createdAt: new Date().toISOString(),
        };
      }

      return {
        id: data.id,
        fullName: data.full_name,
        dateOfBirth: data.date_of_birth,
        phone: data.phone,
        email: data.email,
        address: data.address,
        profilePhoto: data.profile_photo,
        type: data.type,
        paymentType: data.payment_type,
        baseSalary: data.base_salary,
        username: data.username,
        password: data.password,
        advances: [],
        absences: [],
        payments: [],
        createdAt: data.created_at,
      };
    }

    // No login credentials → store an HR-only worker row (cannot log in).
    const dbWorker = {
      full_name: worker.fullName,
      date_of_birth: worker.dateOfBirth,
      phone: worker.phone,
      email,
      address: worker.address,
      profile_photo: worker.profilePhoto,
      type: worker.type,
      payment_type: worker.paymentType,
      base_salary: worker.baseSalary,
      username: worker.username,
      login_enabled: false,
    };

    const { data, error } = await supabase
      .from('workers')
      .insert([dbWorker])
      .select()
      .single();

    if (error) {
      console.error('[DatabaseService] Worker creation failed:', error);
      throw error;
    }

    console.log('[DatabaseService] HR-only worker created successfully:', data.id);

    // Map back to camelCase for the return
    return {
      id: data.id,
      fullName: data.full_name,
      dateOfBirth: data.date_of_birth,
      phone: data.phone,
      email: data.email,
      address: data.address,
      profilePhoto: data.profile_photo,
      type: data.type,
      paymentType: data.payment_type,
      baseSalary: data.base_salary,
      username: data.username,
      password: data.password,
      advances: [],
      absences: [],
      payments: [],
      createdAt: data.created_at,
    };
  }

  static async updateWorker(id: string, updates: Partial<Omit<Worker, 'advances' | 'absences' | 'payments'>>): Promise<Worker> {
    // Map camelCase to snake_case for database
    const dbUpdates: any = {};
    if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
    if (updates.dateOfBirth !== undefined) dbUpdates.date_of_birth = updates.dateOfBirth;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.profilePhoto !== undefined) dbUpdates.profile_photo = updates.profilePhoto;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.paymentType !== undefined) dbUpdates.payment_type = updates.paymentType;
    if (updates.baseSalary !== undefined) dbUpdates.base_salary = updates.baseSalary;
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.password !== undefined) dbUpdates.password = updates.password;

    const { data, error } = await supabase
      .from('workers')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Map back to camelCase for the return
    return {
      id: data.id,
      fullName: data.full_name,
      dateOfBirth: data.date_of_birth,
      phone: data.phone,
      email: data.email,
      address: data.address,
      profilePhoto: data.profile_photo,
      type: data.type,
      paymentType: data.payment_type,
      baseSalary: data.base_salary,
      username: data.username,
      password: data.password,
      advances: [],
      absences: [],
      payments: [],
      createdAt: data.created_at,
    };
  }

  static async deleteWorker(id: string): Promise<void> {
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Worker Advances
  static async createWorkerAdvance(workerId: string, advance: Omit<WorkerAdvance, 'id' | 'createdAt'>): Promise<WorkerAdvance> {
    const dbAdvance = {
      worker_id: workerId,
      amount: advance.amount,
      date: advance.date,
      note: advance.note,
    };

    const { data, error } = await supabase
      .from('worker_advances')
      .insert([dbAdvance])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      amount: data.amount,
      date: data.date,
      note: data.note,
    };
  }

  static async deleteWorkerAdvance(id: string): Promise<void> {
    const { error } = await supabase
      .from('worker_advances')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Worker Absences
  static async createWorkerAbsence(workerId: string, absence: Omit<WorkerAbsence, 'id' | 'createdAt'>): Promise<WorkerAbsence> {
    const dbAbsence = {
      worker_id: workerId,
      cost: absence.cost,
      date: absence.date,
      note: absence.note,
    };

    const { data, error } = await supabase
      .from('worker_absences')
      .insert([dbAbsence])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      cost: data.cost,
      date: data.date,
      note: data.note,
    };
  }

  static async deleteWorkerAbsence(id: string): Promise<void> {
    const { error } = await supabase
      .from('worker_absences')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Worker Payments
  static async createWorkerPayment(workerId: string, payment: Omit<WorkerPayment, 'id' | 'createdAt'>): Promise<WorkerPayment> {
    const dbPayment = {
      worker_id: workerId,
      amount: payment.amount,
      date: payment.date,
      base_salary: payment.baseSalary,
      advances: payment.advances,
      absences: payment.absences,
      net_salary: payment.netSalary,
      note: payment.note,
    };

    const { data, error } = await supabase
      .from('worker_payments')
      .insert([dbPayment])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      amount: data.amount,
      date: data.date,
      baseSalary: data.base_salary,
      advances: data.advances,
      absences: data.absences,
      netSalary: data.net_salary,
      note: data.note,
    };
  }

  static async deleteWorkerPayment(id: string): Promise<void> {
    const { error } = await supabase
      .from('worker_payments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Store Expenses
  static async getStoreExpenses(): Promise<StoreExpense[]> {
    const { data, error } = await supabase
      .from('store_expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createStoreExpense(expense: Omit<StoreExpense, 'id' | 'created_at'>): Promise<StoreExpense> {
    const { data, error } = await supabase
      .from('store_expenses')
      .insert([expense])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Vehicle Expenses
  static async getVehicleExpenses(): Promise<VehicleExpense[]> {
    const { data, error } = await supabase
      .from('vehicle_expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createVehicleExpense(expense: Omit<VehicleExpense, 'id' | 'created_at'>): Promise<VehicleExpense> {
    const { data, error } = await supabase
      .from('vehicle_expenses')
      .insert([expense])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Maintenance Alerts
  static async getMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_alerts')
        .select('*');

      if (error) throw error;
      return (data || []).map(alert => ({
        id: alert.id || '',
        carId: alert.car_id || '',
        carInfo: alert.car_info || '',
        type: alert.type || 'other',
        title: alert.title || 'Alert',
        message: alert.message || '',
        severity: alert.severity || 'medium',
        dueDate: alert.due_date,
        isExpired: alert.is_expired || false,
        daysUntilDue: alert.days_until_due,
        currentMileage: alert.current_mileage,
        nextServiceMileage: alert.next_service_mileage,
        createdAt: alert.created_at || new Date().toISOString()
      }));
    } catch (e) {
      console.warn('getMaintenanceAlerts failed, table may not exist or missing columns:', e);
      return [];
    }
  }

  static async createMaintenanceAlert(alert: Omit<MaintenanceAlert, 'id' | 'created_at'>): Promise<MaintenanceAlert> {
    const dbPayload = {
      car_id: alert.carId,
      car_info: alert.carInfo,
      type: alert.type,
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      due_date: alert.dueDate ?? null,
      is_expired: alert.isExpired,
      days_until_due: alert.daysUntilDue ?? null,
      current_mileage: alert.currentMileage ?? null,
      next_service_mileage: alert.nextServiceMileage ?? null,
    };

    const { data, error } = await supabase
      .from('maintenance_alerts')
      .insert([dbPayload])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteMaintenanceAlert(carId: string, type: string): Promise<void> {
    const { error } = await supabase
      .from('maintenance_alerts')
      .delete()
      .eq('car_id', carId)
      .eq('type', type);

    if (error) throw error;
  }

  // Website Orders
  static async getWebsiteOrders(): Promise<WebsiteOrder[]> {
    try {
      // Query pending reservations from reservations table (website orders)
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          client_id,
          car_id,
          departure_date,
          departure_time,
          departure_agency_id,
          return_date,
          return_time,
          return_agency_id,
          total_days,
          total_price,
          additional_fees,
          status,
          created_at,
          protection_assurance_id,
          protection_assurance_name,
          protection_assurance_price,
          client:clients(*),
          car:cars(*),
          reservation_services(*),
          protection_assurance:protection_assurances!reservations_protection_assurance_fkey(
            id, name, price_per_day, is_active, created_at,
            protection_assurance_item_links(
              id, status, item:protection_assurance_items(id, item_name, display_order)
            )
          )
        `)
        // load both new pending orders and those we've already accepted so they stay visible here
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching website orders:', error);
        return [];
      }

      // Transform reservations to WebsiteOrder format
      if (!data) return [];

      return data.map((reservation: any) => {
        const totalPrice = parseInt(reservation.total_price) || 0;
        const totalDays = reservation.total_days || 0;

        // Services supplémentaires attachés à la réservation
        const additionalServices = (reservation.reservation_services || []).map((s: any) => ({
          id: s.id,
          category: s.category,
          name: s.service_name,
          description: s.description,
          price: Math.round(Number(s.price) || 0),
          selected: true,
        }));
        const servicesTotal = additionalServices.reduce((sum: number, s: any) => sum + s.price, 0);

        // Assurance de protection sélectionnée
        const pa = reservation.protection_assurance;
        const protectionAssurance = pa ? {
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
        } : undefined;
        const assuranceTotal = reservation.protection_assurance_price != null
          ? Math.round(Number(reservation.protection_assurance_price) * totalDays)
          : 0;

        return {
          id: reservation.id,
          carId: reservation.car_id,
          car: reservation.car || {},
          step1: {
            carId: reservation.car_id,
            departureDate: reservation.departure_date,
            departureTime: reservation.departure_time,
            departureAgency: reservation.departure_agency_id,
            returnDate: reservation.return_date,
            returnTime: reservation.return_time,
            returnAgency: reservation.return_agency_id,
            differentReturnAgency: reservation.departure_agency_id !== reservation.return_agency_id,
          },
          step2: {
            firstName: reservation.client?.first_name || '',
            lastName: reservation.client?.last_name || '',
            phone: reservation.client?.phone || '',
            email: reservation.client?.email || '',
            licenseNumber: reservation.client?.license_number || '',
            wilaya: reservation.client?.wilaya || '',
            completeAddress: reservation.client?.complete_address || '',
            // include profile photo like planner reservations do
            photo: reservation.client?.profile_photo || '',
            scannedDocuments: reservation.client?.documents_urls || [],
          },
          step3: {
            additionalServices,
          },
          totalDays,
          totalPrice: totalPrice,
          servicesTotal,
          protectionAssurance,
          protectionAssuranceName: reservation.protection_assurance_name || undefined,
          assuranceTotal,
          status: reservation.status || 'pending',
          createdAt: reservation.created_at,
          source: 'website',
        } as WebsiteOrder;
      });
    } catch (err) {
      console.warn('Exception fetching website orders:', err);
      return [];
    }
  }

  static async createWebsiteOrder(order: Omit<WebsiteOrder, 'id' | 'created_at'>): Promise<WebsiteOrder> {
    // Website orders are actually reservations with pending status
    const reservationData = {
      client_id: (order as any).clientId,
      car_id: order.carId,
      departure_date: order.step1.departureDate,
      departure_time: order.step1.departureTime,
      departure_agency_id: order.step1.departureAgency,
      return_date: order.step1.returnDate,
      return_time: order.step1.returnTime,
      return_agency_id: order.step1.returnAgency,
      total_days: order.totalDays,
      total_price: order.totalPrice,
      additional_fees: order.servicesTotal,
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('reservations')
      .insert([reservationData])
      .select()
      .single();

    if (error) throw error;
    return order;
  }

  static async updateWebsiteOrderStatus(orderId: string, status: 'pending' | 'accepted' | 'confirmed' | 'processing' | 'completed' | 'cancelled'): Promise<void> {
    // Update reservation status (website orders are reservations)
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', orderId);

    if (error) throw error;
  }

  static async deleteWebsiteOrder(orderId: string): Promise<void> {
    // Delete from reservations table (website orders are reservations)
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', orderId);

    if (error) throw error;
  }

  // Reservations
  static async getReservations(): Promise<ReservationDetails[]> {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        client:clients(*),
        car:cars(*),
        payments:payments(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createReservation(reservation: Omit<ReservationDetails, 'id' | 'created_at' | 'activatedAt' | 'completedAt'>): Promise<ReservationDetails> {
    const { data, error } = await supabase
      .from('reservations')
      .insert([reservation])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Dashboard Statistics
  static async getDashboardStats() {
    // Add retry logic for rate limiting
    const maxRetries = 2;
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Run all queries in parallel for faster loading
        const [
          revenueResult,
          monthlyRevenueResult,
          storeExpensesResult,
          vehicleExpensesResult,
          clientsResult,
          carsResult,
          activeReservationsForCarsResult,
          totalReservationsResult,
          activeReservationsResult,
          overduePaymentsResult,
          recentReservationsResult,
          alertsResult
        ] = await Promise.all([
          supabase.from('reservations').select('total_price').eq('status', 'completed'),
          supabase.from('reservations').select('total_price, completed_at').eq('status', 'completed').gte('completed_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          supabase.from('store_expenses').select('cost'),
          supabase.from('vehicle_expenses').select('cost'),
          supabase.from('clients').select('id', { count: 'exact' }),
          supabase.from('cars').select('id', { count: 'exact' }),
          supabase.from('reservations').select('car_id').in('status', ['pending', 'confirmed', 'active']),
          supabase.from('reservations').select('id', { count: 'exact' }),
          supabase.from('reservations').select('id', { count: 'exact' }).in('status', ['confirmed', 'active']),
          supabase.from('payments').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('reservations').select('*, client:clients(*), car:cars(*)').order('created_at', { ascending: false }).limit(5),
          supabase.from('maintenance_alerts').select('id', { count: 'exact' })
        ]);

        // Extract data and errors
        const { data: revenueData, error: revenueError } = revenueResult;
        const { data: monthlyRevenueData, error: monthlyRevenueError } = monthlyRevenueResult;
        const { data: storeExpenses, error: storeError } = storeExpensesResult;
        const { data: vehicleExpenses, error: vehicleError } = vehicleExpensesResult;
        const { data: clients, error: clientsError } = clientsResult;
        const { data: cars, error: carsError } = carsResult;
        const { data: activeReservationsForCars, error: activeReservationsForCarsError } = activeReservationsForCarsResult;
        const { data: totalReservations, error: totalReservationsError } = totalReservationsResult;
        const { data: activeReservations, error: activeResError } = activeReservationsResult;
        const { data: overduePayments, error: overduePaymentsError } = overduePaymentsResult;
        const { data: recentReservations, error: recentReservationsError } = recentReservationsResult;
        const { data: alerts, error: alertsError } = alertsResult;

        // Throw on critical errors
        if (revenueError || storeError || vehicleError || clientsError || carsError || activeResError) {
          throw revenueError || storeError || vehicleError || clientsError || carsError || activeResError;
        }

        // Calculate available cars: total cars minus those with active/pending reservations
        const rentedCarIds = new Set(activeReservationsForCars?.map((r: any) => r.car_id) || []);
        const availableCarsCount = (cars?.length || 0) - rentedCarIds.size;

        // Calculate totals
        const totalRevenue = revenueData?.reduce((sum, r) => sum + r.total_price, 0) || 0;
        const monthlyRevenue = monthlyRevenueData?.reduce((sum, r) => sum + r.total_price, 0) || 0;
        const totalExpenses = (storeExpenses?.reduce((sum, e) => sum + e.cost, 0) || 0) +
                             (vehicleExpenses?.reduce((sum, e) => sum + e.cost, 0) || 0);
        const maintenanceAlertsCount = alertsError ? 0 : (alerts?.length || 0);

        // Calculate revenue by month (last 6 months)
        const revenueByMonth = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
          const monthRevenue = revenueData?.filter(r => {
            const completedDate = new Date(r.completed_at || r.created_at);
            return completedDate >= month && completedDate < nextMonth;
          }).reduce((sum, r) => sum + r.total_price, 0) || 0;

          revenueByMonth.push({
            month: month.toLocaleDateString('fr-FR', { month: 'short' }),
            revenue: monthRevenue
          });
        }

    // Calculate car utilization (simplified - based on active reservations)
    const carUtilization = cars?.slice(0, 5).map(car => ({
      carId: car.id,
      carName: `${car.brand} ${car.model}`,
      utilization: Math.floor(Math.random() * 40) + 60 // Placeholder - would need actual calculation
    })) || [];

    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      totalClients: clients?.length || 0,
      totalCars: cars?.length || 0,
      availableCars: availableCarsCount,
      totalReservations: totalReservations?.length || 0,
      activeReservations: activeReservations?.length || 0,
      overduePayments: overduePayments?.length || 0,
      maintenanceAlerts: maintenanceAlertsCount,
      monthlyRevenue,
      recentReservations: recentReservations || [],
      revenueByMonth,
      carUtilization
    };
      } catch (error: any) {
        lastError = error;
        const message = error.message || '';
        
        // Check if it's a rate limit error
        if (message.includes('429') || message.includes('Too Many Requests')) {
          if (attempt < maxRetries) {
            // Exponential backoff: 1s, 2s, etc.
            const delay = Math.pow(2, attempt) * 1000;
            console.warn(`[DatabaseService] Rate limited on dashboard stats, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Retry
          }
        }
        
        // For other errors, throw immediately
        throw error;
      }
    }
    
    // After all retries exhausted
    throw lastError;
  }

  // Website Management - Offres spéciales (promotions)
  // NOTE : les "offres ordinaires" (table offers) sont dépréciées — les voitures
  // existantes s'affichent désormais automatiquement sur le site (sauf masquées).
  // La table offers est conservée (0 ligne constatée) mais n'est plus lue ni écrite.

  /**
   * Construit le payload DB d'une offre spéciale. Les nouveaux champs (label,
   * remise, dates) ne sont inclus que s'ils sont renseignés, pour rester
   * compatible tant que la migration 20260702_offers_visibility.sql n'est pas appliquée.
   */
  private static buildSpecialOfferPayload(offer: Partial<Omit<SpecialOffer, 'id' | 'createdAt' | 'car'>>): any {
    const payload: any = {
      car_id: offer.carId,
      old_price: offer.oldPrice,
      new_price: offer.newPrice,
      note: offer.note,
      is_active: offer.isActive,
    };
    if (offer.label !== undefined) payload.label = offer.label || null;
    if (offer.discountType !== undefined) payload.discount_type = offer.discountType || null;
    if (offer.discountValue !== undefined) payload.discount_value = offer.discountValue ?? null;
    if (offer.startDate !== undefined) payload.start_date = offer.startDate || null;
    if (offer.endDate !== undefined) payload.end_date = offer.endDate || null;
    return payload;
  }

  private static specialOfferMigrationError(error: any): Error {
    const msg = error?.message || '';
    if (msg.includes('column') && /label|discount_type|discount_value|start_date|end_date/.test(msg)) {
      return new Error(
        "Colonnes d'offre spéciale manquantes. Exécutez la migration supabase/migrations/20260702_offers_visibility.sql dans le SQL Editor de Supabase."
      );
    }
    return error;
  }

  static async getSpecialOffers(): Promise<SpecialOffer[]> {
    try {
      const { data, error } = await supabase
        .from('special_offers')
        .select(`
          *,
          car:cars(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => this.mapDbSpecialOffer(row));
    } catch (e: any) {
      console.warn('getSpecialOffers failed, returning empty array', e.message || e);
      return [];
    }
  }

  static async createSpecialOffer(offer: Omit<SpecialOffer, 'id' | 'createdAt' | 'car'>): Promise<SpecialOffer> {
    const { data, error } = await supabase
      .from('special_offers')
      .insert([this.buildSpecialOfferPayload(offer)])
      .select(`
        *,
        car:cars(*)
      `)
      .single();

    if (error) throw this.specialOfferMigrationError(error);
    return this.mapDbSpecialOffer(data);
  }

  static async updateSpecialOffer(id: string, updates: Partial<Omit<SpecialOffer, 'id' | 'createdAt' | 'car'>>): Promise<SpecialOffer> {
    const { data, error } = await supabase
      .from('special_offers')
      .update(this.buildSpecialOfferPayload(updates))
      .eq('id', id)
      .select(`
        *,
        car:cars(*)
      `)
      .single();

    if (error) throw this.specialOfferMigrationError(error);
    return this.mapDbSpecialOffer(data);
  }

  /** Toggle affiché / masqué du site (colonne is_active). */
  static async toggleSpecialOfferStatus(id: string): Promise<SpecialOffer> {
    // First get current status
    const { data: current, error: fetchError } = await supabase
      .from('special_offers')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Toggle the status
    const { data, error } = await supabase
      .from('special_offers')
      .update({ is_active: !current.is_active })
      .eq('id', id)
      .select(`
        *,
        car:cars(*)
      `)
      .single();

    if (error) throw error;
    return this.mapDbSpecialOffer(data);
  }

  static async deleteSpecialOffer(id: string): Promise<void> {
    const { error } = await supabase
      .from('special_offers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }


  // Website Management - Contacts
  static async getWebsiteContacts(): Promise<ContactInfo> {
    try {
      const { data, error } = await supabase
        .from('website_contacts')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        return {
          facebook: data[0].facebook,
          instagram: data[0].instagram,
          tiktok: data[0].tiktok,
          whatsapp: data[0].whatsapp,
          phone: data[0].phone,
          address: data[0].address,
          email: data[0].email,
        };
      }
    } catch (e: any) {
      console.warn('getWebsiteContacts failed, returning empty object', e.message || e);
    }

    // Return empty object if error or no contacts exist
    return {};
  }

  static async updateWebsiteContacts(contacts: ContactInfo): Promise<ContactInfo> {
    // First, delete all existing records to ensure only one record exists
    await supabase
      .from('website_contacts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    // Then insert the new record
    const { data, error } = await supabase
      .from('website_contacts')
      .insert([{
        facebook: contacts.facebook,
        instagram: contacts.instagram,
        tiktok: contacts.tiktok,
        whatsapp: contacts.whatsapp,
        phone: contacts.phone,
        address: contacts.address,
        email: contacts.email,
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      facebook: data.facebook,
      instagram: data.instagram,
      tiktok: data.tiktok,
      whatsapp: data.whatsapp,
      phone: data.phone,
      address: data.address,
      email: data.email,
    };
  }

  // Website Management - Settings
  static async getWebsiteSettings(): Promise<WebsiteSettings> {
    try {
      const { data, error } = await supabase
        .from('website_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        return {
          name: data[0].name,
          description: data[0].description,
          logo: data[0].logo,
          phone_number_2: data[0].phone_number_2,
          bank_number: data[0].bank_number,
          address: data[0].address,
          phone: data[0].phone,
          landing_background: data[0].landing_background,
        };
      }
    } catch (e: any) {
      console.warn('getWebsiteSettings failed, returning empty object', e.message || e);
    }

    // default empty - ensure required fields present
    return {
      name: '',
      description: '',
      logo: '',
      phone_number_2: '',
      bank_number: '',
      address: '',
      phone: '',
      landing_background: '',
    };
  }

  static async updateWebsiteSettings(settings: WebsiteSettings): Promise<WebsiteSettings> {
    // Les appels partiels (ConfigPage, upload de logo…) ne doivent pas effacer
    // les champs non fournis : on fusionne avec l'enregistrement existant.
    const current = await this.getWebsiteSettings();
    const merged = {
      name: settings.name ?? current.name,
      description: settings.description ?? current.description,
      logo: settings.logo ?? current.logo,
      phone_number_2: settings.phone_number_2 ?? current.phone_number_2,
      bank_number: settings.bank_number ?? current.bank_number,
      address: settings.address ?? current.address,
      phone: settings.phone ?? current.phone,
      landing_background: settings.landing_background ?? current.landing_background,
    };

    // First, delete all existing records to ensure only one record exists
    await supabase
      .from('website_settings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    // Then insert the new record
    let { data, error } = await supabase
      .from('website_settings')
      .insert([{
        ...merged,
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    // Colonne landing_background absente (migration 20260706 non appliquée) :
    // on réessaie sans la colonne pour ne pas bloquer la sauvegarde des autres champs.
    if (error && (error.message || '').includes('landing_background')) {
      const { landing_background: _lb, ...withoutBackground } = merged;
      ({ data, error } = await supabase
        .from('website_settings')
        .insert([{
          ...withoutBackground,
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single());
    }

    if (error) throw error;

    return {
      name: data.name,
      description: data.description,
      logo: data.logo,
      phone_number_2: data.phone_number_2,
      bank_number: data.bank_number,
      address: data.address,
      phone: data.phone,
      landing_background: data.landing_background,
    };
  }

  // Inspection Checklist Items
  static async getInspectionChecklistItems(): Promise<any[]> {
    const { data, error } = await supabase
      .from('inspection_checklist_items')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createInspectionChecklistItem(item: {
    category: string;
    item_name: string;
    display_order?: number;
  }): Promise<any> {
    const { data, error } = await supabase
      .from('inspection_checklist_items')
      .insert([{
        category: item.category,
        item_name: item.item_name,
        display_order: item.display_order || 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteInspectionChecklistItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('inspection_checklist_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Vehicle Inspections
  static async createVehicleInspection(inspection: {
    reservation_id: string;
    type: 'departure' | 'return';
    mileage: number;
    fuel_level: string;
    agency_id: string;
    exterior_front_photo?: string;
    exterior_rear_photo?: string;
    interior_photo?: string;
    other_photos?: string[];
    client_signature?: string;
    notes?: string;
    date: string;
    time: string;
  }): Promise<any> {
    // upsert so that if an inspection already exists for this reservation/type it updates instead of inserting duplicate
    const { data, error } = await supabase
      .from('vehicle_inspections')
      .upsert([inspection], { onConflict: 'reservation_id,type' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateVehicleInspection(inspectionId: string, updates: Partial<{
    mileage: number;
    fuel_level: string;
    agency_id: string;
    exterior_front_photo?: string | null;
    exterior_rear_photo?: string | null;
    interior_photo?: string | null;
    other_photos?: string[];
    client_signature?: string | null;
    notes?: string | null;
    date?: string;
    time?: string;
  }>): Promise<any> {
    const { data, error } = await supabase
      .from('vehicle_inspections')
      .update(updates)
      .eq('id', inspectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getVehicleInspections(reservationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('vehicle_inspections')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Inspection Responses
  static async createInspectionResponses(responses: {
    inspection_id: string;
    checklist_item_id: string;
    status: boolean;
    note?: string;
  }[]): Promise<any[]> {
    try {
      // Request explicit columns to avoid complex auto-generated REST query params
      const { data, error } = await supabase
        .from('inspection_responses')
        .insert(responses)
        .select('id,inspection_id,checklist_item_id,status,note');

      if (error) {
        console.error('createInspectionResponses error:', error);
        throw error;
      }
      return data || [];
    } catch (err) {
      console.error('createInspectionResponses exception:', err);
      throw err;
    }
  }

  static async deleteInspectionResponses(inspectionId: string): Promise<void> {
    const { error } = await supabase
      .from('inspection_responses')
      .delete()
      .eq('inspection_id', inspectionId);

    if (error) throw error;
  }

  // Upsert inspection responses: create new rows or update existing ones by (inspection_id, checklist_item_id)
  static async upsertInspectionResponses(responses: {
    inspection_id: string;
    checklist_item_id: string;
    status: boolean;
    note?: string;
  }[]): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('inspection_responses')
        .upsert(responses, { onConflict: 'inspection_id,checklist_item_id' })
        .select('id,inspection_id,checklist_item_id,status,note');

      if (error) {
        console.error('upsertInspectionResponses error:', error);
        throw error;
      }
      return data || [];
    } catch (err) {
      console.error('upsertInspectionResponses exception:', err);
      throw err;
    }
  }

  // Services
  static async getServices(): Promise<any[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(service => ({
      id: service.id,
      category: service.category,
      name: service.service_name,
      description: service.description,
      price: Math.round(Number(service.price)),
      isActive: service.is_active,
      createdAt: service.created_at,
    }));
  }

  static async createService(service: Omit<any, 'id' | 'created_at'>): Promise<any> {
    const { data, error } = await supabase
      .from('services')
      .insert([{
        category: service.category,
        service_name: service.name,
        description: service.description,
        price: service.price,
        is_active: true,
      }])
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      category: data.category,
      name: data.service_name,
      description: data.description,
      price: Math.round(Number(data.price)),
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  }

  static async updateService(id: string, updates: any): Promise<any> {
    const { data, error } = await supabase
      .from('services')
      .update({
        service_name: updates.name,
        description: updates.description,
        price: updates.price,
        is_active: updates.isActive,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      category: data.category,
      name: data.service_name,
      description: data.description,
      price: Math.round(Number(data.price)),
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  }

  static async deleteService(id: string): Promise<void> {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Get drivers (workers with type 'driver')
  static async getDrivers(): Promise<Worker[]> {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('type', 'driver')
      .order('full_name', { ascending: true });

    if (error) throw error;

    return (data || []).map(worker => ({
      id: worker.id,
      fullName: worker.full_name,
      dateOfBirth: worker.date_of_birth,
      phone: worker.phone,
      email: worker.email,
      address: worker.address,
      profilePhoto: worker.profile_photo,
      type: worker.type,
      paymentType: worker.payment_type,
      baseSalary: worker.base_salary,
      username: worker.username,
      password: worker.password,
      advances: [],
      absences: [],
      payments: [],
      createdAt: worker.created_at,
    }));
  }

  // ========================================================================
  // PROTECTION ASSURANCES (forfaits d'assurance de protection)
  // ========================================================================

  // Master list of reusable items (like inspection_checklist_items)
  static async getProtectionAssuranceItems(): Promise<any[]> {
    const { data, error } = await supabase
      .from('protection_assurance_items')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    return (data || []).map(it => ({
      id: it.id,
      name: it.item_name,
      displayOrder: it.display_order,
      createdAt: it.created_at,
    }));
  }

  static async createProtectionAssuranceItem(itemName: string, displayOrder = 0): Promise<any> {
    const { data, error } = await supabase
      .from('protection_assurance_items')
      .insert([{ item_name: itemName, display_order: displayOrder }])
      .select()
      .single();
    if (error) throw error;
    return { id: data.id, name: data.item_name, displayOrder: data.display_order, createdAt: data.created_at };
  }

  static async deleteProtectionAssuranceItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('protection_assurance_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // Assurances with their linked items (status true/false)
  static async getProtectionAssurances(includeInactive = false): Promise<any[]> {
    let query = supabase
      .from('protection_assurances')
      .select(`
        *,
        protection_assurance_item_links(
          id,
          status,
          item:protection_assurance_items(id, item_name, display_order)
        )
      `)
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      pricePerDay: Math.round(Number(a.price_per_day) || 0),
      isActive: a.is_active,
      createdAt: a.created_at,
      items: (a.protection_assurance_item_links || [])
        .map((link: any) => ({
          linkId: link.id,
          itemId: link.item?.id || null,
          name: link.item?.item_name || '',
          status: !!link.status,
          displayOrder: link.item?.display_order ?? 0,
        }))
        .sort((x: any, y: any) => x.displayOrder - y.displayOrder),
    }));
  }

  // items: array of { itemId, status }
  static async createProtectionAssurance(payload: {
    name: string;
    pricePerDay: number;
    items?: { itemId: string; status: boolean }[];
  }): Promise<any> {
    const { data: assurance, error } = await supabase
      .from('protection_assurances')
      .insert([{ name: payload.name, price_per_day: payload.pricePerDay, is_active: true }])
      .select()
      .single();
    if (error) throw error;

    const items = payload.items || [];
    if (items.length > 0) {
      const links = items.map(it => ({
        assurance_id: assurance.id,
        item_id: it.itemId,
        status: it.status,
      }));
      const { error: linkError } = await supabase
        .from('protection_assurance_item_links')
        .insert(links);
      if (linkError) throw linkError;
    }
    return { id: assurance.id };
  }

  static async updateProtectionAssurance(id: string, payload: {
    name?: string;
    pricePerDay?: number;
    isActive?: boolean;
    items?: { itemId: string; status: boolean }[];
  }): Promise<void> {
    const updates: any = {};
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.pricePerDay !== undefined) updates.price_per_day = payload.pricePerDay;
    if (payload.isActive !== undefined) updates.is_active = payload.isActive;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('protection_assurances')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    }

    // Replace links when items are provided
    if (payload.items) {
      const { error: delError } = await supabase
        .from('protection_assurance_item_links')
        .delete()
        .eq('assurance_id', id);
      if (delError) throw delError;

      if (payload.items.length > 0) {
        const links = payload.items.map(it => ({
          assurance_id: id,
          item_id: it.itemId,
          status: it.status,
        }));
        const { error: insError } = await supabase
          .from('protection_assurance_item_links')
          .insert(links);
        if (insError) throw insError;
      }
    }
  }

  static async deleteProtectionAssurance(id: string): Promise<void> {
    const { error } = await supabase
      .from('protection_assurances')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // ==========================================================================
  // CODES PROMO (gérés par l'admin, consommés par le site public)
  // ==========================================================================

  private static mapPromoCodeRow(row: any): PromoCode {
    return {
      id: row.id,
      code: row.code,
      discountPercentage: Number(row.discount_percentage),
      isActive: !!row.is_active,
      isUsed: !!row.is_used,
      usedAt: row.used_at,
      reservationId: row.reservation_id,
      createdAt: row.created_at,
    };
  }

  private static promoCodesMissingError(error: any): Error | null {
    const msg = error?.message || '';
    if (msg.includes('promo_codes') || error?.code === '42P01') {
      return new Error(
        "La table promo_codes n'existe pas encore. Exécutez la migration supabase/migrations/20260706_website_updates.sql dans le SQL Editor de Supabase."
      );
    }
    return null;
  }

  static async getPromoCodes(): Promise<PromoCode[]> {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw this.promoCodesMissingError(error) || error;
    return (data || []).map(r => this.mapPromoCodeRow(r));
  }

  static async createPromoCode(code: string, discountPercentage: number): Promise<PromoCode> {
    const { data, error } = await supabase
      .from('promo_codes')
      .insert([{
        code: code.trim().toUpperCase(),
        discount_percentage: discountPercentage,
        is_active: true,
        is_used: false,
      }])
      .select()
      .single();

    if (error) {
      if ((error.message || '').includes('promo_codes_code_unique') || error.code === '23505') {
        throw new Error('Ce code existe déjà — générez-en un autre.');
      }
      throw this.promoCodesMissingError(error) || error;
    }
    return this.mapPromoCodeRow(data);
  }

  static async setPromoCodeActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('promo_codes')
      .update({ is_active: isActive })
      .eq('id', id);
    if (error) throw error;
  }

  static async deletePromoCode(id: string): Promise<void> {
    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  /**
   * Vérifie un code promo côté serveur (RPC SECURITY DEFINER, accessible en
   * anonyme sans exposer la table). Retourne le pourcentage si valide.
   */
  static async verifyPromoCode(code: string): Promise<{ valid: boolean; discountPercentage?: number; reason?: string }> {
    const { data, error } = await supabase.rpc('verify_promo_code', { p_code: code });
    if (error) {
      if ((error.message || '').includes('verify_promo_code')) {
        return { valid: false, reason: 'missing_rpc' };
      }
      throw error;
    }
    return {
      valid: !!data?.valid,
      discountPercentage: data?.discount_percentage != null ? Number(data.discount_percentage) : undefined,
      reason: data?.reason,
    };
  }

  // ==========================================================================
  // SITE PUBLIC — création de réservation + disponibilité (RPC anti-RLS)
  // ==========================================================================

  /**
   * Crée client + réservation + services (+ consommation du code promo) en une
   * seule transaction via la RPC SECURITY DEFINER create_website_reservation.
   * C'est le SEUL chemin d'écriture du site public (le rôle anon n'a aucun
   * droit INSERT direct sur clients/reservations).
   */
  static async createWebsiteReservation(payload: {
    client: Record<string, any>;
    reservation: Record<string, any>;
    services?: { category: string; service_name: string; description?: string; price: number }[];
    promoCode?: string | null;
  }): Promise<{ reservationId: string; clientId: string }> {
    const { data, error } = await supabase.rpc('create_website_reservation', {
      p_client: payload.client,
      p_reservation: payload.reservation,
      p_services: payload.services || [],
      p_promo_code: payload.promoCode || null,
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('create_website_reservation')) {
        throw new Error(
          "La fonction create_website_reservation n'existe pas encore. Exécutez la migration supabase/migrations/20260706_website_updates.sql dans le SQL Editor de Supabase."
        );
      }
      if (msg.includes('PROMO_CODE_INVALID')) {
        throw new Error('Le code promo est invalide ou a déjà été utilisé.');
      }
      if (msg.includes('CAR_UNAVAILABLE')) {
        throw new Error('Cette voiture vient d\'être réservée sur ces dates. Choisissez d\'autres dates.');
      }
      throw error;
    }

    return {
      reservationId: data?.reservation_id,
      clientId: data?.client_id,
    };
  }

  /**
   * IDs des voitures INDISPONIBLES sur une période (réservations pending/
   * accepted/confirmed/active qui chevauchent). Retourne null si la RPC
   * n'est pas encore installée (l'appelant affiche alors toutes les voitures).
   */
  static async getUnavailableCarIds(from: string, to: string): Promise<string[] | null> {
    try {
      const { data, error } = await supabase.rpc('get_unavailable_car_ids', { p_from: from, p_to: to });
      if (error) return null;
      return (data || []).map((r: any) => (typeof r === 'string' ? r : r.get_unavailable_car_ids || r.id)).filter(Boolean);
    } catch {
      return null;
    }
  }
}
