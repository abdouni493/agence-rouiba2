/**
 * Conditions Templates - Arabic and French
 * Used for printing rental conditions without database connection
 * Language: Both Arabic (RTL) and French (LTR)
 */

export interface ConditionItem {
  title: string;
  content: string;
}

export interface ConditionsTemplate {
  language: 'ar' | 'fr';
  title: string;
  subtitle: string;
  conditions: ConditionItem[];
  clientSignatureLabel: string;
  agencySignatureLabel: string;
}

/**
 * ARABIC CONDITIONS TEMPLATE
 * Complete rental agreement conditions in Arabic
 */
export const ARABIC_CONDITIONS_TEMPLATE: ConditionsTemplate = {
  language: 'ar',
  title: 'شروط الإيجار',
  subtitle: 'يمكنك قراءة شروط العقد في الأسفل ومصادقة عليها',
  conditions: [
    {
      title: 'السن',
      content: 'يجب أن يكون السائق يبلغ من العمر 20 عامًا على الأقل، وأن يكون حاصلًا على رخصة قيادة منذ سنتين على الأقل'
    },
    {
      title: 'جواز السفر',
      content: 'إيداع جواز السفر البيومتري إلزامي، بالإضافة إلى دفع تأمين ابتدائي حسب فئة المركبة، ويُعدّ هذا بمثابة ضمان تطلبه'
    },
    {
      title: 'الوقود',
      content: 'الوقود يكون على نفقة الزبون'
    },
    {
      title: 'قانون ونظام',
      content: 'يتم الدفع نقدًا عند تسليم السيارة'
    },
    {
      title: 'النظافة',
      content: 'تسلم السيارة نظيفة ويجب إرجاعها في نفس الحالة، وفي حال عدم ذلك، سيتم احتساب تكلفة الغسيل بمبلغ 1000 دج'
    },
    {
      title: 'مكان التسليم',
      content: 'يتم تسليم السيارات في موقف السيارات التابع لوكالاتنا'
    },
    {
      title: 'جدول المواعيد',
      content: 'يجب على الزبون احترام المواعيد المحددة عند الحجز. يجب الإبلاغ مسبقًا عن أي تغيير. لا يمكن للزبون تمديد مدة الإيجار إلا بعد الحصول على إذن من وكالتنا للإيجار، وذلك بإشعار مسبق لا يقل عن 24 ساعة'
    },
    {
      title: 'الأضرار والخسائر',
      content: 'في حالة السرقة أو تضرر المركبة، يجب تقديم تصريح لدى مصالح الشرطة أو الدرك الوطني. قبل أي تصريح، يجب على الزبون إبلاغ وكالة الكراء بشكل إلزامي'
    },
    {
      title: 'الحادث',
      content: 'يتحمل الزبون كل نفقات السيارة في حال حادث أو ضرر بالسيارة من الداخل والخارج'
    },
    {
      title: 'تأمين',
      content: 'يستفيد من التأمين فقط السائقون المذكورون في عقد الكراء. يُمنع منعًا باتًّا إعارة أو تأجير المركبة من الباطن. وتكون جميع الأضرار الناتجة عن مثل هذه الحالات على عاتق الزبون بالكامل'
    },
    {
      title: 'عطل ميكانيكي',
      content: 'خلال فترة الإيجار، وبناء على عدد الكيلومترات المقطوعة، يجب على الزبون إجراء الفحوصات اللازمة مثل مستوى الزيت، حالة المحرك، ضغط الإطارات، وغيرها. في حال حدوث عطل ميكانيكي بسبب إهمال الزبون في إجراء هذه الفحوصات أو لأي سبب آخر ناتج عن مسؤولية الزبون (مثلاً: كسر حوض الزيت، العارضة السفلية، القفل أو غيرها)، فإن تكاليف الإصلاح والصيانة تكون على عاتق الزبون بالكامل'
    },
    {
      title: 'خسائر إضافية',
      content: 'الأضرار التي تلحق بالعجلات والإطارات، القيادة بالإطارات المفرغة من الهواء، التدهور، السرقة، نهب الملحقات، أعمال التخريب، الأضرار الميكانيكية الناتجة عن سوء استخدام المركبة، المخالفات المرورية، الأضرار التي تحدث أسفل المركبة (الصدام الأمامي، الجوانب، حوض الزيت، العادم) والأضرار الناتجة عن الاضطرابات والشغب، كلها سيتم تحميل تكلفتها على الزبون'
    },
    {
      title: 'ضريبة التأخر',
      content: 'مدة الإيجار تُحتسب على فترات كاملة مدتها 24 ساعة غير قابلة للتقسيم، ابتداءً من وقت حجز المركبة وحتى الوقت المذكور في العقد. يجب على الزبون إعادة المركبة في نفس الوقت، وإلا سيتم احتساب تكلفة تأخير مقدارها 800 دينار لكل ساعة تأخير'
    },
    {
      title: 'عدد الأميال',
      content: 'عدد الكيلومترات محدود لجميع مركباتنا بـ 300 كم يوميًا على حسب نوع السيارة، ويُفرض غرامة قدرها 30 دج عن كل كيلومتر زائد'
    },
    {
      title: 'شروط',
      content: 'يُقرّ الزبون بأنه اطّلع على شروط الإيجار هذه وقبلها دون أي تحفظ، ويتعهد بتوقيع هذا العقد'
    },
    {
      title: 'المسؤولية القانونية',
      content: 'في حالة ضبط السيارة بأي شكل من جميع الممنوعات أو أي شيء مخالف للقانون، يتحمل الزبون كل المسؤوليات القانونية لدى مصالح الدرك أو الشرطة أو المحكمة بصفة عامة'
    },
    {
      title: 'المصاريف والمتابعة',
      content: 'كل المصاريف على عاتق الزبون، وإذا لم يتم دفع مستحقات الوكالة فللوكالة الحق في متابعة الزبون قضائيًا'
    }
  ],
  clientSignatureLabel: 'امضاء وبصمة الزبون',
  agencySignatureLabel: 'امضاء صاحب وكالة'
};

