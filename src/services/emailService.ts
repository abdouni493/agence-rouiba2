import { supabase } from '../supabase';
import { ReservationDetails } from '../types';
import html2pdf from 'html2pdf.js';

/**
 * Email Service for handling contract email operations
 */
export class EmailService {
  /**
   * Force a phone number to render strictly left-to-right, even inside an RTL (Arabic)
   * document, so it prints in the same order as the French layout.
   */
  static ltrPhone(value: any): string {
    return `<span dir="ltr" style="unicode-bidi:bidi-override;direction:ltr;display:inline-block">${value ?? ''}</span>`;
  }

  /**
   * Force any latin/number value (car immatriculation, VIN, model, mileage, ...) to render
   * strictly left-to-right so it keeps the same order as French even inside an RTL (Arabic)
   * document. Without this, plate numbers like "01234-116-16" print inverted ("16-116-01234").
   */
  static ltr(value: any): string {
    return `<span dir="ltr" style="unicode-bidi:bidi-override;direction:ltr;display:inline-block">${value ?? ''}</span>`;
  }

  /**
   * Convert HTML to PDF Buffer
   */
  static async htmlToPdf(htmlContent: string, fileName: string = 'document'): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const element = document.createElement('div');
        element.innerHTML = htmlContent;
        
        const options = {
          margin: 0,
          filename: `${fileName}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        
        const promise = (html2pdf() as any).set(options).from(element).outputPdf('blob');
        promise.then((pdf: Blob) => {
          resolve(pdf);
        }).catch((error: any) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  /**
   * Generate contract HTML for email
   */
  static async generateContractHTML(
    reservation: ReservationDetails,
    templateLang: 'fr' | 'ar'
  ): Promise<string> {
    try {
      // Fetch agency settings for logo and name
      const { data: settingsData } = await supabase
        .from('website_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      const agencyName = settingsData?.[0]?.name || 'AUTO LOCATION';
      const logoUrl = settingsData?.[0]?.logo || '';

      const isRTL = templateLang === 'ar';
      const dirAttr = isRTL ? 'rtl' : 'ltr';

      // Format dates
      const departureDate = new Date(reservation.step1.departureDate).toLocaleDateString(
        templateLang === 'ar' ? 'ar-DZ' : 'fr-FR'
      );
      const returnDate = new Date(reservation.step1.returnDate).toLocaleDateString(
        templateLang === 'ar' ? 'ar-DZ' : 'fr-FR'
      );

      // Calculate total days
      const start = new Date(reservation.step1.departureDate);
      const end = new Date(reservation.step1.returnDate);
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      // Labels
      const labels = {
        contractTitle: templateLang === 'fr' ? 'CONTRAT DE LOCATION DE VÉHICULE' : 'عقد تأجير السيارة',
        contractNumber: templateLang === 'fr' ? 'N° de Contrat' : 'رقم العقد',
        date: templateLang === 'fr' ? 'Date' : 'التاريخ',
        client: templateLang === 'fr' ? 'CLIENT' : 'العميل',
        clientName: `${reservation.client.firstName} ${reservation.client.lastName}`,
        rentalPeriod: templateLang === 'fr' ? 'PÉRIODE DE LOCATION' : 'فترة الإيجار',
        from: templateLang === 'fr' ? 'Du' : 'من',
        to: templateLang === 'fr' ? 'au' : 'إلى',
        days: templateLang === 'fr' ? 'jours' : 'أيام',
        vehicle: templateLang === 'fr' ? 'VÉHICULE' : 'السيارة',
        driver: templateLang === 'fr' ? 'CONDUCTEUR' : 'السائق',
        pricing: templateLang === 'fr' ? 'TARIFICATION' : 'التسعير',
        pricePerDay: templateLang === 'fr' ? 'Prix par jour' : 'السعر في اليوم',
        total: templateLang === 'fr' ? 'Total' : 'الإجمالي',
        conditions: templateLang === 'fr' ? 'CONDITIONS' : 'الشروط',
        signature: templateLang === 'fr' ? 'SIGNATURE' : 'التوقيع',
        client_sig: templateLang === 'fr' ? 'Client' : 'العميل',
        agency_sig: templateLang === 'fr' ? 'Agence' : 'الوكالة',
      };

      const html = `
<!DOCTYPE html>
<html dir="${dirAttr}" lang="${templateLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${labels.contractTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: white; color: #333; line-height: 1.6; }
    .container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 15mm; background: white; }
    
    /* Header */
    .header { 
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 3px solid #3b82f6;
      page-break-after: avoid;
    }
    
    .logo { width: 50px; height: 50px; }
    .logo img { width: 100%; height: 100%; object-fit: contain; }
    
    .agency-info { 
      text-align: ${isRTL ? 'right' : 'left'};
      flex: 1;
      ${isRTL ? 'margin-right: 15px;' : 'margin-left: 15px;'}
    }
    
