import { Enterprise, DomainItem, MailboxAccount, AdminUser, AuditLogEntry, EmailMessage, ImportHistoryItem, RolePermissionDefinition } from '../types';

export const initialEnterprises: Enterprise[] = [
  {
    id: 'ent-1',
    name: 'Sultan Voyages',
    plan: 'Entreprise Pro',
    defaultDomain: 'sultanvoyagebf.com',
  },
  {
    id: 'ent-2',
    name: 'Mailoos',
    plan: 'Enterprise Cloud',
    defaultDomain: 'mailoos.com',
  }
];

export const initialDomains: DomainItem[] = [
  {
    id: 'dom-1',
    enterpriseId: 'ent-1',
    name: 'sultanvoyagebf.com',
    isVerified: true,
    verifiedAt: '15:54',
    recordsOkCount: 3,
    totalRecordsCount: 3,
    activeMailboxesCount: 3,
    dkimKey: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAklQdcp64fJ1e8sx2JcjcNFBb/K3/qRxWZb2nsnx8lEZE8HUt04JOnp1yvzQrHyyD7zeTLXSmqiepULLD4PSP0j+Cy0hQyT3yufyxoCqpAEjpgOG9S4CT0OPVKw1Ro80YVN3k9mL3psdv3Dx4OAgJeLbw9LcFmnto/dl0CtLHPBuzs/2DRvBkpJk3MLqLEizHGoA181HOjww8vZTUConTq3ZCY6AVXqqT1/2hLlrEoid8uCxqk6lb0tia0BODpKFghX9NHXwIb4BkJbr9RpAdPH5c6jCA4QURBmCrd0kzLVv9+AQ2TeuXAwZa3L0E8csrVhfGdur/5K7GDGXwznf6wIDAQAB',
    records: [
      {
        role: 'Réception des mails (MX)',
        type: 'MX',
        host: '@',
        value: 'mail.mailoos.com',
        priority: 10,
        status: 'correct'
      },
      {
        role: "Autorisation d'envoi (SPF)",
        type: 'TXT',
        host: '@',
        value: 'v=spf1 mx a:mail.mailoos.com include:_spf.mx.cloudflare.net ~all',
        status: 'correct'
      },
      {
        role: 'Signature des mails (DKIM)',
        type: 'TXT',
        host: 'mail._domainkey',
        value: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAklQdcp64fJ1e8sx2JcjcNFBb/K3/qRxWZb2nsnx8lEZE8HUt04JOnp1yvzQrHyyD7zeTLXSmqiepULLD4PSP0j+Cy0hQyT3yufyxoCqpAEjpgOG9S4CT0OPVKw1Ro80YVN3k9mL3psdv3Dx4OAgJeLbw9LcFmnto/dl0CtLHPBuzs/2DRvBkpJk3MLqLEizHGoA181HOjww8vZTUConTq3ZCY6AVXqqT1/2hLlrEoid8uCxqk6lb0tia0BODpKFghX9NHXwIb4BkJbr9RpAdPH5c6jCA4QURBmCrd0kzLVv9+AQ2TeuXAwZa3L0E8csrVhfGdur/5K7GDGXwznf6wIDAQAB',
        status: 'correct'
      },
      {
        role: 'Politique anti-usurpation (DMARC) (recommandé)',
        type: 'TXT',
        host: '_dmarc',
        value: 'v=DMARC1; p=quarantine; adkim=r; aspf=r',
        status: 'correct',
        isRecommended: true
      }
    ]
  },
  {
    id: 'dom-2',
    enterpriseId: 'ent-2',
    name: 'mailoos.com',
    isVerified: true,
    verifiedAt: 'Cloudflare NS Actif',
    recordsOkCount: 5,
    totalRecordsCount: 5,
    activeMailboxesCount: 3,
    dkimKey: 'v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAiweykoi+o48IOGuP7GR3X0MOExCUDY/BCRHoWBnh3rChl7WhdyCxW3jgq1daEjPPqoi7sJvdg5hEQVsgVRQP4DcnQDVjGMbASQtrY4WmB1VebF+RPJB2ECPsEDTpeiI5ZyUAwJaVX7r6bznU67g7LvFq35yIo4sdlmtZGV+i0H4cpYH9+3JJ78km4KXwaf9xUJCWF6nxeD+qG6Fyruw1Qlbds2r85U9dkNDVAS3gioCvELryh1TxKGiVTkg4wqHTyHfWsp7KD3WQHYJn0RyfJJu6YEmL77zonn7p2SRMvTMP3ZEXibnC9gz3nnhR6wcYL8Q7zXypKTMD58bTixDSJwIDAQAB',
    records: [
      {
        role: 'Réception des mails (MX Principal - Cloudflare)',
        type: 'MX',
        host: '@',
        value: 'route2.mx.cloudflare.net',
        priority: 57,
        status: 'correct'
      },
      {
        role: 'Réception des mails (MX Secondaire - Cloudflare)',
        type: 'MX',
        host: '@',
        value: 'route1.mx.cloudflare.net',
        priority: 59,
        status: 'correct'
      },
      {
        role: 'Réception des mails (MX Tertiaire - Cloudflare)',
        type: 'MX',
        host: '@',
        value: 'route3.mx.cloudflare.net',
        priority: 65,
        status: 'correct'
      },
      {
        role: "Autorisation d'envoi (SPF)",
        type: 'TXT',
        host: '@',
        value: 'v=spf1 include:_spf.mx.cloudflare.net ~all',
        status: 'correct'
      },
      {
        role: 'Signature des mails (DKIM Cloudflare)',
        type: 'TXT',
        host: 'cf2024-1._domainkey',
        value: 'v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAiweykoi+o48IOGuP7GR3X0MOExCUDY/BCRHoWBnh3rChl7WhdyCxW3jgq1daEjPPqoi7sJvdg5hEQVsgVRQP4DcnQDVjGMbASQtrY4WmB1VebF+RPJB2ECPsEDTpeiI5ZyUAwJaVX7r6bznU67g7LvFq35yIo4sdlmtZGV+i0H4cpYH9+3JJ78km4KXwaf9xUJCWF6nxeD+qG6Fyruw1Qlbds2r85U9dkNDVAS3gioCvELryh1TxKGiVTkg4wqHTyHfWsp7KD3WQHYJn0RyfJJu6YEmL77zonn7p2SRMvTMP3ZEXibnC9gz3nnhR6wcYL8Q7zXypKTMD58bTixDSJwIDAQAB',
        status: 'correct'
      },
      {
        role: 'Politique anti-usurpation (DMARC) (recommandé)',
        type: 'TXT',
        host: '_dmarc',
        value: 'v=DMARC1; p=quarantine; adkim=r; aspf=r',
        status: 'missing',
        isRecommended: true
      }
    ]
  }
];

