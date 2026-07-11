import { ReservationDetails, VehicleExpense, Language, Car } from '../types';

const T = (fr: string, ar: string, lang: Language) => lang === 'fr' ? fr : ar;

export const generateReportHTML = (
  car: Car | null,
  reservations: ReservationDetails[],
  expenses: VehicleExpense[],
  startDate: string,
  endDate: string,
  agencySettings: any,
  lang: Language
): string => {
  const isFrench = lang === 'fr';
  const textDir = isFrench ? 'ltr' : 'rtl';

  // Utility functions
  const fmt = (n: number) => Math.round(n || 0).toLocaleString('fr-DZ');
  const fmtD = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(isFrench ? 'fr-FR' : 'ar-DZ');
    } catch {
      return d || '';
    }
  };

  // Calculate metrics
  const nonCancelledRes = reservations.filter(r => r.status !== 'cancelled');
  const totalPaid = nonCancelledRes.reduce((s, r) => {
    const payments = (r.payments || []) as any[];
    if (payments.length > 0) {
      const total = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      if (total > 0) return s + total;
    }
    return s + Math.max(0, (Number(r.totalPrice) || 0) - (Number(r.remainingPayment) || 0));
  }, 0);
  
  const totalInvoiced = nonCancelledRes.reduce((s, r) => s + (Number(r.totalPrice) || 0), 0);
  const totalRemaining = reservations
    .filter(r => !['completed', 'cancelled'].includes(r.status))
    .reduce((s, r) => s + (Number(r.remainingPayment) || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.cost) || 0), 0);
  const netBenefit = totalPaid - totalExpenses;
  
  const carImage = car?.images?.[0] || null;

  const html = `
    <!DOCTYPE html>
    <html dir="${textDir}" lang="${isFrench ? 'fr' : 'ar'}">
    <head>
      <meta charset="UTF-8">
      <title>${isFrench ? 'Rapport Véhicule' : 'تقرير السيارة'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          width: 100%;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, sans-serif;
          line-height: 1.4;
          color: #333;
          background: white;
          direction: ${textDir};
          font-size: 11px;
          padding: 15px;
        }
        .page {
          width: 210mm;
          margin: 0 auto;
          padding: 12px;
          background: white;
          display: flex;
          flex-direction: column;
          min-height: 297mm;
        }
        
        /* Header */
        .header-section {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          background: linear-gradient(135deg, #003399 0%, #0047b2 100%);
          color: white;
          border-radius: 6px;
          margin-bottom: 12px;
          border: 2px solid #003399;
        }
        
        .agency-logo {
          width: 50px;
          height: 50px;
          border-radius: 6px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
          flex-shrink: 0;
        }
        
        .agency-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 4px;
        }
        
        .agency-info {
          flex: 1;
        }
        
        .agency-info h1 {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        
        .agency-info p {
          font-size: 10px;
          line-height: 1.4;
          opacity: 0.95;
          margin: 2px 0;
        }
        
        .report-date {
          text-align: ${textDir === 'ltr' ? 'right' : 'left'};
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
        }
        
        /* Car Info Card */
        .car-info-card {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 10px;
          background: #f8f9fa;
          border: 2px solid #667eea;
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 12px;
          page-break-inside: avoid;
        }
        
        .car-image {
          width: 70px;
          height: 52px;
          border-radius: 4px;
          overflow: hidden;
          background: white;
          border: 1px solid #ddd;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .car-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .car-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        
        .car-detail-item {
          display: flex;
          flex-direction: column;
        }
        
        .car-detail-label {
          font-size: 8px;
          font-weight: bold;
          color: #667eea;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .car-detail-value {
          font-size: 10px;
          font-weight: 600;
          color: #333;
          margin-top: 1px;
        }
        
        /* Section Titles */
        .section-title {
          font-size: 11px;
          font-weight: 700;
          color: white;
          background: #667eea;
          padding: 6px 10px;
          border-radius: 4px;
          margin: 10px 0 6px 0;
          page-break-after: avoid;
        }
        
        /* Tables */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
          font-size: 9px;
          page-break-inside: avoid;
        }
        
        table th {
          background: #667eea;
          color: white;
          padding: 5px 4px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #667eea;
        }
        
        table td {
          padding: 4px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        table tbody tr:nth-child(even) {
          background: #f8f9fa;
        }
        
        table tfoot tr {
          background: #e8eaf6;
          font-weight: bold;
          border-top: 2px solid #667eea;
        }
        
        /* Summary Grid */
        .summary-section {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 6px;
          margin: 10px 0;
          page-break-inside: avoid;
        }
        
        .summary-item {
          background: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 6px;
          text-align: center;
        }
        
        .summary-label {
          font-size: 8px;
          font-weight: bold;
          color: #667eea;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        
        .summary-value {
          font-size: 11px;
          font-weight: 700;
          color: #333;
        }
        
        .benefit-item {
          grid-column: 1 / -1;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 10px;
          border-radius: 4px;
        }
        
        .benefit-item .summary-label {
          color: rgba(255,255,255,0.9);
        }
        
        .benefit-item .summary-value {
          color: white;
          font-size: 13px;
        }
        
        /* Content Area */
        .content {
          flex: 1;
          overflow-y: auto;
        }
        
        /* Signature Section */
        .signature-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: 15px;
          padding-top: 12px;
          border-top: 2px solid #ddd;
          page-break-inside: avoid;
        }
        
        .signature-block {
          text-align: center;
        }
        
        .signature-label {
          font-size: 9px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 15px;
          text-transform: uppercase;
        }
        
        .signature-line {
          border-top: 2px solid #333;
          height: 35px;
          margin-bottom: 6px;
        }
        
        .signature-date {
          font-size: 8px;
          color: #666;
          margin-top: 6px;
        }
        
        @media print {
          body { padding: 0; }
          .page { margin: 0; box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header-section">
          <div class="agency-logo">
            ${agencySettings?.logo 
              ? `<img src="${agencySettings.logo}" alt="Agency Logo" />`
              : '<span style="font-size: 28px; font-weight: bold; color: #003399;">🚗</span>'
            }
          </div>
          <div class="agency-info">
            <h1>${agencySettings?.name || 'AUTO LOCATION'}</h1>
            ${agencySettings?.address ? `<p><strong>${T('Adresse', 'العنوان', lang)}</strong>: ${agencySettings.address}</p>` : ''}
            ${agencySettings?.phone ? `<p>📞 ${T('Téléphone', 'الهاتف', lang)}: ${agencySettings.phone}</p>` : ''}
            ${agencySettings?.phone_number_2 ? `<p>📱 ${T('Deuxième téléphone', 'الهاتف الثاني', lang)}: ${agencySettings.phone_number_2}</p>` : ''}
            ${agencySettings?.email ? `<p>✉️ ${T('Email', 'البريد الإلكتروني', lang)}: ${agencySettings.email}</p>` : ''}
            ${agencySettings?.bank_number ? `<p>🏦 ${T('N° Bancaire', 'الرقم البنكي', lang)}: ${agencySettings.bank_number}</p>` : ''}
          </div>
          <div class="report-date">
            <div><strong>${T('RAPPORT VÉHICULE', 'تقرير السيارة', lang)}</strong></div>
            <div>${T('Date:', 'التاريخ:', lang)}</div>
            <div>${fmtD(new Date().toISOString().split('T')[0])}</div>
          </div>
        </div>

        <!-- Car Information Card -->
        ${car ? `
          <div class="car-info-card">
            ${carImage ? `
              <div class="car-image">
                <img src="${carImage}" alt="Car" />
              </div>
            ` : ''}
            <div class="car-details">
              <div class="car-detail-item">
                <span class="car-detail-label">${T('Marque', 'العلامة', lang)}</span>
                <span class="car-detail-value">${car.brand}</span>
              </div>
              <div class="car-detail-item">
                <span class="car-detail-label">${T('Modèle', 'الموديل', lang)}</span>
                <span class="car-detail-value">${car.model}</span>
              </div>
              <div class="car-detail-item">
                <span class="car-detail-label">${T('Immatriculation', 'التسجيل', lang)}</span>
                <span class="car-detail-value">${car.registration}</span>
              </div>
              <div class="car-detail-item">
                <span class="car-detail-label">${T('Année', 'السنة', lang)}</span>
                <span class="car-detail-value">${car.year}</span>
              </div>
              <div class="car-detail-item">
                <span class="car-detail-label">${T('Couleur', 'اللون', lang)}</span>
                <span class="car-detail-value">${car.color || '-'}</span>
              </div>
              <div class="car-detail-item">
                <span class="car-detail-label">${T('Carburant', 'الوقود', lang)}</span>
                <span class="car-detail-value">${car.energy || '-'}</span>
              </div>
            </div>
          </div>
        ` : ''}

        <div class="content">
          <!-- Period -->
          <div class="section-title">📅 ${T('Période', 'الفترة', lang)}: ${fmtD(startDate)} → ${fmtD(endDate)}</div>

          <!-- Reservations Table -->
          ${reservations.length > 0 ? `
            <div class="section-title">📋 ${T('Locations', 'الإيجارات', lang)} (${reservations.length})</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>${T('Client', 'العميل', lang)}</th>
                  <th>${T('Départ', 'المغادرة', lang)}</th>
                  <th>${T('Retour', 'العودة', lang)}</th>
                  <th>${T('Total', 'الإجمالي', lang)}</th>
                  <th>${T('Payé', 'المدفوع', lang)}</th>
                </tr>
              </thead>
              <tbody>
                ${reservations.map((r, i) => {
                  const paid = (() => {
                    const payments = (r.payments || []) as any[];
                    if (payments.length > 0) {
                      const total = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                      if (total > 0) return total;
                    }
                    return Math.max(0, (Number(r.totalPrice) || 0) - (Number(r.remainingPayment) || 0));
                  })();
                  return `
                    <tr>
                      <td>${i + 1}</td>
                      <td>${r.client?.firstName || ''} ${r.client?.lastName || ''}</td>
                      <td>${r.step1?.departureDate || ''}</td>
                      <td>${r.step1?.returnDate || ''}</td>
                      <td>${fmt(Number(r.totalPrice) || 0)}</td>
                      <td>${fmt(paid)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4">${T('TOTAL', 'الإجمالي', lang)}</td>
                  <td>${fmt(totalInvoiced)}</td>
                  <td>${fmt(totalPaid)}</td>
                </tr>
              </tfoot>
            </table>
          ` : ''}

          <!-- Expenses Table -->
          ${expenses.length > 0 ? `
            <div class="section-title">💰 ${T('Dépenses', 'المصاريف', lang)} (${expenses.length})</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>${T('Type', 'النوع', lang)}</th>
                  <th>${T('Date', 'التاريخ', lang)}</th>
                  <th>${T('Description', 'الوصف', lang)}</th>
                  <th>${T('Montant', 'المبلغ', lang)}</th>
                </tr>
              </thead>
              <tbody>
                ${expenses.map((e, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${e.type}</td>
                    <td>${fmtD(e.date)}</td>
                    <td>${e.expenseName || e.note || '-'}</td>
                    <td>${fmt(Number(e.cost) || 0)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4">${T('TOTAL', 'الإجمالي', lang)}</td>
                  <td>${fmt(totalExpenses)}</td>
                </tr>
              </tfoot>
            </table>
          ` : ''}

          <!-- Financial Summary -->
          <div class="section-title">📊 ${T('Résumé Financier', 'الملخص المالي', lang)}</div>
          <div class="summary-section">
            <div class="summary-item">
              <div class="summary-label">${T('Facturé', 'المفاتر', lang)}</div>
              <div class="summary-value">${fmt(totalInvoiced)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">${T('Encaissé', 'المحصّل', lang)}</div>
              <div class="summary-value">${fmt(totalPaid)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">${T('Dépenses', 'المصاريف', lang)}</div>
              <div class="summary-value">${fmt(totalExpenses)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">${T('Reste', 'المتبقي', lang)}</div>
              <div class="summary-value">${fmt(totalRemaining)}</div>
            </div>
            <div class="benefit-item">
              <div class="summary-label">${T('Bénéfice Net', 'صافي الأرباح', lang)}</div>
              <div class="summary-value">${netBenefit >= 0 ? '+' : ''}${fmt(netBenefit)} DZD</div>
            </div>
          </div>
        </div>

        <!-- Signatures -->
        <div class="signature-section">
          <div class="signature-block">
            <div class="signature-label">${T('Signature Agent', 'توقيع الوكيل', lang)}</div>
            <div class="signature-line"></div>
            <div class="signature-date">${T('Date:', 'التاريخ:', lang)} _________________</div>
          </div>
          <div class="signature-block">
            <div class="signature-label">${T('Tampon Agence', 'ختم الوكالة', lang)}</div>
            <div class="signature-line"></div>
            <div class="signature-date">${T('Cachet / ختم', 'Cachet / ختم', lang)}</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
};
