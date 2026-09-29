// constants/caseScreensStrings.ts
// Naye Case Management (Cases/CaseProfile/CreateCase/Escalate/EvidenceViewer),
// ConsumerProfile (admin) aur Consumer NotificationsScreen ke liye alag
// multi-language strings — bilkul us pattern se jo ProfileScreen.tsx ke
// "EXTRA" object mein hai, taake aapki asal constants/translations.ts file
// ko touch na karna pade.
//
// Use: const S = getStrings(language).cases;  →  S.title, S.subtitle, waghera

export type CaseLang = "en" | "ur_roman" | "ur" | "ar";

interface CasesStrings {
  title: string;
  subtitle: string;
  loading: string;
  overviewTitle: string;
  totalActive: (n: number) => string;
  statusOpen: string;
  statusInProgress: string;
  statusClosed: string;
  statusRejected: string;
  unassigned: string;
  evidenceCount: (n: number) => string;
  emptyTitle: string;
  emptySub: string;
}

interface CaseProfileStrings {
  loadingCase: string;
  notFound: string;
  goBack: string;
  caseDetails: string;
  area: string;
  created: string;
  category: string;
  priority: string;
  timeline: string;
  noTimeline: string;
  evidence: (n: number) => string;
  noEvidence: string;
  assignInspector: string;
  change: string;
  unassignedTapChange: string;
  closeCase: string;
  escalate: string;
  closeConfirmTitle: string;
  closeConfirmMsg: string;
  cancel: string;
  close: string;
  assignedTitle: string;
  assignedMsg: (name: string) => string;
  assigned: string;
  assign: string;
  busy: string;
  error: string;
}

interface CreateCaseStrings {
  title: string;
  consumerId: string;
  consumerName: string;
  areaLocation: string;
  riskLevel: string;
  caseCategory: string;
  description: string;
  assignInspectorOptional: string;
  priorityLevel: string;
  evidenceUpload: string;
  uploadImage: string;
  uploadDocument: string;
  createCase: string;
  creating: string;
  cancel: string;
  missingFieldsTitle: string;
  missingFieldsMsg: string;
  successTitle: string;
  successMsg: (caseNumber: string) => string;
  errorTitle: string;
  errorMsg: (msg: string) => string;
  ph_consumerId: string;
  ph_consumerName: string;
  ph_area: string;
  ph_description: string;
  ph_inspector: string;
  selectRisk: string;
  selectCategory: string;
  selectPriority: string;
}

interface EscalateStrings {
  title: string;
  caseSummary: string;
  reviewBeforeEscalation: string;
  caseId: string;
  consumerId: string;
  currentStatus: string;
  riskLevel: string;
  assignedInspector: string;
  escalationDetails: string;
  provideJustification: string;
  escalationLevel: string;
  reasonForEscalation: string;
  description: string;
  attachAdditional: string;
  uploadImage: string;
  uploadDocument: string;
  importantNotice: string;
  noticeText: string;
  confirmEscalation: string;
  escalating: string;
  cancel: string;
  missingFieldsTitle: string;
  missingFieldsMsg: string;
  confirmTitle: string;
  confirmMsg: string;
  escalatedTitle: string;
  escalatedMsg: string;
  errorTitle: string;
  ph_description: string;
  selectLevel: string;
  selectReason: string;
}

interface EvidenceViewerStrings {
  notFound: string;
  couldNotLoad: string;
  openInBrowser: string;
  docHint: string;
  openDocument: string;
}

interface ConsumerProfileAdminStrings {
  consumerProfile: string;
  address: string;
  contact: string;
  email: string;
  prediction: string;
  estimatedBill: string;
  lastReading: string;
  status: string;
  riskAnalysis: string;
  consumptionHistory: string;
  notEnoughData: string;
  theftFlags: string;
  severity: string;
  caseHistory: string;
  noCasesFiled: string;
  createCase: string;
  contactBtn: string;
  loadFailed: string;
  retry: string;
}

interface ConsumerNotificationsStrings {
  title: string;
  allCaughtUp: string;
  unread: (n: number) => string;
  markAllRead: string;
  all: string;
  unreadTab: (n: number) => string;
  loadFailed: string;
  noUnread: string;
  noneYet: string;
  retry: string;
}