/**
 * FRENCH CONDITIONS TEMPLATE
 * Complete rental agreement conditions in French
 */
export const FRENCH_CONDITIONS_TEMPLATE: ConditionsTemplate = {
  language: 'fr',
  title: 'Les Conditions Générales de location véhicule',
  subtitle: 'Vous pouvez lire les conditions de location, elles apparaîtront sur le contra de location',
  conditions: [
    {
      title: 'Age',
      content: 'Le conducteur doit être âgé au minimum de 20 ans et être titulaire d\'un permis de conduire d\'au moins 2 ans.'
    },
    {
      title: 'Passeport',
      content: 'Dépôt obligatoire du passeport biométrique et une caution selon la catégorie du véhicule, qui constitue une garantie que nous demandons.'
    },
    {
      title: 'Carburant',
      content: 'Le carburant est à la charge du client.'
    },
    {
      title: 'Règlement',
      content: 'Le paiement se fait à la livraison de la voiture en espèces.'
    },
    {
      title: 'Propreté',
      content: 'Le véhicule est livré propre et doit être restitué dans le même état, faute de quoi le lavage sera facturé au prix de 1000 Da.'
    },
    {
      title: 'Lieux de livraisons',
      content: 'La livraison des voitures s\'effectue sur le parking de nos agences.'
    },
    {
      title: 'Horaire',
      content: 'Le client doit respecter les horaires établit à la réservation. Tout changement doit être signalé à l\'avance. Le client ne peut prolonger sa location que sur autorisation de notre agence location avec un préavis de 24 heures.'
    },
    {
      title: 'Cas de sinistre',
      content: 'Assurance de base : Le client s\'engage à payer tout dégât occasionné sur le véhicule qu\'il soit fautif ou non fautif. Toutes dégats sur le véhicule feras l\'objet d\'un ponctionnement sur la contion de garantie'
    },
    {
      title: 'Accident',
      content: 'Le client prend en charge tous les frais du véhicule en cas d\'accident ou de dommage au véhicule, à l\'intérieur comme à l\'extérieur.'
    },
    {
      title: 'Assurances',
      content: 'Seuls les conducteurs mentionnés sur le contrat de location bénéficient de l\'assurance. Le prêt et la sous-location du véhicule sont strictement interdits. L\'intégralité des dommages survenus dans ces circonstances est à la charge du client.'
    },
    {
      title: 'Panne mécanique',
      content: 'Au cours de la location en fonction du kilométrage parcourus le client doit effectuer les contrôles d\'usage (niveau d\'huile, moteur, pression des pneus, etc....). En cas de panne mécanique due à la négligence du client pour ne pas avoir effectué les contrôles d\'usage ou pour tout autre raisons due à la responsabilité du client (ex: casse carter d\'huile, triangle inférieur, serrure ou autres etc.), la prise en charge du dépannage et de la réparation sont à la charge totale du client.'
    },
    {
      title: 'Dégâts supplémentaire',
      content: 'Les dégâts aux jantes et pneumatiques, le roulage à plat des pneumatiques, la détérioration, les vols, les pillages d\'accessoires, les actes de vandalisme, les dégâts mécaniques dus à une mauvaise utilisation du véhicule, les procès verbaux, les dégâts survenus en dessous du véhicule (jupe, bas de caisse, carter d\'huile, échappement) et les dommages causés par les troubles et émeutes seront facturés au client.'
    },
    {
      title: 'Pénalité de retard',
      content: 'La durée de location se calcul par tranche de 24 heure non fractionnable depuis l\'heure de la réservation du véhicule et l\'heure mentionnée sur le contrat. Le client doit restituer le véhicule à la même heure autrement chaque heure de retard sera facturée au prix de 800 dinars/heure.'
    },
    {
      title: 'Kilométrage',
      content: 'Le kilométrage est limité pour tous nos véhicules a 300Km/Jour, selon le type de véhicule.'
    },
    {
      title: 'Acceptation',
      content: 'Le client déclare avoir pris connaissance et accepter sans réserve les présentes conditions de location.et s engage a signé ce contrat.'
    },
    {
      title: 'Responsabilité légale',
      content: 'En cas de constatation d\'objets interdits ou de toute chose contraire à la loi dans le véhicule, le client assume l\'entière responsabilité légale devant les services de la gendarmerie, de la police ou du tribunal, de manière générale.'
    },
    {
      title: 'Frais et poursuites',
      content: 'Tous les frais sont à la charge du client. À défaut de paiement des sommes dues à l\'agence, celle-ci se réserve le droit de poursuivre le client en justice.'
    }
  ],
  clientSignatureLabel: 'Signature et empreinte du client',
  agencySignatureLabel: 'Signature et scellés de l\'Agence'
};