export const initialMailboxes: MailboxAccount[] = [
  // Sultan Voyages (ent-1)
  {
    id: 'mb-1459',
    enterpriseId: 'ent-1',
    firstName: '',
    lastName: 'KINDAMOCTAR',
    name: 'KINDAMOCTAR',
    email: 'kindamoctar@sultanvoyagebf.com',
    password: 'Y#zwXmAhZu9qv4',
    mailsCount: 2,
    unreadCount: 1,
    storageUsedBytes: 420000,
    storageLimitBytes: 5 * 1024 * 1024 * 1024,
    status: 'active',
    createdAt: '23/10/2026 16:21:46',
    domainName: 'sultanvoyagebf.com'
  },
  {
    id: 'mb-1460',
    enterpriseId: 'ent-1',
    firstName: 'Ousmane',
    lastName: 'Kinda',
    name: 'Ousmane Kinda',
    email: 'kindaousmane@sultanvoyagebf.com',
    password: 'K7$pLm9#wQ2vXy',
    mailsCount: 1,
    unreadCount: 0,
    storageUsedBytes: 154000,
    storageLimitBytes: 5 * 1024 * 1024 * 1024,
    status: 'active',
    createdAt: '23/10/2026 16:22:55',
    domainName: 'sultanvoyagebf.com'
  },
  {
    id: 'mb-1461',
    enterpriseId: 'ent-1',
    firstName: 'SARATA',
    lastName: 'SAWADOGO',
    name: 'SARATA SAWADOGO',
    email: 'sawadogosarata@sultanvoyagebf.com',
    password: 'S9@dFx4!mRt8Zn',
    mailsCount: 1,
    unreadCount: 1,
    storageUsedBytes: 280000,
    storageLimitBytes: 5 * 1024 * 1024 * 1024,
    status: 'active',
    createdAt: '23/10/2026 16:24:17',
    domainName: 'sultanvoyagebf.com'
  },
  // Mailoos (ent-2)
  {
    id: 'mb-2001',
    enterpriseId: 'ent-2',
    firstName: 'Salif',
    lastName: 'Guiro',
    name: 'Salif Guiro',
    email: 'salif.guiro@mailoos.com',
    password: 'A$Lab#2026!Pass',
    mailsCount: 2,
    unreadCount: 1,
    storageUsedBytes: 310000,
    storageLimitBytes: 10 * 1024 * 1024 * 1024,
    status: 'active',
    createdAt: '23/10/2026 14:50:00',
    domainName: 'mailoos.com'
  },
  {
    id: 'mb-2002',
    enterpriseId: 'ent-2',
    firstName: 'Support',
    lastName: 'Technique',
    name: 'Support Technique',
    email: 'support@mailoos.com',
    password: 'Sup#Mailoos89!Xq',
    mailsCount: 1,
    unreadCount: 0,
    storageUsedBytes: 195000,
    storageLimitBytes: 10 * 1024 * 1024 * 1024,
    status: 'active',
    createdAt: '23/10/2026 14:52:10',
    domainName: 'mailoos.com'
  },
  {
    id: 'mb-2003',
    enterpriseId: 'ent-2',
    firstName: 'Direction',
    lastName: 'Générale',
    name: 'Direction Générale',
    email: 'direction@mailoos.com',
    password: 'Dir!Mailoos77#Vz',
    mailsCount: 1,
    unreadCount: 0,
    storageUsedBytes: 520000,
    storageLimitBytes: 10 * 1024 * 1024 * 1024,
    status: 'active',
    createdAt: '23/10/2026 14:55:30',
    domainName: 'mailoos.com'
  }
];

