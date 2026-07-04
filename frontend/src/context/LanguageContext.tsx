import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

// ---- Supported languages ----
export type LanguageCode = "en" | "hi" | "mr" | "gu" | "fr" | "de" | "es";

export const LANGUAGES: { code: LanguageCode; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
];
type TranslationDict = Record<string, string>;
// ---- Translation dictionary ----
type TranslationKeys =
  // Nav / header
  | "dashboard" | "analytics" | "splitwise" | "transactions" | "liquidityLedger" | "resetDemoData"
  // Bill splitter
  | "groupBillSplitting" | "groupNamePlaceholder" | "addMembersPlaceholder" | "createGroup"
  | "addGroupExpense" | "whatWasItFor" | "amount" | "youPaid" | "splitEqually" | "addExpense"
  | "optimizedSettlements" | "owesYou" | "settle" | "lateFee" | "devFastForward"
  // Accounts / transfer
  | "accounts" | "transferFunds" | "from" | "to" | "sendMoney" | "balance"
  // Statement importer
  | "importStatement" | "uploadFile" | "dragDropFile"
  // Analytics
  | "spendingBreakdown" | "monthlyTrend" | "categoryInsights"
  // Transaction history
  | "recentTransactions" | "date" | "description" | "type" | "status"
  // Budget tracker
  | "budgetTracker" | "monthlyBudget" | "remaining" | "spent"
  // Audit console
  | "auditLog" | "activityFeed"
  // Login
  | "login" | "unlockDashboard" | "enterPassword" | "unlock";

