import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  Enterprise, 
  DomainItem, 
  MailboxAccount, 
  EmailMessage, 
  AdminUser, 
  AuditLogEntry 
} from '../types';
import { 
  initialEnterprises, 
  initialDomains, 
  initialMailboxes, 
  initialEmails, 
  initialAdmins, 
  initialAuditLogs 
} from '../data/initialData';

// Collections paths
export const COLLECTIONS = {
  ENTERPRISES: 'enterprises',
  DOMAINS: 'domains',
  MAILBOXES: 'mailboxes',
  EMAILS: 'emails',
  ADMINS: 'admins',
  AUDIT_LOGS: 'auditLogs'
} as const;

/**
 * Initialise les données de départ dans Firestore si la base de données est vide
 */
export async function seedInitialFirestoreData(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.ENTERPRISES));
    if (!snap.empty) {
      const hasLegacyAsLab = snap.docs.some(d => {
        const data = d.data() as Enterprise;
        return data.defaultDomain === 'aslab.com' || data.name === 'AsLab';
      });
      const domSnap = await getDocs(collection(db, COLLECTIONS.DOMAINS));
      const dom2Doc = domSnap.docs.find(d => d.id === 'dom-2');
      const dom2Data = dom2Doc?.data() as DomainItem | undefined;
      const hasLegacyDkimHost = dom2Data?.records?.some(r => r.host === 'mail._domainkey');
      if (hasLegacyAsLab || !dom2Data || dom2Data.dkimKey?.includes('...') || hasLegacyDkimHost) {
        const ent2 = initialEnterprises.find(e => e.id === 'ent-2');
        if (ent2) await setDoc(doc(db, COLLECTIONS.ENTERPRISES, 'ent-2'), ent2);

        for (const dom of initialDomains) {
          await setDoc(doc(db, COLLECTIONS.DOMAINS, dom.id), dom);
        }
        if (hasLegacyAsLab) {
          for (const mb of initialMailboxes.filter(m => m.enterpriseId === 'ent-2')) {
            await setDoc(doc(db, COLLECTIONS.MAILBOXES, mb.id), mb);
          }
          for (const em of initialEmails) {
            await setDoc(doc(db, COLLECTIONS.EMAILS, em.id), em);
          }
          for (const adm of initialAdmins) {
            await setDoc(doc(db, COLLECTIONS.ADMINS, adm.id), adm);
          }
        }
      }
      return; // Base déjà initialisée
    }

    // 1. Initialiser les entreprises
    for (const ent of initialEnterprises) {
      await setDoc(doc(db, COLLECTIONS.ENTERPRISES, ent.id), ent);
    }

    // 2. Initialiser les domaines
    for (const dom of initialDomains) {
      await setDoc(doc(db, COLLECTIONS.DOMAINS, dom.id), dom);
    }

    // 3. Initialiser les boîtes mail
    for (const mb of initialMailboxes) {
      await setDoc(doc(db, COLLECTIONS.MAILBOXES, mb.id), mb);
    }

    // 4. Initialiser les e-mails
    for (const em of initialEmails) {
      await setDoc(doc(db, COLLECTIONS.EMAILS, em.id), em);
    }

    // 5. Initialiser les administrateurs
    for (const adm of initialAdmins) {
      await setDoc(doc(db, COLLECTIONS.ADMINS, adm.id), adm);
    }

    // 6. Initialiser les logs d'audit
    for (const log of initialAuditLogs) {
      await setDoc(doc(db, COLLECTIONS.AUDIT_LOGS, log.id), log);
    }
  } catch (err) {
    console.warn("Seeding initial Firestore data:", err);
  }
}

/**
 * Abonnements temps réel (onSnapshot)
 */
export function subscribeToEnterprises(onData: (data: Enterprise[]) => void): () => void {
  const path = COLLECTIONS.ENTERPRISES;
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const items: Enterprise[] = [];
      snap.forEach((d) => items.push(d.data() as Enterprise));
      if (items.length > 0) onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export function subscribeToDomains(onData: (data: DomainItem[]) => void): () => void {
  const path = COLLECTIONS.DOMAINS;
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const items: DomainItem[] = [];
      snap.forEach((d) => items.push(d.data() as DomainItem));
      if (items.length > 0) onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export function subscribeToMailboxes(onData: (data: MailboxAccount[]) => void): () => void {
  const path = COLLECTIONS.MAILBOXES;
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const items: MailboxAccount[] = [];
      snap.forEach((d) => items.push(d.data() as MailboxAccount));
      if (items.length > 0) onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export function subscribeToEmails(onData: (data: EmailMessage[]) => void): () => void {
  const path = COLLECTIONS.EMAILS;
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const items: EmailMessage[] = [];
      snap.forEach((d) => items.push(d.data() as EmailMessage));
      items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      if (items.length > 0) onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export function subscribeToAdmins(onData: (data: AdminUser[]) => void): () => void {
  const path = COLLECTIONS.ADMINS;
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const items: AdminUser[] = [];
      snap.forEach((d) => items.push(d.data() as AdminUser));
      if (items.length > 0) onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export function subscribeToAuditLogs(onData: (data: AuditLogEntry[]) => void): () => void {
  const path = COLLECTIONS.AUDIT_LOGS;
  const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(150));
  return onSnapshot(
    q,
    (snap) => {
      const items: AuditLogEntry[] = [];
      snap.forEach((d) => items.push(d.data() as AuditLogEntry));
      if (items.length > 0) onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

/**
 * Mutations asynchrones vers Firestore
 */
export async function syncEnterpriseToFirestore(enterprise: Enterprise): Promise<void> {
  const path = `${COLLECTIONS.ENTERPRISES}/${enterprise.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.ENTERPRISES, enterprise.id), enterprise);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncDomainToFirestore(domain: DomainItem): Promise<void> {
  const path = `${COLLECTIONS.DOMAINS}/${domain.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.DOMAINS, domain.id), domain);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncMailboxToFirestore(mailbox: MailboxAccount): Promise<void> {
  const path = `${COLLECTIONS.MAILBOXES}/${mailbox.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.MAILBOXES, mailbox.id), mailbox);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteMailboxFromFirestore(mailboxId: string): Promise<void> {
  const path = `${COLLECTIONS.MAILBOXES}/${mailboxId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.MAILBOXES, mailboxId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function syncEmailToFirestore(email: EmailMessage): Promise<void> {
  const path = `${COLLECTIONS.EMAILS}/${email.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.EMAILS, email.id), email);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteEmailFromFirestore(emailId: string): Promise<void> {
  const path = `${COLLECTIONS.EMAILS}/${emailId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.EMAILS, emailId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function syncAdminToFirestore(admin: AdminUser): Promise<void> {
  const path = `${COLLECTIONS.ADMINS}/${admin.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.ADMINS, admin.id), admin);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteAdminFromFirestore(adminId: string): Promise<void> {
  const path = `${COLLECTIONS.ADMINS}/${adminId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.ADMINS, adminId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function syncAuditLogToFirestore(log: AuditLogEntry): Promise<void> {
  const path = `${COLLECTIONS.AUDIT_LOGS}/${log.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.AUDIT_LOGS, log.id), log);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