export const initialEmails: EmailMessage[] = [
  // Sultan Voyages
  {
    id: 'msg-1',
    enterpriseId: 'ent-1',
    mailboxId: 'mb-1459',
    mailboxEmail: 'kindamoctar@sultanvoyagebf.com',
    from: 'support@mailoos.com',
    fromName: 'Mailoos Support',
    to: ['kindamoctar@sultanvoyagebf.com'],
    subject: 'Bienvenue sur votre messagerie professionnelle Sultan Voyages',
    body: `Bonjour Moctar,\n\nVotre boîte mail professionnelle sultanvoyagebf.com est maintenant opérationnelle et prête à l'emploi.\n\nParamètres de synchronisation :\n- Serveur entrant IMAP : mail.mailoos.com (Port 993, SSL/TLS)\n- Serveur sortant SMTP : mail.mailoos.com (Port 587, STARTTLS)\n- Identifiant : kindamoctar@sultanvoyagebf.com\n\nVous pouvez envoyer et recevoir vos e-mails directement depuis ce webmail ou les configurer dans Outlook, Apple Mail ou votre smartphone.\n\nCordialement,\nL'équipe Support Mailoos`,
    date: 'Aujourd\'hui à 16:30',
    timestamp: Date.now() - 3600000,
    isRead: false,
    folder: 'inbox',
  },
  {
    id: 'msg-2',
    enterpriseId: 'ent-1',
    mailboxId: 'mb-1459',
    mailboxEmail: 'kindamoctar@sultanvoyagebf.com',
    from: 'billetterie@iata-partner.net',
    fromName: 'IATA Global Booking',
    to: ['kindamoctar@sultanvoyagebf.com'],
    subject: 'Confirmation de réservation billets - Vol Ouagadougou - Paris CDG',
    body: `Bonjour M. Kinda Moctar,\n\nNous vous confirmons l'émission des 4 billets d'avion pour le dossier SV-78491.\n\nPassagers :\n1. M. Traoré Hamidou\n2. Mme Traoré Awa\n3. M. Kaboré Issouf\n4. Mlle Sanou Rachelle\n\nDépart : Ouagadougou (OUA) -> Paris (CDG)\nCompagnie : Air France AF 709\nDate : 28 Octobre 2026 à 23h50\n\nLe reçu électronique est joint au format PDF.\n\nService Réservations Sultan Voyages.`,
    date: 'Aujourd\'hui à 15:45',
    timestamp: Date.now() - 7200000,
    isRead: true,
    folder: 'inbox',
    attachments: [
      {
        id: 'att-1',
        name: 'e-billets_SV-78491.pdf',
        size: '245 Ko',
        type: 'application/pdf'
      }
    ]
  },
  {
    id: 'msg-3',
    enterpriseId: 'ent-1',
    mailboxId: 'mb-1460',
    mailboxEmail: 'kindaousmane@sultanvoyagebf.com',
    from: 'support@mailoos.com',
    fromName: 'Mailoos Support',
    to: ['kindaousmane@sultanvoyagebf.com'],
    subject: 'Activation de votre boîte mail d\'entreprise',
    body: `Bonjour Ousmane,\n\nVotre adresse email officielle kindaousmane@sultanvoyagebf.com est désormais active avec un quota de 5 Go.\n\nN'hésitez pas à nous contacter en cas de question.\n\nL'équipe Mailoos`,
    date: 'Aujourd\'hui à 16:25',
    timestamp: Date.now() - 4000000,
    isRead: true,
    folder: 'inbox'
  },
  {
    id: 'msg-4',
    enterpriseId: 'ent-1',
    mailboxId: 'mb-1461',
    mailboxEmail: 'sawadogosarata@sultanvoyagebf.com',
    from: 'direction@sultanvoyagebf.com',
    fromName: 'Direction Sultan Voyages',
    to: ['sawadogosarata@sultanvoyagebf.com'],
    subject: 'Planning des départs Hajj & Omra 2026/2027',
    body: `Chère Sarata,\n\nVeuillez trouver la mise à jour des plannings de vols pour les groupes de pèlerinage prévus pour le mois prochain.\n\nMerci de préparer les listes nominatives avec les passeports et visas.\n\nBien cordialement,\nM. Guiro`,
    date: 'Aujourd\'hui à 16:26',
    timestamp: Date.now() - 3800000,
    isRead: false,
    folder: 'inbox'
  },
  // Mailoos
  {
    id: 'msg-101',
    enterpriseId: 'ent-2',
    mailboxId: 'mb-2001',
    mailboxEmail: 'salif.guiro@mailoos.com',
    from: 'notifications@mailoos.com',
    fromName: 'Mailoos Cloud Console',
    to: ['salif.guiro@mailoos.com'],
    subject: 'Bienvenue sur la messagerie d\'entreprise Mailoos',
    body: `Bonjour Salif,\n\nVotre boîte mail d'administration mailoos.com est opérationnelle et reliée à vos serveurs DNS Cloudflare (DKIM, SPF, DMARC).\n\nQuota alloué : 10 Go Cloud.\n\nÉquipe Infrastructure Mailoos`,
    date: 'Aujourd\'hui à 14:50',
    timestamp: Date.now() - 6000000,
    isRead: false,
    folder: 'inbox'
  },
  {
    id: 'msg-102',
    enterpriseId: 'ent-2',
    mailboxId: 'mb-2002',
    mailboxEmail: 'support@mailoos.com',
    from: 'client@burkina-tech.bf',
    fromName: 'Burkina Tech SA',
    to: ['support@mailoos.com'],
    subject: 'Demande de devis hébergement & messagerie Mailoos',
    body: `Bonjour l'équipe Mailoos,\n\nNous souhaitons déployer la solution Mailoos pour 50 collaborateurs au sein de notre structure.\n\nPouvez-vous nous transmettre la documentation technique et les modalités de souscription ?\n\nSalutations cordiales,\nDirection Informatique Burkina Tech`,
    date: 'Aujourd\'hui à 15:10',
    timestamp: Date.now() - 5000000,
    isRead: true,
    folder: 'inbox'
  }
];