const translations: Record<LanguageCode, TranslationDict> = {
  en: {
    dashboard: "Dashboard", analytics: "Analytics", splitwise: "Splitwise",
    transactions: "Transactions", liquidityLedger: "Liquidity & Ledger", resetDemoData: "Reset demo data",
    groupBillSplitting: "Group Bill Splitting", groupNamePlaceholder: "Group Name (e.g. Boys Trip)",
    addMembersPlaceholder: "Add Members (e.g. Peehu, Rohit)", createGroup: "Create Group",
    addGroupExpense: "Add Group Expense", whatWasItFor: "What was it for? (e.g. Dinner)",
    amount: "Amount (₹)", youPaid: "You paid", splitEqually: "Split Equally", addExpense: "Add Expense",
    optimizedSettlements: "Optimized Settlements", owesYou: "owes you", settle: "Settle",
    lateFee: "late fee", devFastForward: "Dev: Fast Forward 3 Days",
    accounts: "Accounts", transferFunds: "Transfer Funds", from: "From", to: "To",
    sendMoney: "Send Money", balance: "Balance",
    importStatement: "Import Statement", uploadFile: "Upload File", dragDropFile: "Drag & drop a file here",
    spendingBreakdown: "Spending Breakdown", monthlyTrend: "Monthly Trend", categoryInsights: "Category Insights",
    recentTransactions: "Recent Transactions", date: "Date", description: "Description", type: "Type", status: "Status",
    budgetTracker: "Budget Tracker", monthlyBudget: "Monthly Budget", remaining: "Remaining", spent: "Spent",
    auditLog: "Audit Log", activityFeed: "Activity Feed",
    login: "Login", unlockDashboard: "Unlock Dashboard", enterPassword: "Enter Password", unlock: "Unlock",
  },
  hi: {
    dashboard: "डैशबोर्ड", analytics: "विश्लेषण", splitwise: "स्प्लिटवाइज़",
    transactions: "लेन-देन", liquidityLedger: "तरलता एवं लेजर", resetDemoData: "डेमो डेटा रीसेट करें",
    groupBillSplitting: "समूह बिल विभाजन", groupNamePlaceholder: "समूह का नाम (जैसे Boys Trip)",
    addMembersPlaceholder: "सदस्य जोड़ें (जैसे Peehu, Rohit)", createGroup: "समूह बनाएं",
    addGroupExpense: "समूह खर्च जोड़ें", whatWasItFor: "यह किसलिए था? (जैसे रात का खाना)",
    amount: "राशि (₹)", youPaid: "आपने भुगतान किया", splitEqually: "समान रूप से विभाजित करें", addExpense: "खर्च जोड़ें",
    optimizedSettlements: "अनुकूलित निपटान", owesYou: "आपका बकाया है", settle: "निपटान करें",
    lateFee: "विलंब शुल्क", devFastForward: "डेव: 3 दिन आगे बढ़ाएं",
    accounts: "खाते", transferFunds: "धनराशि स्थानांतरण", from: "से", to: "को",
    sendMoney: "पैसे भेजें", balance: "शेष राशि",
    importStatement: "स्टेटमेंट आयात करें", uploadFile: "फ़ाइल अपलोड करें", dragDropFile: "फ़ाइल यहां खींचें और छोड़ें",
    spendingBreakdown: "खर्च विवरण", monthlyTrend: "मासिक रुझान", categoryInsights: "श्रेणी अंतर्दृष्टि",
    recentTransactions: "हाल के लेन-देन", date: "तारीख", description: "विवरण", type: "प्रकार", status: "स्थिति",
    budgetTracker: "बजट ट्रैकर", monthlyBudget: "मासिक बजट", remaining: "शेष", spent: "खर्च किया गया",
    auditLog: "ऑडिट लॉग", activityFeed: "गतिविधि फ़ीड",
    login: "लॉगिन", unlockDashboard: "डैशबोर्ड अनलॉक करें", enterPassword: "पासवर्ड दर्ज करें", unlock: "अनलॉक करें",
  },
  mr: {
    dashboard: "डॅशबोर्ड", analytics: "विश्लेषण", splitwise: "स्प्लिटवाइज",
    transactions: "व्यवहार", liquidityLedger: "तरलता आणि खातेवही", resetDemoData: "डेमो डेटा रीसेट करा",
    groupBillSplitting: "गट बिल विभाजन", groupNamePlaceholder: "गटाचे नाव (उदा. Boys Trip)",
    addMembersPlaceholder: "सदस्य जोडा (उदा. Peehu, Rohit)", createGroup: "गट तयार करा",
    addGroupExpense: "गट खर्च जोडा", whatWasItFor: "हे कशासाठी होते? (उदा. जेवण)",
    amount: "रक्कम (₹)", youPaid: "तुम्ही पैसे दिले", splitEqually: "समान विभागणी करा", addExpense: "खर्च जोडा",
    optimizedSettlements: "अनुकूलित सेटलमेंट्स", owesYou: "तुमचे देणे आहे", settle: "सेटल करा",
    lateFee: "विलंब शुल्क", devFastForward: "डेव्ह: 3 दिवस पुढे न्या",
    accounts: "खाती", transferFunds: "निधी हस्तांतरण", from: "कडून", to: "कडे",
    sendMoney: "पैसे पाठवा", balance: "शिल्लक",
    importStatement: "स्टेटमेंट आयात करा", uploadFile: "फाइल अपलोड करा", dragDropFile: "फाइल इथे ड्रॅग करा",
    spendingBreakdown: "खर्चाचे विश्लेषण", monthlyTrend: "मासिक कल", categoryInsights: "श्रेणी माहिती",
    recentTransactions: "अलीकडील व्यवहार", date: "तारीख", description: "वर्णन", type: "प्रकार", status: "स्थिती",
    budgetTracker: "बजेट ट्रॅकर", monthlyBudget: "मासिक बजेट", remaining: "उर्वरित", spent: "खर्च झाले",
    auditLog: "ऑडिट लॉग", activityFeed: "अ‍ॅक्टिव्हिटी फीड",
    login: "लॉगिन", unlockDashboard: "डॅशबोर्ड अनलॉक करा", enterPassword: "पासवर्ड टाका", unlock: "अनलॉक करा",
  },
  gu: {
    dashboard: "ડેશબોર્ડ", analytics: "એનાલિટિક્સ", splitwise: "સ્પ્લિટવાઇઝ",
    transactions: "વ્યવહારો", liquidityLedger: "લિક્વિડિટી અને લેજર", resetDemoData: "ડેમો ડેટા રીસેટ કરો",
    groupBillSplitting: "ગ્રુપ બિલ સ્પ્લિટિંગ", groupNamePlaceholder: "ગ્રુપ નામ (દા.ત. Boys Trip)",
    addMembersPlaceholder: "સભ્યો ઉમેરો (દા.ત. Peehu, Rohit)", createGroup: "ગ્રુપ બનાવો",
    addGroupExpense: "ગ્રુપ ખર્ચ ઉમેરો", whatWasItFor: "તે શેના માટે હતું? (દા.ત. ડિનર)",
    amount: "રકમ (₹)", youPaid: "તમે ચૂકવ્યું", splitEqually: "સમાન રીતે વહેંચો", addExpense: "ખર્ચ ઉમેરો",
    optimizedSettlements: "ઓપ્ટિમાઇઝ્ડ સેટલમેન્ટ્સ", owesYou: "તમારું બાકી છે", settle: "સેટલ કરો",
    lateFee: "મોડું ફી", devFastForward: "ડેવ: 3 દિવસ આગળ વધો",
    accounts: "ખાતાઓ", transferFunds: "ફંડ ટ્રાન્સફર", from: "થી", to: "ને",
    sendMoney: "પૈસા મોકલો", balance: "બેલેન્સ",
    importStatement: "સ્ટેટમેન્ટ આયાત કરો", uploadFile: "ફાઇલ અપલોડ કરો", dragDropFile: "ફાઇલ અહીં ખેંચો અને છોડો",
    spendingBreakdown: "ખર્ચ વિભાજન", monthlyTrend: "માસિક વલણ", categoryInsights: "કેટેગરી માહિતી",
    recentTransactions: "તાજેતરના વ્યવહારો", date: "તારીખ", description: "વર્ણન", type: "પ્રકાર", status: "સ્થિતિ",
    budgetTracker: "બજેટ ટ્રેકર", monthlyBudget: "માસિક બજેટ", remaining: "બાકી", spent: "ખર્ચ થયું",
    auditLog: "ઓડિટ લોગ", activityFeed: "એક્ટિવિટી ફીડ",
    login: "લોગિન", unlockDashboard: "ડેશબોર્ડ અનલોક કરો", enterPassword: "પાસવર્ડ દાખલ કરો", unlock: "અનલોક કરો",
  },
  fr: {
    dashboard: "Tableau de bord", analytics: "Analytique", splitwise: "Partage",
    transactions: "Transactions", liquidityLedger: "Liquidité et Grand Livre", resetDemoData: "Réinitialiser les données",
    groupBillSplitting: "Partage de facture de groupe", groupNamePlaceholder: "Nom du groupe (ex. Boys Trip)",
    addMembersPlaceholder: "Ajouter des membres (ex. Peehu, Rohit)", createGroup: "Créer un groupe",
    addGroupExpense: "Ajouter une dépense", whatWasItFor: "C'était pour quoi ? (ex. Dîner)",
    amount: "Montant (₹)", youPaid: "Vous avez payé", splitEqually: "Partager également", addExpense: "Ajouter la dépense",
    optimizedSettlements: "Règlements optimisés", owesYou: "vous doit", settle: "Régler",
    lateFee: "frais de retard", devFastForward: "Dev : Avancer de 3 jours",
    accounts: "Comptes", transferFunds: "Transférer des fonds", from: "De", to: "À",
    sendMoney: "Envoyer de l'argent", balance: "Solde",
    importStatement: "Importer un relevé", uploadFile: "Téléverser un fichier", dragDropFile: "Glissez-déposez un fichier ici",
    spendingBreakdown: "Répartition des dépenses", monthlyTrend: "Tendance mensuelle", categoryInsights: "Aperçu par catégorie",
    recentTransactions: "Transactions récentes", date: "Date", description: "Description", type: "Type", status: "Statut",
    budgetTracker: "Suivi du budget", monthlyBudget: "Budget mensuel", remaining: "Restant", spent: "Dépensé",
    auditLog: "Journal d'audit", activityFeed: "Flux d'activité",
    login: "Connexion", unlockDashboard: "Déverrouiller le tableau de bord", enterPassword: "Entrer le mot de passe", unlock: "Déverrouiller",
  },
  de: {
    dashboard: "Übersicht", analytics: "Analytik", splitwise: "Kostenteilung",
    transactions: "Transaktionen", liquidityLedger: "Liquidität & Hauptbuch", resetDemoData: "Demodaten zurücksetzen",
    groupBillSplitting: "Gruppenrechnung teilen", groupNamePlaceholder: "Gruppenname (z. B. Boys Trip)",
    addMembersPlaceholder: "Mitglieder hinzufügen (z. B. Peehu, Rohit)", createGroup: "Gruppe erstellen",
    addGroupExpense: "Gruppenausgabe hinzufügen", whatWasItFor: "Wofür war das? (z. B. Abendessen)",
    amount: "Betrag (₹)", youPaid: "Sie haben bezahlt", splitEqually: "Gleichmäßig aufteilen", addExpense: "Ausgabe hinzufügen",
    optimizedSettlements: "Optimierte Ausgleichszahlungen", owesYou: "schuldet Ihnen", settle: "Begleichen",
    lateFee: "Verzugsgebühr", devFastForward: "Dev: 3 Tage vorspulen",
    accounts: "Konten", transferFunds: "Geld überweisen", from: "Von", to: "An",
    sendMoney: "Geld senden", balance: "Kontostand",
    importStatement: "Kontoauszug importieren", uploadFile: "Datei hochladen", dragDropFile: "Datei hierher ziehen",
    spendingBreakdown: "Ausgabenübersicht", monthlyTrend: "Monatlicher Trend", categoryInsights: "Kategorieeinblicke",
    recentTransactions: "Letzte Transaktionen", date: "Datum", description: "Beschreibung", type: "Typ", status: "Status",
    budgetTracker: "Budget-Tracker", monthlyBudget: "Monatsbudget", remaining: "Verbleibend", spent: "Ausgegeben",
    auditLog: "Prüfprotokoll", activityFeed: "Aktivitätsfeed",
    login: "Anmelden", unlockDashboard: "Dashboard entsperren", enterPassword: "Passwort eingeben", unlock: "Entsperren",
  },
  es: {
    dashboard: "Panel", analytics: "Analítica", splitwise: "Reparto de gastos",
    transactions: "Transacciones", liquidityLedger: "Liquidez y Libro Mayor", resetDemoData: "Restablecer datos de demo",
    groupBillSplitting: "División de cuentas grupales", groupNamePlaceholder: "Nombre del grupo (ej. Boys Trip)",
    addMembersPlaceholder: "Añadir miembros (ej. Peehu, Rohit)", createGroup: "Crear grupo",
    addGroupExpense: "Añadir gasto grupal", whatWasItFor: "¿Para qué fue? (ej. Cena)",
    amount: "Monto (₹)", youPaid: "Tú pagaste", splitEqually: "Dividir en partes iguales", addExpense: "Añadir gasto",
    optimizedSettlements: "Liquidaciones optimizadas", owesYou: "te debe", settle: "Liquidar",
    lateFee: "cargo por retraso", devFastForward: "Dev: Avanzar 3 días",
    accounts: "Cuentas", transferFunds: "Transferir fondos", from: "De", to: "A",
    sendMoney: "Enviar dinero", balance: "Saldo",
    importStatement: "Importar estado de cuenta", uploadFile: "Subir archivo", dragDropFile: "Arrastra y suelta un archivo aquí",
    spendingBreakdown: "Desglose de gastos", monthlyTrend: "Tendencia mensual", categoryInsights: "Información por categoría",
    recentTransactions: "Transacciones recientes", date: "Fecha", description: "Descripción", type: "Tipo", status: "Estado",
    budgetTracker: "Seguimiento de presupuesto", monthlyBudget: "Presupuesto mensual", remaining: "Restante", spent: "Gastado",
    auditLog: "Registro de auditoría", activityFeed: "Feed de actividad",
    login: "Iniciar sesión", unlockDashboard: "Desbloquear panel", enterPassword: "Introducir contraseña", unlock: "Desbloquear",
  },
};

// ---- Context shape ----
interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  translate: (key: TranslationKeys) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "app_language";

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") return "en";
    const stored = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    return stored && translations[stored] ? stored : "en";
  });

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, lang);
    }
  }, []);

  const translate = useCallback(
    (key: TranslationKeys): string => {
      return translations[language]?.[key] ?? translations.en[key] ?? key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
};