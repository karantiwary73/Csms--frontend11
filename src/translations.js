/**
 * Translation strings for multi-language support
 * Add more languages as needed
 */

const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    userManagement: 'User Management',
    organization: 'Organization',
    systemSettings: 'System Settings',
    logout: 'Logout',

    // Dashboard
    welcomeBack: 'Welcome back',
    hereIsWhatsHappening: "Here's what's happening in your",
    system: 'system',
    unit: 'unit',
    today: 'today',
    totalUsers: 'Total Users',
    unitUsers: 'Unit Users',
    activeUsers: 'Active Users',
    yourAccess: 'Your Access',
    roleLevel: 'Role Level',
    quickActions: 'Quick Actions',
    addNewUser: 'Add New User',
    createNewWorker: 'Create a new worker account',
    createNewUser: 'Create a new user account',
    viewProfile: 'View Profile',
    updatePersonalInfo: 'Update your personal information',
    configureSystemPreferences: 'Configure system preferences',
    manageOrganizationSettings: 'Manage organization settings',
    recentActivity: 'Recent Activity',
    systemStatus: 'System Status',
    databaseConnection: 'Database Connection',
    authenticationService: 'Authentication Service',
    emailService: 'Email Service',

    // Change Unit Profile
    changeUnitProfile: 'Change Unit Profile',
    selectUnitToSwitch: 'Select Unit to Switch Profile',
    selectUnit: 'Select a unit',
    switch: 'Switch',
    switching: 'Switching...',
    selectDifferentUnit: 'Please select a different unit',
    unitSwitchedSuccessfully: 'Unit switched successfully!',
    failedToSwitchUnit: 'Failed to switch unit',
    errorSwitchingUnit: 'Error switching unit',

    // Login
    login: 'Login',
    email: 'Email',
    password: 'Password',
    loggingIn: 'Logging in...',
    forgotPassword: 'Forgot Password?',
    resetPassword: 'Reset Password',
    sending: 'Sending...',
    sendResetEmail: 'Send Reset Email',
    backToLogin: 'Back to Login',

    // System Settings
    generalSettings: 'General Settings',
    systemName: 'System Name',
    timezone: 'Timezone',
    dateFormat: 'Date Format',
    language: 'Language',
    saveGeneralSettings: 'Save General Settings',
    securitySettings: 'Security Settings',
    sessionTimeout: 'Session Timeout (minutes)',
    passwordMinLength: 'Password Minimum Length',
    requireSpecialChars: 'Require Special Characters in Passwords',
    maxLoginAttempts: 'Max Login Attempts',
    accountLockoutDuration: 'Account Lockout Duration (minutes)',
    saveSecuritySettings: 'Save Security Settings',
    notificationSettings: 'Notification Settings',
    enableEmailNotifications: 'Enable Email Notifications',
    systemAlerts: 'System Alerts',
    userRegistrationNotifications: 'User Registration Notifications',
    passwordResetNotifications: 'Password Reset Notifications',
    saveNotificationSettings: 'Save Notification Settings',
    auditLoggingSettings: 'Audit & Logging Settings',
    logLevel: 'Log Level',
    logRetention: 'Log Retention (days)',
    enableActivityLogging: 'Enable Activity Logging',
    logFailedLogins: 'Log Failed Login Attempts',
    saveAuditSettings: 'Save Audit Settings',

    // Messages
    settingsSavedSuccessfully: 'Settings saved successfully!',
    failedToSaveSettings: 'Failed to save settings',
    errorSavingSettings: 'Error saving settings. Settings are saved locally for now.',
  },

  hi: {
    // Navigation
    dashboard: 'डैशबोर्ड',
    userManagement: 'उपयोगकर्ता प्रबंधन',
    organization: 'संगठन',
    systemSettings: 'सिस्टम सेटिंग्स',
    logout: 'लॉगआउट',

    // Dashboard
    welcomeBack: 'स्वागत है',
    hereIsWhatsHappening: 'यहाँ आपके',
    system: 'सिस्टम',
    unit: 'यूनिट',
    today: 'में आज क्या हो रहा है',
    totalUsers: 'कुल उपयोगकर्ता',
    unitUsers: 'यूनिट उपयोगकर्ता',
    activeUsers: 'सक्रिय उपयोगकर्ता',
    yourAccess: 'आपकी पहुंच',
    roleLevel: 'भूमिका स्तर',
    quickActions: 'त्वरित कार्य',
    addNewUser: 'नया उपयोगकर्ता जोड़ें',
    createNewWorker: 'एक नया कार्यकर्ता खाता बनाएं',
    createNewUser: 'एक नया उपयोगकर्ता खाता बनाएं',
    viewProfile: 'प्रोफाइल देखें',
    updatePersonalInfo: 'अपनी व्यक्तिगत जानकारी अपडेट करें',
    configureSystemPreferences: 'सिस्टम प्राथमिकताएं कॉन्फ़िगर करें',
    manageOrganizationSettings: 'संगठन सेटिंग्स प्रबंधित करें',
    recentActivity: 'हाल की गतिविधि',
    systemStatus: 'सिस्टम स्थिति',
    databaseConnection: 'डेटाबेस कनेक्शन',
    authenticationService: 'प्रमाणीकरण सेवा',
    emailService: 'ईमेल सेवा',

    // Change Unit Profile
    changeUnitProfile: 'यूनिट प्रोफाइल बदलें',
    selectUnitToSwitch: 'प्रोफाइल स्विच करने के लिए यूनिट चुनें',
    selectUnit: 'एक यूनिट चुनें',
    switch: 'स्विच करें',
    switching: 'स्विच हो रहा है...',
    selectDifferentUnit: 'कृपया एक अलग यूनिट चुनें',
    unitSwitchedSuccessfully: 'यूनिट सफलतापूर्वक स्विच हो गई!',
    failedToSwitchUnit: 'यूनिट स्विच करने में विफल',
    errorSwitchingUnit: 'यूनिट स्विच करने में त्रुटि',

    // Login
    login: 'लॉगिन',
    email: 'ईमेल',
    password: 'पासवर्ड',
    loggingIn: 'लॉगिन हो रहे हैं...',
    forgotPassword: 'पासवर्ड भूल गए?',
    resetPassword: 'पासवर्ड रीसेट करें',
    sending: 'भेज रहे हैं...',
    sendResetEmail: 'रीसेट ईमेल भेजें',
    backToLogin: 'लॉगिन पर वापस जाएं',

    // System Settings
    generalSettings: 'सामान्य सेटिंग्स',
    systemName: 'सिस्टम का नाम',
    timezone: 'समय क्षेत्र',
    dateFormat: 'तारीख प्रारूप',
    language: 'भाषा',
    saveGeneralSettings: 'सामान्य सेटिंग्स सहेजें',
    securitySettings: 'सुरक्षा सेटिंग्स',
    sessionTimeout: 'सत्र समय सीमा (मिनट)',
    passwordMinLength: 'पासवर्ड न्यूनतम लंबाई',
    requireSpecialChars: 'पासवर्ड में विशेष वर्ण आवश्यक हैं',
    maxLoginAttempts: 'अधिकतम लॉगिन प्रयास',
    accountLockoutDuration: 'खाता लॉकआउट अवधि (मिनट)',
    saveSecuritySettings: 'सुरक्षा सेटिंग्स सहेजें',
    notificationSettings: 'सूचना सेटिंग्स',
    enableEmailNotifications: 'ईमेल सूचनाएं सक्षम करें',
    systemAlerts: 'सिस्टम सतर्कताएं',
    userRegistrationNotifications: 'उपयोगकर्ता पंजीकरण सूचनाएं',
    passwordResetNotifications: 'पासवर्ड रीसेट सूचनाएं',
    saveNotificationSettings: 'सूचना सेटिंग्स सहेजें',
    auditLoggingSettings: 'ऑडिट और लॉगिंग सेटिंग्स',
    logLevel: 'लॉग स्तर',
    logRetention: 'लॉग प्रतिधारण (दिन)',
    enableActivityLogging: 'गतिविधि लॉगिंग सक्षम करें',
    logFailedLogins: 'विफल लॉगिन प्रयास लॉग करें',
    saveAuditSettings: 'ऑडिट सेटिंग्स सहेजें',

    // Messages
    settingsSavedSuccessfully: 'सेटिंग्स सफलतापूर्वक सहेजी गईं!',
    failedToSaveSettings: 'सेटिंग्स सहेजने में विफल',
    errorSavingSettings: 'सेटिंग्स सहेजने में त्रुटि। सेटिंग्स अभी के लिए स्थानीय रूप से सहेजी गई हैं।',
  },

  es: {
    // Navigation
    dashboard: 'Panel de control',
    userManagement: 'Gestión de usuarios',
    organization: 'Organización',
    systemSettings: 'Configuración del sistema',
    logout: 'Cerrar sesión',

    // Dashboard
    welcomeBack: 'Bienvenido de vuelta',
    hereIsWhatsHappening: "Aquí está lo que está sucediendo en tu",
    system: 'sistema',
    unit: 'unidad',
    today: 'hoy',
    totalUsers: 'Usuarios totales',
    unitUsers: 'Usuarios de unidad',
    activeUsers: 'Usuarios activos',
    yourAccess: 'Tu acceso',
    roleLevel: 'Nivel de rol',
    quickActions: 'Acciones rápidas',
    addNewUser: 'Agregar nuevo usuario',
    createNewWorker: 'Crear una nueva cuenta de trabajador',
    createNewUser: 'Crear una nueva cuenta de usuario',
    viewProfile: 'Ver perfil',
    updatePersonalInfo: 'Actualizar tu información personal',
    configureSystemPreferences: 'Configurar preferencias del sistema',
    manageOrganizationSettings: 'Gestionar configuración de la organización',
    recentActivity: 'Actividad reciente',
    systemStatus: 'Estado del sistema',
    databaseConnection: 'Conexión de base de datos',
    authenticationService: 'Servicio de autenticación',
    emailService: 'Servicio de correo electrónico',

    // Change Unit Profile
    changeUnitProfile: 'Cambiar perfil de unidad',
    selectUnitToSwitch: 'Seleccionar unidad para cambiar perfil',
    selectUnit: 'Seleccionar una unidad',
    switch: 'Cambiar',
    switching: 'Cambiando...',
    selectDifferentUnit: 'Por favor selecciona una unidad diferente',
    unitSwitchedSuccessfully: '¡Unidad cambiada exitosamente!',
    failedToSwitchUnit: 'Error al cambiar la unidad',
    errorSwitchingUnit: 'Error al cambiar la unidad',

    // Login
    login: 'Iniciar sesión',
    email: 'Correo electrónico',
    password: 'Contraseña',
    loggingIn: 'Iniciando sesión...',
    forgotPassword: '¿Olvidaste tu contraseña?',
    resetPassword: 'Restablecer contraseña',
    sending: 'Enviando...',
    sendResetEmail: 'Enviar correo de restablecimiento',
    backToLogin: 'Volver a iniciar sesión',

    // System Settings
    generalSettings: 'Configuración general',
    systemName: 'Nombre del sistema',
    timezone: 'Zona horaria',
    dateFormat: 'Formato de fecha',
    language: 'Idioma',
    saveGeneralSettings: 'Guardar configuración general',
    securitySettings: 'Configuración de seguridad',
    sessionTimeout: 'Tiempo de espera de sesión (minutos)',
    passwordMinLength: 'Longitud mínima de contraseña',
    requireSpecialChars: 'Requerir caracteres especiales en contraseñas',
    maxLoginAttempts: 'Máximo de intentos de inicio de sesión',
    accountLockoutDuration: 'Duración del bloqueo de cuenta (minutos)',
    saveSecuritySettings: 'Guardar configuración de seguridad',
    notificationSettings: 'Configuración de notificaciones',
    enableEmailNotifications: 'Habilitar notificaciones por correo electrónico',
    systemAlerts: 'Alertas del sistema',
    userRegistrationNotifications: 'Notificaciones de registro de usuario',
    passwordResetNotifications: 'Notificaciones de restablecimiento de contraseña',
    saveNotificationSettings: 'Guardar configuración de notificaciones',
    auditLoggingSettings: 'Configuración de auditoría y registro',
    logLevel: 'Nivel de registro',
    logRetention: 'Retención de registro (días)',
    enableActivityLogging: 'Habilitar registro de actividad',
    logFailedLogins: 'Registrar intentos de inicio de sesión fallidos',
    saveAuditSettings: 'Guardar configuración de auditoría',

    // Messages
    settingsSavedSuccessfully: '¡Configuración guardada exitosamente!',
    failedToSaveSettings: 'Error al guardar la configuración',
    errorSavingSettings: 'Error al guardar la configuración. La configuración se guardó localmente por ahora.',
  },

  fr: {
    // Navigation
    dashboard: 'Tableau de bord',
    userManagement: 'Gestion des utilisateurs',
    organization: 'Organisation',
    systemSettings: 'Paramètres système',
    logout: 'Déconnexion',

    // Dashboard
    welcomeBack: 'Bienvenue',
    hereIsWhatsHappening: "Voici ce qui se passe dans votre",
    system: 'système',
    unit: 'unité',
    today: "aujourd'hui",
    totalUsers: 'Utilisateurs totaux',
    unitUsers: 'Utilisateurs de l\'unité',
    activeUsers: 'Utilisateurs actifs',
    yourAccess: 'Votre accès',
    roleLevel: 'Niveau de rôle',
    quickActions: 'Actions rapides',
    addNewUser: 'Ajouter un nouvel utilisateur',
    createNewWorker: 'Créer un nouveau compte de travailleur',
    createNewUser: 'Créer un nouveau compte utilisateur',
    viewProfile: 'Voir le profil',
    updatePersonalInfo: 'Mettre à jour vos informations personnelles',
    configureSystemPreferences: 'Configurer les préférences système',
    manageOrganizationSettings: 'Gérer les paramètres de l\'organisation',
    recentActivity: 'Activité récente',
    systemStatus: 'État du système',
    databaseConnection: 'Connexion à la base de données',
    authenticationService: 'Service d\'authentification',
    emailService: 'Service de messagerie',

    // Change Unit Profile
    changeUnitProfile: 'Changer le profil d\'unité',
    selectUnitToSwitch: 'Sélectionner l\'unité pour changer de profil',
    selectUnit: 'Sélectionner une unité',
    switch: 'Changer',
    switching: 'Changement en cours...',
    selectDifferentUnit: 'Veuillez sélectionner une unité différente',
    unitSwitchedSuccessfully: 'Unité changée avec succès!',
    failedToSwitchUnit: 'Échec du changement d\'unité',
    errorSwitchingUnit: 'Erreur lors du changement d\'unité',

    // Login
    login: 'Connexion',
    email: 'E-mail',
    password: 'Mot de passe',
    loggingIn: 'Connexion en cours...',
    forgotPassword: 'Mot de passe oublié?',
    resetPassword: 'Réinitialiser le mot de passe',
    sending: 'Envoi...',
    sendResetEmail: 'Envoyer un e-mail de réinitialisation',
    backToLogin: 'Retour à la connexion',

    // System Settings
    generalSettings: 'Paramètres généraux',
    systemName: 'Nom du système',
    timezone: 'Fuseau horaire',
    dateFormat: 'Format de date',
    language: 'Langue',
    saveGeneralSettings: 'Enregistrer les paramètres généraux',
    securitySettings: 'Paramètres de sécurité',
    sessionTimeout: 'Délai d\'expiration de la session (minutes)',
    passwordMinLength: 'Longueur minimale du mot de passe',
    requireSpecialChars: 'Exiger des caractères spéciaux dans les mots de passe',
    maxLoginAttempts: 'Nombre maximum de tentatives de connexion',
    accountLockoutDuration: 'Durée du verrouillage du compte (minutes)',
    saveSecuritySettings: 'Enregistrer les paramètres de sécurité',
    notificationSettings: 'Paramètres de notification',
    enableEmailNotifications: 'Activer les notifications par e-mail',
    systemAlerts: 'Alertes système',
    userRegistrationNotifications: 'Notifications d\'enregistrement d\'utilisateur',
    passwordResetNotifications: 'Notifications de réinitialisation de mot de passe',
    saveNotificationSettings: 'Enregistrer les paramètres de notification',
    auditLoggingSettings: 'Paramètres d\'audit et de journalisation',
    logLevel: 'Niveau de journalisation',
    logRetention: 'Rétention des journaux (jours)',
    enableActivityLogging: 'Activer la journalisation des activités',
    logFailedLogins: 'Enregistrer les tentatives de connexion échouées',
    saveAuditSettings: 'Enregistrer les paramètres d\'audit',

    // Messages
    settingsSavedSuccessfully: 'Paramètres enregistrés avec succès!',
    failedToSaveSettings: 'Échec de l\'enregistrement des paramètres',
    errorSavingSettings: 'Erreur lors de l\'enregistrement des paramètres. Les paramètres ont été enregistrés localement pour l\'instant.',
  }
};

/**
 * Get translation for a key in a specific language
 * @param {string} language - Language code (en, hi, es, fr)
 * @param {string} key - Translation key
 * @returns {string} Translated string or key if not found
 */
export const t = (language, key) => {
  if (!translations[language]) {
    language = 'en'; // Fallback to English
  }
  return translations[language][key] || key;
};

/**
 * Get all translations for a language
 * @param {string} language - Language code
 * @returns {Object} All translations for the language
 */
export const getTranslations = (language) => {
  return translations[language] || translations.en;
};

export default translations;
