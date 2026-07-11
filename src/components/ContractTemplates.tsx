import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Download, Edit2, Copy, ChevronRight, Save } from 'lucide-react';
import { supabase } from '../supabase';

interface ContractTemplate {
  id: string;
  name: string;
  language: 'fr' | 'ar';
  content: string;
  description: string;
}

interface ContractData {
  agencyName: string;
  agencyLogo?: string;
  agencyPhone?: string;
  agencyAddress?: string;
  driverName: string;
  driverLicense: string;
  driverBirthDate: string;
  driverPassport?: string;
  carBrand: string;
  carModel: string;
  carColor: string;
  carRegistration: string;
  carMileage: number;
  departureDate: string;
  returnDate: string;
  rentAmount: number;
  insurance: number;
  deposit: number;
  assurancePercentage?: number;
  assuranceAmount?: number;
  fuelType?: string;
  language: 'fr' | 'ar';
}

interface ContractTemplatesProps {
  onClose: () => void;
  onSave?: (contract: string) => void;
  contractData?: Partial<ContractData>;
}

const FRENCH_CONTRACT_TEMPLATE = `
<div class="contract-fr">
  <div class="contract-header">
    <div class="logo-section">
      {logo}
    </div>
    <div class="header-text">
      <h1>CONTRAT DE LOCATION DE VÉHICULE</h1>
      <h2>{agencyName}</h2>
      <p>Téléphone: {agencyPhone}</p>
      <p>Adresse: {agencyAddress}</p>
    </div>
  </div>

  <div class="contract-info">
    <div class="info-section">
      <h3>INFORMATIONS DU CONDUCTEUR</h3>
      <table>
        <tr>
          <td>Nom et Prénom:</td>
          <td>{driverName}</td>
        </tr>
        <tr>
          <td>Date de Naissance:</td>
          <td>{driverBirthDate}</td>
        </tr>
        <tr>
          <td>Numéro de Permis:</td>
          <td>{driverLicense}</td>
        </tr>
        <tr>
          <td>Numéro Passeport:</td>
          <td>{driverPassport}</td>
        </tr>
      </table>
    </div>

    <div class="info-section">
      <h3>INFORMATIONS DU VÉHICULE</h3>
      <table>
        <tr>
          <td>Marque:</td>
          <td>{carBrand}</td>
        </tr>
        <tr>
          <td>Modèle:</td>
          <td>{carModel}</td>
        </tr>
        <tr>
          <td>Couleur:</td>
          <td>{carColor}</td>
        </tr>
        <tr>
          <td>Immatriculation:</td>
          <td>{carRegistration}</td>
        </tr>
        <tr>
          <td>Kilométrage Initial:</td>
          <td>{carMileage} km</td>
        </tr>
        <tr>
          <td>Carburant:</td>
          <td>{fuelType}</td>
        </tr>
      </table>
    </div>

    <div class="info-section">
      <h3>PÉRIODE DE LOCATION</h3>
      <table>
        <tr>
          <td>Date de Départ:</td>
          <td>{departureDate}</td>
        </tr>
        <tr>
          <td>Date de Retour:</td>
          <td>{returnDate}</td>
        </tr>
      </table>
    </div>

    <div class="info-section">
      <h3>CONDITIONS FINANCIÈRES</h3>
      <table>
        <tr>
          <td>Montant de Location:</td>
          <td>{rentAmount} DZD</td>
        </tr>
        <tr>
          <td>Assurance:</td>
          <td>{insurance} DZD</td>
        </tr>
        <tr>
          <td>Assurance Serenity:</td>
          <td>{assuranceAmount} DZD ({assurancePercentage}%)</td>
        </tr>
        <tr>
          <td>Caution Obligatoire:</td>
          <td>{deposit} DZD</td>
        </tr>
        <tr style="font-weight: bold; border-top: 2px solid #000;">
          <td>TOTAL:</td>
          <td>{total} DZD</td>
        </tr>
      </table>
    </div>

    <div class="conditions-section">
      <h3>CONDITIONS DE LOCATION</h3>
      <ul>
        <li>Le conducteur doit être âgé de 20 ans minimum avec un permis depuis 2 ans.</li>
        <li>Une pièce d'identité valide (passeport biométrique) est obligatoire.</li>
        <li>Un dépôt de garantie est requis avant la remise du véhicule.</li>
        <li>Le carburant est à la charge du client.</li>
        <li>Le véhicule doit être retourné à la date convenue.</li>
        <li>Toute rayure ou dommage sera facturé au client.</li>
        <li>Le kilométrage dépasse 150 km/jour sera facturé en supplément.</li>
      </ul>
    </div>
  </div>

  <div class="contract-footer">
    <div class="signature-section">
      <div class="signature-box">
        <p>Signature du Conducteur</p>
        <p>Empreinte Digitale</p>
        <div class="signature-line"></div>
      </div>
      <div class="signature-box">
        <p>Signature de l'Agence</p>
        <div class="signature-line"></div>
      </div>
    </div>
    <p style="text-align: center; margin-top: 20px; font-size: 12px;">
      Ce contrat a été établi en deux exemplaires, un pour le conducteur et un pour l'agence.
    </p>
  </div>
</div>
`;

