// Legal document content for Rent Control (bilingual en/he).
//
// NOTE: These texts are drafted as a practical starting point and should be
// reviewed by a qualified lawyer for your jurisdiction before relying on them.
// Operator and contact details are centralised in the constants below.

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDoc {
  title: string;
  lastUpdated: string;
  intro: string[];
  sections: LegalSection[];
}

export type Localized<T> = Record<'en' | 'he', T>;

const OPERATOR_EN = 'Eyal Kook';
const OPERATOR_HE = 'אייל קוק';
const CONTACT_EMAIL = 'eyalkook@gmail.com';
const UPDATED_EN = 'June 9, 2026';
const UPDATED_HE = '9 ביוני 2026';

// ─── Privacy Policy ──────────────────────────────────────────────────────────

export const privacyContent: Localized<LegalDoc> = {
  en: {
    title: 'Privacy Policy',
    lastUpdated: UPDATED_EN,
    intro: [
      `This Privacy Policy explains how ${OPERATOR_EN} (“we”, “us”, the “operator”) collects, uses, and protects personal information when you use Rent Control (the “Service”), a property-management application for landlords.`,
      'By using the Service you agree to the practices described here. If you do not agree, please do not use the Service.',
    ],
    sections: [
      {
        heading: '1. Information we collect',
        paragraphs: ['We collect the following categories of information:'],
        bullets: [
          'Account information — your email address and display name, provided through Firebase Authentication (including Google sign-in).',
          'Data you enter — details about your properties, tenants, and suppliers, including names, phone numbers, email addresses, lease terms, payment and balance records, and bank or other financial details.',
          'Documents you upload — such as lease contracts, identity documents, and payment receipts.',
          'Locally stored preferences — your sign-in token, language, and theme, stored in your browser.',
          'Technical and error data — limited diagnostic information used to detect and fix errors. It is not used for tracking or advertising.',
        ],
      },
      {
        heading: '2. How we use your information',
        bullets: [
          'To provide, operate, and maintain the Service.',
          'To store and display the data you enter and the documents you upload.',
          'To authenticate you and keep your account secure.',
          'To detect, prevent, and fix technical problems.',
          'To comply with legal obligations.',
        ],
      },
      {
        heading: '3. Legal basis for processing',
        paragraphs: [
          'Where applicable law requires a legal basis, we rely on: the performance of our agreement with you; our legitimate interest in operating and securing the Service; your consent where required; and compliance with legal obligations.',
        ],
      },
      {
        heading: '4. Tenant and third-party data',
        paragraphs: [
          'The Service allows you, as a landlord, to store personal data about your tenants and other third parties. With respect to that data, you are the data controller and we act as a processor on your behalf.',
          'You are responsible for having a lawful basis to collect and store your tenants’ personal data, for informing them as required by law, and for keeping the data accurate and up to date.',
        ],
      },
      {
        heading: '5. How we share information',
        paragraphs: ['We do not sell your personal information. We share information only with service providers that help us operate the Service:'],
        bullets: [
          'Google Firebase — authentication, file storage, and database services.',
          'Railway — application and database hosting.',
          'Sentry — error monitoring (configured to avoid collecting personal information).',
        ],
      },
      {
        heading: '6. International processing',
        paragraphs: [
          'Our service providers may process data on servers located outside Israel. We take reasonable steps to ensure appropriate safeguards are in place for such transfers.',
        ],
      },
      {
        heading: '7. Data retention',
        paragraphs: [
          'We retain your information for as long as your account is active or as needed to provide the Service. You can delete your account at any time from the Settings screen, which removes your account and associated data. Some information may be retained where required by law.',
        ],
      },
      {
        heading: '8. Your rights',
        paragraphs: [
          'Subject to applicable law, you may have the right to access, correct, delete, or export your personal data, and to object to or restrict certain processing.',
          `You can exercise many of these directly in the app (for example, editing or deleting records, or deleting your account). For any other request, contact us at ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: '9. Data security',
        paragraphs: [
          'We use industry-standard measures to protect your information, including encrypted connections (HTTPS), authentication, and access controls that restrict uploaded files to your own account. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
        ],
      },
      {
        heading: '10. Cookies and local storage',
        paragraphs: [
          'The Service uses only strictly necessary first-party browser storage — your sign-in token, language, and theme preference. We do not use advertising or tracking cookies, and therefore do not display a cookie-consent banner. If we add analytics or tracking in the future, we will request your consent as required by law.',
        ],
      },
      {
        heading: '11. Children',
        paragraphs: ['The Service is intended for adults (18+) managing rental property and is not directed at children.'],
      },
      {
        heading: '12. Changes to this policy',
        paragraphs: [
          'We may update this Privacy Policy from time to time. The “last updated” date above reflects the latest version. Material changes will be communicated through the Service.',
        ],
      },
      {
        heading: '13. Contact',
        paragraphs: [`For any questions or requests regarding this Privacy Policy or your personal data, contact ${OPERATOR_EN} at ${CONTACT_EMAIL}.`],
      },
    ],
  },
  he: {
    title: 'מדיניות פרטיות',
    lastUpdated: UPDATED_HE,
    intro: [
      `מדיניות פרטיות זו מסבירה כיצד ${OPERATOR_HE} (“אנחנו”, “המפעיל”) אוסף, משתמש ומגן על מידע אישי בעת השימוש ב-Rent Control (“השירות”), אפליקציה לניהול נכסים עבור בעלי דירות.`,
      'השימוש בשירות מהווה הסכמה לנהלים המתוארים כאן. אם אינך מסכים, אנא הימנע משימוש בשירות.',
    ],
    sections: [
      {
        heading: '1. מידע שאנו אוספים',
        paragraphs: ['אנו אוספים את סוגי המידע הבאים:'],
        bullets: [
          'פרטי חשבון — כתובת הדוא"ל ושם התצוגה שלך, המתקבלים באמצעות Firebase Authentication (כולל התחברות עם Google).',
          'מידע שאתה מזין — פרטים על הנכסים, הדיירים והספקים שלך, לרבות שמות, מספרי טלפון, כתובות דוא"ל, תנאי שכירות, רישומי תשלומים ויתרות, ופרטי בנק או פרטים פיננסיים אחרים.',
          'מסמכים שאתה מעלה — כגון חוזי שכירות, מסמכי זיהוי וקבלות תשלום.',
          'העדפות הנשמרות מקומית — אסימון ההתחברות, השפה וערכת הנושא, הנשמרים בדפדפן שלך.',
          'נתונים טכניים ונתוני שגיאות — מידע אבחוני מוגבל המשמש לזיהוי ותיקון תקלות. הוא אינו משמש למעקב או לפרסום.',
        ],
      },
      {
        heading: '2. כיצד אנו משתמשים במידע',
        bullets: [
          'לספק, להפעיל ולתחזק את השירות.',
          'לאחסן ולהציג את הנתונים שאתה מזין והמסמכים שאתה מעלה.',
          'לאמת אותך ולשמור על אבטחת חשבונך.',
          'לזהות, למנוע ולתקן בעיות טכניות.',
          'לעמוד בחובות חוקיות.',
        ],
      },
      {
        heading: '3. בסיס חוקי לעיבוד',
        paragraphs: [
          'כאשר הדין החל מחייב בסיס חוקי, אנו מסתמכים על: ביצוע ההסכם עמך; האינטרס הלגיטימי שלנו בהפעלת השירות ואבטחתו; הסכמתך במקרים הנדרשים; ועמידה בחובות חוקיות.',
        ],
      },
      {
        heading: '4. נתוני דיירים וצדדים שלישיים',
        paragraphs: [
          'השירות מאפשר לך, כבעל נכס, לאחסן מידע אישי על הדיירים שלך ועל צדדים שלישיים אחרים. ביחס למידע זה, אתה בעל השליטה במאגר המידע, ואנו פועלים כמעבד מידע מטעמך.',
          'באחריותך להחזיק בבסיס חוקי לאיסוף ולאחסון המידע האישי של הדיירים שלך, ליידע אותם כנדרש בחוק, ולוודא שהמידע מדויק ומעודכן.',
        ],
      },
      {
        heading: '5. כיצד אנו משתפים מידע',
        paragraphs: ['איננו מוכרים את המידע האישי שלך. אנו משתפים מידע רק עם ספקי שירות המסייעים לנו בהפעלת השירות:'],
        bullets: [
          'Google Firebase — שירותי אימות, אחסון קבצים ומסד נתונים.',
          'Railway — אירוח האפליקציה ומסד הנתונים.',
          'Sentry — ניטור שגיאות (מוגדר כך שלא יאסוף מידע אישי).',
        ],
      },
      {
        heading: '6. עיבוד בינלאומי',
        paragraphs: [
          'ספקי השירות שלנו עשויים לעבד מידע בשרתים הממוקמים מחוץ לישראל. אנו נוקטים צעדים סבירים כדי להבטיח אמצעי הגנה הולמים להעברות אלה.',
        ],
      },
      {
        heading: '7. שמירת מידע',
        paragraphs: [
          'אנו שומרים את המידע שלך כל עוד חשבונך פעיל או כנדרש לצורך אספקת השירות. באפשרותך למחוק את חשבונך בכל עת ממסך ההגדרות, פעולה המוחקת את חשבונך ואת הנתונים הקשורים אליו. מידע מסוים עשוי להישמר כאשר הדבר נדרש על פי דין.',
        ],
      },
      {
        heading: '8. הזכויות שלך',
        paragraphs: [
          'בכפוף לדין החל, ייתכן שתהיה לך הזכות לעיין במידע האישי שלך, לתקנו, למחקו או לייצאו, וכן להתנגד לעיבוד מסוים או להגבילו.',
          `ניתן לממש רבות מזכויות אלה ישירות באפליקציה (למשל עריכה או מחיקה של רשומות, או מחיקת החשבון). לכל בקשה אחרת, פנה אלינו בכתובת ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: '9. אבטחת מידע',
        paragraphs: [
          'אנו משתמשים באמצעים מקובלים בתעשייה כדי להגן על המידע שלך, לרבות חיבורים מוצפנים (HTTPS), אימות, ובקרות גישה המגבילות את הקבצים שהועלו לחשבונך בלבד. שום שיטת העברה או אחסון אינה מאובטחת לחלוטין, ואיננו יכולים להבטיח אבטחה מוחלטת.',
        ],
      },
      {
        heading: '10. עוגיות ואחסון מקומי',
        paragraphs: [
          'השירות משתמש באחסון דפדפן מהותי בלבד מטעמנו — אסימון ההתחברות, העדפת השפה וערכת הנושא. איננו משתמשים בעוגיות פרסום או מעקב, ולכן איננו מציגים באנר הסכמה לעוגיות. אם נוסיף ניתוח נתונים או מעקב בעתיד, נבקש את הסכמתך כנדרש בחוק.',
        ],
      },
      {
        heading: '11. קטינים',
        paragraphs: ['השירות מיועד לבגירים (18+) המנהלים נכסים להשכרה ואינו מכוון לקטינים.'],
      },
      {
        heading: '12. שינויים במדיניות זו',
        paragraphs: [
          'אנו עשויים לעדכן מדיניות פרטיות זו מעת לעת. תאריך “עודכן לאחרונה” שלמעלה משקף את הגרסה העדכנית. שינויים מהותיים יימסרו באמצעות השירות.',
        ],
      },
      {
        heading: '13. יצירת קשר',
        paragraphs: [`לכל שאלה או בקשה בנוגע למדיניות פרטיות זו או למידע האישי שלך, פנה אל ${OPERATOR_HE} בכתובת ${CONTACT_EMAIL}.`],
      },
    ],
  },
};

// ─── Terms of Service ────────────────────────────────────────────────────────

export const termsContent: Localized<LegalDoc> = {
  en: {
    title: 'Terms of Service',
    lastUpdated: UPDATED_EN,
    intro: [
      `These Terms of Service (“Terms”) govern your use of Rent Control (the “Service”), operated by ${OPERATOR_EN} (“we”, “us”). By creating an account or using the Service you agree to these Terms.`,
    ],
    sections: [
      {
        heading: '1. The Service',
        paragraphs: [
          'Rent Control is a property-management application that helps landlords manage properties, tenants, leases, payments, suppliers, and related documents.',
        ],
      },
      {
        heading: '2. Eligibility and your account',
        paragraphs: [
          'You must be at least 18 years old and able to enter into a binding agreement. You are responsible for the accuracy of your account information, for keeping your login credentials secure, and for all activity that occurs under your account.',
        ],
      },
      {
        heading: '3. Acceptable use',
        paragraphs: ['You agree not to:'],
        bullets: [
          'Use the Service for any unlawful purpose or in violation of any applicable law.',
          'Upload malicious code or attempt to disrupt, damage, or gain unauthorized access to the Service or to other users’ data.',
          'Infringe the rights of others or upload content you do not have the right to store.',
        ],
      },
      {
        heading: '4. Your data and responsibilities',
        paragraphs: [
          'You retain ownership of the data you enter. You grant us a limited license to host and process that data solely to provide the Service.',
          'You are solely responsible for having a lawful basis to store personal data about your tenants and other third parties, and for complying with all applicable privacy and tenancy laws.',
        ],
      },
      {
        heading: '5. Intellectual property',
        paragraphs: [
          'The Service, including its software, design, and content (excluding your data), is owned by the operator and protected by applicable law. You may not copy, modify, or distribute it without permission.',
        ],
      },
      {
        heading: '6. Disclaimers',
        paragraphs: [
          'The Service is provided “as is” and “as available”, without warranties of any kind, whether express or implied.',
          'The Service does not provide legal, financial, tax, or accounting advice. You are responsible for verifying any information and for your own compliance and decisions.',
        ],
      },
      {
        heading: '7. Limitation of liability',
        paragraphs: [
          'To the maximum extent permitted by law, the operator shall not be liable for any indirect, incidental, special, or consequential damages, or for any loss of data, profits, or revenue, arising from your use of or inability to use the Service.',
        ],
      },
      {
        heading: '8. Termination',
        paragraphs: [
          'You may stop using the Service and delete your account at any time. We may suspend or terminate access if you breach these Terms or where required by law.',
        ],
      },
      {
        heading: '9. Governing law',
        paragraphs: [
          'These Terms are governed by the laws of the State of Israel, and any dispute shall be subject to the exclusive jurisdiction of the competent courts in Israel.',
        ],
      },
      {
        heading: '10. Changes to these Terms',
        paragraphs: [
          'We may update these Terms from time to time. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.',
        ],
      },
      {
        heading: '11. Contact',
        paragraphs: [`Questions about these Terms can be sent to ${OPERATOR_EN} at ${CONTACT_EMAIL}.`],
      },
    ],
  },
  he: {
    title: 'תנאי שימוש',
    lastUpdated: UPDATED_HE,
    intro: [
      `תנאי שימוש אלה (“התנאים”) חלים על השימוש שלך ב-Rent Control (“השירות”), המופעל על ידי ${OPERATOR_HE} (“אנחנו”, “המפעיל”). יצירת חשבון או שימוש בשירות מהווים הסכמה לתנאים אלה.`,
    ],
    sections: [
      {
        heading: '1. השירות',
        paragraphs: [
          'Rent Control היא אפליקציה לניהול נכסים המסייעת לבעלי דירות לנהל נכסים, דיירים, חוזי שכירות, תשלומים, ספקים ומסמכים נלווים.',
        ],
      },
      {
        heading: '2. כשירות וחשבונך',
        paragraphs: [
          'עליך להיות בן 18 לפחות וכשיר להתקשר בהסכם מחייב. אתה אחראי לדיוק פרטי חשבונך, לשמירה על סודיות פרטי ההתחברות שלך, ולכל פעילות המתבצעת בחשבונך.',
        ],
      },
      {
        heading: '3. שימוש מותר',
        paragraphs: ['אתה מתחייב שלא:'],
        bullets: [
          'להשתמש בשירות לכל מטרה בלתי חוקית או בניגוד לכל דין חל.',
          'להעלות קוד זדוני או לנסות לשבש, לפגוע או להשיג גישה בלתי מורשית לשירות או למידע של משתמשים אחרים.',
          'להפר את זכויותיהם של אחרים או להעלות תוכן שאין לך זכות לאחסן.',
        ],
      },
      {
        heading: '4. הנתונים שלך ואחריותך',
        paragraphs: [
          'הבעלות בנתונים שאתה מזין נותרת שלך. אתה מעניק לנו רישיון מוגבל לאחסן ולעבד נתונים אלה אך ורק לצורך אספקת השירות.',
          'האחריות הבלעדית להחזקת בסיס חוקי לאחסון מידע אישי על הדיירים שלך ועל צדדים שלישיים אחרים, ולעמידה בכל דיני הפרטיות והשכירות החלים, מוטלת עליך.',
        ],
      },
      {
        heading: '5. קניין רוחני',
        paragraphs: [
          'השירות, לרבות התוכנה, העיצוב והתוכן שלו (למעט הנתונים שלך), הוא בבעלות המפעיל ומוגן על פי דין. אין להעתיק, לשנות או להפיץ אותו ללא רשות.',
        ],
      },
      {
        heading: '6. הסרת אחריות',
        paragraphs: [
          'השירות מסופק “כמות שהוא” (AS IS) ו”כפי שהוא זמין”, ללא אחריות מכל סוג, מפורשת או משתמעת.',
          'השירות אינו מספק ייעוץ משפטי, פיננסי, מיסויי או חשבונאי. באחריותך לאמת כל מידע ולקבל את החלטותיך ולעמוד בדרישות הדין בעצמך.',
        ],
      },
      {
        heading: '7. הגבלת אחריות',
        paragraphs: [
          'במידה המרבית המותרת בדין, המפעיל לא יישא באחריות לכל נזק עקיף, מקרי, מיוחד או תוצאתי, או לכל אובדן נתונים, רווחים או הכנסות, הנובעים משימושך בשירות או מאי-יכולתך להשתמש בו.',
        ],
      },
      {
        heading: '8. סיום',
        paragraphs: [
          'באפשרותך להפסיק להשתמש בשירות ולמחוק את חשבונך בכל עת. אנו רשאים להשעות או להפסיק את הגישה אם תפר תנאים אלה או כאשר הדבר נדרש על פי דין.',
        ],
      },
      {
        heading: '9. דין חל וסמכות שיפוט',
        paragraphs: [
          'על תנאים אלה יחולו דיני מדינת ישראל, וכל מחלוקת תהיה נתונה לסמכות השיפוט הבלעדית של בתי המשפט המוסמכים בישראל.',
        ],
      },
      {
        heading: '10. שינויים בתנאים',
        paragraphs: [
          'אנו עשויים לעדכן תנאים אלה מעת לעת. המשך השימוש בשירות לאחר כניסת השינויים לתוקף מהווה הסכמה לתנאים המעודכנים.',
        ],
      },
      {
        heading: '11. יצירת קשר',
        paragraphs: [`שאלות בנוגע לתנאים אלה ניתן לשלוח אל ${OPERATOR_HE} בכתובת ${CONTACT_EMAIL}.`],
      },
    ],
  },
};

// ─── Accessibility Statement ─────────────────────────────────────────────────

export const accessibilityContent: Localized<LegalDoc> = {
  en: {
    title: 'Accessibility Statement',
    lastUpdated: UPDATED_EN,
    intro: [
      `${OPERATOR_EN} is committed to making Rent Control accessible to all users, including people with disabilities, in accordance with the Israeli Equal Rights for Persons with Disabilities (Service Accessibility) Regulations, 5773-2013, and Israeli Standard IS 5568, which is based on the international WCAG 2.0 guidelines at Level AA.`,
    ],
    sections: [
      {
        heading: '1. Conformance status',
        paragraphs: [
          'We aim to conform to Israeli Standard IS 5568 (WCAG 2.0, Level AA). Accessibility is an ongoing effort, and we continue to improve the Service.',
        ],
      },
      {
        heading: '2. Measures we have taken',
        bullets: [
          'Keyboard navigation for interactive elements.',
          'Visible focus indicators and a logical focus order.',
          'Text alternatives and labels for controls and meaningful images.',
          'Support for screen readers and assistive technologies.',
          'Attention to color contrast and full right-to-left (Hebrew) support.',
          'Respect for the operating-system “reduced motion” preference.',
        ],
      },
      {
        heading: '3. Known limitations',
        paragraphs: [
          'Despite our efforts, some parts of the Service may not yet be fully accessible. We are working to address known issues. If you encounter a barrier, please let us know using the contact details below.',
        ],
      },
      {
        heading: '4. Feedback and accessibility coordinator',
        paragraphs: ['If you experience difficulty using the Service, or have suggestions for improving its accessibility, please contact our accessibility coordinator:'],
        bullets: [`Accessibility coordinator: ${OPERATOR_EN}`, `Email: ${CONTACT_EMAIL}`],
      },
      {
        heading: '5. Response',
        paragraphs: ['We will make every effort to respond to your request within a reasonable time.'],
      },
    ],
  },
  he: {
    title: 'הצהרת נגישות',
    lastUpdated: UPDATED_HE,
    intro: [
      `${OPERATOR_HE} מחויב להנגיש את Rent Control לכלל המשתמשים, לרבות אנשים עם מוגבלות, בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013, ולתקן הישראלי ת"י 5568, המבוסס על הנחיות WCAG 2.0 הבינלאומיות ברמה AA.`,
    ],
    sections: [
      {
        heading: '1. רמת התאמה',
        paragraphs: [
          'אנו שואפים לעמוד בתקן הישראלי ת"י 5568 (WCAG 2.0, רמה AA). הנגישות היא מאמץ מתמשך, ואנו ממשיכים לשפר את השירות.',
        ],
      },
      {
        heading: '2. צעדים שנקטנו',
        bullets: [
          'ניווט באמצעות מקלדת עבור רכיבים אינטראקטיביים.',
          'סימוני מיקוד נראים וסדר מיקוד הגיוני.',
          'חלופות טקסט ותוויות עבור פקדים ותמונות בעלות משמעות.',
          'תמיכה בקוראי מסך ובטכנולוגיות מסייעות.',
          'תשומת לב לניגודיות צבעים ותמיכה מלאה בכיווניות מימין לשמאל (עברית).',
          'התחשבות בהעדפת מערכת ההפעלה ל”צמצום תנועה”.',
        ],
      },
      {
        heading: '3. מגבלות ידועות',
        paragraphs: [
          'על אף מאמצינו, ייתכן שחלקים מסוימים בשירות עדיין אינם נגישים במלואם. אנו פועלים לטיפול בליקויים הידועים. אם נתקלת בחסם, נשמח שתיידע אותנו באמצעות פרטי הקשר שלהלן.',
        ],
      },
      {
        heading: '4. משוב ורכז נגישות',
        paragraphs: ['אם נתקלת בקושי בשימוש בשירות, או שיש לך הצעות לשיפור הנגישות, אנא פנה אל רכז הנגישות שלנו:'],
        bullets: [`רכז נגישות: ${OPERATOR_HE}`, `דוא"ל: ${CONTACT_EMAIL}`],
      },
      {
        heading: '5. מענה',
        paragraphs: ['נעשה כל מאמץ להשיב לפנייתך בתוך זמן סביר.'],
      },
    ],
  },
};
