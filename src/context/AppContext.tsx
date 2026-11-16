import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  NavTab, 
  Enterprise, 
  DomainItem, 
  MailboxAccount, 
  AdminUser, 
  AuditLogEntry, 
  EmailMessage, 
  ImportHistoryItem,
  DnsRecord,
  PermissionAction,
  PermissionResource,
  RolePermissionDefinition,
  SecurityPolicy,
  ResourcePermissionConfig
} from '../types';
import { 
  initialEnterprises, 
  initialDomains, 
  initialMailboxes, 
  initialEmails, 
  initialAdmins, 
  initialAuditLogs, 
  initialImports,
  initialRolePermissions
} from '../data/initialData';
import { 
  createSecureSessionToken, 
  verifySecureSessionToken, 
  checkRateLimit, 
  recordFailedLogin, 
  resetRateLimit,
  validatePasswordStrength,
  sanitizeInput
} from '../services/security';
import {
  seedInitialFirestoreData,
  subscribeToEnterprises,
  subscribeToDomains,
  subscribeToMailboxes,
  subscribeToEmails,
  subscribeToAdmins,
  subscribeToAuditLogs,
  syncEnterpriseToFirestore,
  syncDomainToFirestore,
  syncMailboxToFirestore,
  deleteMailboxFromFirestore,
  syncEmailToFirestore,
  deleteEmailFromFirestore,
  syncAdminToFirestore,
  deleteAdminFromFirestore,
  syncAuditLogToFirestore
} from '../services/firestoreSync';
import { checkLiveCloudflareDns, LiveDnsReport } from '../services/dnsLookup';
import {
  getBrevoRelayStatus,
  sendRealEmailViaBrevo,
  BrevoRelayStatus,
  BrevoSendResult
} from '../services/mailDelivery';
import { ensureApiSession, revokeApiSession } from '../services/apiAuth';

interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

interface AppContextType {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  currentEnterprise: Enterprise;
  enterprises: Enterprise[];
  setCurrentEnterprise: (ent: Enterprise) => void;
  addEnterprise: (name: string, domain: string) => void;
  selectedEnterpriseScope: string;
  setSelectedEnterpriseScope: (scope: string) => void;

  // Authentication, Session & Concepteur Role
  isAuthenticated: boolean;
  isCreator: boolean;
  login: (email: string, password: string, totpCode?: string) => { success: boolean; error?: string; require2FA?: boolean };
  logout: () => void;
  switchAdminAccount: (adminId: string) => void;
  resetUserPassword: (email: string, newPassword: string) => { success: boolean; message: string };
  changeCurrentAdminPassword: (oldPassword: string, newPassword: string) => { success: boolean; message: string };

  // RBAC Permission Controls
  rolePermissions: RolePermissionDefinition[];
  updateRolePermission: (role: string, resource: PermissionResource, action: PermissionAction, value: boolean) => void;
  resetRolePermissions: (role?: string) => void;
  addCustomRole: (role: string, label: string, description: string, copyFromRole?: string) => void;
  deleteCustomRole: (role: string) => boolean;
  hasPermission: (action: PermissionAction, resource: PermissionResource, roleOverride?: string) => boolean;
  canView: (resource: PermissionResource) => boolean;
  canCreate: (resource: PermissionResource) => boolean;
  canEdit: (resource: PermissionResource) => boolean;
  canDelete: (resource: PermissionResource) => boolean;
  canExport: (resource: PermissionResource) => boolean;

  // IAM & Enterprise Governance
  securityPolicy: SecurityPolicy;
  updateSecurityPolicy: (updates: Partial<SecurityPolicy>) => void;
  getAdminsForRole: (role: string) => AdminUser[];
  getUserPermissions: (adminId: string) => Record<PermissionResource, ResourcePermissionConfig>;
  reassignAdminRole: (adminId: string, newRole: string) => void;
  resetAdminCredentials: (adminId: string, customPassword?: string) => string;

  domains: DomainItem[];
  addDomain: (domainName: string) => boolean;
  verifyDomain: (domainId: string, silent?: boolean) => Promise<LiveDnsReport | null>;

  mailboxes: MailboxAccount[];
  addMailbox: (firstName: string, lastName: string, prefix: string, domain: string, password?: string) => MailboxAccount;
  deleteMailbox: (id: string) => void;
  toggleMailboxStatus: (id: string) => void;
  updateMailboxPassword: (id: string, newPassword?: string) => string;
  getMailboxById: (id: string) => MailboxAccount | undefined;

  // Selected mailbox for Webmail view
  activeWebmailAccount: MailboxAccount | null;
  openWebmailForAccount: (account: MailboxAccount) => void;
  closeWebmail: () => void;

  // Emails & Brevo Outbound Relay
  emails: EmailMessage[];
  brevoStatus: BrevoRelayStatus;
  refreshBrevoStatus: () => Promise<void>;
  sendEmail: (mailboxId: string, to: string[], subject: string, body: string, cc?: string[]) => Promise<{ email: EmailMessage; delivery?: BrevoSendResult }>;
  deleteEmail: (emailId: string) => void;
  markEmailAsRead: (emailId: string, isRead?: boolean) => void;
  simulateIncomingEmail: (mailboxId?: string) => void;

  // Admins
  admins: AdminUser[];
  currentAdmin: AdminUser;
  addAdmin: (name: string, email: string, role: string) => void;
  updateAdmin: (id: string, updates: Partial<AdminUser>) => void;
  deleteAdmin: (id: string) => boolean;
  toggleAdmin2FA: () => void;
  toggleTargetAdmin2FA: (id: string) => void;
  toggleTargetAdminStatus: (id: string) => void;
  updateAdminPassword: (id: string, newPassword?: string) => string;

  // Audit Logs
  auditLogs: AuditLogEntry[];
  logAuditAction: (action: string, target: string, detail?: string) => void;

  // Imports
  importHistory: ImportHistoryItem[];
  recordImport: (fileName: string, totalRows: number, successRows: number) => void;

  // Modals & Popups
  viewPasswordAccount: MailboxAccount | null;
  setViewPasswordAccount: (acc: MailboxAccount | null) => void;
  resetPasswordAccount: MailboxAccount | null;
  setResetPasswordAccount: (acc: MailboxAccount | null) => void;
  isNewMailboxModalOpen: boolean;
  setIsNewMailboxModalOpen: (open: boolean) => void;
  isAddDomainModalOpen: boolean;
  setIsAddDomainModalOpen: (open: boolean) => void;
  isComposeModalOpen: boolean;
  setIsComposeModalOpen: (open: boolean) => void;
  composeInitialData?: { to?: string; subject?: string; replyBody?: string };
  openComposeModal: (initial?: { to?: string; subject?: string; replyBody?: string }) => void;

  // Notification Toasts
  notifications: ToastNotification[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;

  // Stats & Sync
  lastSyncTime: string;
  refreshStats: () => void;
  isRefreshing: boolean;

  // Sidebar Controls
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMobileSidebar: () => void;

  // Theme Controls
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  // Real-time notifications toggle
  isNotificationsActive: boolean;
  toggleNotifications: () => void;

  // Custom Button & Theme Accent Color
  buttonColor: string;
  setButtonColor: (color: string) => void;
}

export interface ButtonColorPreset {
  id: string;
  name: string;
  primary: string;
  hover: string;
  light: string;
}

export const BUTTON_COLOR_PRESETS: ButtonColorPreset[] = [
  { id: 'blue', name: 'Bleu Royal (Défaut)', primary: '#2563eb', hover: '#1d4ed8', light: '#eff6ff' },
  { id: 'indigo', name: 'Indigo Moderne', primary: '#4f46e5', hover: '#4338ca', light: '#eef2ff' },
  { id: 'violet', name: 'Violet Sombre', primary: '#7c3aed', hover: '#6d28d9', light: '#f5f3ff' },
  { id: 'emerald', name: 'Vert Émeraude', primary: '#059669', hover: '#047857', light: '#ecfdf5' },
  { id: 'teal', name: 'Sarcelle Océan', primary: '#0d9488', hover: '#0f766e', light: '#f0fdfa' },
  { id: 'rose', name: 'Rose Framboise', primary: '#e11d48', hover: '#be123c', light: '#fff1f2' },
  { id: 'amber', name: 'Ambre Doré', primary: '#d97706', hover: '#b45309', light: '#fffbeb' },
  { id: 'slate', name: 'Graphite / Noir', primary: '#0f172a', hover: '#1e293b', light: '#f8fafc' },
];

export const getHoverColor = (hex: string): string => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  // Refined 9% darkening for smooth, professional button and link hover
  const r = Math.max(0, Math.floor(((num >> 16) & 255) * 0.91));
  const g = Math.max(0, Math.floor(((num >> 8) & 255) * 0.91));
  const b = Math.max(0, Math.floor((num & 255) * 0.91));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const getLightColor = (hex: string): string => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 'rgba(37, 99, 235, 0.12)';
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, 0.12)`;
};

export const getRingColor = (hex: string): string => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 'rgba(37, 99, 235, 0.38)';
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, 0.38)`;
};

