import { ReservationDetails } from '../types';

/**
 * Force a phone number to render strictly left-to-right, even inside an RTL (Arabic)
 * document, so it prints in the same order as the French layout.
 */
const ltrPhone = (value: any): string =>
  `<span dir="ltr" style="unicode-bidi:bidi-override;direction:ltr;display:inline-block">${value ?? ''}</span>`;

/**
 * Force any latin/number value (car immatriculation, VIN, model, mileage, ...) to render
 * strictly left-to-right so it keeps the same order as French even inside an RTL (Arabic)
 * document. Without this, plate numbers like "01234-116-16" print inverted ("16-116-01234").
 */
const ltr = ltrPhone;

export const generateContractHTML = (
  reservation: ReservationDetails | null,
  agencySettings: any,
  secondConductor: any,
  templateLang: 'fr' | 'ar'
): string => {
  const isFrench = templateLang === 'fr';
  const textDir = isFrench ? 'ltr' : 'rtl';
  
  const labels = {
    contractTitle: isFrench ? 'Contrat de Location de Véhicule' : 'عقد كراء السيارة',
    contractDate: isFrench ? 'Date du Contrat' : 'تاريخ العقد',
    contractNumber: isFrench ? 'N° de Contrat' : 'رقم العقد',
    client: isFrench ? 'Client' : 'العميل',
    rentalPeriod: isFrench ? 'Période de Location' : 'فترة الإيجار',
    departure: isFrench ? 'Départ' : 'المغادرة',
    return: isFrench ? 'Retour' : 'العودة',
    duration: isFrench ? 'Durée' : 'المدة',
    days: isFrench ? 'jours' : 'أيام',
    driverInfo: isFrench ? 'Information Conducteur Principal' : 'معلومات السائق الأساسي',
    secondDriver: isFrench ? 'Information Conducteur Secondaire' : 'معلومات السائق الثاني',
    lastName: isFrench ? 'Nom de Famille' : 'الاسم الأخير',
    firstName: isFrench ? 'Prénom' : 'الاسم الأول',
    phone: isFrench ? 'Téléphone' : 'الهاتف',
    birthDate: isFrench ? 'Date Naissance' : 'تاريخ الميلاد',
    birthPlace: isFrench ? 'Lieu Naissance' : 'مكان الميلاد',
    documents: isFrench ? 'Documents Officiels' : 'وثائق رسمية',
    licenseNumber: isFrench ? 'N° Permis' : 'رقم الرخصة',
    licenseDelivery: isFrench ? 'Délivrance Permis' : 'تاريخ إصدار الرخصة',
    licenseExpiry: isFrench ? 'Expiration Permis' : 'تاريخ انتهاء الرخصة',
    licensePlace: isFrench ? 'Lieu Délivrance Permis' : 'مكان إصدار الرخصة',
    vehicleInfo: isFrench ? 'Informations Véhicule' : 'معلومات السيارة',
    model: isFrench ? 'Modèle' : 'الموديل',
    registration: isFrench ? 'Immatriculation' : 'لوحة الترخيص',
    color: isFrench ? 'Couleur' : 'اللون',
    vin: isFrench ? 'VIN' : 'رقم الهيكل',
    fuelStart: isFrench ? 'Carburant Départ' : 'الوقود عند المغادرة',
    mileageStart: isFrench ? 'Kilométrage Départ' : 'عداد المسافات عند المغادرة',
    pricing: isFrench ? 'Tarification' : 'التسعير',
    pricePerDay: isFrench ? 'Prix par Jour' : 'السعر في اليوم',
    numberOfDays: isFrench ? 'Nombre de Jours' : 'عدد الأيام',
    totalHT: isFrench ? 'Montant HT' : 'المبلغ غير ضريبي',
    tva: isFrench ? 'TVA 19%' : 'الضريبة 19%',
    totalTTC: isFrench ? 'TOTAL TTC' : 'الإجمالي',
    conditions: isFrench ? 'Conditions Acceptées' : 'الشروط المقبولة',
    signatures: isFrench ? 'Signatures' : 'التوقيعات',
    clientSignature: isFrench ? 'Signature du Client' : 'توقيع العميل',
    agencySignature: isFrench ? "Signature de l'Agence" : 'توقيع الوكالة',
    dateAndSignature: isFrench ? 'Date et signature' : 'التاريخ والتوقيع',
    terms: isFrench ? 'Conditions et Remarques' : 'الشروط والملاحظات',
  };

  const termsList = isFrench 
    ? [
        '1- Toute extension doit être confirmée au minimum 48 heures avant l\'expiration du contrat de location, incluant le kilométrage et le carburant à la retour.',
        '2- Ne pas conduire le véhicule avec un carburant de réserve (réserve).',
        '3- Le renouvellement du contrat de location commence à partir de la date d\'expiration du contrat et est la responsabilité du client.',
        '4- Le non-respect du contrat de location expose le client à une pénalité du montant journalier complet.'
      ]
    : [
        '1- كل تمديد يجب على الزبون اطمئنان قبل 48 ساعة من تاريخ انتهاء صلاحيات عقد الكراء كيلومترات وقود العودة',
        '2- عدم قيادة السيارة بوقود احتياطي (réserve)',
        '3- تجديد عقد الكراء يكون من تاريخ انتهاء العقد من مسؤولية الزبون',
        '4- عدم احترام عقد الكراء على الزبون يعرضه لغرامة المبلغ اليومي كاملا'
      ];

  const html = `
    <!DOCTYPE html>
    <html dir="${textDir}" lang="${isFrench ? 'fr' : 'ar'}">
    <head>
      <meta charset="UTF-8">
      <title>${labels.contractTitle}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          width: 794px;
          height: 1123px;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.3;
          color: #222;
          background: white;
          direction: ${textDir};
          font-size: 13px;
        }
        .page-container {
          width: 100%;
          height: 100%;
          padding: 12px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        /* HEADER WITH AGENCY INFO */
        .header {
          background: linear-gradient(135deg, #003399 0%, #0047b2 100%);
          color: white;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 10px;
        }
        .header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .header-logo {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          object-fit: cover;
          background: white;
          padding: 2px;
          flex-shrink: 0;
        }
        .agency-name {
          font-size: 12px;
          font-weight: bold;
        }
        .agency-contact {
          font-size: 11px;
          line-height: 1.5;
          font-weight: bold;
          text-align: ${textDir === 'ltr' ? 'right' : 'left'};
        }
        .agency-contact-item {
          margin: 2px 0;
        }
        .contract-title {
          font-size: 14px;
          font-weight: bold;
          margin-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.5);
          padding-top: 4px;
          text-align: center;
        }
        
        /* CARD STYLES */
        .card {
          border: 1px solid #0047b2;
          border-radius: 4px;
          background: #f8faff;
          padding: 8px;
          margin-bottom: 8px;
          page-break-inside: avoid;
        }
        .card-title {
          background: #dbeafe;
          border-bottom: 2px solid #0047b2;
          color: #003399;
          font-weight: bold;
          font-size: 12px;
          padding: 4px 6px;
          margin: -8px -8px 6px -8px;
          border-radius: 3px 3px 0 0;
        }
        
        /* FIELD STYLES */
        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 6px;
        }
        .field-row.full {
          grid-template-columns: 1fr;
        }
        .field-row.three-col {
          grid-template-columns: 1fr 1fr 1fr;
        }
        .field {
          display: flex;
          flex-direction: column;
        }
        .field-label {
          font-weight: 600;
          color: #003399;
          font-size: 11px;
          margin-bottom: 2px;
        }
        .field-value {
          border-bottom: 1px solid #ddd;
          padding-bottom: 3px;
          min-height: 18px;
          font-size: 12px;
          color: #333;
        }
        
        /* TWO COLUMN LAYOUT */
        .two-column {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        /* PRICING TABLE */
        .pricing {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 12px;
        }
        .pricing-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 10px;
          padding: 3px 0;
          border-bottom: 1px solid #ddd;
        }
        .pricing-row.total {
          font-weight: bold;
          border-top: 1px solid #333;
          border-bottom: 1px solid #333;
          background: #f0f0f0;
        }
        .pricing-row.grand-total {
          font-weight: bold;
          font-size: 13px;
          background: #dbeafe;
          border-top: 2px solid #003399;
          border-bottom: 2px solid #003399;
          color: #003399;
        }
        .pricing-label {
          text-align: ${isFrench ? 'left' : 'right'};
        }
        .pricing-value {
          text-align: ${isFrench ? 'right' : 'left'};
          font-weight: bold;
        }
        
        /* TERMS */
        .terms-section {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 4px;
          padding: 6px;
          margin-bottom: 8px;
          font-size: 10px;
          line-height: 1.4;
          color: #d63031;
        }
        .term-item {
          margin: 2px 0;
          text-align: justify;
        }
        
        /* SIGNATURES */
        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 8px;
        }
        .signature-block {
          text-align: center;
          font-size: 11px;
        }
        .signature-line {
          border-top: 1px solid #333;
          margin-bottom: 3px;
          height: 30px;
        }
        .signature-label {
          font-weight: bold;
          margin: 2px 0;
        }
        
        @media print {
          html, body {
            width: 794px;
            height: 1123px;
            margin: 0;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        
        <!-- HEADER -->
        <div class="header">
          <div class="header-top">
            <div class="header-brand">
              ${agencySettings?.logo ? `<img src="${agencySettings.logo}" alt="Logo" class="header-logo">` : '<div style="font-size: 40px;">🏢</div>'}
              <div class="agency-name">${(agencySettings?.name || 'AGENCY').split(' ').slice(0, 3).join(' ')}</div>
            </div>
            <div class="agency-contact">
              ${agencySettings?.address ? `<div class="agency-contact-item"><strong>${isFrench ? 'Adresse du siège' : 'عنوان المقر'}</strong><br>${agencySettings.address}</div>` : ''}
              ${agencySettings?.phone ? `<div class="agency-contact-item">📞 ${isFrench ? 'Téléphone' : 'الهاتف'}: ${ltrPhone(agencySettings.phone)}</div>` : ''}
              ${agencySettings?.phone_number_2 ? `<div class="agency-contact-item">📱 ${isFrench ? 'Deuxième numéro de téléphone' : 'الهاتف الثاني'}: ${ltrPhone(agencySettings.phone_number_2)}</div>` : ''}
              ${agencySettings?.bank_number ? `<div class="agency-contact-item">🏦 ${isFrench ? 'Numéro de compte bancaire' : 'الرقم البنكي'}: ${agencySettings.bank_number}</div>` : ''}
            </div>
          </div>
          <div class="contract-title">${labels.contractTitle}</div>
        </div>
        
        <!-- RENTAL PERIOD & CONTRACT INFO -->
        <div class="card">
          <div class="card-title">📅 ${labels.rentalPeriod}</div>
          <div class="field-row three-col">
            <div class="field">
              <div class="field-label">${labels.departure}</div>
              <div class="field-value">${new Date(reservation?.step1?.departureDate).toLocaleDateString(isFrench ? 'fr-FR' : 'ar-SA')}</div>
            </div>
            <div class="field">
              <div class="field-label">${labels.return}</div>
              <div class="field-value">${new Date(reservation?.step1?.returnDate).toLocaleDateString(isFrench ? 'fr-FR' : 'ar-SA')}</div>
            </div>
            <div class="field">
              <div class="field-label">${labels.duration}</div>
              <div class="field-value">${reservation?.totalDays || 0} ${labels.days}</div>
            </div>
          </div>
          <div class="field-row three-col">
            <div class="field">
              <div class="field-label">📅 ${labels.contractDate}</div>
              <div class="field-value">${new Date().toLocaleDateString(isFrench ? 'fr-FR' : 'ar-SA')}</div>
            </div>
            <div class="field">
              <div class="field-label">🔢 ${labels.contractNumber}</div>
              <div class="field-value">#${reservation?.id ? reservation.id.toString().substring(0, 8).toUpperCase() : 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">👤 ${labels.client}</div>
              <div class="field-value">${reservation?.client?.lastName || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        <!-- PRIMARY DRIVER INFO -->
        <div class="card">
          <div class="card-title">✍️ ${labels.driverInfo}</div>
          <div class="field-row">
            <div class="field">
              <div class="field-label">✍️ ${labels.lastName} *</div>
              <div class="field-value">${reservation?.client?.lastName || ''}</div>
            </div>
            <div class="field">
              <div class="field-label">✍️ ${labels.firstName} *</div>
              <div class="field-value">${reservation?.client?.firstName || ''}</div>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <div class="field-label">📱 ${labels.phone} *</div>
              <div class="field-value">${reservation?.client?.phone ? ltrPhone(reservation.client.phone) : ''}</div>
            </div>
            <div class="field">
              <div class="field-label">🎂 ${labels.birthDate}</div>
              <div class="field-value">${reservation?.client?.dateOfBirth ? new Date(reservation.client.dateOfBirth).toLocaleDateString(isFrench ? 'fr-FR' : 'ar-SA') : ''}</div>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <div class="field-label">📍 ${labels.birthPlace}</div>
              <div class="field-value">${reservation?.client?.placeOfBirth || ''}</div>
            </div>
            <div class="field">
              <div class="field-label">🆔 ${labels.documents}</div>
              <div class="field-value">${reservation?.client?.documentType || ''}</div>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <div class="field-label">🚗 ${labels.licenseNumber} *</div>
              <div class="field-value">${reservation?.client?.licenseNumber || ''}</div>
            </div>
            <div class="field">
              <div class="field-label">📅 ${labels.licenseDelivery}</div>
              <div class="field-value">${reservation?.client?.licenseDeliveryDate ? new Date(reservation.client.licenseDeliveryDate).toLocaleDateString(isFrench ? 'fr-FR' : 'ar-SA') : ''}</div>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <div class="field-label">⏱️ ${labels.licenseExpiry}</div>
              <div class="field-value">${reservation?.client?.licenseExpirationDate ? new Date(reservation.client.licenseExpirationDate).toLocaleDateString(isFrench ? 'fr-FR' : 'ar-SA') : ''}</div>
            </div>
            <div class="field">
              <div class="field-label">📍 ${labels.licensePlace}</div>
              <div class="field-value">${reservation?.client?.licenseDeliveryPlace || ''}</div>
            </div>
          </div>
        </div>
        
        ${secondConductor ? `
        <!-- SECONDARY DRIVER INFO -->
        <div class="card">
          <div class="card-title">✍️ ${labels.secondDriver}</div>
          <div class="field-row">
            <div class="field">
              <div class="field-label">✍️ ${labels.lastName} *</div>
              <div class="field-value">${secondConductor?.last_name || secondConductor?.lastName || ''}</div>
            </div>
            <div class="field">
              <div class="field-label">✍️ ${labels.firstName} *</div>
              <div class="field-value">${secondConductor?.first_name || secondConductor?.firstName || ''}</div>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <div class="field-label">📱 ${labels.phone} *</div>
              <div class="field-value">${secondConductor?.phone ? ltrPhone(secondConductor.phone) : ''}</div>
            </div>
            <div class="field">
              <div class="field-label">🎂 ${labels.birthDate}</div>
              <div class="field-value">${(secondConductor?.date_of_birth || secondConductor?.dateOfBirth) ? new Date(secondConductor.date_of_birth || secondConductor.dateOfBirth).toLocaleDateString(isFrench ? 'fr-FR' : 'ar-SA') : ''}</div>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <div class="field-label">📍 ${labels.birthPlace}</div>
              <div class="field-value">${secondConductor?.place_of_birth || secondConductor?.placeOfBirth || ''}</div>
            </div>
            <div class="field">
              <div class="field-label">🆔 ${labels.documents}</div>
              <div class="field-value">${secondConductor?.document_type || secondConductor?.documentType || ''}</div>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <div class="field-label">🚗 ${labels.licenseNumber} *</div>
              <div class="field-value">${secondConductor?.license_number || secondConductor?.licenseNumber || ''}</div>
            </div>
            <div class="field">
              <div class="field-label">📅 ${labels.licenseDelivery}</div>
              <div class="field-value">${(secondConductor?.license_delivery_date || secondConductor?.licenseDeliveryDate) ? new Date(secondConductor.license_delivery_date || secondConductor.licenseDeliveryDate).toLocaleDateString(isFrench ? 'fr-FR' : 'ar-SA') : ''}</div>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <div class="field-label">⏱️ ${labels.licenseExpiry}</div>
              <div class="field-value">${(secondConductor?.license_expiration_date || secondConductor?.licenseExpirationDate) ? new Date(secondConductor.license_expiration_date || secondConductor.licenseExpirationDate).toLocaleDateString(isFrench ? 'fr-FR' : 'ar-SA') : ''}</div>
            </div>
            <div class="field">
              <div class="field-label">📍 ${labels.licensePlace}</div>
              <div class="field-value">${secondConductor?.license_delivery_place || secondConductor?.licenseDeliveryPlace || ''}</div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <!-- TWO COLUMN: VEHICLE & PRICING -->
        <div class="two-column">
          <!-- VEHICLE INFO -->
          <div class="card">
            <div class="card-title">🚗 ${labels.vehicleInfo}</div>
            <div class="field">
              <div class="field-label">${labels.model}</div>
              <div class="field-value">${ltr((reservation?.car?.brand || '') + ' ' + (reservation?.car?.model || ''))}</div>
            </div>
            <div class="field">
              <div class="field-label">${labels.registration}</div>
              <div class="field-value">${ltr(reservation?.car?.plateNumber || '')}</div>
            </div>
            <div class="field">
              <div class="field-label">${labels.color}</div>
              <div class="field-value">${reservation?.car?.color || ''}</div>
            </div>
            <div class="field">
              <div class="field-label">${labels.vin}</div>
              <div class="field-value">${ltr(reservation?.car?.vin || '')}</div>
            </div>
            <div class="field">
              <div class="field-label">${labels.mileageStart}</div>
              <div class="field-value">${ltr((reservation?.departureInspection?.mileage || reservation?.car?.mileage || 0) + ' km')}</div>
            </div>
            <div class="field">
              <div class="field-label">${labels.fuelStart}</div>
              <div class="field-value">${reservation?.departureInspection?.fuelLevel || ''}</div>
            </div>
          </div>
          
          <!-- PRICING INFO -->
          <div class="card">
            <div class="card-title">💰 ${labels.pricing}</div>
            <div class="pricing">
              <div class="pricing-row">
                <div class="pricing-label">${labels.pricePerDay}:</div>
                <div class="pricing-value">${reservation?.car?.pricePerDay || 0} DA</div>
              </div>
              <div class="pricing-row">
                <div class="pricing-label">${labels.numberOfDays}:</div>
                <div class="pricing-value">${reservation?.totalDays || 0}</div>
              </div>
              <div class="pricing-row total">
                <div class="pricing-label">${labels.totalHT}:</div>
                <div class="pricing-value">${(reservation?.totalPrice || 0).toFixed(2)} DA</div>
              </div>
              ${reservation?.tvaApplied ? `
              <div class="pricing-row">
                <div class="pricing-label">${labels.tva}:</div>
                <div class="pricing-value">${((reservation?.totalPrice || 0) * 0.19).toFixed(2)} DA</div>
              </div>
              ` : ''}
              <div class="pricing-row grand-total">
                <div class="pricing-label">${labels.totalTTC}:</div>
                <div class="pricing-value">${(reservation?.tvaApplied ? ((reservation?.totalPrice || 0) * 1.19) : (reservation?.totalPrice || 0)).toFixed(2)} DA</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- TERMS & CONDITIONS -->
        <div class="terms-section">
          <strong style="display: block; margin-bottom: 4px;">⚠️ ${labels.terms}</strong>
          ${termsList.map(term => `<div class="term-item">${term}</div>`).join('')}
        </div>
        
        <!-- SIGNATURES -->
        <div class="signatures">
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">${labels.clientSignature}</div>
            <div style="font-size: 10px;">${labels.dateAndSignature}</div>
          </div>
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">${labels.agencySignature}</div>
            <div style="font-size: 10px;">${labels.dateAndSignature}</div>
          </div>
        </div>
        
      </div>
    </body>
    </html>
  `;
  
  return html;
};