const ARABIC_CONTRACT_TEMPLATE = `
<div class="contract-ar" dir="rtl">
  <div class="contract-header">
    <div class="header-text">
      <h1>عقد استئجار المركبة</h1>
      <h2>{agencyName}</h2>
      <p>الهاتف: {agencyPhone}</p>
      <p>العنوان: {agencyAddress}</p>
    </div>
    <div class="logo-section">
      {logo}
    </div>
  </div>

  <div class="contract-info">
    <div class="info-section">
      <h3>معلومات السائق</h3>
      <table>
        <tr>
          <td>{driverName}</td>
          <td>الاسم الكامل:</td>
        </tr>
        <tr>
          <td>{driverBirthDate}</td>
          <td>تاريخ الميلاد:</td>
        </tr>
        <tr>
          <td>{driverLicense}</td>
          <td>رقم رخصة القيادة:</td>
        </tr>
        <tr>
          <td>{driverPassport}</td>
          <td>رقم جواز السفر:</td>
        </tr>
      </table>
    </div>

    <div class="info-section">
      <h3>معلومات المركبة</h3>
      <table>
        <tr>
          <td>{carBrand}</td>
          <td>الماركة:</td>
        </tr>
        <tr>
          <td>{carModel}</td>
          <td>الموديل:</td>
        </tr>
        <tr>
          <td>{carColor}</td>
          <td>اللون:</td>
        </tr>
        <tr>
          <td>{carRegistration}</td>
          <td>رقم التسجيل:</td>
        </tr>
        <tr>
          <td>{carMileage} كم</td>
          <td>المسافة الأولية:</td>
        </tr>
        <tr>
          <td>{fuelType}</td>
          <td>نوع الوقود:</td>
        </tr>
      </table>
    </div>

    <div class="info-section">
      <h3>فترة الاستئجار</h3>
      <table>
        <tr>
          <td>{departureDate}</td>
          <td>تاريخ البداية:</td>
        </tr>
        <tr>
          <td>{returnDate}</td>
          <td>تاريخ النهاية:</td>
        </tr>
      </table>
    </div>

    <div class="info-section">
      <h3>الشروط المالية</h3>
      <table>
        <tr>
          <td>{rentAmount} دج</td>
          <td>سعر الإيجار:</td>
        </tr>
        <tr>
          <td>{insurance} دج</td>
          <td>التأمين:</td>
        </tr>
        <tr>
          <td>{assuranceAmount} دج ({assurancePercentage}%)</td>
          <td>تأمين Serenity:</td>
        </tr>
        <tr>
          <td>{deposit} دج</td>
          <td>الكفالة الإجبارية:</td>
        </tr>
        <tr style="font-weight: bold; border-top: 2px solid #000;">
          <td>{total} دج</td>
          <td>الإجمالي:</td>
        </tr>
      </table>
    </div>

    <div class="conditions-section">
      <h3>شروط الإيجار</h3>
      <ul>
        <li>يجب أن يكون السائق بعمر 20 سنة على الأقل مع رخصة قيادة منذ سنتين.</li>
        <li>وثيقة هوية صالحة (جواز سفر حيوي) إلزامية.</li>
        <li>يجب دفع كفالة قبل تسليم السيارة.</li>
        <li>الوقود على حساب العميل.</li>
        <li>يجب إرجاع السيارة في التاريخ المتفق عليه.</li>
        <li>أي خدش أو ضرر سيتم فرض رسوم على العميل.</li>
        <li>ستكون هناك رسوم إضافية للمسافة التي تتجاوز 150 كم يومياً.</li>
      </ul>
    </div>
  </div>

  <div class="contract-footer">
    <div class="signature-section">
      <div class="signature-box">
        <p>توقيع السائق</p>
        <p>البصمة</p>
        <div class="signature-line"></div>
      </div>
      <div class="signature-box">
        <p>توقيع الوكالة</p>
        <div class="signature-line"></div>
      </div>
    </div>
    <p style="text-align: center; margin-top: 20px; font-size: 12px;">
      تم إعداد هذا العقد بنسختين، واحدة للسائق وواحدة للوكالة.
    </p>
  </div>
</div>
`;