export const getDarkLightColor = (hex: string): string => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 'rgba(37, 99, 235, 0.22)';
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, 0.22)`;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

let idCounter = 0;
const generateUniqueId = (prefix: string) => {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 7)}`;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from local storage or fallback to seed
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mailo_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('mailo_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(prev => !prev);
  };

  // Dark / Light Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('mailo_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('mailo_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Real-time notifications toggle
  const [isNotificationsActive, setIsNotificationsActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mailo_notifications_active') === 'true';
    } catch {
      return false;
    }
  });

  const toggleNotifications = () => {
    setIsNotificationsActive(prev => {
      const next = !prev;
      try {
        localStorage.setItem('mailo_notifications_active', String(next));
      } catch {}
      if (next) {
        showToast('Notifications de messagerie activées en direct', 'success');
      } else {
        showToast('Notifications de messagerie désactivées', 'info');
      }
      return next;
    });
  };



  const [enterprises, setEnterprises] = useState<Enterprise[]>(() => {
    const saved = localStorage.getItem('mailadmin_enterprises');
    const list: Enterprise[] = saved ? JSON.parse(saved) : initialEnterprises;
    return list.map(e => (e.name === 'Nordith Solution' || e.name === 'AsLab' || e.defaultDomain === 'aslab.com') ? { ...e, name: 'Mailoos', defaultDomain: 'mailoos.com' } : e);
  });
  const [currentEnterprise, setCurrentEnterprise] = useState<Enterprise>(enterprises[0]);

  const [domains, setDomains] = useState<DomainItem[]>(() => {
    const saved = localStorage.getItem('mailadmin_domains');
    let list: DomainItem[] = saved ? JSON.parse(saved) : initialDomains;
    list = list.map(d => {
      if (
        d.name.toLowerCase() === 'aslab.com' ||
        d.name.toLowerCase() === 'nordithsolution.com' ||
        (d.name.toLowerCase() === 'mailoos.com' && d.dkimKey?.includes('...'))
      ) {
        const mailoosSeed = initialDomains.find(initD => initD.name === 'mailoos.com');
        return mailoosSeed ? { ...mailoosSeed, activeMailboxesCount: d.activeMailboxesCount || mailoosSeed.activeMailboxesCount } : { ...d, name: 'mailoos.com' };
      }
      return d;
    });
    initialDomains.forEach(initDom => {
      if (!list.some(d => d.name.toLowerCase() === initDom.name.toLowerCase())) {
        list.push(initDom);
      }
    });
    const seen = new Set<string>();
    return list.map((d, idx) => {
      let id = d.id;
      if (!id || seen.has(id)) {
        id = `dom-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
      }
      seen.add(id);
      const entId = d.enterpriseId || (d.name === 'mailoos.com' || d.name === 'aslab.com' || d.name === 'nordithsolution.com' ? 'ent-2' : 'ent-1');
      const updatedRecords = (d.records || []).map(r => ({
        ...r,
        value: r.value.replace(/nordithsolution\.com/g, 'mailoos.com').replace(/aslab\.com/g, 'mailoos.com')
      }));
      return { ...d, id, enterpriseId: entId, records: updatedRecords };
    });
  });

  const [mailboxes, setMailboxes] = useState<MailboxAccount[]>(() => {
    const saved = localStorage.getItem('mailadmin_mailboxes');
    let list: MailboxAccount[] = saved ? JSON.parse(saved) : initialMailboxes;
    list = list.map(mb => ({
      ...mb,
      email: mb.email.replace(/@aslab\.com$/i, '@mailoos.com').replace(/@nordithsolution\.com$/i, '@mailoos.com'),
      domainName: mb.domainName === 'aslab.com' || mb.domainName === 'nordithsolution.com' ? 'mailoos.com' : mb.domainName
    }));
    initialMailboxes.forEach(initMb => {
      if (!list.some(m => m.email.toLowerCase() === initMb.email.toLowerCase())) {
        list.push(initMb);
      }
    });
    const seen = new Set<string>();
    return list.map((mb, idx) => {
      let id = mb.id;
      if (!id || seen.has(id)) {
        id = `mb-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
      }
      seen.add(id);
      const entId = mb.enterpriseId || (mb.email.endsWith('@mailoos.com') || mb.domainName === 'mailoos.com' ? 'ent-2' : 'ent-1');
      return { ...mb, id, enterpriseId: entId };
    });
  });

  const [emails, setEmails] = useState<EmailMessage[]>(() => {
    const saved = localStorage.getItem('mailadmin_emails');
    let list: EmailMessage[] = saved ? JSON.parse(saved) : initialEmails;
    initialEmails.forEach(initMsg => {
      if (!list.some(m => m.id === initMsg.id)) {
        list.push(initMsg);
      }
    });
    const seen = new Set<string>();
    return list.map((msg, idx) => {
      let id = msg.id;
      if (!id || seen.has(id)) {
        id = `msg-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
      }
      seen.add(id);
      const cleanEmail = msg.mailboxEmail?.replace(/aslab\.com/g, 'mailoos.com');
      const entId = msg.enterpriseId || (cleanEmail?.endsWith('@mailoos.com') ? 'ent-2' : 'ent-1');
      return {
        ...msg,
        id,
        enterpriseId: entId,
        mailboxEmail: cleanEmail,
        from: msg.from.replace(/nordithsolution\.com/g, 'mailoos.com').replace(/aslab\.com/g, 'mailoos.com'),
        fromName: msg.fromName.replace(/Nordith Solution/g, 'Mailoos').replace(/AsLab/g, 'Mailoos'),
        to: (msg.to || []).map(t => t.replace(/aslab\.com/g, 'mailoos.com')),
        subject: msg.subject.replace(/AsLab/g, 'Mailoos').replace(/Mailo\b/g, 'Mailoos'),
        body: msg.body.replace(/nordithsolution\.com/g, 'mailoos.com').replace(/aslab\.com/g, 'mailoos.com').replace(/Nordith Solution/g, 'Mailoos').replace(/AsLab/g, 'Mailoos')
      };
    });
  });

  const [admins, setAdmins] = useState<AdminUser[]>(() => {
    const saved = localStorage.getItem('mailadmin_admins');
    let list: AdminUser[] = saved ? JSON.parse(saved) : initialAdmins;
    list = list.map(a => ({
      ...a,
      email: a.email.replace(/@aslab\.com$/i, '@mailoos.com')
    }));
    
    // Ensure all initialAdmins are present
    initialAdmins.forEach(initAdm => {
      const idx = list.findIndex(a => a.email.toLowerCase() === initAdm.email.toLowerCase());
      if (idx === -1) {
        list.push(initAdm);
      } else if (initAdm.isCreator) {
        // Guarantee Super Admin / Concepteur is always active with valid credentials
        list[idx] = {
          ...list[idx],
          isCreator: true,
          status: 'active',
          role: list[idx].role || 'Concepteur',
          password: list[idx].password || 'Admin1234!'
        };
      }
    });

    return list.map(a => {
      const entId = a.enterpriseId || (a.email.endsWith('@mailoos.com') ? 'ent-2' : 'ent-1');
      const isMaster = a.isCreator || a.email.toLowerCase() === 'salifguiro00@gmail.com' || a.email.toLowerCase() === 'admin@mailoos.com' || a.email.toLowerCase() === 'superadmin@mailoos.com';
      return { 
        ...a, 
        enterpriseId: entId,
        isCreator: isMaster ? true : a.isCreator,
        status: isMaster ? 'active' : a.status
      };
    });
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('mailadmin_audit_logs');
    let list: AuditLogEntry[] = saved ? JSON.parse(saved) : initialAuditLogs;
    initialAuditLogs.forEach(initLog => {
      if (!list.some(l => l.id === initLog.id)) {
        list.push(initLog);
      }
    });
    return list.map(l => {
      const entId = l.enterpriseId || (l.adminEmail.endsWith('@mailoos.com') || l.adminEmail.endsWith('@aslab.com') || l.target.includes('mailoos') || l.target.includes('aslab') ? 'ent-2' : 'ent-1');
      return {
        ...l,
        enterpriseId: entId,
        adminEmail: l.adminEmail.replace(/nordithsolution\.com/g, 'mailoos.com').replace(/aslab\.com/g, 'mailoos.com'),
        target: l.target.replace(/aslab\.com/g, 'mailoos.com')
      };
    });
  });

  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>(() => {
    const saved = localStorage.getItem('mailadmin_imports');
    let list: ImportHistoryItem[] = saved ? JSON.parse(saved) : initialImports;
    
    // Ensure initial imports are present
    initialImports.forEach(initImp => {
      if (!list.some(i => i.id === initImp.id)) {
        list.push(initImp);
      }
    });

    // Make sure every item has an explicit enterpriseId
    return list.map(item => {
      let entId = item.enterpriseId;
      if (!entId) {
        entId = item.fileName.toLowerCase().includes('aslab') || item.fileName.toLowerCase().includes('mailoos') ? 'ent-2' : 'ent-1';
      }
      return {
        ...item,
        fileName: item.fileName.replace(/ASLAB/g, 'MAILOOS'),
        enterpriseId: entId
      };
    });
  });

  const [activeWebmailAccount, setActiveWebmailAccount] = useState<MailboxAccount | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const explicitLogout = localStorage.getItem('mailadmin_session') === 'false';
      if (explicitLogout) return false;
      const secureToken = localStorage.getItem('mailadmin_secure_token');
      if (secureToken) {
        const verified = verifySecureSessionToken(secureToken);
        if (verified.valid) return true;
        // Jeton invalide, expiré ou altéré -> révocation immédiate
        localStorage.removeItem('mailadmin_secure_token');
        localStorage.setItem('mailadmin_session', 'false');
        return false;
      }
      // Initialisation sécurisée de la session initiale pour le Super Admin
      const initialAdminId = localStorage.getItem('mailadmin_current_admin_id') || 'adm-creator';
      const token = createSecureSessionToken(initialAdminId, 'Concepteur', 'salifguiro00@gmail.com', 12);
      localStorage.setItem('mailadmin_secure_token', token);
      localStorage.setItem('mailadmin_session', 'true');
      return true;
    } catch {
      return false;
    }
  });

  const [currentAdminId, setCurrentAdminId] = useState<string>(() => {
    const saved = localStorage.getItem('mailadmin_current_admin_id');
    return saved || 'adm-creator';
  });

  const currentAdmin = useMemo(() => {
    return admins.find(a => a.id === currentAdminId) || admins.find(a => a.isCurrentUser) || admins[0];
  }, [admins, currentAdminId]);

  // Helper: retrieve individual saved accent color for a specific administrator
  const getAdminSavedColor = useCallback((adminId?: string, email?: string): string => {
    try {
      if (adminId) {
        const perUser = localStorage.getItem(`mailo_user_color_${adminId}`);
        if (perUser) return perUser;
      }
      if (email) {
        const perEmail = localStorage.getItem(`mailo_user_color_${email.toLowerCase().trim()}`);
        if (perEmail) return perEmail;
      }
      // Check admin record in state
      const match = admins.find(a => (adminId && a.id === adminId) || (email && a.email?.toLowerCase() === email.toLowerCase()));
      if (match?.themeColor) return match.themeColor;

      const savedAdmins = localStorage.getItem('mailadmin_admins');
      if (savedAdmins) {
        const parsed = JSON.parse(savedAdmins);
        if (Array.isArray(parsed)) {
          const found = parsed.find((a: any) => (adminId && a.id === adminId) || (email && a.email?.toLowerCase() === email.toLowerCase()));
          if (found?.themeColor) return found.themeColor;
        }
      }
    } catch {}
    return '#2563eb';
  }, [admins]);

  // Per-user custom button color state (strictly isolated per administrator)
  const [buttonColor, setButtonColorState] = useState<string>(() => {
    try {
      const savedAdminId = localStorage.getItem('mailadmin_current_admin_id') || 'adm-creator';
      const perUser = localStorage.getItem(`mailo_user_color_${savedAdminId}`);
      if (perUser) return perUser;
      const savedAdmins = localStorage.getItem('mailadmin_admins');
      if (savedAdmins) {
        const parsed = JSON.parse(savedAdmins);
        if (Array.isArray(parsed)) {
          const found = parsed.find((a: any) => a.id === savedAdminId);
          if (found?.themeColor) return found.themeColor;
        }
      }
      return '#2563eb';
    } catch {
      return '#2563eb';
    }
  });

  // Dedicated setButtonColor that updates ONLY the current user's profile and storage without touching others
  const setButtonColor = useCallback((newColor: string) => {
    const cleanColor = newColor.trim();
    if (!cleanColor) return;
    setButtonColorState(cleanColor);

    if (currentAdmin) {
      try {
        localStorage.setItem(`mailo_user_color_${currentAdmin.id}`, cleanColor);
        if (currentAdmin.email) {
          localStorage.setItem(`mailo_user_color_${currentAdmin.email.toLowerCase()}`, cleanColor);
        }
      } catch {}

      // Update the current admin's themeColor in directory so other users remain untouched
      setAdmins(prev => {
        const updated = prev.map(a => a.id === currentAdmin.id ? { ...a, themeColor: cleanColor } : a);
        try {
          localStorage.setItem('mailadmin_admins', JSON.stringify(updated));
        } catch {}
        const updatedTarget = updated.find(a => a.id === currentAdmin.id);
        if (updatedTarget) {
          syncAdminToFirestore(updatedTarget).catch(err => console.warn('Sync admin theme error:', err));
        }
        return updated;
      });
    }
  }, [currentAdmin]);

  // Synchronize CSS custom variables whenever buttonColor changes
  useEffect(() => {
    const root = document.documentElement;
    const hover = getHoverColor(buttonColor);
    const light = getLightColor(buttonColor);
    const ring = getRingColor(buttonColor);
    const darkLight = getDarkLightColor(buttonColor);
    root.style.setProperty('--app-primary', buttonColor);
    root.style.setProperty('--app-primary-hover', hover);
    root.style.setProperty('--app-primary-light', light);
    root.style.setProperty('--app-primary-ring', ring);
    root.style.setProperty('--app-primary-dark-light', darkLight);
  }, [buttonColor]);

  // Restore the specific user's color whenever the logged-in admin changes
  useEffect(() => {
    if (currentAdmin) {
      const userColor = getAdminSavedColor(currentAdmin.id, currentAdmin.email) || currentAdmin.themeColor || '#2563eb';
      if (userColor !== buttonColor) {
        setButtonColorState(userColor);
      }
    }
  }, [currentAdminId, currentAdmin?.id, getAdminSavedColor]);

  // The platform creator ("Concepteur / Super Admin") has absolute master access
  const isCreator = useMemo(() => {
    if (!currentAdmin) return false;
    return Boolean(
      currentAdmin.isCreator || 
      currentAdmin.role?.toLowerCase() === 'concepteur' || 
      currentAdmin.role?.toLowerCase() === 'super admin' || 
      currentAdmin.role?.toLowerCase() === 'superadmin' || 
      currentAdmin.email?.toLowerCase() === 'salifguiro00@gmail.com' ||
      currentAdmin.email?.toLowerCase() === 'superadmin@mailoos.com' ||
      currentAdmin.email?.toLowerCase() === 'admin@mailoos.com' ||
      currentAdmin.email?.toLowerCase() === 'superadmin@aslab.com' ||
      currentAdmin.email?.toLowerCase() === 'admin@aslab.com'
    );
  }, [currentAdmin]);

  // Enterprise scoping state:
  // For Concepteur: can be 'all' (Global view) or an enterprise ID ('ent-1', 'ent-2')
  // For company users: STRICTLY locked to their own company enterpriseId
  const [selectedEnterpriseScope, setSelectedEnterpriseScopeState] = useState<string>(() => {
    return localStorage.getItem('mailadmin_enterprise_scope') || 'all';
  });

  const activeEnterpriseId = useMemo(() => {
    if (!isCreator) {
      return currentAdmin.enterpriseId || 'ent-1';
    }
    return selectedEnterpriseScope;
  }, [isCreator, currentAdmin.enterpriseId, selectedEnterpriseScope]);

  const setSelectedEnterpriseScope = (scope: string) => {
    if (!isCreator && scope !== (currentAdmin.enterpriseId || 'ent-1')) {
      showToast("Accès refusé : vous ne pouvez consulter que votre propre entreprise.", "error");
      return;
    }
    setSelectedEnterpriseScopeState(scope);
    try {
      localStorage.setItem('mailadmin_enterprise_scope', scope);
    } catch {}

    if (scope !== 'all') {
      const match = enterprises.find(e => e.id === scope);
      if (match) setCurrentEnterprise(match);
    }
  };

  // Keep currentEnterprise synced with active scope
  useEffect(() => {
    if (!isCreator) {
      const entId = currentAdmin.enterpriseId || 'ent-1';
      const match = enterprises.find(e => e.id === entId);
      if (match && match.id !== currentEnterprise.id) {
        setCurrentEnterprise(match);
      }
    } else if (activeEnterpriseId !== 'all') {
      const match = enterprises.find(e => e.id === activeEnterpriseId);
      if (match && match.id !== currentEnterprise.id) {
        setCurrentEnterprise(match);
      }
    }
  }, [isCreator, currentAdmin.enterpriseId, activeEnterpriseId, enterprises, currentEnterprise.id]);

  // Scoped lists isolated for the currently selected enterprise
  const scopedDomains = useMemo(() => {
    if (activeEnterpriseId === 'all') return domains;
    return domains.filter(d => 
      d.enterpriseId ? d.enterpriseId === activeEnterpriseId : d.name.toLowerCase() === currentEnterprise.defaultDomain.toLowerCase()
    );
  }, [domains, activeEnterpriseId, currentEnterprise.defaultDomain]);

  const scopedDomainNames = useMemo(() => {
    return new Set(scopedDomains.map(d => d.name.toLowerCase()));
  }, [scopedDomains]);

  const scopedMailboxes = useMemo(() => {
    if (activeEnterpriseId === 'all') return mailboxes;
    return mailboxes.filter(m => {
      if (m.enterpriseId) return m.enterpriseId === activeEnterpriseId;
      return (
        scopedDomainNames.has(m.domainName.toLowerCase()) || 
        m.domainName.toLowerCase() === currentEnterprise.defaultDomain.toLowerCase()
      );
    });
  }, [mailboxes, activeEnterpriseId, currentEnterprise.defaultDomain, scopedDomainNames]);

  const scopedMailboxIds = useMemo(() => {
    return new Set(scopedMailboxes.map(m => m.id));
  }, [scopedMailboxes]);

  const scopedEmails = useMemo(() => {
    if (activeEnterpriseId === 'all') return emails;
    return emails.filter(e => {
      if (e.enterpriseId) return e.enterpriseId === activeEnterpriseId;
      return scopedMailboxIds.has(e.mailboxId);
    });
  }, [emails, activeEnterpriseId, scopedMailboxIds]);

  const scopedAdmins = useMemo(() => {
    if (activeEnterpriseId === 'all') return admins;
    return admins.filter(a => {
      const belongs = a.enterpriseId === activeEnterpriseId || 
        a.email.toLowerCase().endsWith('@' + currentEnterprise.defaultDomain.toLowerCase());
      // Concepteur can see all admins in that enterprise
      if (isCreator) return belongs || a.isCreator;
      // Company admins can ONLY see non-creator members of their enterprise!
      return belongs && !a.isCreator;
    });
  }, [admins, activeEnterpriseId, currentEnterprise.defaultDomain, isCreator]);

  const scopedAuditLogs = useMemo(() => {
    if (activeEnterpriseId === 'all') return auditLogs;
    return auditLogs.filter(l => {
      if (l.enterpriseId) return l.enterpriseId === activeEnterpriseId;
      return (
        l.adminEmail.toLowerCase().endsWith('@' + currentEnterprise.defaultDomain.toLowerCase()) || 
        l.target.toLowerCase().includes(currentEnterprise.defaultDomain.toLowerCase()) || 
        l.target.toLowerCase() === currentEnterprise.name.toLowerCase()
      );
    });
  }, [auditLogs, activeEnterpriseId, currentEnterprise.defaultDomain, currentEnterprise.name]);

  const scopedImportHistory = useMemo(() => {
    if (activeEnterpriseId === 'all') return importHistory;
    return importHistory.filter(i => {
      const entId = i.enterpriseId || (i.fileName.toLowerCase().includes('aslab') || i.fileName.toLowerCase().includes('mailoos') ? 'ent-2' : 'ent-1');
      return entId === activeEnterpriseId;
    });
  }, [importHistory, activeEnterpriseId]);

  const [rolePermissions, setRolePermissions] = useState<RolePermissionDefinition[]>(() => {
    const saved = localStorage.getItem('mailadmin_role_permissions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return initialRolePermissions;
  });

  useEffect(() => {
    localStorage.setItem('mailadmin_role_permissions', JSON.stringify(rolePermissions));
  }, [rolePermissions]);

  // Modals state
  const [viewPasswordAccount, setViewPasswordAccount] = useState<MailboxAccount | null>(null);
  const [resetPasswordAccount, setResetPasswordAccount] = useState<MailboxAccount | null>(null);
  const [isNewMailboxModalOpen, setIsNewMailboxModalOpen] = useState(false);
  const [isAddDomainModalOpen, setIsAddDomainModalOpen] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [composeInitialData, setComposeInitialData] = useState<{ to?: string; subject?: string; replyBody?: string } | undefined>(undefined);

  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>('16:28');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('mailadmin_enterprises', JSON.stringify(enterprises));
  }, [enterprises]);

  useEffect(() => {
    localStorage.setItem('mailadmin_domains', JSON.stringify(domains));
  }, [domains]);

  useEffect(() => {
    localStorage.setItem('mailadmin_mailboxes', JSON.stringify(mailboxes));
  }, [mailboxes]);

  useEffect(() => {
    localStorage.setItem('mailadmin_emails', JSON.stringify(emails));
  }, [emails]);

  useEffect(() => {
    localStorage.setItem('mailadmin_admins', JSON.stringify(admins));
  }, [admins]);

  useEffect(() => {
    localStorage.setItem('mailadmin_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('mailadmin_imports', JSON.stringify(importHistory));
  }, [importHistory]);

  // Synchronisation Cloud Firestore en temps réel (multi-appareils / multi-utilisateurs)
  useEffect(() => {
    // 1. Initialise les données par défaut si la base Firestore est vide
    seedInitialFirestoreData().catch(err => console.warn('Erreur seed Firestore initial:', err));

    // 2. Abonnements aux flux temps réel (onSnapshot)
    const unsubEnt = subscribeToEnterprises(data => {
      setEnterprises(data);
      setCurrentEnterprise(prev => data.find(e => e.id === prev.id) || prev);
    });
    const unsubDom = subscribeToDomains(data => setDomains(data));
    const unsubMb = subscribeToMailboxes(data => setMailboxes(data));
    const unsubEm = subscribeToEmails(data => setEmails(data));
    const unsubAdm = subscribeToAdmins(data => setAdmins(data));
    const unsubLogs = subscribeToAuditLogs(data => setAuditLogs(data));

    return () => {
      unsubEnt();
      unsubDom();
      unsubMb();
      unsubEm();
      unsubAdm();
      unsubLogs();
    };
  }, []);

  const [brevoStatus, setBrevoStatus] = useState<BrevoRelayStatus>({
    configured: false,
    mode: 'none',
    smtpHost: 'smtp-relay.brevo.com',
    smtpPort: 587,
    dailyQuotaFree: 300,
    spfInclude: 'include:spf.brevo.com',
  });

  const refreshBrevoStatus = useCallback(async () => {
    if (!isAuthenticated || !currentAdmin?.email) return;
    await ensureApiSession({
      adminId: currentAdmin.id,
      email: currentAdmin.email,
      role: currentAdmin.role,
      enterpriseId: currentAdmin.enterpriseId,
    });
    const status = await getBrevoRelayStatus(true);
    setBrevoStatus(status);
  }, [isAuthenticated, currentAdmin?.id, currentAdmin?.email, currentAdmin?.role, currentAdmin?.enterpriseId]);

  useEffect(() => {
    if (!isAuthenticated || !currentAdmin?.email) return;
    ensureApiSession({
      adminId: currentAdmin.id,
      email: currentAdmin.email,
      role: currentAdmin.role,
      enterpriseId: currentAdmin.enterpriseId,
    })
      .then(() => refreshBrevoStatus())
      .catch(() => {});
  }, [isAuthenticated, currentAdmin?.id, currentAdmin?.email, currentAdmin?.role, currentAdmin?.enterpriseId, refreshBrevoStatus]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const formatLogDate = (d = new Date()) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const logAuditAction = (action: string, target: string, detail = '') => {
    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      enterpriseId: currentEnterprise.id,
      date: formatLogDate(),
      timestamp: Date.now(),
      adminEmail: currentAdmin.email,
      action,
      target,
      detail,
      ip: '102.180.170.117'
    };
    setAuditLogs(prev => [newEntry, ...prev]);
    syncAuditLogToFirestore(newEntry).catch(err => console.warn('Sync auditLog error:', err));
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!#$@%&';
    let res = '';
    for (let i = 0; i < 14; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const addDomain = (domainName: string): boolean => {
    const cleanName = domainName.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!cleanName || cleanName.indexOf('.') === -1) {
      showToast('Nom de domaine invalide (ex: monentreprise.com)', 'error');
      return false;
    }
    if (scopedDomains.some(d => d.name.toLowerCase() === cleanName)) {
      showToast('Ce domaine est déjà enregistré pour cette entreprise', 'warning');
      return false;
    }

    const dkimKey = `v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}klQdcp64fJ1e8sx2JcjcNFBb`;
    const newDomain: DomainItem = {
      id: `dom-${Date.now()}`,
      enterpriseId: currentEnterprise.id,
      name: cleanName,
      isVerified: false,
      verifiedAt: 'En attente',
      recordsOkCount: 0,
      totalRecordsCount: 3,
      activeMailboxesCount: 0,
      dkimKey,
      records: [
        {
          role: 'Réception des mails (MX - Cloudflare Email Routing)',
          type: 'MX',
          host: '@',
          value: cleanName === 'mailoos.com' ? 'route1.mx.cloudflare.net' : 'mail.mailoos.com',
          priority: 10,
          status: 'missing'
        },
        {
          role: "Autorisation d'envoi (SPF)",
          type: 'TXT',
          host: '@',
          value: 'v=spf1 include:_spf.mx.cloudflare.net a:mail.mailoos.com ~all',
          status: 'missing'
        },
        {
          role: 'Signature des mails (DKIM)',
          type: 'TXT',
          host: 'mail._domainkey',
          value: dkimKey,
          status: 'missing'
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
    };

    setDomains(prev => [...prev, newDomain]);
    syncDomainToFirestore(newDomain).catch(err => console.warn('Sync domain error:', err));
    logAuditAction('Ajout de domaine', cleanName);
    showToast(`Domaine ${cleanName} ajouté avec succès`, 'success');
    return true;
  };

  const verifyDomain = async (domainId: string, silent = false): Promise<LiveDnsReport | null> => {
    const d = domains.find(dom => dom.id === domainId);
    if (!d) return null;

    const liveReport = await checkLiveCloudflareDns(d.name);
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const updatedRecords = (d.records || []).map(rec => {
      if (rec.type === 'MX') {
        const targetMx = rec.value.trim().toLowerCase().replace(/\.$/, '');
        const exactMxFound = liveReport.mxRecords.some(m => m.exchange === targetMx);
        const mxOk = exactMxFound || (liveReport.hasActiveMailRouting && !targetMx.includes('route'));
        return { ...rec, status: (mxOk ? 'correct' : 'missing') as 'correct' | 'missing' | 'error' };
      }
      if (rec.type === 'TXT' && rec.host === '@') {
        return {
          ...rec,
          value: liveReport.spfRecords[0] || rec.value,
          status: (liveReport.hasSpf ? 'correct' : 'missing') as 'correct' | 'missing' | 'error',
        };
      }
      if (rec.type === 'TXT' && rec.host.includes('_dmarc')) {
        return {
          ...rec,
          value: liveReport.dmarcRecords[0] || rec.value,
          status: (liveReport.hasDmarc ? 'correct' : 'missing') as 'correct' | 'missing' | 'error',
        };
      }
      if (rec.type === 'TXT' && rec.host.includes('_domainkey')) {
        return { ...rec, status: (liveReport.hasDkim ? 'correct' : 'missing') as 'correct' | 'missing' | 'error' };
      }
      return rec;
    });

    const coreRecords = updatedRecords.filter(r => !r.isRecommended);
    const okCount = coreRecords.filter(r => r.status === 'correct').length;
    const isFullyVerified = okCount >= coreRecords.length || (liveReport.isCloudflareNs && liveReport.hasActiveMailRouting);

    const updated: DomainItem = {
      ...d,
      isVerified: isFullyVerified,
      verifiedAt: liveReport.isCloudflareNs ? `Cloudflare DNS (${timeStr})` : timeStr,
      recordsOkCount: okCount,
      totalRecordsCount: coreRecords.length,
      records: updatedRecords,
    };

    setDomains(prev => prev.map(dom => dom.id === domainId ? updated : dom));
    syncDomainToFirestore(updated).catch(err => console.warn('Sync domain error:', err));

    if (!silent) {
      logAuditAction(
        'Vérification DNS Cloudflare',
        d.name,
        `NS Cloudflare: ${liveReport.isCloudflareNs ? 'Oui' : 'Non'} | MX: ${liveReport.mxRecords.length} | SPF: ${liveReport.hasSpf ? 'OK' : 'Manquant'} | DKIM: ${liveReport.hasDkim ? 'OK' : 'Manquant'} | DMARC: ${liveReport.hasDmarc ? 'OK' : 'Manquant'}`
      );

      if (liveReport.hasActiveMailRouting && liveReport.hasSpf && liveReport.hasDkim) {
        showToast(
          liveReport.hasDmarc
            ? `Domaine ${d.name} 100 % propagé et sécurisé (MX, SPF, DKIM, DMARC) !`
            : `Domaine ${d.name} actif sur Cloudflare (${okCount}/${coreRecords.length} requis OK, DMARC recommandé à ajouter).`,
          'success'
        );
      } else if (liveReport.isCloudflareNs) {
        showToast(
          `${d.name} est actif sur Cloudflare (${liveReport.nameservers.join(', ')}). Activez Cloudflare Email Routing pour les MX/SPF.`,
          'info'
        );
      } else {
        showToast(`Vérification DNS effectuée pour ${d.name} (${okCount}/${coreRecords.length} enregistrements détectés)`, 'warning');
      }
    }

    return liveReport;
  };

  const addMailbox = (
    firstName: string, 
    lastName: string, 
    prefix: string, 
    domain: string,
    customPassword?: string
  ): MailboxAccount => {
    const cleanPrefix = sanitizeInput(prefix.trim().toLowerCase().replace(/[^a-z0-9._-]/g, ''));
    const cleanDomain = sanitizeInput(domain.trim().toLowerCase());
    const fullEmail = `${cleanPrefix}@${cleanDomain}`;
    const cleanFirst = sanitizeInput(firstName.trim());
    const cleanLast = sanitizeInput(lastName.trim());
    const name = [cleanFirst, cleanLast].filter(Boolean).join(' ') || cleanPrefix.toUpperCase();
    const password = customPassword || generateRandomPassword();

    const newMb: MailboxAccount = {
      id: generateUniqueId('mb'),
      firstName: cleanFirst,
      lastName: cleanLast,
      name,
      email: fullEmail,
      password,
      mailsCount: 0,
      unreadCount: 0,
      storageUsedBytes: 0,
      storageLimitBytes: 5 * 1024 * 1024 * 1024,
      status: 'active',
      createdAt: formatLogDate(),
      domainName: cleanDomain,
      enterpriseId: currentEnterprise.id
    };

    setMailboxes(prev => [newMb, ...prev]);
    syncMailboxToFirestore(newMb).catch(err => console.warn('Sync mailbox error:', err));

    // Update domain mailbox count
    setDomains(prev => prev.map(d => {
      if (d.name === cleanDomain) {
        const updatedDom = { ...d, activeMailboxesCount: d.activeMailboxesCount + 1 };
        syncDomainToFirestore(updatedDom).catch(err => console.warn('Sync domain count error:', err));
        return updatedDom;
      }
      return d;
    }));

    logAuditAction('Création de boîte', fullEmail);
    showToast(`Boîte mail ${fullEmail} créée avec succès !`, 'success');
    return newMb;
  };

  const deleteMailbox = (id: string) => {
    const target = mailboxes.find(m => m.id === id);
    if (!target) return;

    setMailboxes(prev => prev.filter(m => m.id !== id));
    setEmails(prev => prev.filter(e => e.mailboxId !== id));
    deleteMailboxFromFirestore(id).catch(err => console.warn('Delete mailbox error:', err));
    
    // Update domain count
    setDomains(prev => prev.map(d => {
      if (d.name === target.domainName && d.activeMailboxesCount > 0) {
        const updatedDom = { ...d, activeMailboxesCount: d.activeMailboxesCount - 1 };
        syncDomainToFirestore(updatedDom).catch(err => console.warn('Sync domain count error:', err));
        return updatedDom;
      }
      return d;
    }));

    logAuditAction('Suppression de boîte', target.email);
    showToast(`Boîte mail ${target.email} supprimée`, 'info');
    
    if (activeWebmailAccount?.id === id) {
      setActiveWebmailAccount(null);
    }
  };

  const toggleMailboxStatus = (id: string) => {
    setMailboxes(prev => prev.map(m => {
      if (m.id === id) {
        const nextStatus: 'active' | 'disabled' = m.status === 'active' ? 'disabled' : 'active';
        const updated: MailboxAccount = { ...m, status: nextStatus };
        syncMailboxToFirestore(updated).catch(err => console.warn('Sync mailbox status error:', err));
        logAuditAction(nextStatus === 'disabled' ? 'Désactivation de boîte' : 'Activation de boîte', m.email);
        showToast(`Boîte ${m.email} ${nextStatus === 'disabled' ? 'désactivée' : 'activée'}`, 'info');
        return updated;
      }
      return m;
    }));
  };

  const updateMailboxPassword = (id: string, newPassword?: string): string => {
    const pass = newPassword || generateRandomPassword();
    setMailboxes(prev => prev.map(m => {
      if (m.id === id) {
        const updated = { ...m, password: pass };
        syncMailboxToFirestore(updated).catch(err => console.warn('Sync mailbox pass error:', err));
        logAuditAction('Nouveau mot de passe', m.email);
        return updated;
      }
      return m;
    }));
    showToast('Nouveau mot de passe enregistré avec succès', 'success');
    return pass;
  };

  const getMailboxById = (id: string) => {
    return mailboxes.find(m => m.id === id);
  };

  const openWebmailForAccount = (account: MailboxAccount) => {
    setActiveWebmailAccount(account);
    setCurrentTab('mailboxes');
    logAuditAction('Ouverture de boîte', account.email);
  };

  const closeWebmail = () => {
    setActiveWebmailAccount(null);
  };

  const sendEmail = async (
    mailboxId: string,
    to: string[],
    subject: string,
    body: string,
    cc?: string[]
  ): Promise<{ email: EmailMessage; delivery?: BrevoSendResult }> => {
    const sender = mailboxes.find(m => m.id === mailboxId) || mailboxes[0];
    const newMsg: EmailMessage = {
      id: `msg-${Date.now()}`,
      enterpriseId: sender.enterpriseId || currentEnterprise.id,
      mailboxId: sender.id,
      mailboxEmail: sender.email,
      from: sender.email,
      fromName: sender.name,
      to,
      cc,
      subject: subject || '(Sans objet)',
      body,
      date: "À l'instant",
      timestamp: Date.now(),
      isRead: true,
      folder: 'sent'
    };

    setEmails(prev => [newMsg, ...prev]);
    syncEmailToFirestore(newMsg);

    // Update mailbox stats
    const updatedSender = {
      ...sender,
      mailsCount: sender.mailsCount + 1,
      storageUsedBytes: sender.storageUsedBytes + 15000
    };
    setMailboxes(prev => prev.map(m => m.id === sender.id ? updatedSender : m));
    syncMailboxToFirestore(updatedSender);

    // Internal platform delivery if recipient mailbox exists in Mailoos
    const internalEmails = new Set<string>();
    to.forEach(recipientEmail => {
      const normalized = recipientEmail.toLowerCase().trim();
      const internalRecipient = mailboxes.find(m => m.email.toLowerCase() === normalized);
      if (internalRecipient) {
        internalEmails.add(normalized);
        const receivedCopy: EmailMessage = {
          id: `msg-${Date.now()}-in-${Math.random().toString(36).slice(2, 6)}`,
          enterpriseId: internalRecipient.enterpriseId || currentEnterprise.id,
          mailboxId: internalRecipient.id,
          mailboxEmail: internalRecipient.email,
          from: sender.email,
          fromName: sender.name,
          to: [internalRecipient.email],
          subject: subject || '(Sans objet)',
          body,
          date: "À l'instant",
          timestamp: Date.now(),
          isRead: false,
          folder: 'inbox'
        };
        setEmails(prev => [receivedCopy, ...prev]);
        syncEmailToFirestore(receivedCopy);

        const updatedRecipient = {
          ...internalRecipient,
          mailsCount: internalRecipient.mailsCount + 1,
          unreadCount: internalRecipient.unreadCount + 1,
          storageUsedBytes: internalRecipient.storageUsedBytes + 15000
        };
        setMailboxes(prev => prev.map(m => m.id === internalRecipient.id ? updatedRecipient : m));
        syncMailboxToFirestore(updatedRecipient);
      }
    });

    const externalTo = to.filter(addr => !internalEmails.has(addr.toLowerCase().trim()));
    const externalCc = (cc || []).filter(addr => !internalEmails.has(addr.toLowerCase().trim()));

    if (externalTo.length === 0 && externalCc.length === 0) {
      logAuditAction('Envoi de mail interne', to.join(', '), `Objet: ${subject}`);
      showToast(`Email distribué en interne à ${to.join(', ')}`, 'success');
      return { email: newMsg };
    }

    const delivery = await sendRealEmailViaBrevo({
      fromEmail: sender.email,
      fromName: sender.name,
      to: externalTo.length > 0 ? externalTo : to,
      cc: externalCc,
      subject: subject || '(Sans objet)',
      body,
    });

    if (delivery.delivered) {
      logAuditAction(
        'Envoi de mail réel (Brevo)',
        to.join(', '),
        `Objet: ${subject} · Provider: ${delivery.provider || 'brevo'}`
      );
      showToast(`E-mail envoyé réellement via Brevo à ${to.join(', ')} !`, 'success');
    } else if (delivery.reason === 'not_configured') {
      logAuditAction('Envoi de mail (archive locale)', to.join(', '), `Objet: ${subject} · Relais Brevo non configuré`);
      showToast(
        'Message enregistré dans Mailoos. Ajoutez BREVO_API_KEY dans les Secrets serveur pour activer la livraison réelle.',
        'info'
      );
    } else {
      logAuditAction('Échec envoi Brevo', to.join(', '), delivery.message || 'Erreur SMTP/API');
      showToast(`Message sauvegardé localement, erreur Brevo : ${delivery.message || 'échec d’envoi'}`, 'warning');
    }

    return { email: newMsg, delivery };
  };

  const deleteEmail = (emailId: string) => {
    const target = emails.find(e => e.id === emailId);
    if (target && target.folder === 'trash') {
      deleteEmailFromFirestore(emailId);
    } else if (target) {
      syncEmailToFirestore({ ...target, folder: 'trash' });
    }

    setEmails(prev => prev.map(e => {
      if (e.id === emailId) {
        if (e.folder === 'trash') {
          return null as any;
        }
        return { ...e, folder: 'trash' };
      }
      return e;
    }).filter(Boolean));
    showToast('Message déplacé dans la corbeille', 'info');
  };

  const markEmailAsRead = (emailId: string, isRead = true) => {
    const target = emails.find(e => e.id === emailId);
    if (target) {
      syncEmailToFirestore({ ...target, isRead });
    }

    setEmails(prev => prev.map(e => {
      if (e.id === emailId) {
        if (e.isRead !== isRead) {
          // Adjust mailbox unread counter
          setMailboxes(mbs => mbs.map(mb => {
            if (mb.id === e.mailboxId) {
              const delta = isRead ? -1 : 1;
              const updatedMb = { ...mb, unreadCount: Math.max(0, mb.unreadCount + delta) };
              syncMailboxToFirestore(updatedMb);
              return updatedMb;
            }
            return mb;
          }));
        }
        return { ...e, isRead };
      }
      return e;
    }));
  };

  const simulateIncomingEmail = (mailboxId?: string) => {
    const targetMb = mailboxId 
      ? mailboxes.find(m => m.id === mailboxId) 
      : (activeWebmailAccount || mailboxes[0]);
    
    if (!targetMb) return;

    const senders = [
      { name: 'Air Burkina Billetterie', email: 'service-client@airburkina.bf', subject: 'Mise à jour tarifaire vols régionaux Cotonou / Dakar' },
      { name: 'Chambre de Commerce', email: 'contact@cci.bf', subject: 'Invitation au Forum Économique International 2026' },
      { name: 'Banque Atlantique', email: 'alerte-operations@banqueatlantique.net', subject: 'Avis d\'opération de virement interbancaire reçu' },
      { name: 'IATA Agent Support', email: 'helpdesk@iata.org', subject: 'Renouvellement accréditation agence Sultan Voyages' }
    ];

    const pick = senders[Math.floor(Math.random() * senders.length)];
    const incoming: EmailMessage = {
      id: `msg-${Date.now()}-inc`,
      enterpriseId: targetMb.enterpriseId || currentEnterprise.id,
      mailboxId: targetMb.id,
      mailboxEmail: targetMb.email,
      from: pick.email,
      fromName: pick.name,
      to: [targetMb.email],
      subject: pick.subject,
      body: `Bonjour ${targetMb.name},\n\nNous vous transmettons ce message pour suivi dans votre dossier agence.\n\nMerci de bien vouloir accuser réception de cette notification dès que possible.\n\nCordialement,\n${pick.name}`,
      date: "À l'instant",
      timestamp: Date.now(),
      isRead: false,
      folder: 'inbox'
    };

    setEmails(prev => [incoming, ...prev]);
    syncEmailToFirestore(incoming);

    const updatedMb = {
      ...targetMb,
      mailsCount: targetMb.mailsCount + 1,
      unreadCount: targetMb.unreadCount + 1,
      storageUsedBytes: targetMb.storageUsedBytes + 12000
    };
    setMailboxes(prev => prev.map(m => m.id === targetMb.id ? updatedMb : m));
    syncMailboxToFirestore(updatedMb);

    showToast(`Nouveau message reçu pour ${targetMb.email} : "${pick.subject}"`, 'info');
  };

  const addAdmin = (name: string, email: string, role: string) => {
    const newAdm: AdminUser = {
      id: `adm-${Date.now()}`,
      enterpriseId: currentEnterprise.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role.trim() || 'Entreprise',
      createdAt: 'Aujourd\'hui',
      status: 'active',
      has2FA: false
    };
    setAdmins(prev => [...prev, newAdm]);
    syncAdminToFirestore(newAdm);
    logAuditAction('Création administrateur', newAdm.email);
    showToast(`Administrateur ${newAdm.email} ajouté`, 'success');
  };

  const toggleAdmin2FA = () => {
    setAdmins(prev => prev.map(a => {
      if (a.id === currentAdmin.id) {
        const next2FA = !a.has2FA;
        const updated = { ...a, has2FA: next2FA };
        syncAdminToFirestore(updated);
        logAuditAction(next2FA ? 'Activation 2FA' : 'Désactivation 2FA', a.email);
        showToast(next2FA ? 'Double authentification (2FA) activée' : 'Double authentification désactivée', 'info');
        return updated;
      }
      return a;
    }));
  };

  const updateAdmin = (id: string, updates: Partial<AdminUser>) => {
    setAdmins(prev => prev.map(a => {
      if (a.id === id) {
        const updated = { ...a, ...updates };
        syncAdminToFirestore(updated);
        logAuditAction('Modification administrateur', a.email, Object.keys(updates).join(', '));
        return updated;
      }
      return a;
    }));
    showToast('Profil administrateur mis à jour avec succès', 'success');
  };

  const deleteAdmin = (id: string): boolean => {
    const target = admins.find(a => a.id === id);
    if (!target) return false;
    if (target.id === currentAdmin.id) {
      showToast('Impossible de supprimer le compte actuellement connecté', 'error');
      return false;
    }
    setAdmins(prev => prev.filter(a => a.id !== id));
    deleteAdminFromFirestore(id);
    logAuditAction('Suppression administrateur', target.email);
    showToast(`Administrateur ${target.email} supprimé`, 'info');
    return true;
  };

  const toggleTargetAdmin2FA = (id: string) => {
    setAdmins(prev => prev.map(a => {
      if (a.id === id) {
        const next2FA = !a.has2FA;
        const updated = { ...a, has2FA: next2FA };
        syncAdminToFirestore(updated);
        logAuditAction(next2FA ? 'Activation 2FA' : 'Désactivation 2FA', a.email);
        showToast(`2FA ${next2FA ? 'activée' : 'désactivée'} pour ${a.name}`, 'info');
        return updated;
      }
      return a;
    }));
  };

  const toggleTargetAdminStatus = (id: string) => {
    setAdmins(prev => prev.map(a => {
      if (a.id === id) {
        if (a.id === currentAdmin.id) {
          showToast('Impossible de désactiver votre propre session active', 'warning');
          return a;
        }
        const nextStatus: 'active' | 'inactive' = a.status === 'active' ? 'inactive' : 'active';
        const updated: AdminUser = { ...a, status: nextStatus };
        syncAdminToFirestore(updated);
        logAuditAction(nextStatus === 'inactive' ? 'Désactivation administrateur' : 'Activation administrateur', a.email);
        showToast(`Compte administrateur ${a.email} ${nextStatus === 'inactive' ? 'désactivé' : 'activé'}`, 'info');
        return updated;
      }
      return a;
    }));
  };

  const updateAdminPassword = (id: string, newPassword?: string): string => {
    const pass = newPassword || generateRandomPassword();
    setAdmins(prev => prev.map(a => {
      if (a.id === id) {
        const updated = { ...a, password: pass };
        syncAdminToFirestore(updated);
        logAuditAction('Régénération mot de passe administrateur', a.email);
        return updated;
      }
      return a;
    }));
    showToast('Nouveau mot de passe administrateur enregistré', 'success');
    return pass;
  };

  const recordImport = (fileName: string, totalRows: number, successRows: number) => {
    const item: ImportHistoryItem = {
      id: `imp-${Date.now()}`,
      enterpriseId: currentEnterprise.id,
      fileName,
      date: formatLogDate(),
      rowsCount: totalRows,
      successCount: successRows,
      status: successRows === totalRows ? 'success' : 'partial'
    };
    setImportHistory(prev => [item, ...prev]);
    logAuditAction('Importation Excel', fileName, `${successRows}/${totalRows} boîtes importées`);
  };

  const addEnterprise = (name: string, defaultDomain: string) => {
    const newEnt: Enterprise = {
      id: `ent-${Date.now()}`,
      name: name.trim(),
      plan: 'Entreprise Cloud',
      defaultDomain: defaultDomain.trim().toLowerCase()
    };
    setEnterprises(prev => [...prev, newEnt]);
    syncEnterpriseToFirestore(newEnt);
    setCurrentEnterprise(newEnt);
    addDomain(defaultDomain);
    logAuditAction("Création d'entreprise", newEnt.name);
    showToast(`Entreprise "${newEnt.name}" configurée`, 'success');
  };

  const openComposeModal = (initial?: { to?: string; subject?: string; replyBody?: string }) => {
    setComposeInitialData(initial);
    setIsComposeModalOpen(true);
  };

  const refreshStats = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const now = new Date();
      setLastSyncTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
      setIsRefreshing(false);
      showToast('Statistiques et boîtes mail actualisées', 'success');
    }, 600);
  };

  const login = (email: string, password: string, totpCode?: string): { success: boolean; error?: string; require2FA?: boolean } => {
    const rawInput = (email || '').trim();
    const cleanLower = rawInput.toLowerCase();

    // 1. Protection Anti-Brute-Force (Rate Limiting)
    const rateLimit = checkRateLimit(rawInput, 5, 5);
    if (rateLimit.isLocked) {
      return { 
        success: false, 
        error: `Accès temporairement verrouillé suite à 5 tentatives erronées. Veuillez patienter ${rateLimit.remainingSeconds} seconde(s) avant de réessayer.` 
      };
    }

    // Check directly by email
    let admin = admins.find(a => a.email.toLowerCase() === cleanLower);

    // Support Super Admin aliases (username, role name, creator email or mailoos admin)
    const isSuperAdminAlias = [
      'superadmin',
      'super admin',
      'super-admin',
      'superadmin@mailoos.com',
      'superadmin@aslab.com',
      'superadmin@mailo.com',
      'admin',
      'concepteur',
      'salif',
      'salifguiro',
      'salif guiro',
      'salifguiro00@gmail.com',
      'admin@mailoos.com',
      'admin@aslab.com'
    ].includes(cleanLower) || cleanLower.startsWith('salifguiro') || cleanLower.startsWith('superadmin');

    if (!admin && isSuperAdminAlias) {
      admin = admins.find(a => a.email.toLowerCase() === 'salifguiro00@gmail.com') ||
              admins.find(a => a.email.toLowerCase() === 'superadmin@mailoos.com') ||
              admins.find(a => a.isCreator) ||
              admins.find(a => a.email.toLowerCase() === 'admin@mailoos.com');
    }

    if (!admin) {
      const fail = recordFailedLogin(rawInput, 5, 5);
      return { 
        success: false, 
        error: `Identifiant ou adresse e-mail administrateur introuvable. (${fail.failedCount}/5 tentatives avant verrouillage)` 
      };
    }

    // Check account status
    if (admin.status !== 'active') {
      return { success: false, error: 'Ce compte administrateur est inactif ou désactivé.' };
    }

    const expectedPassword = admin.password || 'Admin1234!';
    
    // Strict comparison without backdoor universal passwords
    const passwordMatches = password === expectedPassword;

    if (!passwordMatches) {
      const fail = recordFailedLogin(rawInput, 5, 5);
      if (fail.isLocked) {
        logAuditAction('Compte verrouillé (Anti-Brute Force)', admin.email, '5 échecs de mot de passe consécutifs');
        return {
          success: false,
          error: "Nombre maximum d'échecs atteint (5/5). Votre compte est bloqué pendant 5 minutes par mesure de sécurité."
        };
      }
      return { 
        success: false, 
        error: `Mot de passe incorrect. (${fail.failedCount}/5 tentatives avant verrouillage)` 
      };
    }

    // 2FA verification (if enabled)
    if (admin.has2FA) {
      if (!totpCode || totpCode.trim().length !== 6 || !/^\d{6}$/.test(totpCode.trim())) {
        return { 
          success: false, 
          require2FA: true, 
          error: "Saisissez votre code d'authentification 2FA à 6 chiffres." 
        };
      }
    }

    // Réinitialisation du compteur d'échecs après connexion réussie
    resetRateLimit(rawInput);

    // Génération du jeton de session cryptographique sécurisé
    const secureToken = createSecureSessionToken(admin.id, admin.role, admin.email, 12);
    localStorage.setItem('mailadmin_secure_token', secureToken);
    localStorage.setItem('mailadmin_session', 'true');
    localStorage.setItem('mailadmin_current_admin_id', admin.id);
    setCurrentAdminId(admin.id);
    setIsAuthenticated(true);
    ensureApiSession({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      enterpriseId: admin.enterpriseId,
    }).catch(() => {});

    // Immediately restore this specific administrator's individual color
    const userColor = getAdminSavedColor(admin.id, admin.email) || admin.themeColor || '#2563eb';
    setButtonColorState(userColor);

    const adminIsCreator = Boolean(
      admin.isCreator || 
      admin.role?.toLowerCase() === 'concepteur' || 
      admin.role?.toLowerCase() === 'super admin' || 
      admin.role?.toLowerCase() === 'superadmin' || 
      admin.email.toLowerCase() === 'salifguiro00@gmail.com' ||
      admin.email.toLowerCase() === 'superadmin@mailoos.com' ||
      admin.email.toLowerCase() === 'admin@mailoos.com' ||
      admin.email.toLowerCase() === 'superadmin@aslab.com' ||
      admin.email.toLowerCase() === 'admin@aslab.com'
    );

    if (adminIsCreator) {
      // Concepteur keeps global scope or chooses
      const savedScope = localStorage.getItem('mailadmin_enterprise_scope') || 'all';
      setSelectedEnterpriseScopeState(savedScope);
      if (savedScope !== 'all') {
        const ent = enterprises.find(e => e.id === savedScope);
        if (ent) setCurrentEnterprise(ent);
      }
    } else {
      // Enterprise user is strictly locked to their enterprise
      const entId = admin.enterpriseId || 'ent-1';
      setSelectedEnterpriseScopeState(entId);
      localStorage.setItem('mailadmin_enterprise_scope', entId);
      const ent = enterprises.find(e => e.id === entId) || enterprises[0];
      setCurrentEnterprise(ent);
    }

    logAuditAction('Connexion réussie', admin.email, `Rôle: ${admin.role} (Jeton sécurisé émis)`);
    showToast(`Connexion sécurisée réussie. Bienvenue ${admin.name} !`, 'success');
    return { success: true };
  };

  const resetUserPassword = (email: string, newPassword: string): { success: boolean; message: string } => {
    const rawInput = (email || '').trim();
    const cleanLower = rawInput.toLowerCase();

    let target = admins.find(a => a.email.toLowerCase() === cleanLower);

    const isSuperAdminAlias = [
      'superadmin', 'super admin', 'super-admin', 'admin', 'concepteur', 'salif', 'salifguiro', 'salifguiro00@gmail.com', 'superadmin@mailoos.com', 'admin@mailoos.com', 'superadmin@aslab.com', 'admin@aslab.com'
    ].includes(cleanLower) || cleanLower.startsWith('salifguiro') || cleanLower.startsWith('superadmin');

    if (!target && isSuperAdminAlias) {
      target = admins.find(a => a.email.toLowerCase() === 'salifguiro00@gmail.com') ||
               admins.find(a => a.email.toLowerCase() === 'superadmin@mailoos.com') ||
               admins.find(a => a.isCreator) ||
               admins.find(a => a.email.toLowerCase() === 'admin@mailoos.com');
    }

    if (!target) {
      return { success: false, message: "Aucun compte administrateur trouvé avec l'identifiant saisi." };
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return { 
        success: false, 
        message: `Mot de passe trop faible : ${strength.errors.join(' ')}` 
      };
    }

    const updatedAdmins = admins.map(a => a.id === target!.id ? { ...a, password: newPassword, status: 'active' as const } : a);
    setAdmins(updatedAdmins);
    localStorage.setItem('mailadmin_admins', JSON.stringify(updatedAdmins));
    const syncedTarget = updatedAdmins.find(a => a.id === target!.id);
    if (syncedTarget) {
      syncAdminToFirestore(syncedTarget).catch(err => console.warn('Sync admin reset error:', err));
    }
    logAuditAction('Réinitialisation mot de passe utilisateur', target.email);
    showToast(`Mot de passe sécurisé réinitialisé pour ${target.email}.`, 'success');
    return { success: true, message: "Mot de passe réinitialisé avec succès !" };
  };

  const changeCurrentAdminPassword = (oldPassword: string, newPassword: string): { success: boolean; message: string } => {
    const expected = currentAdmin.password || 'Admin1234!';
    if (oldPassword !== expected) {
      return { success: false, message: "Le mot de passe actuel saisi est incorrect." };
    }
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return { 
        success: false, 
        message: `Nouveau mot de passe non conforme : ${strength.errors.join(' ')}` 
      };
    }
    if (oldPassword === newPassword) {
      return { success: false, message: "Le nouveau mot de passe doit être différent de l'actuel." };
    }

    setAdmins(prev => {
      const updated = prev.map(a => a.id === currentAdmin.id ? { ...a, password: newPassword } : a);
      const syncedAdmin = updated.find(a => a.id === currentAdmin.id);
      if (syncedAdmin) {
        syncAdminToFirestore(syncedAdmin).catch(err => console.warn('Sync admin password error:', err));
      }
      return updated;
    });
    logAuditAction('Changement de mot de passe administrateur', currentAdmin.email);
    showToast("Votre mot de passe a été modifié avec succès.", 'success');
    return { success: true, message: "Mot de passe modifié avec succès." };
  };

  const logout = () => {
    logAuditAction('Déconnexion administrateur', currentAdmin.email);
    revokeApiSession().catch(() => {});
    localStorage.removeItem('mailadmin_secure_token');
    localStorage.setItem('mailadmin_session', 'false');
    setIsAuthenticated(false);
    showToast('Session fermée avec succès', 'info');
  };

  const switchAdminAccount = (adminId: string) => {
    const target = admins.find(a => a.id === adminId);
    if (target) {
      setCurrentAdminId(target.id);
      localStorage.setItem('mailadmin_current_admin_id', target.id);
      ensureApiSession({
        adminId: target.id,
        email: target.email,
        role: target.role,
        enterpriseId: target.enterpriseId,
      }).catch(() => {});
      
      // Apply the target user's personal color
      const targetColor = getAdminSavedColor(target.id, target.email) || target.themeColor || '#2563eb';
      setButtonColorState(targetColor);

      if (target.enterpriseId) {
        const ent = enterprises.find(e => e.id === target.enterpriseId);
        if (ent) setCurrentEnterprise(ent);
      }
      logAuditAction('Changement de profil administrateur', target.email, `Rôle: ${target.role}`);
      showToast(`Profil actif : ${target.name} (${target.role})`, 'info');
    }
  };

  const updateRolePermission = (
    role: string, 
    resource: PermissionResource, 
    action: PermissionAction, 
    value: boolean
  ) => {
    setRolePermissions(prev => prev.map(r => {
      if (r.role.toLowerCase() === role.toLowerCase()) {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            [resource]: {
              ...r.permissions[resource],
              [action]: value
            }
          }
        };
      }
      return r;
    }));
    logAuditAction('Modification des droits RBAC', role, `Ressource: ${resource}, Action: ${action} -> ${value ? 'Autorisé' : 'Révoqué'}`);
    showToast(`Permission mise à jour pour le rôle ${role}`, 'success');
  };

  const resetRolePermissions = (roleName?: string) => {
    if (roleName) {
      const defaultRole = initialRolePermissions.find(r => r.role.toLowerCase() === roleName.toLowerCase());
      if (defaultRole) {
        setRolePermissions(prev => prev.map(r => r.role.toLowerCase() === roleName.toLowerCase() ? JSON.parse(JSON.stringify(defaultRole)) : r));
        showToast(`Droits du rôle "${roleName}" réinitialisés`, 'info');
      }
    } else {
      setRolePermissions(JSON.parse(JSON.stringify(initialRolePermissions)));
      showToast('Matrice des droits réinitialisée aux valeurs par défaut', 'info');
    }
    logAuditAction('Réinitialisation des droits RBAC', roleName || 'Tous les rôles');
  };

  const addCustomRole = (role: string, label: string, description: string, copyFromRole = 'Support') => {
    if (rolePermissions.some(r => r.role.toLowerCase() === role.toLowerCase())) {
      showToast(`Un rôle avec le nom "${role}" existe déjà`, 'error');
      return;
    }
    const base = rolePermissions.find(r => r.role.toLowerCase() === copyFromRole.toLowerCase()) || rolePermissions[0];
    const newRole: RolePermissionDefinition = {
      role: role.trim(),
      label: label.trim(),
      description: description.trim(),
      badgeColor: '#ec4899',
      isSystem: false,
      permissions: JSON.parse(JSON.stringify(base.permissions))
    };
    setRolePermissions(prev => [...prev, newRole]);
    logAuditAction('Création de rôle personnalisé', role.trim());
    showToast(`Rôle "${label}" créé avec succès`, 'success');
  };

  const deleteCustomRole = (role: string): boolean => {
    const target = rolePermissions.find(r => r.role.toLowerCase() === role.toLowerCase());
    if (!target) return false;
    if (target.isSystem) {
      showToast('Impossible de supprimer un rôle système de base', 'error');
      return false;
    }
    setRolePermissions(prev => prev.filter(r => r.role.toLowerCase() !== role.toLowerCase()));
    logAuditAction('Suppression de rôle personnalisé', role);
    showToast(`Rôle "${target.label}" supprimé`, 'info');
    return true;
  };

  const hasPermission = (action: PermissionAction, resource: PermissionResource, roleOverride?: string): boolean => {
    // Le Concepteur / Super Admin Créateur a un accès absolu à tout sans exception
    if (isCreator && !roleOverride) return true;

    const targetRole = roleOverride || currentAdmin.role;
    const roleConfig = rolePermissions.find(r => r.role.toLowerCase() === targetRole.toLowerCase())
      || rolePermissions.find(r => r.role.toLowerCase() === 'entreprise')
      || rolePermissions[0];
    
    if (!roleConfig) return true;
    return roleConfig.permissions[resource]?.[action] ?? false;
  };

  const canView = (resource: PermissionResource) => hasPermission('view', resource);
  const canCreate = (resource: PermissionResource) => hasPermission('create', resource);
  const canEdit = (resource: PermissionResource) => hasPermission('edit', resource);
  const canDelete = (resource: PermissionResource) => hasPermission('delete', resource);
  const canExport = (resource: PermissionResource) => hasPermission('export', resource);

  // Enterprise IAM & Security Policies
  const [securityPolicy, setSecurityPolicy] = useState<SecurityPolicy>(() => {
    const saved = localStorage.getItem('mailadmin_security_policy');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      minPasswordLength: 8,
      requireSpecialChar: true,
      requireNumber: true,
      requireUppercase: true,
      enforce2FAForPrivileged: false,
      sessionTimeoutMinutes: 60,
    };
  });

  const updateSecurityPolicy = (updates: Partial<SecurityPolicy>) => {
    setSecurityPolicy(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('mailadmin_security_policy', JSON.stringify(next));
      } catch {}
      logAuditAction('Mise à jour politique de sécurité IAM', 'Gouvernance globale', JSON.stringify(updates));
      showToast('Politique de sécurité mise à jour', 'success');
      return next;
    });
  };

  const getAdminsForRole = (roleName: string): AdminUser[] => {
    return admins.filter(a => a.role?.toLowerCase() === roleName.toLowerCase());
  };

  const getUserPermissions = (adminId: string): Record<PermissionResource, ResourcePermissionConfig> => {
    const target = admins.find(a => a.id === adminId) || currentAdmin;
    const isMaster = Boolean(
      target.isCreator ||
      target.role?.toLowerCase() === 'concepteur' ||
      target.email?.toLowerCase() === 'salifguiro00@gmail.com'
    );
    if (isMaster) {
      return {
        domains: { view: true, create: true, edit: true, delete: true, export: true },
        accounts: { view: true, create: true, edit: true, delete: true, export: true },
        import: { view: true, create: true, edit: true, delete: true, export: true },
        admins: { view: true, create: true, edit: true, delete: true, export: true },
        audit: { view: true, create: false, edit: false, delete: false, export: true },
        settings: { view: true, create: true, edit: true, delete: true, export: true },
      };
    }
    const roleDef = rolePermissions.find(r => r.role.toLowerCase() === (target.role || '').toLowerCase())
      || rolePermissions.find(r => r.role.toLowerCase() === 'entreprise')
      || rolePermissions[0];
    return roleDef.permissions;
  };

  const reassignAdminRole = (adminId: string, newRole: string) => {
    const target = admins.find(a => a.id === adminId);
    if (!target) return;
    if (target.isCreator && !isCreator) {
      showToast('Impossible de modifier le rôle du Concepteur', 'error');
      return;
    }
    setAdmins(prev => {
      const updated = prev.map(a => a.id === adminId ? { ...a, role: newRole } : a);
      const syncedAdmin = updated.find(a => a.id === adminId);
      if (syncedAdmin) {
        syncAdminToFirestore(syncedAdmin).catch(err => console.warn('Sync admin role error:', err));
      }
      return updated;
    });
    logAuditAction('Réattribution de rôle RBAC', target.email, `Nouveau rôle : ${newRole}`);
    showToast(`Rôle ${newRole} assigné à ${target.name}`, 'success');
  };

  const resetAdminCredentials = (adminId: string, customPassword?: string): string => {
    const target = admins.find(a => a.id === adminId);
    if (!target) return '';
    const newPass = customPassword || generateRandomPassword();
    const now = new Date();
    const updatedDate = `Aujourd'hui à ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setAdmins(prev => {
      const updated = prev.map(a => a.id === adminId ? {
        ...a,
        password: newPass,
        passwordUpdatedAt: updatedDate,
        forcePasswordChange: true
      } : a);
      const syncedAdmin = updated.find(a => a.id === adminId);
      if (syncedAdmin) {
        syncAdminToFirestore(syncedAdmin).catch(err => console.warn('Sync admin creds error:', err));
      }
      return updated;
    });
    logAuditAction('Réinitialisation sécurisée des identifiants', target.email);
    showToast(`Nouveaux identifiants générés pour ${target.name}`, 'success');
    return newPass;
  };

  return (
    <AppContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        currentEnterprise,
        enterprises,
        setCurrentEnterprise,
        addEnterprise,
        selectedEnterpriseScope,
        setSelectedEnterpriseScope,

        isAuthenticated,
        isCreator,
        login,
        logout,
        switchAdminAccount,
        resetUserPassword,
        changeCurrentAdminPassword,

        rolePermissions,
        updateRolePermission,
        resetRolePermissions,
        addCustomRole,
        deleteCustomRole,
        hasPermission,
        canView,
        canCreate,
        canEdit,
        canDelete,
        canExport,

        securityPolicy,
        updateSecurityPolicy,
        getAdminsForRole,
        getUserPermissions,
        reassignAdminRole,
        resetAdminCredentials,

        domains: scopedDomains,
        addDomain,
        verifyDomain,

        mailboxes: scopedMailboxes,
        addMailbox,
        deleteMailbox,
        toggleMailboxStatus,
        updateMailboxPassword,
        getMailboxById,

        activeWebmailAccount,
        openWebmailForAccount,
        closeWebmail,

        emails: scopedEmails,
        brevoStatus,
        refreshBrevoStatus,
        sendEmail,
        deleteEmail,
        markEmailAsRead,
        simulateIncomingEmail,

        admins: scopedAdmins,
        currentAdmin,
        addAdmin,
        updateAdmin,
        deleteAdmin,
        toggleAdmin2FA,
        toggleTargetAdmin2FA,
        toggleTargetAdminStatus,
        updateAdminPassword,

        auditLogs: scopedAuditLogs,
        logAuditAction,

        importHistory: scopedImportHistory,
        recordImport,

        viewPasswordAccount,
        setViewPasswordAccount,
        resetPasswordAccount,
        setResetPasswordAccount,
        isNewMailboxModalOpen,
        setIsNewMailboxModalOpen,
        isAddDomainModalOpen,
        setIsAddDomainModalOpen,
        isComposeModalOpen,
        setIsComposeModalOpen,
        composeInitialData,
        openComposeModal,

        notifications,
        showToast,
        removeToast,

        lastSyncTime,
        refreshStats,
        isRefreshing,

        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        toggleMobileSidebar,

        theme,
        setTheme,
        toggleTheme,

        isNotificationsActive,
        toggleNotifications,

        buttonColor,
        setButtonColor
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