/**
 * Get conditions template by language
 */
export const getConditionsTemplate = (language: 'ar' | 'fr'): ConditionsTemplate => {
  return language === 'ar' ? ARABIC_CONDITIONS_TEMPLATE : FRENCH_CONDITIONS_TEMPLATE;
};

/**
 * Generate HTML content for printing conditions.
 * Layout summary:
 *   - Blue gradient header  : linear-gradient(135deg, #003399 → #0047b2)
 *   - Condition font        : 12.5px / 600 (bold #003399 prefix)
 *   - Row divider           : 1px solid #eef0f7
 *   - Acceptance box        : bg #f0f4ff, border #b8ccee
 *   - Signatures            : simple empty rectangles with the label below
 *   - Page border           : 2px solid #003399
 */
export const generateConditionsPrintHTML = (language: 'ar' | 'fr'): string => {
  const template = getConditionsTemplate(language);
  const isArabic = language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  const textAlign = isArabic ? 'right' : 'left';

  /**
   * The French wording is considerably longer than the Arabic one and used to spill onto a
   * second A4 sheet. Both languages share one design; French simply renders it at a reduced
   * scale (fonts + vertical rhythm) so the 17 conditions, the acceptance box and both
   * signature boxes still fit on a single page. Horizontal gutters stay fixed so the two
   * languages keep the same page frame.
   */
  const scale = isArabic ? 1 : 0.86;
  const u = (n: number): string => `${Math.round(n * scale * 100) / 100}px`;

  const conditionsHTML = template.conditions
    .map(
      (condition, index) => `
      <div class="condition-item">
        <p class="condition-text">
          <span class="condition-title">${index + 1}- ${condition.title} </span>${condition.content}
        </p>
      </div>`
    )
    .join('');

  const acceptanceText = isArabic
    ? 'قام المستأجر بالاطلاع على شروط الإيجار هذه وقبلها دون أي تحفظ، ويتعهد بتوقيع هذا العقد وتحمّل جميع المسؤوليات الثانوية.'
    : "Le locataire déclare avoir pris connaissance des présentes conditions de location et les accepter sans réserve, s'engage à signer ce contrat et à assumer toutes les responsabilités secondaires.";

  const printDate = new Date().toLocaleDateString(isArabic ? 'en-US' : 'fr-FR');

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="utf-8">
  <title>${template.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: 794px;
      margin: 0;
      padding: 0;
      background: white;
    }

    body {
      font-family: 'Arial', 'Helvetica Neue', sans-serif;
      color: #222;
      direction: ${dir};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── PAGE ── */
    .page {
      width: 794px;
      min-height: 1123px;
      padding-bottom: ${u(30)};
      display: flex;
      flex-direction: column;
      background: white;
      border: 2px solid #003399;
    }

    /* ── HEADER ── */
    .header {
      background: linear-gradient(135deg, #003399 0%, #0047b2 100%);
      color: white;
      padding: ${u(18)} 47px ${u(15)};
      text-align: center;
      flex-shrink: 0;
    }

    .header h1 {
      font-size: ${u(22)};
      font-weight: 800;
      margin: 0 0 ${u(7)};
      letter-spacing: 0.3px;
    }

    .header p {
      font-size: ${u(12.5)};
      margin: 0;
      opacity: 0.88;
      font-style: italic;
      color: rgba(255,255,255,0.88);
    }

    /* ── CONTENT ──
       No flex-grow: the content takes only the height it needs so the
       acceptance box + signatures sit directly beneath the conditions
       instead of being pushed to the bottom of the A4 page. */
    .content {
      padding: ${u(15)} 47px 0;
    }

    /* ── CONDITION ROWS ── */
    .condition-item {
      padding: ${u(7)} 0;
      border-bottom: 1px solid #eef0f7;
    }
    .condition-item:last-child { border-bottom: none; }

    .condition-text {
      font-size: ${u(12.5)};
      color: #111;
      font-weight: 600;
      line-height: 1.55;
      margin: 0;
      text-align: ${textAlign};
    }

    .condition-title {
      font-weight: 800;
      color: #003399;
    }

    /* ── ACCEPTANCE ── */
    .acceptance {
      margin: ${u(12)} 47px 0;
      padding: ${u(9)} ${u(12)};
      background: #f0f4ff;
      border-radius: 5px;
      border: 1px solid #b8ccee;
      font-size: ${u(12.5)};
      color: #003399;
      font-weight: 700;
      text-align: ${textAlign};
    }

    /* ── SIGNATURES: simple empty rectangles ── */
    .signatures-section {
      margin: ${u(16)} 47px 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 27px;
    }

    .signature-block { text-align: center; }

    .signature-box {
      border: 2px solid #003399;
      border-radius: 4px;
      height: ${u(100)};
      background: #fff;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: ${u(8)};
    }

    .signature-label {
      font-size: ${u(12.5)};
      font-weight: 700;
      color: #003399;
      letter-spacing: 0.2px;
    }

    .print-date {
      text-align: center;
      font-size: ${u(9)};
      color: #888;
      margin: ${u(13)} 47px 0;
      padding-top: ${u(10)};
      border-top: 1px solid #dde3f5;
    }

    @media print {
      @page { size: A4; margin: 0; }
      html, body { width: 794px; }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="page">

    <div class="header">
      <h1>${template.title}</h1>
      <p>${template.subtitle}</p>
    </div>

    <div class="content">
      ${conditionsHTML}
    </div>

    <div class="acceptance">
      ${acceptanceText}
    </div>

    <div class="signatures-section">
      <div class="signature-block">
        <div class="signature-box">
          <div class="signature-label">${template.agencySignatureLabel}</div>
        </div>
      </div>
      <div class="signature-block">
        <div class="signature-box">
          <div class="signature-label">${template.clientSignatureLabel}</div>
        </div>
      </div>
    </div>

    <div class="print-date">
      ${isArabic ? 'التاريخ: ' : 'Date: '}${printDate}
    </div>

  </div>
</body>
</html>`;
};