export const initialAdmins: AdminUser[] = [
  {
    id: 'adm-creator',
    enterpriseId: 'all',
    email: 'salifguiro00@gmail.com',
    name: 'Salif Guiro (Concepteur / Super Admin)',
    role: 'Concepteur',
    createdAt: '15/10/2026',
    status: 'active',
    has2FA: false,
    password: 'Admin1234!',
    isCurrentUser: true,
    isCreator: true,
    lastLogin: 'Aujourd\'hui à 16:45',
    lastLoginIp: '102.180.170.117',
    passwordUpdatedAt: 'Il y a 3 jours',
    sessionCount: 1,
    themeColor: '#2563eb',
  },
  {
    id: 'adm-superadmin',
    enterpriseId: 'all',
    email: 'superadmin@mailoos.com',
    name: 'Super Admin',
    role: 'Concepteur',
    createdAt: '15/10/2026',
    status: 'active',
    has2FA: false,
    password: 'Admin1234!',
    isCurrentUser: false,
    isCreator: true,
    lastLogin: 'Hier à 14:10',
    lastLoginIp: '102.180.170.117',
    passwordUpdatedAt: 'Il y a 5 jours',
    sessionCount: 0,
    themeColor: '#2563eb',
  },
  {
    id: 'adm-2',
    enterpriseId: 'ent-2',
    email: 'admin@mailoos.com',
    name: 'Salif Guiro',
    role: 'Concepteur',
    createdAt: '20/10/2026',
    status: 'active',
    has2FA: false,
    password: 'Admin1234!',
    isCurrentUser: false,
    isCreator: true,
    lastLogin: 'Il y a 2 jours',
    lastLoginIp: '41.203.220.12',
    passwordUpdatedAt: 'Il y a 10 jours',
    sessionCount: 0,
    themeColor: '#6366f1',
  },
  {
    id: 'adm-1',
    enterpriseId: 'ent-1',
    email: 'admin@sultanvoyagebf.com',
    name: 'Mr Guiro',
    role: 'Entreprise',
    createdAt: '23/10/2026',
    status: 'active',
    has2FA: false,
    password: 'Admin1234!',
    isCurrentUser: false,
    isCreator: false,
    lastLogin: 'Aujourd\'hui à 11:20',
    lastLoginIp: '197.239.80.45',
    passwordUpdatedAt: 'Il y a 12 jours',
    sessionCount: 1,
    themeColor: '#10b981',
  },
  {
    id: 'adm-3',
    enterpriseId: 'ent-2',
    email: 'support@mailoos.com',
    name: 'Karim Ouédraogo',
    role: 'Support',
    createdAt: '22/10/2026',
    status: 'active',
    has2FA: false,
    password: 'Support1234!',
    isCurrentUser: false,
    lastLogin: 'Hier à 09:15',
    lastLoginIp: '102.180.170.88',
    passwordUpdatedAt: 'Il y a 20 jours',
    sessionCount: 0,
    themeColor: '#8b5cf6',
  },
  {
    id: 'adm-4',
    enterpriseId: 'ent-1',
    email: 'rh@sultanvoyagebf.com',
    name: 'Fatimata Zoungrana',
    role: 'Gestionnaire RH',
    createdAt: '24/10/2026',
    status: 'active',
    has2FA: false,
    password: 'Rh1234!',
    isCurrentUser: false,
    lastLogin: 'Il y a 4 jours',
    lastLoginIp: '197.239.80.45',
    passwordUpdatedAt: 'Il y a 15 jours',
    sessionCount: 0,
    themeColor: '#d97706',
  },
  {
    id: 'adm-5',
    enterpriseId: 'ent-2',
    email: 'audit@mailoos.com',
    name: 'Cabinet Audit & Qualité',
    role: 'Auditeur',
    createdAt: '25/10/2026',
    status: 'active',
    has2FA: false,
    password: 'Audit1234!',
    isCurrentUser: false,
    lastLogin: 'Il y a 6 jours',
    lastLoginIp: '196.200.45.10',
    passwordUpdatedAt: 'Il y a 1 mois',
    sessionCount: 0,
  }
];