export const ContractTemplates: React.FC<ContractTemplatesProps> = ({
  onClose,
  onSave,
  contractData = {
    agencyName: '',
    driverName: '',
    driverLicense: '',
    driverBirthDate: '',
    carBrand: '',
    carModel: '',
    carColor: '',
    carRegistration: '',
    carMileage: 0,
    departureDate: '',
    returnDate: '',
    rentAmount: 0,
    insurance: 0,
    deposit: 0
  } as ContractData
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<'fr' | 'ar' | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [templates, setTemplates] = useState<ContractTemplate[]>([
    {
      id: 'fr-standard',
      name: 'Contrat Standard',
      language: 'fr',
      content: FRENCH_CONTRACT_TEMPLATE,
      description: 'Contrat de location en français avec tous les détails requis'
    },
    {
      id: 'ar-standard',
      name: 'العقد القياسي',
      language: 'ar',
      content: ARABIC_CONTRACT_TEMPLATE,
      description: 'عقد الإيجار باللغة العربية مع جميع التفاصيل المطلوبة'
    }
  ]);

  const handleSelectTemplate = (lang: 'fr' | 'ar') => {
    const template = templates.find(t => t.language === lang);
    if (template) {
      setSelectedTemplate(lang);
      setEditContent(template.content);
      setIsEditing(false);
    }
  };

  const handleEditTemplate = () => {
    setIsEditing(true);
  };

  const handleSaveTemplate = () => {
    if (selectedTemplate && editContent) {
      const updatedTemplates = templates.map(t => 
        t.language === selectedTemplate 
          ? { ...t, content: editContent }
          : t
      );
      setTemplates(updatedTemplates);
      setIsEditing(false);
    }
  };

  const handlePrint = () => {
    if (editContent) {
      window.print();
    }
  };

  const handleSaveContract = () => {
    if (editContent && onSave) {
      onSave(editContent);
      onClose();
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
      return String(dateStr);
    }
  };

  const renderTemplatePreview = (content: string) => {
    let rendered = content;
    
    // Format dates before replacing placeholders
    const formattedData = {
      ...contractData,
      departureDate: contractData.departureDate ? formatDate(contractData.departureDate) : '',
      returnDate: contractData.returnDate ? formatDate(contractData.returnDate) : '',
      driverBirthDate: contractData.driverBirthDate ? formatDate(contractData.driverBirthDate) : '',
    };
    
    Object.entries(formattedData).forEach(([key, value]) => {
      rendered = rendered.replace(`{${key}}`, String(value || ''));
    });
    
    const total = (contractData.rentAmount || 0) + (contractData.insurance || 0) + (contractData.deposit || 0) + (contractData.assuranceAmount || 0);
    rendered = rendered.replace('{total}', String(total));
    
    return rendered;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-black text-slate-900">
            {selectedTemplate ? 'Éditer Contrat' : 'Sélectionner un Modèle'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {!selectedTemplate ? (
            // Template Selection
            <div className="space-y-4">
              {templates.map((template) => (
                <motion.button
                  key={template.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectTemplate(template.language)}
                  className="w-full p-6 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600">
                        {template.name}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {template.description}
                      </p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            // Contract Editor
            <div className="space-y-4">
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-96 p-4 border-2 border-blue-500 rounded-lg font-mono text-sm focus:outline-none"
                />
              ) : (
                <div
                  className="prose prose-sm max-w-none p-6 border-2 border-slate-200 rounded-lg bg-white"
                  dangerouslySetInnerHTML={{ __html: renderTemplatePreview(editContent) }}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          {selectedTemplate ? (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedTemplate(null)}
                className="px-6 py-2 text-slate-700 font-bold hover:bg-slate-200 rounded-lg transition-colors"
              >
                ← Retour
              </motion.button>

              <div className="flex gap-4">
                {isEditing ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveTemplate}
                    className="px-6 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </motion.button>
                ) : (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleEditTemplate}
                      className="px-6 py-2 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Éditer
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handlePrint}
                      className="px-6 py-2 bg-slate-500 text-white font-bold rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimer
                    </motion.button>
                  </>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSaveContract}
                  className="px-6 py-2 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Utiliser
                </motion.button>
              </div>
            </>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="ml-auto px-6 py-2 bg-slate-500 text-white font-bold rounded-lg hover:bg-slate-600 transition-colors"
            >
              Fermer
            </motion.button>
          )}
        </div>
      </motion.div>

      <style>{`
        /* =============================================================
           FIX: Contract printing layout - A4 centered on page
           
           Issues fixed:
           - Contract was shifted to the left when printing
           - Not horizontally centered
           - Margins were inconsistent
           - Frame (border) did not align with page limits
           - Layout used screen styles instead of print styles
           
           Solution: Perfect A4 centering with proper page settings
           ============================================================= */

        /* 1. A4 PAGE SETTINGS */
        @page {
          size: A4;
          margin: 0;
        }

        /* 2. RESET HTML AND BODY FOR PRINT */
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          background: white;
        }

        /* 3. SCREEN DISPLAY STYLES (Non-print) */
        .contract-fr, .contract-ar {
          font-family: 'Arial', sans-serif;
          color: #333;
          background: white;
          padding: 20px;
          width: 190mm;
          min-height: 277mm;
          box-sizing: border-box;
          margin: 20px auto;
          box-shadow: 0 0 0 2px #ddd;
          page-break-after: always;
          border: 2px solid #ddd;
          display: flex;
          flex-direction: column;
        }

        .contract-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #333;
          padding-bottom: 20px;
        }

        .logo-section {
          width: 80px;
          height: 80px;
          background: #f0f0f0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: #999;
          flex-shrink: 0;
        }

        .header-text {
          flex: 1;
          text-align: center;
          padding: 0 15px;
        }

        .header-text h1 {
          font-size: 20px;
          font-weight: bold;
          margin: 0;
          color: #000;
        }

        .header-text h2 {
          font-size: 14px;
          font-weight: bold;
          margin: 5px 0;
          color: #333;
        }

        .header-text p {
          font-size: 11px;
          margin: 2px 0;
          color: #666;
        }

        .contract-info {
          margin: 15px 0;
          flex: 1;
        }

        .info-section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }

        .info-section h3 {
          font-size: 13px;
          font-weight: bold;
          background: #f0f0f0;
          padding: 6px 10px;
          margin: 0 0 8px 0;
          border-left: 4px solid #333;
        }

        .info-section table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }

        .info-section table tr {
          border-bottom: 1px solid #ddd;
        }

        .info-section table tr:last-child {
          border-bottom: 2px solid #333;
        }

        .info-section table td {
          padding: 6px;
          text-align: left;
        }

        .info-section table td:first-child {
          font-weight: bold;
          width: 50%;
        }

        .conditions-section {
          margin-top: 15px;
        }

        .conditions-section h3 {
          font-size: 13px;
          font-weight: bold;
          background: #f0f0f0;
          padding: 6px 10px;
          margin: 0 0 8px 0;
          border-left: 4px solid #333;
        }

        .conditions-section ul {
          margin: 0;
          padding-left: 20px;
          font-size: 10px;
          line-height: 1.5;
        }

        .conditions-section li {
          margin-bottom: 4px;
        }

        .contract-footer {
          margin-top: 20px;
          page-break-inside: avoid;
        }

        .signature-section {
          display: flex;
          justify-content: space-around;
          margin-top: 30px;
        }

        .signature-box {
          text-align: center;
          flex: 1;
        }

        .signature-box p {
          font-size: 10px;
          font-weight: bold;
          margin: 4px 0;
        }

        .signature-line {
          border-top: 1px solid #333;
          width: 120px;
          margin: 25px auto 4px;
        }

        /* =============================================================
           PRINT STYLES - CRITICAL FOR A4 CENTERING
           ============================================================= */
        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          /* 4. Reset html and body for printing */
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            background: white;
            overflow: hidden;
          }

          /* 5. Center contract on page */
          body {
            display: flex;
            justify-content: center;
            align-items: flex-start;
            overflow: hidden;
          }

          /* 6. Contract container - perfectly centered with margins */
          .contract-fr, .contract-ar {
            width: 190mm;
            min-height: 277mm;
            margin: 0 auto;
            padding: 10mm;
            box-sizing: border-box;
            background: white;
            border: 2px solid black;
            box-shadow: none;
            page-break-after: always;
            position: relative;
            display: flex;
            flex-direction: column;
            left: 0;
            right: 0;
    transform: scale(1.15);
    transform-origin: top center;
          *, *::before, *::after {
            box-sizing: border-box;
          }

          /* 10. Hide non-contract elements during print */
          body > * {
            visibility: hidden;
          }

          .contract-fr, .contract-ar,
          .contract-fr *,
          .contract-ar * {
            visibility: visible;
          }

          /* 11. Reduce sizes for print to fit better */
          .header-text h1 {
            font-size: 18px;
          }

          .header-text h2 {
            font-size: 12px;
          }

          .header-text p {
            font-size: 10px;
          }

          .info-section h3 {
            font-size: 12px;
          }

          .info-section table {
            font-size: 10px;
          }

          .conditions-section h3 {
            font-size: 12px;
          }

          .conditions-section ul {
            font-size: 9px;
          }

          .signature-box p {
            font-size: 9px;
          }
        }
      `}</style>
    </motion.div>
  );
};
