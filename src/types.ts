export type NavTab = 
  | 'dashboard'
  | 'domains'
  | 'import'
  | 'accounts'
  | 'mailboxes'
  | 'admins'
  | 'audit'
  | 'settings';

export interface Enterprise {
  id: string;
  name: string;
  plan: string;
  defaultDomain: string;
}

export interface DnsRecord {
  role: string;
  type: 'MX' | 'TXT' | 'CNAME' | 'A';
  host: string;
  value: string;
  priority?: number;
  status: 'correct' | 'missing' | 'error';
  isRecommended?: boolean;
}

export interface DomainItem {
  id: string;
  enterpriseId?: string;
  name: string;
  isVerified: boolean;
  verifiedAt: string;
  recordsOkCount: number;
  totalRecordsCount: number;
  activeMailboxesCount: number;
  dkimKey: string;
  records: DnsRecord[];
}

export interface MailboxAccount {
  id: string;
  enterpriseId?: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  password: string;
  passwordHash?: string;
  passwordSalt?: string;
  mailsCount: number;
  unreadCount: number;
  storageUsedBytes: number;
  storageLimitBytes: number;
  status: 'active' | 'disabled';
  createdAt: string;
  domainName: string;
}

export interface EmailAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
}

export interface EmailMessage {
  id: string;
  enterpriseId?: string;
  mailboxId: string;
  mailboxEmail: string;
  from: string;
  fromName: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  date: string;
  timestamp: number;
  isRead: boolean;
  isStarred?: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash';
  attachments?: EmailAttachment[];
}

export interface AdminUser {
  id: string;
  enterpriseId?: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  status: 'active' | 'inactive';
  has2FA: boolean;
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
  isCurrentUser?: boolean;
  isCreator?: boolean;
  lastLogin?: string;
  lastLoginIp?: string;
  passwordUpdatedAt?: string;
  sessionCount?: number;
  forcePasswordChange?: boolean;
  themeColor?: string;
}

export interface SecurityPolicy {
  minPasswordLength: number;
  requireSpecialChar: boolean;
  requireNumber: boolean;
  requireUppercase: boolean;
  enforce2FAForPrivileged: boolean;
  sessionTimeoutMinutes: number;
}

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

export type PermissionResource = 
  | 'domains'
  | 'accounts'
  | 'import'
  | 'admins'
  | 'audit'
  | 'settings';

export interface ResourcePermissionConfig {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}

export interface RolePermissionDefinition {
  role: string;
  label: string;
  description: string;
  badgeColor?: string;
  isSystem?: boolean;
  permissions: Record<PermissionResource, ResourcePermissionConfig>;
}

export interface AuditLogEntry {
  id: string;
  enterpriseId?: string;
  date: string;
  timestamp: number;
  adminEmail: string;
  action: string;
  target: string;
  detail: string;
  ip: string;
}

export interface ImportHistoryItem {
  id: string;
  enterpriseId?: string;
  fileName: string;
  date: string;
  rowsCount: number;
  successCount: number;
  status: 'success' | 'failed' | 'partial';
}

export interface ServerServiceStatus {
  name: string;
  port: number;
  protocol: string;
  isOnline: boolean;
}