    .agency-name { font-size: 20px; font-weight: 900; color: #1f2937; }
    
    .title { 
      text-align: center;
      font-size: 16px;
      font-weight: 900;
      color: #1f2937;
      margin: 15px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    /* Info Rows */
    .info-row { 
      display: flex;
      margin-bottom: 8px;
      font-size: 13px;
      page-break-inside: avoid;
    }
    
    .info-label { 
      font-weight: 700;
      width: 150px;
      color: #4b5563;
      flex-shrink: 0;
    }
    
    .info-value { 
      flex: 1;
      color: #1f2937;
      font-weight: 600;
    }
    
    /* Sections */
    .section { 
      margin-bottom: 15px;
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      background: #f9fafb;
      page-break-inside: avoid;
    }
    
    .section-title { 
      font-size: 13px;
      font-weight: 900;
      color: #fff;
      background: #3b82f6;
      padding: 8px 12px;
      margin: -12px -12px 12px -12px;
      border-radius: 2px 2px 0 0;
    }
    
    .two-column { 
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 10px;
    }
    
    .column-item { padding: 5px; }
    
    /* Signatures */
    .signature-section { 
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 25px;
      page-break-inside: avoid;
    }
    
    .signature-box { 
      text-align: center;
      padding-top: 45px;
      border-top: 1px solid #000;
    }
    
    .signature-label { 
      font-weight: 700;
      margin-top: 5px;
      font-size: 11px;
    }
    
    /* Footer */
    .footer { 
      text-align: center;
      font-size: 10px;
      color: #9ca3af;
      margin-top: 20px;
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
      page-break-inside: avoid;
    }
    
    @media print {
      body { margin: 0; padding: 0; }
      .container { padding: 10mm; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      ${logoUrl ? `<div class="logo"><img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'"></div>` : ''}
      <div class="agency-info">
        <div class="agency-name">${agencyName}</div>
      </div>
    </div>
    
    <!-- Title -->
    <div class="title">${labels.contractTitle}</div>
    
    <!-- Contract Info -->
    <div style="padding: 0 5px; margin-bottom: 15px;">
      <div class="info-row">
        <div class="info-label">${labels.contractNumber}:</div>
        <div class="info-value">#${reservation?.id?.substring(0, 8).toUpperCase()}</div>
      </div>
      <div class="info-row">
        <div class="info-label">${labels.date}:</div>
        <div class="info-value">${new Date().toLocaleDateString(templateLang === 'ar' ? 'ar-DZ' : 'fr-FR')}</div>
      </div>
    </div>
    
    <!-- Client Section -->
    <div class="section">
      <div class="section-title">👤 ${labels.client}</div>
      <div class="info-row">
        <div class="info-label">${templateLang === 'fr' ? 'Nom:' : 'الاسم:'}:</div>
        <div class="info-value">${labels.clientName}</div>
      </div>
      <div class="info-row">
        <div class="info-label">${templateLang === 'fr' ? 'Téléphone:' : 'الهاتف:'}:</div>
        <div class="info-value">${reservation.client.phone ? this.ltrPhone(reservation.client.phone) : 'N/A'}</div>
      </div>
      <div class="info-row">
        <div class="info-label">${templateLang === 'fr' ? 'Email:' : 'البريد:'}:</div>
        <div class="info-value">${reservation.client.email || 'N/A'}</div>
      </div>
    </div>
    
    <!-- Rental Period -->
    <div class="section">
      <div class="section-title">📅 ${labels.rentalPeriod}</div>
      <div class="info-row">
        <div class="info-label">${labels.from}:</div>
        <div class="info-value">${departureDate}</div>
      </div>
      <div class="info-row">
        <div class="info-label">${labels.to}:</div>
        <div class="info-value">${returnDate}</div>
      </div>
      <div class="info-row">
        <div class="info-label">${templateLang === 'fr' ? 'Durée:' : 'المدة:'}:</div>
        <div class="info-value">${totalDays} ${labels.days}</div>
      </div>
    </div>
    
    <!-- Vehicle Info -->
    <div class="section">
      <div class="section-title">🚗 ${labels.vehicle}</div>
      <div class="info-row">
        <div class="info-label">${templateLang === 'fr' ? 'Modèle:' : 'الموديل:'}:</div>
        <div class="info-value">${this.ltr((reservation.car.brand || '') + ' ' + (reservation.car.model || ''))}</div>
      </div>
      <div class="info-row">
        <div class="info-label">${templateLang === 'fr' ? 'Plaque:' : 'اللوحة:'}:</div>
        <div class="info-value">${this.ltr(reservation.car.registration)}</div>
      </div>
    </div>
    
    <!-- Pricing -->
    <div class="section">
      <div class="section-title">💰 ${labels.pricing}</div>
      <div class="two-column">
        <div class="column-item">
          <div class="info-row">
            <div class="info-label">${labels.pricePerDay}:</div>
            <div class="info-value">${reservation.car.priceDay.toLocaleString()} ${templateLang === 'ar' ? 'د.ج' : 'DA'}</div>
          </div>
        </div>
        <div class="column-item">
          <div class="info-row">
            <div class="info-label">${templateLang === 'fr' ? 'Jours:' : 'الأيام:'}:</div>
            <div class="info-value">${totalDays}</div>
          </div>
        </div>
      </div>
      <div class="info-row" style="font-weight: 900; font-size: 15px; color: #1f2937; border-top: 2px solid #3b82f6; padding-top: 8px; margin-top: 8px;">
        <div class="info-label">${labels.total}:</div>
        <div class="info-value">${reservation.totalPrice.toLocaleString()} ${templateLang === 'ar' ? 'د.ج' : 'DA'}</div>
      </div>
    </div>
    
    <!-- Signature Section -->
    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-label">${labels.client_sig}</div>
      </div>
      <div class="signature-box">
        <div class="signature-label">${labels.agency_sig}</div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      ${templateLang === 'fr' ? 'Contrat généré automatiquement' : 'تم إنشاء العقد تلقائيًا'} - ${new Date().toLocaleString(templateLang === 'ar' ? 'ar-DZ' : 'fr-FR')}
    </div>
  </div>
</body>
</html>`;

      return html;
    } catch (error) {
      console.error('Error generating contract HTML:', error);
      throw error;
    }
  }

  /**
   * Convert Blob to Base64 string
   */
  static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix if present
        resolve(base64.includes(',') ? base64.split(',')[1] : base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Send contract email via Supabase Edge Function
   * Converts HTML template to PDF and sends as attachment
   */
  static async sendContractEmail(params: {
    clientEmail: string;
    clientName: string;
    reservationId: string;
    senderEmail: string;
    htmlContent: string;
    templateLang: 'fr' | 'ar';
    documentType?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Validate and sanitize email addresses
      const clientEmail = params.clientEmail.trim().toLowerCase();
      const senderEmail = params.senderEmail.trim().toLowerCase();
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientEmail)) {
        throw new Error(`Invalid client email: ${clientEmail}`);
      }
      if (!emailRegex.test(senderEmail)) {
        throw new Error(`Invalid sender email: ${senderEmail}`);
      }

      // Convert HTML to PDF
      console.log('Converting HTML template to PDF...');
      const pdfBlob = await this.htmlToPdf(params.htmlContent, `${params.documentType || 'document'}-${params.reservationId}`);
      const base64Content = await this.blobToBase64(pdfBlob);

      // DEVELOPMENT: Use local mock proxy server on port 3002
      // PRODUCTION: Use Vercel API route
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      let functionUrl: string;
      
      if (isDevelopment) {
        // Development: Use local mock proxy
        functionUrl = 'http://localhost:3002/functions/v1/send-contract-email';
      } else {
        // Production: Use Vercel API route
        const host = window.location.origin;
        functionUrl = `${host}/api/send-contract-email`;
      }

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: clientEmail,
          clientName: params.clientName,
          reservationId: params.reservationId,
          pdfBase64: base64Content,
          sender: senderEmail,
          language: params.templateLang,
          documentType: params.documentType || 'contract',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge Function error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (data?.success === false) {
        throw new Error(data.error || 'Edge Function returned an error');
      }

      return {
        success: true,
        message: `${params.documentType || 'Contract'} PDF sent successfully`,
      };
    } catch (error: any) {
      console.error('Error sending contract email:', error);
      return {
        success: false,
        message: error.message || `Failed to send ${params.documentType || 'contract'} email`,
      };
    }
  }

  /**
   * Generate HTML for any document type - using contract template as base with different titles
   */
  static async generateDocumentHTML(
    reservation: ReservationDetails,
    templateLang: 'fr' | 'ar',
    documentType: 'contract' | 'devis' | 'recu' | 'engagement' | 'facture' | 'inspection' | 'reservation'
  ): Promise<string> {
    // Get the base contract HTML
    let htmlContent = await this.generateContractHTML(reservation, templateLang);
    
    // Define titles for each document type
    const titles = {
      contract: {
        fr: 'CONTRAT DE LOCATION DE VÉHICULE',
        ar: 'عقد تأجير السيارة'
      },
      devis: {
        fr: 'DEVIS DE LOCATION',
        ar: 'عرض الأسعار'
      },
      recu: {
        fr: 'REÇU DE PAIEMENT',
        ar: 'إيصال الدفع'
      },
      engagement: {
        fr: 'LETTRE D\'ENGAGEMENT',
        ar: 'رسالة الالتزام'
      },
      facture: {
        fr: 'FACTURE',
        ar: 'الفاتورة'
      },
      inspection: {
        fr: 'RAPPORT D\'INSPECTION',
        ar: 'تقرير فحص المركبة'
      },
      reservation: {
        fr: 'BON DE RÉSERVATION',
        ar: 'سند الحجز'
      }
    };
    
    // Get current and target titles
    const currentTitle = titles.contract[templateLang];
    const newTitle = titles[documentType][templateLang];
    
    // Replace all occurrences of the contract title with the new title
    // Use global regex to replace all occurrences
    const titleRegex = new RegExp(currentTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    htmlContent = htmlContent.replace(titleRegex, newTitle);
    
    // Also replace common title variations
    const contractTitleArabicShort = 'عقد تأجير السيارة';
    const contractTitleFrenchShort = 'CONTRAT DE LOCATION';
    
    if (templateLang === 'ar') {
      const arabicRegex = new RegExp(contractTitleArabicShort.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      htmlContent = htmlContent.replace(arabicRegex, newTitle);
    } else {
      const frenchRegex = new RegExp(contractTitleFrenchShort.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      htmlContent = htmlContent.replace(frenchRegex, newTitle);
    }
    
    // Replace in title tags if present
    htmlContent = htmlContent.replace(/<title>.*?<\/title>/i, `<title>${newTitle}</title>`);
    
    // Route to appropriate template generator based on document type
    switch(documentType) {
      case 'inspection':
        return await this.generateInspectionEmailHTML(reservation, templateLang);
      case 'engagement':
        return await this.generateEngagementEmailHTML(reservation, templateLang);
      case 'recu':
        return await this.generateRecuEmailHTML(reservation, templateLang);
      case 'facture':
        return await this.generateFactureEmailHTML(reservation, templateLang);
      case 'devis':
        return await this.generateDevisEmailHTML(reservation, templateLang);
      case 'reservation':
        return await this.generateReservationEmailHTML(reservation, templateLang);
      case 'contract':
      default:
        return await this.generateContractEmailHTMLForEmail(reservation, templateLang);
    }
  }

  /**
   * Generate inspection email template — same professional design as the printed inspection
   */
  static async generateInspectionEmailHTML(
    reservation: ReservationDetails,
    templateLang: 'fr' | 'ar'
  ): Promise<string> {
    try {
      const { data: settingsData } = await supabase
        .from('website_settings')
        .select('logo, name, address, phone, phone_number_2')
        .limit(1)
        .single();

      const agencyName    = settingsData?.name  || 'AUTO LOCATION';
      const logoUrl       = settingsData?.logo  || '';
      const agencyAddress = settingsData?.address || '';
      const agencyPhone   = settingsData?.phone   || '';

      const isFrench = templateLang === 'fr';
      const textDir  = isFrench ? 'ltr' : 'rtl';
      const locale   = isFrench ? 'fr-FR' : 'ar-DZ';
      const today    = new Date().toLocaleDateString(locale);

      const inspectionData = reservation.departureInspection;
      const client = reservation.client;
      const car    = reservation.car;

      const labels = {
        title:            isFrench ? 'RAPPORT D\'INSPECTION' : 'تقرير فحص المركبة',
        date:             isFrench ? 'Date'                   : 'التاريخ',
        reservationNo:    isFrench ? 'N° Réservation'         : 'رقم الحجز',
        registration:     isFrench ? 'Immatriculation'        : 'رقم التسجيل',
        clientInfo:       isFrench ? 'Informations Client'    : 'معلومات العميل',
        fullName:         isFrench ? 'Nom Complet'            : 'الاسم الكامل',
        phone:            isFrench ? 'Téléphone'              : 'الهاتف',
        emailLabel:       isFrench ? 'Email'                  : 'البريد الإلكتروني',
        license:          isFrench ? 'Permis'                 : 'رقم الرخصة',
        vehicleInfo:      isFrench ? 'Informations Véhicule'  : 'معلومات المركبة',
        model:            isFrench ? 'Modèle'                 : 'الطراز',
        vin:              isFrench ? 'VIN'                    : 'رقم الهيكل',
        color:            isFrench ? 'Couleur'                : 'اللون',
        mileage:          isFrench ? 'Kilométrage départ'     : 'كيلومتراج البداية',
        fuelLevel:        isFrench ? 'Niveau carburant'       : 'مستوى الوقود',
        inspectionDetails:isFrench ? 'Détails Inspection'     : 'تفاصيل الفحص',
        notes:            isFrench ? 'Notes / Observations'   : 'ملاحظات',
        clientSig:        isFrench ? 'Signature Client'       : 'توقيع العميل',
        agencySig:        isFrench ? 'Signature Agence'       : 'توقيع الوكالة',
        dateAndSig:       isFrench ? 'Date et signature'      : 'التاريخ والتوقيع',
      };

      const categoryLabels: Record<string, string> = {
        security:    isFrench ? '🛡️ Sécurité'         : '🛡️ الأمان',
        equipment:   isFrench ? '🔧 Équipements'      : '🔧 المعدات',
        comfort:     isFrench ? '✨ Confort & Propreté': '✨ الراحة والنظافة',
        cleanliness: isFrench ? '🧹 Nettoyage'         : '🧹 التنظيف',
      };

      const groupedItems: Record<string, any[]> = {};
      (inspectionData?.inspectionItems || []).forEach((item: any) => {
        if (!groupedItems[item.category]) groupedItems[item.category] = [];
        groupedItems[item.category].push(item);
      });

      const checklistHTML = Object.entries(groupedItems).map(([cat, items]) => `
        <div style="margin-bottom:10px;">
          <div style="font-weight:700;font-size:12px;color:#1a3a8a;padding:5px 8px;background:#f0f1f3;border-left:4px solid #2563eb;border-radius:3px;margin-bottom:4px;">
            ${categoryLabels[cat] || cat}
          </div>
          ${(items as any[]).map(item => `
            <div style="display:flex;justify-content:space-between;padding:5px 8px;border-bottom:0.5px solid #ddd;font-size:12px;">
              <span style="color:#333;">${item.name}</span>
              <span style="font-weight:700;font-size:13px;">${item.checked ? '✅' : '❌'}</span>
            </div>
          `).join('')}
        </div>
      `).join('');

      const html = `<!DOCTYPE html>
<html dir="${textDir}" lang="${isFrench ? 'fr' : 'ar'}">
<head>
  <meta charset="UTF-8">
  <title>${labels.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; background: white; line-height: 1.5; direction: ${textDir}; font-size: 13px; }
    .page { width: 100%; max-width: 210mm; padding: 12mm; margin: 0 auto; background: white; }
    .header { border-bottom: 3px solid #1a3a8a; padding-bottom: 8px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
    .logo { width: 40px; height: 40px; object-fit: contain; flex-shrink: 0; }
    .header-text { flex: 1; }
    .agency-name { font-size: 20px; font-weight: bold; color: #1a3a8a; text-align: center; margin-bottom: 2px; }
    .agency-contact { font-size: 10px; color: #555; text-align: center; }
    .doc-title { font-size: 13px; color: #555; text-align: center; margin-top: 2px; }
    .info-boxes { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 10px; }
    .ibox { padding: 6px 8px; border-radius: 4px; font-size: 11px; }
    .ibox.blue  { background: #dbeafe; border-left: 4px solid #2563eb; }
    .ibox.green { background: #dcfce7; border-left: 4px solid #16a34a; }
    .ibox.amber { background: #fef3c7; border-left: 4px solid #d97706; }
    .ibox-label { font-weight: 600; color: #222; margin-bottom: 2px; font-size: 10px; }
    .ibox-value { color: #333; font-size: 11px; font-weight: 600; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .section { padding: 8px 10px; border-radius: 5px; border: 1px solid #e5e7eb; margin-bottom: 8px; }
    .section.client-s  { background: #f0f9ff; border-color: #bfdbfe; }
    .section.vehicle-s { background: #f0fdf4; border-color: #bbf7d0; }
    .section.inspect-s { background: #f8f9fa; border-color: #e5e7eb; }
    .section-title { font-size: 12px; font-weight: 700; background: #f0f1f3; padding: 4px 6px; border-radius: 3px; margin-bottom: 6px; border-left: 4px solid #2563eb; color: #1a3a8a; }
    .field { padding: 2px 0; border-bottom: 0.5px solid #ddd; }
    .field-label { font-weight: 600; color: #1a3a8a; font-size: 11px; }
    .field-value { color: #444; font-size: 12px; margin-top: 1px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 8px; }
    .notes-box { background: #f0f9ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; padding: 10px; border-radius: 4px; margin-bottom: 8px; font-size: 12px; color: #333; }
    .notes-label { font-weight: 700; color: #1a3a8a; margin-bottom: 4px; font-size: 11px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 14px; }
    .sig-block { text-align: center; }
    .sig-line { border-top: 1px solid #333; margin-bottom: 4px; height: 30px; }
    .sig-label { font-weight: 600; font-size: 12px; color: #1a3a8a; }
    .sig-date  { font-size: 10px; color: #666; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo">` : ''}
      <div class="header-text">
        <div class="agency-name">${agencyName}</div>
        <div class="agency-contact">
          ${agencyAddress}${agencyPhone ? ` &nbsp;|&nbsp; 📞 ${this.ltrPhone(agencyPhone)}` : ''}
        </div>
        <div class="doc-title">🔍 ${labels.title}</div>
      </div>
    </div>

    <!-- Info boxes -->
    <div class="info-boxes">
      <div class="ibox blue">
        <div class="ibox-label">📅 ${labels.date}</div>
        <div class="ibox-value">${today}</div>
      </div>
      <div class="ibox green">
        <div class="ibox-label">🔢 ${labels.reservationNo}</div>
        <div class="ibox-value">#${reservation.id?.substring(0, 8).toUpperCase() || 'N/A'}</div>
      </div>
      <div class="ibox amber">
        <div class="ibox-label">🚗 ${labels.registration}</div>
        <div class="ibox-value">${this.ltr(car.registration || 'N/A')}</div>
      </div>
    </div>

    <!-- Client + Vehicle (2 columns) -->
    <div class="two-col">
      <div class="section client-s">
        <div class="section-title">👤 ${labels.clientInfo}</div>
        <div class="grid-2">
          <div class="field">
            <div class="field-label">${labels.fullName}</div>
            <div class="field-value">${client.firstName || ''} ${client.lastName || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.phone}</div>
            <div class="field-value">${client.phone ? this.ltrPhone(client.phone) : 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.emailLabel}</div>
            <div class="field-value">${client.email || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.license}</div>
            <div class="field-value">${client.licenseNumber || 'N/A'}</div>
          </div>
        </div>
      </div>
      <div class="section vehicle-s">
        <div class="section-title">🚗 ${labels.vehicleInfo}</div>
        <div class="grid-2">
          <div class="field">
            <div class="field-label">${labels.model}</div>
            <div class="field-value">${this.ltr((car.brand || '') + ' ' + (car.model || ''))}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.color}</div>
            <div class="field-value">${car.color || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.vin}</div>
            <div class="field-value">${this.ltr(car.vin || 'N/A')}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.mileage}</div>
            <div class="field-value">${this.ltr((inspectionData?.mileage || car.mileage || 0) + ' km')}</div>
          </div>
          <div class="field">
            <div class="field-label">⛽ ${labels.fuelLevel}</div>
            <div class="field-value">${inspectionData?.fuelLevel || 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Inspection Checklist -->
    <div class="section inspect-s">
      <div class="section-title">✅ ${labels.inspectionDetails}</div>
      <div class="two-col">
        ${checklistHTML || `<p style="color:#888;font-size:12px;">${isFrench ? 'Aucun élément d\'inspection' : 'لا توجد عناصر فحص'}</p>`}
      </div>
    </div>

    <!-- Notes -->
    <div class="notes-box">
      <div class="notes-label">📝 ${labels.notes}</div>
      <div>${inspectionData?.notes || (isFrench ? 'Aucune note' : 'بدون ملاحظات')}</div>
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">${labels.clientSig}</div>
        <div class="sig-date">${labels.dateAndSig}</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">${labels.agencySig}</div>
        <div class="sig-date">${labels.dateAndSig}</div>
      </div>
    </div>

  </div>
</body>
</html>`;

      return html;
    } catch (error) {
      console.error('Error generating inspection HTML:', error);
      return this.generateContractHTML(reservation, templateLang);
    }
  }

  // ─── SHARED AGENCY LOADER ────────────────────────────────────────────────────
  private static async loadAgency() {
    const { data } = await supabase
      .from('website_settings')
      .select('logo, name, address, phone, phone_number_2, bank_number')
      .limit(1)
      .single();
    return {
      name:    data?.name         || 'AUTO LOCATION',
      logo:    data?.logo         || '',
      address: data?.address      || '',
      phone:   data?.phone        || '',
      phone2:  data?.phone_number_2 || '',
      bank:    data?.bank_number  || '',
    };
  }

  // ─── SHARED HTML HEADER ──────────────────────────────────────────────────────
  private static agencyHeaderHTML(ag: ReturnType<typeof EmailService['loadAgency']> extends Promise<infer T> ? T : never, docTitle: string, textDir: string): string {
    return `
    <div style="border-bottom:3px solid #1a3a8a;padding-bottom:8px;margin-bottom:10px;display:flex;align-items:center;gap:10px;">
      ${ag.logo ? `<img src="${ag.logo}" alt="Logo" style="width:40px;height:40px;object-fit:contain;flex-shrink:0;">` : ''}
      <div style="flex:1;">
        <div style="font-size:20px;font-weight:bold;color:#1a3a8a;text-align:center;margin-bottom:2px;">${ag.name}</div>
        <div style="font-size:10px;color:#555;text-align:center;">
          ${ag.address}${ag.phone ? ` &nbsp;|&nbsp; 📞 ${this.ltrPhone(ag.phone)}` : ''}${ag.phone2 ? ` &nbsp;|&nbsp; 📱 ${this.ltrPhone(ag.phone2)}` : ''}
        </div>
        <div style="font-size:13px;color:#555;text-align:center;margin-top:2px;">${docTitle}</div>
      </div>
    </div>`;
  }

  /**
   * Generate engagement email — same design as printed engagement (amber #d97706)
   */
  private static async generateEngagementEmailHTML(reservation: ReservationDetails, templateLang: string = 'ar'): Promise<string> {
    const ag = await this.loadAgency();
    const isFrench = templateLang === 'fr';
    const textDir  = isFrench ? 'ltr' : 'rtl';
    const locale   = isFrench ? 'fr-FR' : 'ar-DZ';
    const today    = new Date().toLocaleDateString(locale);
    const client   = reservation.client;
    const car      = reservation.car;
    const depDate  = new Date(reservation.step1.departureDate).toLocaleDateString(locale);
    const retDate  = new Date(reservation.step1.returnDate).toLocaleDateString(locale);

    const isPassport = client.documentType === 'passport';
    const docLabel  = isPassport ? (isFrench ? 'Passeport' : 'جواز سفر') : (isFrench ? "Carte d'Identité" : 'بطاقة هوية');
    const depositLabel = isPassport
      ? (isFrench ? 'Avoir déposé mon passeport' : 'قمت بإيداع جواز سفري')
      : (isFrench ? "Avoir déposé ma carte d'identité" : 'قمت بإيداع بطاقتي الشخصية');
    const docNumber = isPassport ? (client.documentNumber || 'N/A') : (client.idCardNumber || 'N/A');
    const docDate   = client.documentDeliveryDate || client.licenseDeliveryDate || '';
    const docPlace  = client.documentDeliveryAddress || client.licenseDeliveryPlace || client.wilaya || 'N/A';

    return `<!DOCTYPE html>
<html dir="${textDir}" lang="${isFrench ? 'fr' : 'ar'}">
<head>
  <meta charset="UTF-8">
  <title>${isFrench ? 'Engagement' : 'التزام'}</title>
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;background:white;direction:${textDir};font-size:14px;line-height:1.6; }
    .page { width:100%;max-width:210mm;padding:12mm;margin:0 auto; }
    .header { border-bottom:3px solid #d97706;padding-bottom:8px;margin-bottom:14px;display:flex;align-items:center;gap:10px; }
    .logo { width:40px;height:40px;object-fit:contain;flex-shrink:0; }
    .agency-name { font-size:20px;font-weight:700;color:#d97706;text-align:center;margin-bottom:2px; }
    .agency-contact { font-size:10px;color:#555;text-align:center; }
    .doc-title { font-size:16px;font-weight:700;color:#d97706;text-align:center;text-decoration:underline;margin-top:2px; }
    .intro-line { margin:10px 0;font-size:14px; }
    .highlight { font-weight:600;color:#d97706; }
    .doc-info { margin:12px 0;padding:12px;border:2px solid #d97706;border-radius:4px;background:#fffcf8; }
    .info-line { display:flex;gap:12px;margin:6px 0;font-size:13px; }
    .info-label { font-weight:600;color:#92400e;min-width:120px;flex-shrink:0; }
    .info-value { color:#1a1a1a; }
    .vehicle-box { background:#fff8f0;padding:14px;border-radius:4px;margin:14px 0;border:2px solid #d97706;border-left:5px solid #d97706; }
    .vehicle-header { font-weight:700;color:#d97706;margin-bottom:8px;font-size:15px;text-transform:uppercase; }
    .model-badge { background:#fef3c7;padding:6px 12px;border-radius:4px;font-weight:700;color:#d97706;display:inline-block;margin:6px 0;border:1px solid #d97706;font-size:15px; }
    .signatures { display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px; }
    .sig-block { text-align:center;border:2px solid #d97706;border-radius:4px;padding:16px 12px;background:#fffcf8; }
    .sig-space { min-height:50px;border-bottom:2px solid #1a1a1a;margin-bottom:8px; }
    .sig-label { font-weight:700;font-size:12px;color:#d97706;text-transform:uppercase; }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="header">
      ${ag.logo ? `<img src="${ag.logo}" alt="Logo" class="logo">` : ''}
      <div style="flex:1;">
        <div class="agency-name">${ag.name}</div>
        <div class="agency-contact">${ag.address}${ag.phone ? ` &nbsp;|&nbsp; 📞 ${this.ltrPhone(ag.phone)}` : ''}${ag.phone2 ? ` &nbsp;|&nbsp; 📱 ${this.ltrPhone(ag.phone2)}` : ''}</div>
        <div class="doc-title">${isFrench ? 'ENGAGEMENT' : 'التزام'}</div>
      </div>
    </div>

    <!-- Content -->
    <div class="intro-line">
      ${isFrench ? 'Je soussigné(e) Mme/Mrs' : 'أنا الموقع أدناه السيدة/السيد'}
      <span class="highlight"> ${client.firstName || ''} ${client.lastName || ''}</span>
    </div>

    <div class="intro-line" style="margin-top:10px;">${depositLabel} (${docLabel})</div>

    <!-- Document details -->
    <div class="doc-info">
      <div class="info-line">
        <span class="info-label">${isFrench ? 'N°' : 'رقم'}</span>
        <span class="info-value">${docNumber}</span>
      </div>
      <div class="info-line">
        <span class="info-label">${isFrench ? 'Délivré le' : 'صادر في'}</span>
        <span class="info-value">${docDate ? new Date(docDate).toLocaleDateString(locale) : 'N/A'}</span>
      </div>
      <div class="info-line">
        <span class="info-label">${isFrench ? 'À' : 'في'}</span>
        <span class="info-value">${docPlace}</span>
      </div>
    </div>

    <div class="intro-line">
      ${isFrench ? 'Au niveau de votre agence de location de voiture le' : 'لدى وكالة تأجير السيارات الخاصة بكم في'}
      <span class="highlight"> ${today}</span>
    </div>

    <div class="intro-line">
      ${isFrench ? 'Contrat N°' : 'العقد رقم'} <span class="highlight">${reservation.id?.substring(0, 8).toUpperCase() || 'N/A'}</span>
    </div>

    <div class="intro-line">${isFrench ? 'Comme caution pour location du véhicule' : 'كضمان لاستئجار المركبة'}</div>

    <!-- Vehicle -->
    <div class="vehicle-box">
      <div class="vehicle-header">🚗 ${isFrench ? 'Modèle Véhicule' : 'موديل المركبة'}</div>
      <div class="model-badge">${this.ltr((car.brand || '') + ' ' + (car.model || ''))}</div>
      <div class="info-line" style="margin-top:8px;">
        <span class="info-label">${isFrench ? 'Immatriculation' : 'رقم التسجيل'}</span>
        <span class="info-value">${this.ltr(car.registration || 'N/A')}</span>
      </div>
      <div class="info-line">
        <span class="info-label">${isFrench ? 'Période de Location' : 'فترة الإيجار'}</span>
        <span class="info-value">${isFrench ? 'Du' : 'من'} ${depDate} ${isFrench ? 'au' : 'إلى'} ${retDate}</span>
      </div>
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-space"></div>
        <div class="sig-label">${isFrench ? "Signature et cachet de l'Agence" : 'توقيع وختم الوكالة'}</div>
      </div>
      <div class="sig-block">
        <div class="sig-space"></div>
        <div class="sig-label">${isFrench ? 'Signature de client' : 'توقيع العميل'}</div>
      </div>
    </div>

  </div>
</body>
</html>`;
  }

  /**
   * Generate receipt email — same design as printed reçu (purple #7c3aed)
   */
  private static async generateRecuEmailHTML(reservation: ReservationDetails, templateLang: string = 'ar'): Promise<string> {
    const ag = await this.loadAgency();
    const isFrench = templateLang === 'fr';
    const textDir  = isFrench ? 'ltr' : 'rtl';
    const locale   = isFrench ? 'fr-FR' : 'ar-DZ';
    const today    = new Date().toLocaleDateString(locale);
    const client   = reservation.client;

    const totalAmount     = reservation.totalPrice || 0;
    const totalPaid       = reservation.payments?.reduce((s: number, p: any) => s + (p.amount || 0), 0) || reservation.advancePayment || 0;
    const currentPayment  = reservation.payments?.[0]?.amount || totalPaid;
    const remaining       = Math.max(0, totalAmount - totalPaid);

    return `<!DOCTYPE html>
<html dir="${textDir}" lang="${isFrench ? 'fr' : 'ar'}">
<head>
  <meta charset="UTF-8">
  <title>${isFrench ? 'Reçu de Versement' : 'إيصال الدفع'}</title>
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;background:white;direction:${textDir};font-size:13px;line-height:1.5; }
    .page { width:100%;max-width:210mm;padding:12mm;margin:0 auto; }
    .header { border-bottom:3px solid #7c3aed;padding-bottom:8px;margin-bottom:10px;display:flex;align-items:center;gap:10px; }
    .logo { width:40px;height:40px;object-fit:contain;flex-shrink:0; }
    .agency-name { font-size:20px;font-weight:700;color:#7c3aed;text-align:center;margin-bottom:2px; }
    .agency-contact { font-size:10px;color:#555;text-align:center; }
    .doc-title { font-size:16px;font-weight:700;color:#7c3aed;text-align:center;text-decoration:underline;margin-top:2px; }
    .info-boxes { display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px; }
    .ibox { padding:6px 8px;border-radius:4px;background:#f3e8ff;border-left:4px solid #7c3aed; }
    .ibox-label { font-weight:600;font-size:10px;color:#222;margin-bottom:2px; }
    .ibox-value { font-size:11px;font-weight:600;color:#333; }
    .section { padding:8px 10px;border-radius:5px;border:1px solid #e9d5ff;background:#faf5ff;margin-bottom:8px; }
    .sec-title { font-size:12px;font-weight:700;background:#f0f1f3;padding:4px 6px;border-radius:3px;margin-bottom:6px;border-left:4px solid #7c3aed;color:#7c3aed; }
    .detail-grid { display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px; }
    .detail-item { padding:8px;background:#f9f5ff;border-radius:3px; }
    .det-label { font-weight:600;color:#7c3aed;font-size:10px;text-transform:uppercase;margin-bottom:2px; }
    .det-value { color:#1a1a1a;font-size:13px; }
    .pay-box { display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0; }
    .pay-item { background:#f9f5ff;padding:10px;border-radius:4px;border-left:4px solid #7c3aed; }
    .pay-item.orange { background:#fff8f0;border-left-color:#f97316; }
    .pay-label { font-weight:600;font-size:10px;color:#7c3aed;text-transform:uppercase;margin-bottom:3px; }
    .pay-label.orange { color:#f97316; }
    .pay-value { font-size:16px;font-weight:700;color:#1a1a1a; }
    .pay-value.green { color:#10b981; }
    .pay-value.red   { color:#ef4444; }
    .pay-value.orange{ color:#f97316; }
    .amount-hero { background:linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%);color:white;padding:14px;border-radius:6px;text-align:center;margin:10px 0; }
    .amount-hero-label { font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;opacity:0.9;margin-bottom:4px; }
    .amount-hero-value { font-size:28px;font-weight:700; }
    .thanks { text-align:center;color:#7c3aed;font-size:14px;font-weight:600;margin:10px 0; }
    .signatures { display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px; }
    .sig-block { text-align:center; }
    .sig-line { border-top:1px solid #333;margin-bottom:4px;height:30px; }
    .sig-label { font-weight:600;font-size:12px;color:#7c3aed; }
    .sig-date  { font-size:10px;color:#666;margin-top:2px; }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="header">
      ${ag.logo ? `<img src="${ag.logo}" alt="Logo" class="logo">` : ''}
      <div style="flex:1;">
        <div class="agency-name">${ag.name}</div>
        <div class="agency-contact">${ag.address}${ag.phone ? ` &nbsp;|&nbsp; 📞 ${this.ltrPhone(ag.phone)}` : ''}</div>
        <div class="doc-title">${isFrench ? 'REÇU DE VERSEMENT' : 'إيصال الدفع'}</div>
      </div>
    </div>

    <!-- Info boxes -->
    <div class="info-boxes">
      <div class="ibox">
        <div class="ibox-label">🔢 ${isFrench ? 'N° Reçu' : 'رقم الإيصال'}</div>
        <div class="ibox-value">#${reservation.id?.substring(0, 8).toUpperCase() || 'N/A'}</div>
      </div>
      <div class="ibox">
        <div class="ibox-label">📅 ${isFrench ? 'Date' : 'التاريخ'}</div>
        <div class="ibox-value">${today}</div>
      </div>
      <div class="ibox">
        <div class="ibox-label">👤 ${isFrench ? 'Client' : 'العميل'}</div>
        <div class="ibox-value">${client.lastName || ''}</div>
      </div>
    </div>

    <!-- Client info -->
    <div class="section">
      <div class="sec-title">📋 ${isFrench ? 'Informations du Client' : 'معلومات العميل'}</div>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="det-label">${isFrench ? 'Client' : 'العميل'}</div>
          <div class="det-value">${client.firstName || ''} ${client.lastName || ''}</div>
        </div>
        <div class="detail-item">
          <div class="det-label">${isFrench ? 'N° Réservation' : 'رقم الحجز'}</div>
          <div class="det-value">#${reservation.id?.substring(0, 8) || 'N/A'}</div>
        </div>
        <div class="detail-item">
          <div class="det-label">📞 ${isFrench ? 'Téléphone' : 'الهاتف'}</div>
          <div class="det-value">${client.phone ? this.ltrPhone(client.phone) : 'N/A'}</div>
        </div>
        <div class="detail-item">
          <div class="det-label">🚗 ${isFrench ? 'Véhicule' : 'المركبة'}</div>
          <div class="det-value">${this.ltr((reservation.car?.brand || '') + ' ' + (reservation.car?.model || ''))}</div>
        </div>
      </div>
    </div>

    <!-- Payment details -->
    <div class="section">
      <div class="sec-title">💰 ${isFrench ? 'Détails de Paiement' : 'تفاصيل الدفع'}</div>
      <div class="pay-box">
        <div class="pay-item">
          <div class="pay-label">${isFrench ? 'Montant Total' : 'المبلغ الإجمالي'}</div>
          <div class="pay-value">${totalAmount.toLocaleString()} DA</div>
        </div>
        <div class="pay-item">
          <div class="pay-label">${isFrench ? 'Montant Payé' : 'المبلغ المدفوع'}</div>
          <div class="pay-value green">${totalPaid.toLocaleString()} DA</div>
        </div>
      </div>
      <div class="pay-box">
        <div class="pay-item">
          <div class="pay-label">${isFrench ? 'Montant Reçu' : 'المبلغ المستلم'}</div>
          <div class="pay-value">${currentPayment.toLocaleString()} DA</div>
        </div>
        <div class="pay-item orange">
          <div class="pay-label orange">${isFrench ? 'Solde Restant' : 'الرصيد المتبقي'}</div>
          <div class="pay-value ${remaining > 0 ? 'red' : 'green'}">${remaining.toLocaleString()} DA</div>
        </div>
      </div>
    </div>

    <!-- Hero amount -->
    <div class="amount-hero">
      <div class="amount-hero-label">${isFrench ? 'Montant Reçu' : 'المبلغ المستلم'}</div>
      <div class="amount-hero-value">${currentPayment.toLocaleString()} DA</div>
    </div>

    <div class="thanks">✓ ${isFrench ? 'Merci de votre paiement' : 'شكراً على دفعتك'}</div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">${isFrench ? 'Signature Client' : 'توقيع العميل'}</div>
        <div class="sig-date">${isFrench ? 'Date et signature' : 'التاريخ والتوقيع'}</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">${isFrench ? "Signature Agence" : 'توقيع الوكالة'}</div>
        <div class="sig-date">${isFrench ? 'Date et signature' : 'التاريخ والتوقيع'}</div>
      </div>
    </div>

  </div>
</body>
</html>`;
  }

  /**
   * Generate facture email — same design as printed facture (amber #d97706)
   */
  private static async generateFactureEmailHTML(reservation: ReservationDetails, templateLang: string = 'ar'): Promise<string> {
    const ag = await this.loadAgency();
    const isFrench = templateLang === 'fr';
    const locale   = isFrench ? 'fr-FR' : 'ar-DZ';
    const today    = new Date().toLocaleDateString(locale);
    const client   = reservation.client;
    const car      = reservation.car;
    const depDate  = reservation.step1?.departureDate || '';
    const retDate  = reservation.step1?.returnDate    || '';
    const days     = reservation.totalDays || 0;
    const pricePerDay = (car as any).priceDay || (car as any).price_per_day || 0;
    const subtotal = reservation.totalPrice || 0;
    const tva      = reservation.tvaApplied ? subtotal * 0.19 : 0;
    const timbre   = 200;
    const total    = subtotal + tva + timbre;

    return `<!DOCTYPE html>
<html dir="ltr" lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture</title>
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;background:white;font-size:12px;line-height:1.5; }
    .page { width:100%;max-width:210mm;padding:10mm;margin:0 auto; }
    .header { border-bottom:3px solid #d97706;padding-bottom:10px;margin-bottom:10px;display:flex;align-items:center;gap:14px; }
    .logo { width:50px;height:50px;object-fit:contain;flex-shrink:0;border-radius:4px; }
    .agency-name { font-size:20px;font-weight:700;color:#d97706;margin-bottom:2px; }
    .doc-title { font-size:15px;font-weight:700;color:#d97706;text-decoration:underline; }
    .invoice-meta { display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px; }
    .meta-box { padding:6px 10px;border-radius:4px;background:#fff8f0;border-left:3px solid #d97706;font-size:11px; }
    .meta-label { font-weight:600;color:#92400e;font-size:10px;text-transform:uppercase; }
    .meta-value { color:#1a1a1a;font-weight:600;margin-top:1px; }
    .agency-strip { width:100%;border:1.5px solid #d97706;border-radius:4px;padding:8px 12px;margin-bottom:10px;background:#fff8f0; }
    .strip-row { display:flex;gap:5px;margin:3px 0;font-size:11px; }
    .strip-label { font-weight:700;color:#d97706;min-width:150px; }
    .strip-value { color:#333; }
    .two-col { display:grid;grid-template-columns:1.1fr 1fr;gap:10px;margin-bottom:10px; }
    .info-section { border:1.5px solid #d97706;border-radius:5px;padding:10px 12px;background:#fffcf8; }
    .sec-title { font-weight:700;font-size:11px;color:#d97706;text-transform:uppercase;border-bottom:1px solid #fde68a;padding-bottom:5px;margin-bottom:7px; }
    .irow { display:flex;gap:6px;margin:4px 0;font-size:11px; }
    .ilabel { font-weight:600;color:#92400e;min-width:70px;flex-shrink:0; }
    .ivalue { color:#1a1a1a; }
    .items-table { width:100%;border-collapse:collapse;margin-bottom:10px;font-size:11px;border:1.5px solid #d97706; }
    .items-table th { background:#d97706;color:white;border:1px solid #d97706;padding:7px 6px;text-align:center;font-weight:700;font-size:10px;text-transform:uppercase; }
    .items-table td { border:1px solid #e5e5e5;padding:7px 6px;text-align:center;vertical-align:middle; }
    .items-table td.left { text-align:left;padding-left:10px; }
    .items-table tbody tr { background:#fffcf8; }
    .totals-wrap { display:flex;justify-content:flex-end;margin-bottom:10px; }
    .totals-table { width:250px;border-collapse:collapse;font-size:12px;border:1.5px solid #d97706; }
    .totals-table tr td { border:1px solid #e5e5e5;padding:7px 10px; }
    .totals-table tr td:first-child { font-weight:600;background:#fff8f0;color:#92400e;white-space:nowrap; }
    .totals-table tr td:last-child { text-align:right;font-weight:600; }
    .totals-table tr.grand td { background:#d97706;color:white;font-weight:700;font-size:13px;border-color:#d97706; }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="header">
      ${ag.logo ? `<img src="${ag.logo}" alt="Logo" class="logo">` : ''}
      <div style="flex:1;">
        <div class="agency-name">${ag.name}</div>
        <div class="doc-title">FACTURE</div>
      </div>
      <div style="text-align:right;font-size:11px;color:#92400e;">
        <div style="font-weight:700;">N° ${reservation.id?.substring(0, 8).toUpperCase() || '000'}</div>
        <div>${today}</div>
      </div>
    </div>

    <!-- Agency strip -->
    <div class="agency-strip">
      ${ag.name    ? `<div class="strip-row"><span class="strip-label">Nom de l'enseigne :</span><span class="strip-value">${ag.name}</span></div>` : ''}
      ${ag.address ? `<div class="strip-row"><span class="strip-label">Adresse :</span><span class="strip-value">${ag.address}</span></div>` : ''}
      ${ag.phone   ? `<div class="strip-row"><span class="strip-label">📞 Téléphone :</span><span class="strip-value">${ag.phone}${ag.phone2 ? ' / ' + ag.phone2 : ''}</span></div>` : ''}
      ${ag.bank    ? `<div class="strip-row"><span class="strip-label">🏦 Numéro de compte :</span><span class="strip-value">${ag.bank}</span></div>` : ''}
    </div>

    <!-- Agency + Client -->
    <div class="two-col">
      <div class="info-section">
        <div class="sec-title">🏢 Agence / Fournisseur</div>
        <div class="irow"><span class="ilabel">Agence :</span><span class="ivalue">${ag.name}</span></div>
        ${ag.address ? `<div class="irow"><span class="ilabel">Adresse :</span><span class="ivalue">${ag.address}</span></div>` : ''}
        ${ag.phone   ? `<div class="irow"><span class="ilabel">Tél :</span><span class="ivalue">${ag.phone}</span></div>` : ''}
      </div>
      <div class="info-section">
        <div class="sec-title">👤 Client</div>
        <div class="irow"><span class="ilabel">Nom :</span><span class="ivalue">${client.firstName || ''} ${client.lastName || ''}</span></div>
        ${client.completeAddress || client.wilaya ? `<div class="irow"><span class="ilabel">Adresse :</span><span class="ivalue">${client.completeAddress || client.wilaya}</span></div>` : ''}
        ${client.phone ? `<div class="irow"><span class="ilabel">Tél :</span><span class="ivalue">${client.phone}</span></div>` : ''}
        ${client.idCardNumber ? `<div class="irow"><span class="ilabel">N° CIN :</span><span class="ivalue">${client.idCardNumber}</span></div>` : ''}
      </div>
    </div>

    <!-- Invoice meta row -->
    <div class="invoice-meta">
      <div class="meta-box"><div class="meta-label">📅 Date</div><div class="meta-value">${today}</div></div>
      <div class="meta-box"><div class="meta-label">🔢 N° Facture</div><div class="meta-value">${reservation.id?.substring(0, 8).toUpperCase()}</div></div>
      <div class="meta-box"><div class="meta-label">🚗 Véhicule</div><div class="meta-value">${car.brand || ''} ${car.model || ''}</div></div>
    </div>

    <!-- Items table -->
    <table class="items-table">
      <thead>
        <tr>
          <th>Réf</th><th>Désignation</th><th>Immatriculé</th><th>Du</th><th>Au</th><th>Jours</th><th>Prix/J</th><th>HT</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${reservation.id?.substring(0, 3).toUpperCase() || '001'}</td>
          <td class="left">${car.brand || ''} ${car.model || ''}</td>
          <td>${car.registration || 'N/A'}</td>
          <td>${depDate}</td>
          <td>${retDate}</td>
          <td>${days}</td>
          <td>${pricePerDay.toLocaleString('fr-FR')} DA</td>
          <td>${subtotal.toLocaleString('fr-FR')} DA</td>
        </tr>
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-wrap">
      <table class="totals-table">
        <tr><td>TOTAL HT :</td><td>${subtotal.toLocaleString('fr-FR')} DA</td></tr>
        <tr><td>TVA (19%) :</td><td>${tva.toLocaleString('fr-FR')} DA</td></tr>
        <tr><td>TIMBRE :</td><td>${timbre.toLocaleString('fr-FR')} DA</td></tr>
        <tr class="grand"><td>TOTAL À PAYER :</td><td>${total.toLocaleString('fr-FR')} DA</td></tr>
      </table>
    </div>

  </div>
</body>
</html>`;
  }

  /**
   * Generate devis email — same design as printed devis (green #2d7a4d)
   */
  private static async generateDevisEmailHTML(reservation: ReservationDetails, templateLang: string = 'ar'): Promise<string> {
    const ag = await this.loadAgency();
    const isFrench = templateLang === 'fr';
    const textDir  = isFrench ? 'ltr' : 'rtl';
    const locale   = isFrench ? 'fr-FR' : 'ar-DZ';
    const today    = new Date().toLocaleDateString(locale);
    const client   = reservation.client;
    const car      = reservation.car;
    const depDate  = new Date(reservation.step1.departureDate).toLocaleDateString(locale);
    const retDate  = new Date(reservation.step1.returnDate).toLocaleDateString(locale);
    const days     = reservation.totalDays || 0;
    const subtotal = reservation.totalPrice || 0;
    const tva      = reservation.tvaApplied ? subtotal * 0.19 : 0;
    const total    = subtotal + tva;

    return `<!DOCTYPE html>
<html dir="${textDir}" lang="${isFrench ? 'fr' : 'ar'}">
<head>
  <meta charset="UTF-8">
  <title>${isFrench ? 'Devis' : 'عرض أسعار'}</title>
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;background:white;direction:${textDir};font-size:13px;line-height:1.5; }
    .page { width:100%;max-width:210mm;padding:12mm;margin:0 auto; }
    .header { border-bottom:3px solid #2d7a4d;padding-bottom:8px;margin-bottom:10px;display:flex;align-items:center;gap:10px; }
    .logo { width:40px;height:40px;object-fit:contain;flex-shrink:0; }
    .agency-name { font-size:20px;font-weight:700;color:#2d7a4d;text-align:center;margin-bottom:2px; }
    .agency-contact { font-size:10px;color:#555;text-align:center; }
    .doc-title { font-size:15px;font-weight:700;color:#2d7a4d;text-align:center;text-decoration:underline;margin-top:2px; }
    .info-boxes { display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px; }
    .ibox { padding:6px 8px;border-radius:4px;background:#dcfce7;border-left:4px solid #16a34a; }
    .ibox-label { font-weight:600;font-size:10px;color:#222;margin-bottom:2px; }
    .ibox-value { font-size:11px;font-weight:600;color:#333; }
    .section { padding:8px 10px;border-radius:5px;margin-bottom:8px; }
    .section.car-s  { background:#f0fdf4;border:1px solid #bbf7d0; }
    .section.rent-s { background:#f0fdf4;border:1px solid #bbf7d0; }
    .sec-title { font-size:12px;font-weight:700;background:#dcfce7;padding:5px 8px;border-radius:3px;margin-bottom:8px;border-left:4px solid #2d7a4d;color:#2d7a4d; }
    .two-col { display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px; }
    .field { padding:3px 0;border-bottom:0.5px solid #ddd; }
    .field-label { font-weight:600;color:#2d7a4d;font-size:11px; }
    .field-value { color:#1a1a1a;font-size:12px;margin-top:1px; }
    .grid-2 { display:grid;grid-template-columns:1fr 1fr;gap:6px 10px; }
    .rental-info { display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px; }
    .r-field { padding:8px;background:#f0fdf4;border-left:3px solid #2d7a4d;border-radius:3px; }
    .r-label { font-weight:600;color:#2d7a4d;font-size:11px;margin-bottom:2px; }
    .r-value { color:#1a1a1a;font-size:13px;font-weight:600; }
    .price-table { width:100%;border-collapse:collapse;margin-bottom:10px;font-size:12px;border:1px solid #2d7a4d; }
    .price-table th { background:#2d7a4d;color:white;border:1px solid #2d7a4d;padding:7px;text-align:${isFrench ? 'left' : 'right'}; }
    .price-table td { border:1px solid #ddd;padding:7px;background:#fafafa; }
    .totals-wrap { display:flex;justify-content:flex-end;margin-bottom:10px; }
    .totals-table { width:220px;border-collapse:collapse;font-size:12px;border:1px solid #2d7a4d; }
    .totals-table tr td { border:1px solid #ddd;padding:6px 10px; }
    .totals-table tr td:first-child { font-weight:600;color:#2d7a4d;background:#f0fdf4; }
    .totals-table tr td:last-child { text-align:right;font-weight:600; }
    .totals-table tr.grand td { background:#2d7a4d;color:white;font-weight:700;font-size:13px;border-color:#2d7a4d; }
    .validity { background:#dcfce7;border:1px solid #2d7a4d;border-radius:4px;padding:8px 12px;text-align:center;font-size:12px;font-weight:600;color:#2d7a4d;margin-bottom:10px; }
    .signatures { display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:14px; }
    .sig-block { text-align:center; }
    .sig-line { border-top:1px solid #333;margin-bottom:4px;height:30px; }
    .sig-label { font-weight:600;font-size:12px;color:#2d7a4d; }
    .sig-date  { font-size:10px;color:#666;margin-top:2px; }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="header">
      ${ag.logo ? `<img src="${ag.logo}" alt="Logo" class="logo">` : ''}
      <div style="flex:1;">
        <div class="agency-name">${ag.name}</div>
        <div class="agency-contact">${ag.address}${ag.phone ? ` &nbsp;|&nbsp; 📞 ${this.ltrPhone(ag.phone)}` : ''}${ag.phone2 ? ` &nbsp;|&nbsp; 📱 ${this.ltrPhone(ag.phone2)}` : ''}</div>
        <div class="doc-title">${isFrench ? 'DEVIS' : 'عرض أسعار'}</div>
      </div>
    </div>

    <!-- Info boxes -->
    <div class="info-boxes">
      <div class="ibox">
        <div class="ibox-label">📅 ${isFrench ? 'Date' : 'التاريخ'}</div>
        <div class="ibox-value">${today}</div>
      </div>
      <div class="ibox">
        <div class="ibox-label">🔢 ${isFrench ? 'N° Devis' : 'رقم عرض السعر'}</div>
        <div class="ibox-value">#${reservation.id?.substring(0, 8).toUpperCase() || 'N/A'}</div>
      </div>
      <div class="ibox">
        <div class="ibox-label">👤 ${isFrench ? 'Client' : 'العميل'}</div>
        <div class="ibox-value">${client.firstName || ''} ${client.lastName || ''}</div>
      </div>
    </div>

    <!-- Rental period -->
    <div class="section rent-s">
      <div class="sec-title">📅 ${isFrench ? 'Période de Location' : 'فترة الإيجار'}</div>
      <div class="rental-info">
        <div class="r-field">
          <div class="r-label">${isFrench ? 'Du' : 'من'}</div>
          <div class="r-value">${depDate}</div>
        </div>
        <div class="r-field">
          <div class="r-label">${isFrench ? 'Au' : 'إلى'}</div>
          <div class="r-value">${retDate}</div>
        </div>
        <div class="r-field">
          <div class="r-label">${isFrench ? 'Jours' : 'أيام'}</div>
          <div class="r-value">${days}</div>
        </div>
      </div>
    </div>

    <!-- Vehicle -->
    <div class="section car-s">
      <div class="sec-title">🚗 ${isFrench ? 'Véhicule' : 'المركبة'}</div>
      <div class="grid-2">
        <div class="field">
          <div class="field-label">${isFrench ? 'Marque / Modèle' : 'الماركة / الموديل'}</div>
          <div class="field-value">${this.ltr((car.brand || '') + ' ' + (car.model || ''))}</div>
        </div>
        <div class="field">
          <div class="field-label">${isFrench ? 'Immatriculation' : 'التسجيل'}</div>
          <div class="field-value">${this.ltr(car.registration || 'N/A')}</div>
        </div>
        <div class="field">
          <div class="field-label">${isFrench ? 'Couleur' : 'اللون'}</div>
          <div class="field-value">${car.color || 'N/A'}</div>
        </div>
        <div class="field">
          <div class="field-label">${isFrench ? 'Carburant' : 'الوقود'}</div>
          <div class="field-value">${car.energy || 'N/A'}</div>
        </div>
        <div class="field">
          <div class="field-label">VIN</div>
          <div class="field-value">${this.ltr(car.vin || 'N/A')}</div>
        </div>
        <div class="field">
          <div class="field-label">${isFrench ? 'Kilométrage' : 'الكيلومترات'}</div>
          <div class="field-value">${this.ltr((car.mileage || 0) + ' km')}</div>
        </div>
      </div>
    </div>

    <!-- Pricing table -->
    <table class="price-table">
      <thead>
        <tr>
          <th>${isFrench ? 'Description' : 'البيان'}</th>
          <th>${isFrench ? 'Jours' : 'الأيام'}</th>
          <th>${isFrench ? 'Prix/Jour' : 'السعر/اليوم'}</th>
          <th>${isFrench ? 'Montant HT' : 'المبلغ'}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${car.brand || ''} ${car.model || ''}</td>
          <td style="text-align:center;">${days}</td>
          <td style="text-align:right;">${((car as any).priceDay || 0).toLocaleString()} DA</td>
          <td style="text-align:right;">${subtotal.toLocaleString()} DA</td>
        </tr>
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-wrap">
      <table class="totals-table">
        <tr><td>${isFrench ? 'Montant HT' : 'المبلغ'} :</td><td>${subtotal.toLocaleString()} DA</td></tr>
        ${tva > 0 ? `<tr><td>TVA (19%) :</td><td>${tva.toLocaleString()} DA</td></tr>` : ''}
        <tr class="grand"><td>${isFrench ? 'Total TTC' : 'الإجمالي'} :</td><td>${total.toLocaleString()} DA</td></tr>
      </table>
    </div>

    <!-- Validity -->
    <div class="validity">⏰ ${isFrench ? 'Validité 30 jours' : 'صلاحية 30 يوم'} · ${today}</div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">${isFrench ? 'Signature Client' : 'توقيع العميل'}</div>
        <div class="sig-date">${isFrench ? 'Date et signature' : 'التاريخ والتوقيع'}</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">${isFrench ? "Signature Agence" : 'توقيع الوكالة'}</div>
        <div class="sig-date">${isFrench ? 'Date et signature' : 'التاريخ والتوقيع'}</div>
      </div>
    </div>

  </div>
</body>
</html>`;
  }

  /**
   * Generate contract email template — same professional design as the printed contract
   */
  private static async generateContractEmailHTMLForEmail(reservation: ReservationDetails, templateLang: string = 'ar'): Promise<string> {
    // Load agency settings for logo, name, contact info
    const { data: settingsData } = await supabase
      .from('website_settings')
      .select('logo, name, address, phone, phone_number_2, bank_number')
      .limit(1)
      .single();

    const agencyName    = settingsData?.name         || 'AUTO LOCATION';
    const logoUrl       = settingsData?.logo          || '';
    const agencyAddress = settingsData?.address       || '';
    const agencyPhone   = settingsData?.phone         || '';
    const agencyPhone2  = settingsData?.phone_number_2|| '';
    const agencyBank    = settingsData?.bank_number   || '';

    const isFrench = templateLang === 'fr';
    const textDir  = isFrench ? 'ltr' : 'rtl';
    const locale   = isFrench ? 'fr-FR' : 'ar-DZ';

    const client  = reservation.client;
    const car     = reservation.car;
    const depDate = new Date(reservation.step1.departureDate).toLocaleDateString(locale);
    const retDate = new Date(reservation.step1.returnDate).toLocaleDateString(locale);
    const today   = new Date().toLocaleDateString(locale);
    const totalDays = reservation.totalDays || Math.ceil(
      (new Date(reservation.step1.returnDate).getTime() - new Date(reservation.step1.departureDate).getTime())
      / (1000 * 60 * 60 * 24)
    );

    const labels = {
      contractTitle:       isFrench ? 'Contrat de Location' : 'عقد كراء السيارة',
      contractDate:        isFrench ? 'Date du Contrat'     : 'تاريخ العقد',
      contractNumber:      isFrench ? 'N° de Contrat'       : 'رقم العقد',
      clientLabel:         isFrench ? 'Client'              : 'العميل',
      driverInfo:          isFrench ? 'Conducteur Principal': 'السائق الرئيسي',
      fullName:            isFrench ? 'Nom Complet'         : 'الاسم الكامل',
      phone:               isFrench ? 'Téléphone'           : 'الهاتف',
      licenseNumber:       isFrench ? 'Numéro de Permis'    : 'رقم الرخصة',
      licenseDelivery:     isFrench ? 'Délivrance Permis'   : 'تاريخ إصدار الرخصة',
      licenseExpiry:       isFrench ? 'Expiration Permis'   : 'تاريخ انتهاء الرخصة',
      licensePlace:        isFrench ? 'Lieu Délivrance'     : 'مكان الإصدار',
      birthDate:           isFrench ? 'Date de Naissance'   : 'تاريخ الميلاد',
      birthPlace:          isFrench ? 'Lieu de Naissance'   : 'مكان الميلاد',
      vehicleInfo:         isFrench ? 'Informations du Véhicule': 'معلومات المركبة',
      model:               isFrench ? 'Modèle'              : 'الموديل',
      registration:        isFrench ? 'Immatriculation'     : 'التسجيل',
      color:               isFrench ? 'Couleur'             : 'اللون',
      fuel:                isFrench ? 'Carburant'           : 'الوقود',
      vin:                 isFrench ? 'VIN'                 : 'رقم المحرك',
      rentalPeriod:        isFrench ? 'Période de Location' : 'فترة الإيجار',
      departure:           isFrench ? 'Départ'              : 'المغادرة',
      returnLabel:         isFrench ? 'Retour'              : 'العودة',
      duration:            isFrench ? 'Durée'               : 'المدة',
      days:                isFrench ? 'jours'               : 'أيام',
      pricing:             isFrench ? 'Tarification'        : 'التسعير',
      pricePerDay:         isFrench ? 'Prix par Jour'       : 'السعر في اليوم',
      numberOfDays:        isFrench ? 'Nombre de Jours'     : 'عدد الأيام',
      total:               isFrench ? 'TOTAL'               : 'الإجمالي',
      conditions:          isFrench ? 'Conditions Acceptées': 'الشروط المقبولة',
      clientSignature:     isFrench ? 'Signature du Client' : 'توقيع العميل',
      agencySignature:     isFrench ? "Signature de l'Agence": 'توقيع الوكالة',
      dateAndSignature:    isFrench ? 'Date et signature'   : 'التاريخ والتوقيع',
    };

    const conditionsList = isFrench
      ? ['Permis de conduire valide', 'Assurance tous risques', 'Caution dépôt', 'Carburant plein', 'État du véhicule accepté', 'Pas de dégâts supplémentaires']
      : ['رخصة قيادة سارية', 'تأمين شامل', 'ضمان الإيداع', 'خزان ممتلئ', 'حالة المركبة مقبولة', 'لا توجد أضرار إضافية'];

    const formatDate = (d: string) => {
      try { return new Date(d).toLocaleDateString(locale); }
      catch { return ''; }
    };

    return `<!DOCTYPE html>
<html dir="${textDir}" lang="${isFrench ? 'fr' : 'ar'}">
<head>
  <meta charset="UTF-8">
  <title>${labels.contractTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.5;
      color: #222;
      background: white;
      direction: ${textDir};
      font-size: 14px;
    }
    .page {
      width: 100%;
      max-width: 210mm;
      padding: 12mm;
      margin: 0 auto;
      background: white;
    }
    /* Header */
    .header {
      border-bottom: 3px solid #1a3a8a;
      padding-bottom: 8px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo { width: 40px; height: 40px; object-fit: contain; flex-shrink: 0; }
    .header-text { flex: 1; }
    .agency-name { font-size: 20px; font-weight: bold; color: #1a3a8a; text-align: center; margin-bottom: 2px; }
    .agency-contact { font-size: 10px; color: #555; text-align: center; line-height: 1.4; }
    .contract-title { font-size: 13px; color: #555; text-align: center; margin-top: 2px; }
    /* Info boxes row */
    .header-info {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
      margin-bottom: 10px;
    }
    .info-box { padding: 6px 8px; border-radius: 4px; font-size: 11px; line-height: 1.3; }
    .info-box.blue   { background: #dbeafe; border-left: 4px solid #2563eb; }
    .info-box.green  { background: #dcfce7; border-left: 4px solid #16a34a; }
    .info-box.amber  { background: #fef3c7; border-left: 4px solid #d97706; }
    .info-label { font-weight: 600; color: #222; margin-bottom: 2px; font-size: 10px; }
    .info-value { color: #333; font-size: 11px; }
    /* Sections */
    .section {
      margin-bottom: 8px;
      padding: 8px 10px;
      border-radius: 5px;
      border: 1px solid #e5e7eb;
    }
    .section.driver-section   { background: #f0f9ff; border-color: #bfdbfe; }
    .section.vehicle-section  { background: #f0fdf4; border-color: #bbf7d0; }
    .section.pricing-section  { background: #fffbeb; border-color: #fde68a; }
    .section.conditions-section{ background: #faf5ff; border-color: #e9d5ff; }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      background: #f0f1f3;
      padding: 4px 6px;
      border-radius: 3px;
      margin-bottom: 6px;
      border-left: 4px solid #2563eb;
      color: #1a3a8a;
    }
    .section-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 8px;
      font-size: 12px;
    }
    .field { padding: 2px 0; border-bottom: 0.5px solid #ddd; }
    .field-label { font-weight: 600; color: #1a3a8a; font-size: 11px; }
    .field-value { color: #444; font-size: 12px; margin-top: 1px; }
    /* Two-column layout */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    /* Pricing rows */
    .pricing-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 0.5px solid #ddd; font-size: 13px; }
    .pricing-row.grand-total { font-size: 14px; font-weight: 700; color: #1a3a8a; border-top: 2px solid #1a3a8a; border-bottom: none; padding-top: 4px; margin-top: 2px; }
    /* Conditions grid */
    .conditions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px; }
    .condition-item { display: flex; align-items: center; gap: 4px; }
    .checkbox { width: 12px; height: 12px; border: 1px solid #999; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; flex-shrink: 0; }
    /* Special conditions */
    .special-conditions {
      background: #fef2f2; padding: 8px; border: 1px solid #fecaca; border-radius: 4px;
      margin-bottom: 8px; font-size: 11px; line-height: 1.5;
    }
    .special-title { color: #dc2626; font-weight: 600; margin-bottom: 4px; }
    .special-item  { color: #dc2626; margin: 2px 0; }
    /* Signatures */
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 14px; }
    .signature-block { text-align: center; }
    .signature-line { border-top: 1px solid #333; margin-bottom: 4px; height: 30px; }
    .signature-label { font-weight: 600; font-size: 12px; color: #1a3a8a; }
    .date-sig { font-size: 10px; color: #666; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo">` : ''}
      <div class="header-text">
        <div class="agency-name">${agencyName}</div>
        <div class="agency-contact">
          ${agencyAddress ? `<span>${agencyAddress}</span>` : ''}
          ${agencyPhone   ? ` &nbsp;|&nbsp; 📞 ${this.ltrPhone(agencyPhone)}` : ''}
          ${agencyPhone2  ? ` &nbsp;|&nbsp; 📱 ${this.ltrPhone(agencyPhone2)}` : ''}
          ${agencyBank    ? ` &nbsp;|&nbsp; 🏦 ${agencyBank}` : ''}
        </div>
        <div class="contract-title">${labels.contractTitle}</div>
      </div>
    </div>

    <!-- Info boxes -->
    <div class="header-info">
      <div class="info-box blue">
        <div class="info-label">📅 ${labels.contractDate}</div>
        <div class="info-value">${today}</div>
      </div>
      <div class="info-box green">
        <div class="info-label">🔢 ${labels.contractNumber}</div>
        <div class="info-value">#${reservation.id?.substring(0, 8).toUpperCase() || 'N/A'}</div>
      </div>
      <div class="info-box amber">
        <div class="info-label">👤 ${labels.clientLabel}</div>
        <div class="info-value">${client.lastName || ''}</div>
      </div>
    </div>

    <!-- Rental Period -->
    <div class="section">
      <div class="section-title">📅 ${labels.rentalPeriod}</div>
      <div class="section-content" style="grid-template-columns: 1fr 1fr 1fr;">
        <div class="field">
          <div class="field-label">${labels.departure}</div>
          <div class="field-value">${depDate}</div>
        </div>
        <div class="field">
          <div class="field-label">${labels.returnLabel}</div>
          <div class="field-value">${retDate}</div>
        </div>
        <div class="field">
          <div class="field-label">${labels.duration}</div>
          <div class="field-value">${totalDays} ${labels.days}</div>
        </div>
      </div>
    </div>

    <!-- Driver + Vehicle (2 columns) -->
    <div class="two-col">
      <!-- Driver -->
      <div class="section driver-section">
        <div class="section-title">👤 ${labels.driverInfo}</div>
        <div class="section-content">
          <div class="field">
            <div class="field-label">${labels.fullName}</div>
            <div class="field-value">${client.firstName || ''} ${client.lastName || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.phone}</div>
            <div class="field-value">${client.phone ? this.ltrPhone(client.phone) : 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.licenseNumber}</div>
            <div class="field-value">${client.licenseNumber || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.licenseDelivery}</div>
            <div class="field-value">${client.licenseDeliveryDate ? formatDate(client.licenseDeliveryDate) : 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.licenseExpiry}</div>
            <div class="field-value">${client.licenseExpirationDate ? formatDate(client.licenseExpirationDate) : 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.licensePlace}</div>
            <div class="field-value">${client.licenseDeliveryPlace || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.birthDate}</div>
            <div class="field-value">${client.dateOfBirth ? formatDate(client.dateOfBirth) : 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.birthPlace}</div>
            <div class="field-value">${client.placeOfBirth || 'N/A'}</div>
          </div>
        </div>
      </div>

      <!-- Vehicle -->
      <div class="section vehicle-section">
        <div class="section-title">🚗 ${labels.vehicleInfo}</div>
        <div class="section-content">
          <div class="field">
            <div class="field-label">${labels.model}</div>
            <div class="field-value">${this.ltr((car.brand || '') + ' ' + (car.model || ''))}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.registration}</div>
            <div class="field-value">${this.ltr(car.registration || 'N/A')}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.color}</div>
            <div class="field-value">${car.color || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.fuel}</div>
            <div class="field-value">${car.energy || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.vin}</div>
            <div class="field-value">${this.ltr(car.vin || 'N/A')}</div>
          </div>
          <div class="field">
            <div class="field-label">📏 km</div>
            <div class="field-value">${this.ltr((reservation.departureInspection?.mileage || reservation.car?.mileage || 'N/A') + ' km')}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pricing + Conditions (2 columns) -->
    <div class="two-col">
      <!-- Pricing -->
      <div class="section pricing-section">
        <div class="section-title">💰 ${labels.pricing}</div>
        <div class="pricing-row">
          <span>${labels.pricePerDay}:</span>
          <span>${(car.priceDay || 0).toLocaleString()} DA</span>
        </div>
        <div class="pricing-row">
          <span>${labels.numberOfDays}:</span>
          <span>${totalDays}</span>
        </div>
        <div class="pricing-row grand-total">
          <span>${labels.total}:</span>
          <span>${(reservation.totalPrice || 0).toLocaleString()} DA</span>
        </div>
      </div>

      <!-- Conditions -->
      <div class="section conditions-section">
        <div class="section-title">✓ ${labels.conditions}</div>
        <div class="conditions-grid">
          ${conditionsList.map(c => `
            <div class="condition-item">
              <div class="checkbox">✓</div>
              <span>${c}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Special Conditions -->
    <div class="special-conditions">
      <div class="special-title">${isFrench ? 'CONDITIONS SPÉCIALES' : 'الشروط الخاصة'}</div>
      ${isFrench ? `
        <div class="special-item">1- Tout renouvellement doit être confirmé par le client 48 heures avant la date d'expiration du contrat</div>
        <div class="special-item">2- Interdiction de conduire le véhicule avec le carburant de réserve</div>
        <div class="special-item">3- La non-restitution du véhicule à la date convenue entraîne une facturation complète du tarif quotidien</div>
      ` : `
        <div class="special-item">1- كل تمديد يجب على الزبون إخطار الوكالة قبل 48 ساعة من تاريخ انتهاء العقد</div>
        <div class="special-item">2- عدم قيادة السيارة بوقود احتياطي (réserve)</div>
        <div class="special-item">3- عدم تسليم السيارة في التاريخ المحدد ينتج عنه مبلغ اليومي كاملاً</div>
      `}
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">${labels.clientSignature}</div>
        <div class="date-sig">${labels.dateAndSignature}</div>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">${labels.agencySignature}</div>
        <div class="date-sig">${labels.dateAndSignature}</div>
      </div>
    </div>

  </div>
</body>
</html>`;
  }

  /**
   * Generate reservation booking voucher — same professional design / colours / organisation
   * as the printed contract (blue #1a3a8a), but limited to the client, the vehicle and the
   * date & time of the reservation, plus the agency information and logo.
   */
  private static async generateReservationEmailHTML(reservation: ReservationDetails, templateLang: string = 'ar'): Promise<string> {
    // Load agency settings for logo, name, contact info
    const { data: settingsData } = await supabase
      .from('website_settings')
      .select('logo, name, address, phone, phone_number_2, bank_number')
      .limit(1)
      .single();

    const agencyName    = settingsData?.name          || 'AUTO LOCATION';
    const logoUrl       = settingsData?.logo           || '';
    const agencyAddress = settingsData?.address        || '';
    const agencyPhone   = settingsData?.phone          || '';
    const agencyPhone2  = settingsData?.phone_number_2 || '';

    const isFrench = templateLang === 'fr';
    const textDir  = isFrench ? 'ltr' : 'rtl';
    const locale   = isFrench ? 'fr-FR' : 'ar-DZ';

    const client  = reservation.client;
    const car     = reservation.car;
    const today   = new Date().toLocaleDateString(locale);
    const depDate = new Date(reservation.step1.departureDate).toLocaleDateString(locale);
    const retDate = new Date(reservation.step1.returnDate).toLocaleDateString(locale);
    const depTime = reservation.step1.departureTime || '--:--';
    const retTime = reservation.step1.returnTime || '--:--';
    const totalDays = reservation.totalDays || Math.ceil(
      (new Date(reservation.step1.returnDate).getTime() - new Date(reservation.step1.departureDate).getTime())
      / (1000 * 60 * 60 * 24)
    );

    const labels = {
      title:            isFrench ? 'Bon de Réservation'   : 'سند الحجز',
      date:             isFrench ? 'Date'                 : 'التاريخ',
      reservationNo:    isFrench ? 'N° de Réservation'    : 'رقم الحجز',
      clientLabel:      isFrench ? 'Client'               : 'العميل',
      clientInfo:       isFrench ? 'Informations Client'  : 'معلومات العميل',
      fullName:         isFrench ? 'Nom Complet'          : 'الاسم الكامل',
      phone:            isFrench ? 'Téléphone'            : 'الهاتف',
      emailLabel:       isFrench ? 'Email'                : 'البريد الإلكتروني',
      address:          isFrench ? 'Adresse'              : 'العنوان',
      vehicleInfo:      isFrench ? 'Informations du Véhicule' : 'معلومات المركبة',
      model:            isFrench ? 'Modèle'               : 'الموديل',
      registration:     isFrench ? 'Immatriculation'      : 'التسجيل',
      color:            isFrench ? 'Couleur'              : 'اللون',
      fuel:             isFrench ? 'Carburant'            : 'الوقود',
      reservationDetails: isFrench ? 'Date & Heure de la Réservation' : 'تاريخ وساعة الحجز',
      departure:        isFrench ? 'Départ'               : 'المغادرة',
      returnLabel:      isFrench ? 'Retour'               : 'العودة',
      departureTime:    isFrench ? 'Heure de Départ'      : 'ساعة المغادرة',
      returnTime:       isFrench ? 'Heure de Retour'      : 'ساعة العودة',
      duration:         isFrench ? 'Durée'                : 'المدة',
      days:             isFrench ? 'jours'                : 'أيام',
      clientSignature:  isFrench ? 'Signature du Client'  : 'توقيع العميل',
      agencySignature:  isFrench ? "Signature de l'Agence": 'توقيع الوكالة',
      dateAndSignature: isFrench ? 'Date et signature'    : 'التاريخ والتوقيع',
    };

    return `<!DOCTYPE html>
<html dir="${textDir}" lang="${isFrench ? 'fr' : 'ar'}">
<head>
  <meta charset="UTF-8">
  <title>${labels.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.5;
      color: #222;
      background: white;
      direction: ${textDir};
      font-size: 14px;
    }
    .page { width: 100%; max-width: 210mm; padding: 12mm; margin: 0 auto; background: white; }
    /* Header */
    .header { border-bottom: 3px solid #1a3a8a; padding-bottom: 8px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
    .logo { width: 40px; height: 40px; object-fit: contain; flex-shrink: 0; }
    .header-text { flex: 1; }
    .agency-name { font-size: 20px; font-weight: bold; color: #1a3a8a; text-align: center; margin-bottom: 2px; }
    .agency-contact { font-size: 10px; color: #555; text-align: center; line-height: 1.4; }
    .doc-title { font-size: 13px; color: #555; text-align: center; margin-top: 2px; }
    /* Info boxes row */
    .header-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 10px; }
    .info-box { padding: 6px 8px; border-radius: 4px; font-size: 11px; line-height: 1.3; }
    .info-box.blue   { background: #dbeafe; border-left: 4px solid #2563eb; }
    .info-box.green  { background: #dcfce7; border-left: 4px solid #16a34a; }
    .info-box.amber  { background: #fef3c7; border-left: 4px solid #d97706; }
    .info-label { font-weight: 600; color: #222; margin-bottom: 2px; font-size: 10px; }
    .info-value { color: #333; font-size: 11px; }
    /* Sections */
    .section { margin-bottom: 8px; padding: 8px 10px; border-radius: 5px; border: 1px solid #e5e7eb; }
    .section.client-section   { background: #f0f9ff; border-color: #bfdbfe; }
    .section.vehicle-section  { background: #f0fdf4; border-color: #bbf7d0; }
    .section.period-section   { background: #fffbeb; border-color: #fde68a; }
    .section-title { font-size: 12px; font-weight: 700; background: #f0f1f3; padding: 4px 6px; border-radius: 3px; margin-bottom: 6px; border-left: 4px solid #2563eb; color: #1a3a8a; }
    .section-content { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 8px; font-size: 12px; }
    .field { padding: 2px 0; border-bottom: 0.5px solid #ddd; }
    .field-label { font-weight: 600; color: #1a3a8a; font-size: 11px; }
    .field-value { color: #444; font-size: 12px; margin-top: 1px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    /* Signatures */
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 14px; }
    .signature-block { text-align: center; }
    .signature-line { border-top: 1px solid #333; margin-bottom: 4px; height: 30px; }
    .signature-label { font-weight: 600; font-size: 12px; color: #1a3a8a; }
    .date-sig { font-size: 10px; color: #666; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo">` : ''}
      <div class="header-text">
        <div class="agency-name">${agencyName}</div>
        <div class="agency-contact">
          ${agencyAddress ? `<span>${agencyAddress}</span>` : ''}
          ${agencyPhone   ? ` &nbsp;|&nbsp; 📞 ${this.ltrPhone(agencyPhone)}` : ''}
          ${agencyPhone2  ? ` &nbsp;|&nbsp; 📱 ${this.ltrPhone(agencyPhone2)}` : ''}
        </div>
        <div class="doc-title">${labels.title}</div>
      </div>
    </div>

    <!-- Info boxes -->
    <div class="header-info">
      <div class="info-box blue">
        <div class="info-label">📅 ${labels.date}</div>
        <div class="info-value">${today}</div>
      </div>
      <div class="info-box green">
        <div class="info-label">🔢 ${labels.reservationNo}</div>
        <div class="info-value">#${reservation.id?.substring(0, 8).toUpperCase() || 'N/A'}</div>
      </div>
      <div class="info-box amber">
        <div class="info-label">👤 ${labels.clientLabel}</div>
        <div class="info-value">${client.lastName || ''}</div>
      </div>
    </div>

    <!-- Reservation date & time -->
    <div class="section period-section">
      <div class="section-title">🕒 ${labels.reservationDetails}</div>
      <div class="section-content" style="grid-template-columns: 1fr 1fr 1fr;">
        <div class="field">
          <div class="field-label">${labels.departure}</div>
          <div class="field-value">${depDate}</div>
        </div>
        <div class="field">
          <div class="field-label">⏰ ${labels.departureTime}</div>
          <div class="field-value">${this.ltrPhone(depTime)}</div>
        </div>
        <div class="field">
          <div class="field-label">${labels.duration}</div>
          <div class="field-value">${totalDays} ${labels.days}</div>
        </div>
        <div class="field">
          <div class="field-label">${labels.returnLabel}</div>
          <div class="field-value">${retDate}</div>
        </div>
        <div class="field">
          <div class="field-label">⏰ ${labels.returnTime}</div>
          <div class="field-value">${this.ltrPhone(retTime)}</div>
        </div>
      </div>
    </div>

    <!-- Client + Vehicle (2 columns) -->
    <div class="two-col">
      <!-- Client -->
      <div class="section client-section">
        <div class="section-title">👤 ${labels.clientInfo}</div>
        <div class="section-content">
          <div class="field">
            <div class="field-label">${labels.fullName}</div>
            <div class="field-value">${client.firstName || ''} ${client.lastName || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.phone}</div>
            <div class="field-value">${client.phone ? this.ltrPhone(client.phone) : 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.emailLabel}</div>
            <div class="field-value">${client.email || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.address}</div>
            <div class="field-value">${client.completeAddress || client.wilaya || 'N/A'}</div>
          </div>
        </div>
      </div>

      <!-- Vehicle -->
      <div class="section vehicle-section">
        <div class="section-title">🚗 ${labels.vehicleInfo}</div>
        <div class="section-content">
          <div class="field">
            <div class="field-label">${labels.model}</div>
            <div class="field-value">${this.ltr((car.brand || '') + ' ' + (car.model || ''))}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.registration}</div>
            <div class="field-value">${this.ltr(car.registration || 'N/A')}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.color}</div>
            <div class="field-value">${car.color || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">${labels.fuel}</div>
            <div class="field-value">${car.energy || 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">${labels.clientSignature}</div>
        <div class="date-sig">${labels.dateAndSignature}</div>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">${labels.agencySignature}</div>
        <div class="date-sig">${labels.dateAndSignature}</div>
      </div>
    </div>

  </div>
</body>
</html>`;
  }
}