export const initialRolePermissions: RolePermissionDefinition[] = [
  {
    role: 'Concepteur',
    label: 'Concepteur & Propriétaire',
    description: 'Accès absolu et illimité à l\'ensemble des entreprises, boîtes, domaines, paramètres et configurations de la plateforme.',
    badgeColor: '#2563eb',
    isSystem: true,
    permissions: {
      domains: { view: true, create: true, edit: true, delete: true, export: true },
      accounts: { view: true, create: true, edit: true, delete: true, export: true },
      import: { view: true, create: true, edit: true, delete: true, export: true },
      admins: { view: true, create: true, edit: true, delete: true, export: true },
      audit: { view: true, create: false, edit: false, delete: false, export: true },
      settings: { view: true, create: true, edit: true, delete: true, export: true },
    }
  },
  {
    role: 'Super Admin',
    label: 'Super Administrateur',
    description: 'Accès illimité et total à l\'ensemble des modules, configurations système et actions critiques.',
    badgeColor: '#2563eb',
    isSystem: true,
    permissions: {
      domains: { view: true, create: true, edit: true, delete: true, export: true },
      accounts: { view: true, create: true, edit: true, delete: true, export: true },
      import: { view: true, create: true, edit: true, delete: true, export: true },
      admins: { view: true, create: true, edit: true, delete: true, export: true },
      audit: { view: true, create: false, edit: false, delete: false, export: true },
      settings: { view: true, create: true, edit: true, delete: true, export: true },
    }
  },
  {
    role: 'Entreprise',
    label: 'Admin Entreprise',
    description: 'Gestion complète des boîtes, comptes et domaines de son entreprise sans suppression des domaines racines.',
    badgeColor: '#059669',
    isSystem: true,
    permissions: {
      domains: { view: true, create: true, edit: true, delete: false, export: true },
      accounts: { view: true, create: true, edit: true, delete: true, export: true },
      import: { view: true, create: true, edit: true, delete: true, export: true },
      admins: { view: true, create: true, edit: true, delete: false, export: true },
      audit: { view: true, create: false, edit: false, delete: false, export: true },
      settings: { view: true, create: false, edit: true, delete: false, export: true },
    }
  },
  {
    role: 'Support',
    label: 'Support Technique',
    description: 'Consultation technique, déblocage de boîtes mail, réinitialisation de mots de passe et assistance utilisateur.',
    badgeColor: '#d97706',
    isSystem: true,
    permissions: {
      domains: { view: true, create: false, edit: false, delete: false, export: true },
      accounts: { view: true, create: false, edit: true, delete: false, export: true },
      import: { view: true, create: false, edit: false, delete: false, export: false },
      admins: { view: true, create: false, edit: false, delete: false, export: false },
      audit: { view: true, create: false, edit: false, delete: false, export: true },
      settings: { view: true, create: false, edit: false, delete: false, export: false },
    }
  },
  {
    role: 'Gestionnaire RH',
    label: 'Gestionnaire RH & Équipes',
    description: 'Création et mise à jour des boîtes mail des collaborateurs, imports de fichiers Excel et exports.',
    badgeColor: '#8b5cf6',
    isSystem: false,
    permissions: {
      domains: { view: true, create: false, edit: false, delete: false, export: false },
      accounts: { view: true, create: true, edit: true, delete: false, export: true },
      import: { view: true, create: true, edit: true, delete: false, export: true },
      admins: { view: false, create: false, edit: false, delete: false, export: false },
      audit: { view: false, create: false, edit: false, delete: false, export: false },
      settings: { view: false, create: false, edit: false, delete: false, export: false },
    }
  },
  {
    role: 'Auditeur',
    label: 'Auditeur & Conformité',
    description: 'Consultation en lecture seule stricte et extraction/export de rapports pour audits de conformité.',
    badgeColor: '#64748b',
    isSystem: false,
    permissions: {
      domains: { view: true, create: false, edit: false, delete: false, export: true },
      accounts: { view: true, create: false, edit: false, delete: false, export: true },
      import: { view: true, create: false, edit: false, delete: false, export: true },
      admins: { view: true, create: false, edit: false, delete: false, export: true },
      audit: { view: true, create: false, edit: false, delete: false, export: true },
      settings: { view: true, create: false, edit: false, delete: false, export: true },
    }
  }
];