interface AllStrings {
  cases: CasesStrings;
  caseProfile: CaseProfileStrings;
  createCase: CreateCaseStrings;
  escalate: EscalateStrings;
  evidenceViewer: EvidenceViewerStrings;
  consumerProfileAdmin: ConsumerProfileAdminStrings;
  consumerNotifications: ConsumerNotificationsStrings;
}

const DATA: Record<CaseLang, AllStrings> = {
  // ───────────────────────────── ENGLISH ─────────────────────────────
  en: {
    cases: {
      title: "Case Management",
      subtitle: "Track and manage theft investigation cases",
      loading: "Loading cases…",
      overviewTitle: "Case Status Overview",
      totalActive: (n) => `Total ${n} active cases`,
      statusOpen: "Open Cases",
      statusInProgress: "In Progress",
      statusClosed: "Closed",
      statusRejected: "Rejected",
      unassigned: "Unassigned",
      evidenceCount: (n) => `${n} evidence${n !== 1 ? "s" : ""}`,
      emptyTitle: "No cases found",
      emptySub: "Tap + to create a new case",
    },
    caseProfile: {
      loadingCase: "Loading case…",
      notFound: "Case not found.",
      goBack: "← Go Back",
      caseDetails: "Case Details",
      area: "Area",
      created: "Created",
      category: "Category",
      priority: "Priority",
      timeline: "Case Timeline",
      noTimeline: "No timeline events yet",
      evidence: (n) => `Evidence (${n})`,
      noEvidence: "No evidence uploaded yet",
      assignInspector: "Assign Inspector",
      change: "Change",
      unassignedTapChange: "⚠ Unassigned — tap Change",
      closeCase: "✓ Close Case",
      escalate: "⬆ Escalate",
      closeConfirmTitle: "Close Case",
      closeConfirmMsg: "Are you sure you want to close this case?",
      cancel: "Cancel",
      close: "Close",
      assignedTitle: "✅ Assigned",
      assignedMsg: (name) => `Case assigned to ${name}`,
      assigned: "Assigned",
      assign: "Assign",
      busy: "Busy",
      error: "Error",
    },
    createCase: {
      title: "Create New Case",
      consumerId: "Consumer ID *",
      consumerName: "Consumer Name *",
      areaLocation: "Area / Location *",
      riskLevel: "Risk Level",
      caseCategory: "Case Category",
      description: "Description *",
      assignInspectorOptional: "Assign Inspector",
      priorityLevel: "Priority Level",
      evidenceUpload: "Evidence Upload",
      uploadImage: "Upload Image",
      uploadDocument: "Upload Document",
      createCase: "Create Case",
      creating: "Creating Case…",
      cancel: "Cancel",
      missingFieldsTitle: "Missing Fields",
      missingFieldsMsg: "Please fill in all required fields.",
      successTitle: "✅ Case Created",
      successMsg: (c) => `Case ${c} has been created and the consumer has been notified.`,
      errorTitle: "Error",
      errorMsg: (m) => `Failed to create case: ${m}`,
      ph_consumerId: "e.g. CONS-2024-1234",
      ph_consumerName: "e.g. Ahmad Ali",
      ph_area: "Enter area or location",
      ph_description: "Provide detailed description...",
      ph_inspector: "Inspector name (optional)",
      selectRisk: "Select risk level",
      selectCategory: "Select case category",
      selectPriority: "Select priority level",
    },
    escalate: {
      title: "Escalate Case",
      caseSummary: "Case Summary",
      reviewBeforeEscalation: "Review case details before escalation",
      caseId: "Case ID",
      consumerId: "Consumer ID",
      currentStatus: "Current Status",
      riskLevel: "Risk Level",
      assignedInspector: "Assigned Inspector",
      escalationDetails: "Escalation Details",
      provideJustification: "Provide escalation justification",
      escalationLevel: "Escalation Level",
      reasonForEscalation: "Reason for Escalation",
      description: "Description *",
      attachAdditional: "Attach Additional Evidence (Optional)",
      uploadImage: "Upload Image",
      uploadDocument: "Upload Document",
      importantNotice: "Important Notice",
      noticeText: "Escalated cases will be reviewed by higher authority and cannot be reversed.",
      confirmEscalation: "Confirm Escalation",
      escalating: "Escalating…",
      cancel: "Cancel",
      missingFieldsTitle: "Missing Fields",
      missingFieldsMsg: "Please fill in escalation level, reason and description.",
      confirmTitle: "Confirm Escalation",
      confirmMsg: "Escalated cases will be reviewed by higher authority and cannot be reversed. Continue?",
      escalatedTitle: "⬆ Escalated",
      escalatedMsg: "Case has been escalated and the consumer has been notified.",
      errorTitle: "Error",
      ph_description: "Provide comprehensive detail for escalation. Include specific details, evidence, and impact assessment.",
      selectLevel: "Select escalation level",
      selectReason: "Select reason",
    },
    evidenceViewer: {
      notFound: "Evidence file not found.",
      couldNotLoad: "Could not load image.",
      openInBrowser: "Open in browser",
      docHint: "Documents open outside the app",
      openDocument: "Open Document",
    },
    consumerProfileAdmin: {
      consumerProfile: "Consumer Profile",
      address: "Address",
      contact: "Contact",
      email: "Email",
      prediction: "Prediction",
      estimatedBill: "Estimated Bill",
      lastReading: "Last Reading",
      status: "Status",
      riskAnalysis: "Risk Analysis",
      consumptionHistory: "Consumption History",
      notEnoughData: "Not enough consumption data yet",
      theftFlags: "Theft Flags",
      severity: "Severity",
      caseHistory: "Case History",
      noCasesFiled: "No cases filed",
      createCase: "📋 Create Case",
      contactBtn: "📞 Contact",
      loadFailed: "Could not load consumer profile",
      retry: "Retry",
    },
    consumerNotifications: {
      title: "Notifications",
      allCaughtUp: "All caught up",
      unread: (n) => `${n} unread`,
      markAllRead: "Mark all read",
      all: "All",
      unreadTab: (n) => `Unread${n > 0 ? ` (${n})` : ""}`,
      loadFailed: "Could not load notifications",
      noUnread: "No unread notifications",
      noneYet: "No notifications yet",
      retry: "Retry",
    },
  },

  // ───────────────────────── ROMAN URDU ─────────────────────────
  ur_roman: {
    cases: {
      title: "Case Management",
      subtitle: "Bijli chori ke cases track aur manage karein",
      loading: "Cases load ho rahe hain…",
      overviewTitle: "Case Status ka Jaiza",
      totalActive: (n) => `Kul ${n} active cases`,
      statusOpen: "Open Cases",
      statusInProgress: "Jaari Hai",
      statusClosed: "Band",
      statusRejected: "Mustarad",
      unassigned: "Unassigned",
      evidenceCount: (n) => `${n} evidence`,
      emptyTitle: "Koi case nahi mila",
      emptySub: "Naya case banane ke liye + dabayein",
    },
    caseProfile: {
      loadingCase: "Case load ho raha hai…",
      notFound: "Case nahi mila.",
      goBack: "← Wapis Jayein",
      caseDetails: "Case ki Tafseelat",
      area: "Area",
      created: "Bana Gaya",
      category: "Category",
      priority: "Priority",
      timeline: "Case Timeline",
      noTimeline: "Abhi tak koi timeline event nahi",
      evidence: (n) => `Evidence (${n})`,
      noEvidence: "Abhi tak koi evidence upload nahi hui",
      assignInspector: "Inspector Assign Karein",
      change: "Change Karein",
      unassignedTapChange: "⚠ Unassigned — Change dabayein",
      closeCase: "✓ Case Band Karein",
      escalate: "⬆ Escalate Karein",
      closeConfirmTitle: "Case Band Karein",
      closeConfirmMsg: "Kya aap yakeen se yeh case band karna chahte hain?",
      cancel: "Cancel",
      close: "Band Karein",
      assignedTitle: "✅ Assign Ho Gaya",
      assignedMsg: (name) => `Case ${name} ko assign kar diya gaya`,
      assigned: "Assigned",
      assign: "Assign",
      busy: "Busy",
      error: "Error",
    },
    createCase: {
      title: "Naya Case Banayein",
      consumerId: "Consumer ID *",
      consumerName: "Consumer ka Naam *",
      areaLocation: "Area / Location *",
      riskLevel: "Risk Level",
      caseCategory: "Case Category",
      description: "Tafseel *",
      assignInspectorOptional: "Inspector Assign Karein",
      priorityLevel: "Priority Level",
      evidenceUpload: "Evidence Upload Karein",
      uploadImage: "Image Upload Karein",
      uploadDocument: "Document Upload Karein",
      createCase: "Case Banayein",
      creating: "Case Bana Raha Hai…",
      cancel: "Cancel",
      missingFieldsTitle: "Fields Khali Hain",
      missingFieldsMsg: "Baraye meharbani tamam zaroori fields bharein.",
      successTitle: "✅ Case Ban Gaya",
      successMsg: (c) => `Case ${c} ban gaya hai aur consumer ko notify kar diya gaya hai.`,
      errorTitle: "Error",
      errorMsg: (m) => `Case banane mein masla hua: ${m}`,
      ph_consumerId: "misaal: CONS-2024-1234",
      ph_consumerName: "misaal: Ahmad Ali",
      ph_area: "Area ya location likhein",
      ph_description: "Tafseeli bayan likhein...",
      ph_inspector: "Inspector ka naam (optional)",
      selectRisk: "Risk level chunein",
      selectCategory: "Case category chunein",
      selectPriority: "Priority level chunein",
    },
    escalate: {
      title: "Case Escalate Karein",
      caseSummary: "Case ka Khulasa",
      reviewBeforeEscalation: "Escalate karne se pehle case ki tafseelat dekh lein",
      caseId: "Case ID",
      consumerId: "Consumer ID",
      currentStatus: "Mojooda Status",
      riskLevel: "Risk Level",
      assignedInspector: "Assigned Inspector",
      escalationDetails: "Escalation ki Tafseelat",
      provideJustification: "Escalation ki wajah batayein",
      escalationLevel: "Escalation Level",
      reasonForEscalation: "Escalation ki Wajah",
      description: "Tafseel *",
      attachAdditional: "Extra Evidence Attach Karein (Optional)",
      uploadImage: "Image Upload Karein",
      uploadDocument: "Document Upload Karein",
      importantNotice: "Zaroori Notice",
      noticeText: "Escalate hue cases higher authority review karegi aur wapis nahi ho sakte.",
      confirmEscalation: "Escalation Confirm Karein",
      escalating: "Escalate ho raha hai…",
      cancel: "Cancel",
      missingFieldsTitle: "Fields Khali Hain",
      missingFieldsMsg: "Baraye meharbani escalation level, wajah aur tafseel bharein.",
      confirmTitle: "Escalation Confirm Karein",
      confirmMsg: "Escalate hue cases higher authority review karegi aur wapis nahi ho sakte. Jari rakhein?",
      escalatedTitle: "⬆ Escalate Ho Gaya",
      escalatedMsg: "Case escalate ho gaya hai aur consumer ko notify kar diya gaya hai.",
      errorTitle: "Error",
      ph_description: "Escalation ke liye mukammal tafseel likhein — khaas nukaat, evidence aur asar ka jaiza shamil karein.",
      selectLevel: "Escalation level chunein",
      selectReason: "Wajah chunein",
    },
    evidenceViewer: {
      notFound: "Evidence file nahi mili.",
      couldNotLoad: "Image load nahi ho saki.",
      openInBrowser: "Browser mein kholein",
      docHint: "Documents app se bahar khulte hain",
      openDocument: "Document Kholein",
    },
    consumerProfileAdmin: {
      consumerProfile: "Consumer Profile",
      address: "Address",
      contact: "Contact",
      email: "Email",
      prediction: "Prediction",
      estimatedBill: "Estimated Bill",
      lastReading: "Aakhri Reading",
      status: "Status",
      riskAnalysis: "Risk Analysis",
      consumptionHistory: "Consumption History",
      notEnoughData: "Abhi consumption ka data kaafi nahi",
      theftFlags: "Theft Flags",
      severity: "Severity",
      caseHistory: "Case History",
      noCasesFiled: "Koi case file nahi hua",
      createCase: "📋 Case Banayein",
      contactBtn: "📞 Contact",
      loadFailed: "Consumer profile load nahi ho saki",
      retry: "Dobara Koshish Karein",
    },
    consumerNotifications: {
      title: "Notifications",
      allCaughtUp: "Sab dekh liya",
      unread: (n) => `${n} unread`,
      markAllRead: "Sab ko read karein",
      all: "Sab",
      unreadTab: (n) => `Unread${n > 0 ? ` (${n})` : ""}`,
      loadFailed: "Notifications load nahi ho sakin",
      noUnread: "Koi unread notification nahi",
      noneYet: "Abhi koi notification nahi",
      retry: "Dobara Koshish Karein",
    },
  },

  // ─────────────────────────────── URDU ───────────────────────────────
  ur: {
    cases: {
      title: "کیس مینجمنٹ",
      subtitle: "بجلی چوری کے کیسز ٹریک اور منظم کریں",
      loading: "کیسز لوڈ ہو رہے ہیں…",
      overviewTitle: "کیس اسٹیٹس کا جائزہ",
      totalActive: (n) => `کل ${n} فعال کیسز`,
      statusOpen: "کھلے کیسز",
      statusInProgress: "جاری ہے",
      statusClosed: "بند",
      statusRejected: "مسترد",
      unassigned: "غیر تفویض شدہ",
      evidenceCount: (n) => `${n} شواہد`,
      emptyTitle: "کوئی کیس نہیں ملا",
      emptySub: "نیا کیس بنانے کے لیے + دبائیں",
    },
    caseProfile: {
      loadingCase: "کیس لوڈ ہو رہا ہے…",
      notFound: "کیس نہیں ملا۔",
      goBack: "← واپس جائیں",
      caseDetails: "کیس کی تفصیلات",
      area: "علاقہ",
      created: "تاریخ تخلیق",
      category: "قسم",
      priority: "ترجیح",
      timeline: "کیس ٹائم لائن",
      noTimeline: "ابھی تک کوئی ٹائم لائن ایونٹ نہیں",
      evidence: (n) => `شواہد (${n})`,
      noEvidence: "ابھی تک کوئی شواہد اپ لوڈ نہیں ہوئے",
      assignInspector: "انسپکٹر مقرر کریں",
      change: "تبدیل کریں",
      unassignedTapChange: "⚠ غیر تفویض شدہ — تبدیل کریں دبائیں",
      closeCase: "✓ کیس بند کریں",
      escalate: "⬆ اضافہ کریں",
      closeConfirmTitle: "کیس بند کریں",
      closeConfirmMsg: "کیا آپ واقعی یہ کیس بند کرنا چاہتے ہیں؟",
      cancel: "منسوخ کریں",
      close: "بند کریں",
      assignedTitle: "✅ تفویض ہو گیا",
      assignedMsg: (name) => `کیس ${name} کو تفویض کر دیا گیا`,
      assigned: "تفویض شدہ",
      assign: "تفویض کریں",
      busy: "مصروف",
      error: "خرابی",
    },
    createCase: {
      title: "نیا کیس بنائیں",
      consumerId: "کنزیومر آئی ڈی *",
      consumerName: "کنزیومر کا نام *",
      areaLocation: "علاقہ / مقام *",
      riskLevel: "رسک لیول",
      caseCategory: "کیس کی قسم",
      description: "تفصیل *",
      assignInspectorOptional: "انسپکٹر مقرر کریں",
      priorityLevel: "ترجیحی سطح",
      evidenceUpload: "شواہد اپ لوڈ کریں",
      uploadImage: "تصویر اپ لوڈ کریں",
      uploadDocument: "دستاویز اپ لوڈ کریں",
      createCase: "کیس بنائیں",
      creating: "کیس بن رہا ہے…",
      cancel: "منسوخ کریں",
      missingFieldsTitle: "خانے خالی ہیں",
      missingFieldsMsg: "براہ کرم تمام ضروری خانے پُر کریں۔",
      successTitle: "✅ کیس بن گیا",
      successMsg: (c) => `کیس ${c} بن گیا ہے اور صارف کو مطلع کر دیا گیا ہے۔`,
      errorTitle: "خرابی",
      errorMsg: (m) => `کیس بنانے میں ناکامی: ${m}`,
      ph_consumerId: "مثال: CONS-2024-1234",
      ph_consumerName: "مثال: احمد علی",
      ph_area: "علاقہ یا مقام لکھیں",
      ph_description: "تفصیلی بیان لکھیں...",
      ph_inspector: "انسپکٹر کا نام (اختیاری)",
      selectRisk: "رسک لیول منتخب کریں",
      selectCategory: "کیس کی قسم منتخب کریں",
      selectPriority: "ترجیحی سطح منتخب کریں",
    },
    escalate: {
      title: "کیس اضافہ کریں",
      caseSummary: "کیس کا خلاصہ",
      reviewBeforeEscalation: "اضافہ کرنے سے پہلے کیس کی تفصیلات دیکھ لیں",
      caseId: "کیس آئی ڈی",
      consumerId: "کنزیومر آئی ڈی",
      currentStatus: "موجودہ حیثیت",
      riskLevel: "رسک لیول",
      assignedInspector: "مقرر شدہ انسپکٹر",
      escalationDetails: "اضافے کی تفصیلات",
      provideJustification: "اضافے کی وجہ بتائیں",
      escalationLevel: "اضافے کی سطح",
      reasonForEscalation: "اضافے کی وجہ",
      description: "تفصیل *",
      attachAdditional: "اضافی شواہد منسلک کریں (اختیاری)",
      uploadImage: "تصویر اپ لوڈ کریں",
      uploadDocument: "دستاویز اپ لوڈ کریں",
      importantNotice: "اہم نوٹس",
      noticeText: "اضافہ شدہ کیسز کا جائزہ اعلیٰ حکام لیں گے اور انہیں واپس نہیں لیا جا سکتا۔",
      confirmEscalation: "اضافہ تصدیق کریں",
      escalating: "اضافہ ہو رہا ہے…",
      cancel: "منسوخ کریں",
      missingFieldsTitle: "خانے خالی ہیں",
      missingFieldsMsg: "براہ کرم اضافے کی سطح، وجہ اور تفصیل پُر کریں۔",
      confirmTitle: "اضافہ تصدیق کریں",
      confirmMsg: "اضافہ شدہ کیسز کا جائزہ اعلیٰ حکام لیں گے اور انہیں واپس نہیں لیا جا سکتا۔ جاری رکھیں؟",
      escalatedTitle: "⬆ اضافہ ہو گیا",
      escalatedMsg: "کیس میں اضافہ ہو گیا ہے اور صارف کو مطلع کر دیا گیا ہے۔",
      errorTitle: "خرابی",
      ph_description: "اضافے کے لیے مکمل تفصیل لکھیں — مخصوص نکات، شواہد اور اثر کا جائزہ شامل کریں۔",
      selectLevel: "اضافے کی سطح منتخب کریں",
      selectReason: "وجہ منتخب کریں",
    },
    evidenceViewer: {
      notFound: "شواہد کی فائل نہیں ملی۔",
      couldNotLoad: "تصویر لوڈ نہیں ہو سکی۔",
      openInBrowser: "براؤزر میں کھولیں",
      docHint: "دستاویزات ایپ سے باہر کھلتی ہیں",
      openDocument: "دستاویز کھولیں",
    },
    consumerProfileAdmin: {
      consumerProfile: "کنزیومر پروفائل",
      address: "پتہ",
      contact: "رابطہ",
      email: "ای میل",
      prediction: "پیشگوئی",
      estimatedBill: "تخمینی بل",
      lastReading: "آخری ریڈنگ",
      status: "حیثیت",
      riskAnalysis: "رسک تجزیہ",
      consumptionHistory: "کھپت کی تاریخ",
      notEnoughData: "ابھی کھپت کا کافی ڈیٹا نہیں",
      theftFlags: "چوری کی نشانیاں",
      severity: "شدت",
      caseHistory: "کیس کی تاریخ",
      noCasesFiled: "کوئی کیس فائل نہیں ہوا",
      createCase: "📋 کیس بنائیں",
      contactBtn: "📞 رابطہ",
      loadFailed: "کنزیومر پروفائل لوڈ نہیں ہو سکی",
      retry: "دوبارہ کوشش کریں",
    },
    consumerNotifications: {
      title: "اطلاعات",
      allCaughtUp: "سب دیکھ لیا",
      unread: (n) => `${n} ان پڑھ`,
      markAllRead: "سب کو پڑھا ہوا نشان زد کریں",
      all: "تمام",
      unreadTab: (n) => `ان پڑھ${n > 0 ? ` (${n})` : ""}`,
      loadFailed: "اطلاعات لوڈ نہیں ہو سکیں",
      noUnread: "کوئی ان پڑھ اطلاع نہیں",
      noneYet: "ابھی کوئی اطلاع نہیں",
      retry: "دوبارہ کوشش کریں",
    },
  },

  // ────────────────────────────── ARABIC ──────────────────────────────
  ar: {
    cases: {
      title: "إدارة القضايا",
      subtitle: "تتبع وإدارة قضايا سرقة الكهرباء",
      loading: "جارٍ تحميل القضايا…",
      overviewTitle: "نظرة عامة على حالة القضايا",
      totalActive: (n) => `إجمالي ${n} قضية نشطة`,
      statusOpen: "قضايا مفتوحة",
      statusInProgress: "قيد التنفيذ",
      statusClosed: "مغلقة",
      statusRejected: "مرفوضة",
      unassigned: "غير معيّن",
      evidenceCount: (n) => `${n} دليل`,
      emptyTitle: "لم يتم العثور على قضايا",
      emptySub: "اضغط + لإنشاء قضية جديدة",
    },
    caseProfile: {
      loadingCase: "جارٍ تحميل القضية…",
      notFound: "القضية غير موجودة.",
      goBack: "← رجوع",
      caseDetails: "تفاصيل القضية",
      area: "المنطقة",
      created: "تاريخ الإنشاء",
      category: "الفئة",
      priority: "الأولوية",
      timeline: "الجدول الزمني للقضية",
      noTimeline: "لا توجد أحداث حتى الآن",
      evidence: (n) => `الأدلة (${n})`,
      noEvidence: "لم يتم رفع أي دليل حتى الآن",
      assignInspector: "تعيين مفتش",
      change: "تغيير",
      unassignedTapChange: "⚠ غير معيّن — اضغط تغيير",
      closeCase: "✓ إغلاق القضية",
      escalate: "⬆ تصعيد",
      closeConfirmTitle: "إغلاق القضية",
      closeConfirmMsg: "هل أنت متأكد أنك تريد إغلاق هذه القضية؟",
      cancel: "إلغاء",
      close: "إغلاق",
      assignedTitle: "✅ تم التعيين",
      assignedMsg: (name) => `تم تعيين القضية إلى ${name}`,
      assigned: "معيّن",
      assign: "تعيين",
      busy: "مشغول",
      error: "خطأ",
    },
    createCase: {
      title: "إنشاء قضية جديدة",
      consumerId: "رقم المستهلك *",
      consumerName: "اسم المستهلك *",
      areaLocation: "المنطقة / الموقع *",
      riskLevel: "مستوى الخطورة",
      caseCategory: "فئة القضية",
      description: "الوصف *",
      assignInspectorOptional: "تعيين مفتش",
      priorityLevel: "مستوى الأولوية",
      evidenceUpload: "رفع الأدلة",
      uploadImage: "رفع صورة",
      uploadDocument: "رفع مستند",
      createCase: "إنشاء القضية",
      creating: "جارٍ إنشاء القضية…",
      cancel: "إلغاء",
      missingFieldsTitle: "حقول ناقصة",
      missingFieldsMsg: "يرجى تعبئة جميع الحقول المطلوبة.",
      successTitle: "✅ تم إنشاء القضية",
      successMsg: (c) => `تم إنشاء القضية ${c} وتم إخطار المستهلك.`,
      errorTitle: "خطأ",
      errorMsg: (m) => `فشل إنشاء القضية: ${m}`,
      ph_consumerId: "مثال: CONS-2024-1234",
      ph_consumerName: "مثال: أحمد علي",
      ph_area: "أدخل المنطقة أو الموقع",
      ph_description: "اكتب وصفًا تفصيليًا...",
      ph_inspector: "اسم المفتش (اختياري)",
      selectRisk: "اختر مستوى الخطورة",
      selectCategory: "اختر فئة القضية",
      selectPriority: "اختر مستوى الأولوية",
    },
    escalate: {
      title: "تصعيد القضية",
      caseSummary: "ملخص القضية",
      reviewBeforeEscalation: "راجع تفاصيل القضية قبل التصعيد",
      caseId: "رقم القضية",
      consumerId: "رقم المستهلك",
      currentStatus: "الحالة الحالية",
      riskLevel: "مستوى الخطورة",
      assignedInspector: "المفتش المعيّن",
      escalationDetails: "تفاصيل التصعيد",
      provideJustification: "قدّم مبررات التصعيد",
      escalationLevel: "مستوى التصعيد",
      reasonForEscalation: "سبب التصعيد",
      description: "الوصف *",
      attachAdditional: "إرفاق أدلة إضافية (اختياري)",
      uploadImage: "رفع صورة",
      uploadDocument: "رفع مستند",
      importantNotice: "تنبيه مهم",
      noticeText: "ستتم مراجعة القضايا المصعّدة من قبل جهة أعلى ولا يمكن التراجع عنها.",
      confirmEscalation: "تأكيد التصعيد",
      escalating: "جارٍ التصعيد…",
      cancel: "إلغاء",
      missingFieldsTitle: "حقول ناقصة",
      missingFieldsMsg: "يرجى تعبئة مستوى التصعيد والسبب والوصف.",
      confirmTitle: "تأكيد التصعيد",
      confirmMsg: "ستتم مراجعة القضايا المصعّدة من قبل جهة أعلى ولا يمكن التراجع عنها. هل تريد الاستمرار؟",
      escalatedTitle: "⬆ تم التصعيد",
      escalatedMsg: "تم تصعيد القضية وتم إخطار المستهلك.",
      errorTitle: "خطأ",
      ph_description: "قدّم تفاصيل شاملة للتصعيد — يشمل تفاصيل محددة، أدلة، وتقييم الأثر.",
      selectLevel: "اختر مستوى التصعيد",
      selectReason: "اختر السبب",
    },
    evidenceViewer: {
      notFound: "لم يتم العثور على ملف الدليل.",
      couldNotLoad: "تعذر تحميل الصورة.",
      openInBrowser: "فتح في المتصفح",
      docHint: "تُفتح المستندات خارج التطبيق",
      openDocument: "فتح المستند",
    },
    consumerProfileAdmin: {
      consumerProfile: "ملف المستهلك",
      address: "العنوان",
      contact: "التواصل",
      email: "البريد الإلكتروني",
      prediction: "التوقع",
      estimatedBill: "الفاتورة المقدرة",
      lastReading: "آخر قراءة",
      status: "الحالة",
      riskAnalysis: "تحليل المخاطر",
      consumptionHistory: "سجل الاستهلاك",
      notEnoughData: "لا توجد بيانات استهلاك كافية بعد",
      theftFlags: "علامات السرقة",
      severity: "الخطورة",
      caseHistory: "سجل القضايا",
      noCasesFiled: "لا توجد قضايا مسجلة",
      createCase: "📋 إنشاء قضية",
      contactBtn: "📞 تواصل",
      loadFailed: "تعذر تحميل ملف المستهلك",
      retry: "إعادة المحاولة",
    },
    consumerNotifications: {
      title: "الإشعارات",
      allCaughtUp: "لا جديد",
      unread: (n) => `${n} غير مقروء`,
      markAllRead: "تعليم الكل كمقروء",
      all: "الكل",
      unreadTab: (n) => `غير مقروء${n > 0 ? ` (${n})` : ""}`,
      loadFailed: "تعذر تحميل الإشعارات",
      noUnread: "لا توجد إشعارات غير مقروءة",
      noneYet: "لا توجد إشعارات بعد",
      retry: "إعادة المحاولة",
    },
  },
};

export function getStrings(lang: string | undefined | null): AllStrings {
  return DATA[(lang as CaseLang) in DATA ? (lang as CaseLang) : "en"];
}