export const initialAuditLogs: AuditLogEntry[] = [
  // Sultan Voyages
  {
    id: 'log-1',
    enterpriseId: 'ent-1',
    date: '23/10/2026 16:32:11',
    timestamp: 1729701131000,
    adminEmail: 'admin@sultanvoyagebf.com',
    action: 'Mot de passe consulté',
    target: 'kindamoctar@sultanvoyagebf.com',
    detail: '',
    ip: '102.23.28.6'
  },
  {
    id: 'log-2',
    enterpriseId: 'ent-1',
    date: '23/10/2026 16:28:05',
    timestamp: 1729700885000,
    adminEmail: 'admin@mailoos.com',
    action: 'Ouverture de boîte',
    target: 'sawadogosarata@sultanvoyagebf.com',
    detail: '',
    ip: '102.178.214.179'
  },
  {
    id: 'log-3',
    enterpriseId: 'ent-1',
    date: '23/10/2026 16:24:17',
    timestamp: 1729700657000,
    adminEmail: 'admin@mailoos.com',
    action: 'Création de boîte',
    target: 'sawadogosarata@sultanvoyagebf.com',
    detail: '',
    ip: '102.178.214.179'
  },
  {
    id: 'log-4',
    enterpriseId: 'ent-1',
    date: '23/10/2026 16:22:55',
    timestamp: 1729700575000,
    adminEmail: 'admin@mailoos.com',
    action: 'Création de boîte',
    target: 'kindaousmane@sultanvoyagebf.com',
    detail: '',
    ip: '102.178.214.179'
  },
  {
    id: 'log-5',
    enterpriseId: 'ent-1',
    date: '23/10/2026 16:21:46',
    timestamp: 1729700506000,
    adminEmail: 'admin@mailoos.com',
    action: 'Création de boîte',
    target: 'kindamoctar@sultanvoyagebf.com',
    detail: '',
    ip: '102.178.214.179'
  },
  {
    id: 'log-6',
    enterpriseId: 'ent-1',
    date: '23/10/2026 15:50:38',
    timestamp: 1729698638000,
    adminEmail: 'admin@mailoos.com',
    action: 'Domaine vérifié',
    target: 'sultanvoyagebf.com',
    detail: '',
    ip: '102.178.214.179'
  },
  {
    id: 'log-7',
    enterpriseId: 'ent-1',
    date: '23/10/2026 15:47:40',
    timestamp: 1729698460000,
    adminEmail: 'admin@mailoos.com',
    action: 'Ajout de domaine',
    target: 'sultanvoyagebf.com',
    detail: '',
    ip: '102.178.214.179'
  },
  // Mailoos
  {
    id: 'log-101',
    enterpriseId: 'ent-2',
    date: '23/10/2026 14:55:30',
    timestamp: 1729695330000,
    adminEmail: 'admin@mailoos.com',
    action: 'Création de boîte',
    target: 'direction@mailoos.com',
    detail: '',
    ip: '102.178.214.179'
  },
  {
    id: 'log-102',
    enterpriseId: 'ent-2',
    date: '23/10/2026 14:52:10',
    timestamp: 1729695130000,
    adminEmail: 'admin@mailoos.com',
    action: 'Création de boîte',
    target: 'support@mailoos.com',
    detail: '',
    ip: '102.178.214.179'
  },
  {
    id: 'log-103',
    enterpriseId: 'ent-2',
    date: '23/10/2026 14:50:00',
    timestamp: 1729695000000,
    adminEmail: 'admin@mailoos.com',
    action: 'Création de boîte',
    target: 'salif.guiro@mailoos.com',
    detail: '',
    ip: '102.178.214.179'
  },
  {
    id: 'log-104',
    enterpriseId: 'ent-2',
    date: '23/10/2026 14:45:00',
    timestamp: 1729694700000,
    adminEmail: 'admin@mailoos.com',
    action: 'Domaine vérifié',
    target: 'mailoos.com',
    detail: '',
    ip: '102.178.214.179'
  }
];

export const initialImports: ImportHistoryItem[] = [
  {
    id: 'imp-sultan-1',
    enterpriseId: 'ent-1',
    fileName: 'LISTE DES PÈLERINS 2027 POUR E-MAIL - SULTAN VOYAGES.xlsx',
    date: '23/10/2026 15:58',
    rowsCount: 29,
    successCount: 29,
    status: 'success'
  },
  {
    id: 'imp-mailoos-1',
    enterpriseId: 'ent-2',
    fileName: 'EQUIPE_TECHNIQUE_MAILOOS_2026.xlsx',
    date: '23/10/2026 14:48',
    rowsCount: 5,
    successCount: 5,
    status: 'success'
  }
];
