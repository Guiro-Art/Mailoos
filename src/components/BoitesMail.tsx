import React, { useState } from 'react';
import { 
  Search, 
  ChevronLeft, 
  Plus, 
  Inbox, 
  Send, 
  FileText, 
  AlertOctagon, 
  Trash2, 
  Mail, 
  Reply, 
  Forward, 
  Paperclip, 
  Download,
  Sparkles,
  CheckCircle2,
  Eye,
  X,
  AlertTriangle,
  ArrowRight,
  HardDrive,
  Copy,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MailboxAccount, EmailMessage } from '../types';

export const BoitesMail: React.FC = () => {
  const { 
    mailboxes, 
    emails, 
    activeWebmailAccount, 
    openWebmailForAccount, 
    closeWebmail, 
    openComposeModal,
    deleteEmail,
    deleteMailbox,
    markEmailAsRead,
    simulateIncomingEmail,
    setCurrentTab,
    showToast
  } = useApp();

  const [mailboxToDelete, setMailboxToDelete] = useState<MailboxAccount | null>(null);
  const [overviewSearch, setOverviewSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'drafts' | 'spam' | 'trash'>('inbox');
  const [folderSearch, setFolderSearch] = useState('');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isEmailCopied, setIsEmailCopied] = useState<boolean>(false);

  const handleCopyEmail = (email: string) => {
    try {
      navigator.clipboard.writeText(email);
      setIsEmailCopied(true);
      showToast(`Adresse e-mail copiée : ${email}`, 'success');
      setTimeout(() => setIsEmailCopied(false), 2000);
    } catch {
      showToast("Impossible de copier l'adresse e-mail", 'error');
    }
  };

  // Filtered mailboxes for overview
  const filteredMailboxes = mailboxes.filter(m => 
    m.name.toLowerCase().includes(overviewSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(overviewSearch.toLowerCase())
  );

  // If inside a mailbox:
  const currentMb = activeWebmailAccount;
  const currentMbEmails = emails.filter(e => 
    currentMb ? (e.mailboxId === currentMb.id || e.mailboxEmail === currentMb.email) : false
  );

  const folderEmails = currentMbEmails
    .filter(e => {
      const inFolder = e.folder === activeFolder;
      const matchesSearch =
        e.subject.toLowerCase().includes(folderSearch.toLowerCase()) ||
        e.from.toLowerCase().includes(folderSearch.toLowerCase()) ||
        e.body.toLowerCase().includes(folderSearch.toLowerCase());
      return inFolder && matchesSearch;
    })
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const selectedEmail = folderEmails.find(e => e.id === selectedEmailId) || null;

  const handleSelectEmail = (msg: EmailMessage) => {
    setSelectedEmailId(msg.id);
    if (!msg.isRead) {
      markEmailAsRead(msg.id, true);
    }
  };

  const handleReply = (msg: EmailMessage) => {
    openComposeModal({
      to: msg.from,
      subject: msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
      replyBody: `De: ${msg.fromName} <${msg.from}>\nDate: ${msg.date}\nObjet: ${msg.subject}\n\n${msg.body}`
    });
  };

  const getInitials = (name: string, email: string) => {
    const clean = name.trim();
    if (clean) {
      const parts = clean.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return clean.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const renderDeleteModal = () => {
    if (!mailboxToDelete) return null;
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Supprimer ce compte mail
                </h3>
                <button
                  type="button"
                  onClick={() => setMailboxToDelete(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Êtes-vous sûr de vouloir supprimer définitivement cette boîte de messagerie ?
              </p>

              <div className="mt-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-1 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">{mailboxToDelete.name}</div>
                <div className="text-blue-600 dark:text-blue-400 font-mono font-medium break-all">{mailboxToDelete.email}</div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <div>
                    <span className="block text-slate-400 dark:text-slate-500">Total mails</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 font-mono">{mailboxToDelete.mailsCount}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 dark:text-slate-500">Non lus</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 font-mono">{mailboxToDelete.unreadCount}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 dark:text-slate-500">Statut</span>
                    <span className={`font-semibold ${mailboxToDelete.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {mailboxToDelete.status === 'active' ? 'Actif' : 'Désactivé'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Attention :</strong> Cette action est irréversible. Tous les messages reçus et envoyés seront définitivement purgés.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setMailboxToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = mailboxToDelete.id;
                    if (activeWebmailAccount?.id === id) {
                      closeWebmail();
                    }
                    deleteMailbox(id);
                    setMailboxToDelete(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-2xs cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer le compte</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // MODE A: Overview of all mailboxes
  // ----------------------------------------------------
  if (!currentMb) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 w-full space-y-5 sm:space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-medium text-slate-700 dark:text-slate-300">Messagerie</span>
              <span>/</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">Boîtes mail</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Boîtes de messagerie
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sélectionnez une boîte aux lettres pour accéder au Webmail dédié et consulter les courriels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem('mailoos_settings_tab', 'serveurs');
                } catch {
                  // ignore
                }
                setCurrentTab('settings');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/70 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Réception réelle (Cloudflare)</span>
            </button>
            <button
              type="button"
              onClick={() => simulateIncomingEmail()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simuler un e-mail</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher une boîte ou une adresse..."
              value={overviewSearch}
              onChange={e => setOverviewSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Mailbox Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMailboxes.map((mb, idx) => {
            const initials = getInitials(mb.name, mb.email);
            const mbEmailsList = emails.filter(
              e => e.mailboxId === mb.id || e.mailboxEmail?.toLowerCase() === mb.email.toLowerCase()
            );
            const mbUnread = mbEmailsList.filter(e => e.folder === 'inbox' && !e.isRead).length;
            const mbTotalCount = Math.max(mb.mailsCount, mbEmailsList.length);
            const storageMo = (mb.storageUsedBytes / (1024 * 1024)).toFixed(1);

            return (
              <div
                key={`${mb.id}-${idx}`}
                onClick={() => openWebmailForAccount(mb)}
                className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 group-hover:bg-blue-600 dark:group-hover:bg-blue-600 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors flex items-center justify-center font-bold text-xs shrink-0">
                      {initials}
                    </div>
                    {mbUnread > 0 ? (
                      <span className="text-[11px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
                        {mbUnread} non lu{mbUnread > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        {mbTotalCount} mails
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {mb.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-mono">
                    {mb.email}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                  <span className="font-mono tabular-nums">{storageMo} Mo utilisés</span>
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>Ouvrir</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Delete Modal */}
        {renderDeleteModal()}
      </div>
    );
  }

  // ----------------------------------------------------
  // MODE B: Inside a Mailbox Webmail
  // ----------------------------------------------------
  const unreadInboxCount = currentMbEmails.filter(e => e.folder === 'inbox' && !e.isRead).length;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 w-full space-y-4 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={closeWebmail}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Toutes les boîtes</span>
          </button>

          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{currentMb.name}</span>
              <span 
                onClick={() => handleCopyEmail(currentMb.email)}
                title="Cliquer pour copier l'adresse e-mail"
                className="group/copy inline-flex items-center gap-1.5 text-xs font-mono font-normal text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 px-2 py-0.5 rounded-lg transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700/80 select-all"
              >
                <span>&lt;{currentMb.email}&gt;</span>
                {isEmailCopied ? (
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400 group-hover/copy:text-slate-600 dark:group-hover/copy:text-slate-300 shrink-0 transition-colors" />
                )}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => simulateIncomingEmail(currentMb.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 rounded-xl transition-all shadow-2xs cursor-pointer border border-blue-200/50 dark:border-blue-900/50"
            title="Tester la réception d'un e-mail dans cette boîte"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Simuler réception</span>
          </button>

          <button
            type="button"
            onClick={() => openComposeModal()}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau message</span>
          </button>
        </div>
      </div>

      {/* Main Mailbox Interface Responsive View */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row h-[calc(100vh-210px)] min-h-[520px] overflow-hidden">
        {/* Left Sub-sidebar: Folders (hidden on small mobile, visible on tablet & desktop) */}
        <div className="hidden md:flex md:w-48 lg:w-52 border-r border-slate-100 dark:border-slate-800 p-3 flex-col space-y-1 shrink-0 bg-slate-50/50 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={() => { setActiveFolder('inbox'); setSelectedEmailId(null); }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium transition-colors cursor-pointer ${
              activeFolder === 'inbox' 
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Inbox className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Boîte de réception</span>
            </div>
            {unreadInboxCount > 0 && (
              <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded-full">
                {unreadInboxCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setActiveFolder('sent'); setSelectedEmailId(null); }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium transition-colors cursor-pointer ${
              activeFolder === 'sent' 
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Send className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Envoyés</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => { setActiveFolder('drafts'); setSelectedEmailId(null); }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium transition-colors cursor-pointer ${
              activeFolder === 'drafts' 
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Brouillons</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => { setActiveFolder('spam'); setSelectedEmailId(null); }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium transition-colors cursor-pointer ${
              activeFolder === 'spam' 
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertOctagon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Spam</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => { setActiveFolder('trash'); setSelectedEmailId(null); }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium transition-colors cursor-pointer ${
              activeFolder === 'trash' 
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Corbeille</span>
            </div>
          </button>
        </div>

        {/* Middle Column: Email List (on mobile, hidden when an email is selected so the reading pane is full width) */}
        <div className={`
          flex-col border-r border-slate-100 dark:border-slate-800 shrink-0
          ${selectedEmailId ? 'hidden md:flex md:w-72 lg:w-96' : 'flex w-full md:w-72 lg:w-96'}
        `}>
          {/* Mobile Folder Selector Bar (shown only on phones) */}
          <div className="md:hidden p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
            {[
              { id: 'inbox' as const, label: 'Réception', count: unreadInboxCount },
              { id: 'sent' as const, label: 'Envoyés' },
              { id: 'drafts' as const, label: 'Brouillons' },
              { id: 'spam' as const, label: 'Spam' },
              { id: 'trash' as const, label: 'Corbeille' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => { setActiveFolder(f.id); setSelectedEmailId(null); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  activeFolder === f.id
                    ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {f.label} {f.count ? `(${f.count})` : ''}
              </button>
            ))}
          </div>

          {/* Folder Search Input */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher dans ce dossier..."
                value={folderSearch}
                onChange={e => setFolderSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Email Item Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {folderEmails.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                Ce dossier est vide.
              </div>
            ) : (
              folderEmails.map((msg, idx) => {
                const isSelected = selectedEmailId === msg.id;

                return (
                  <div
                    key={`${msg.id}-${idx}`}
                    onClick={() => handleSelectEmail(msg)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-50/80 dark:bg-blue-950/60' 
                        : msg.isRead 
                          ? 'hover:bg-slate-50 dark:hover:bg-slate-800/60 bg-white dark:bg-slate-900' 
                          : 'bg-blue-50/30 dark:bg-blue-950/30 hover:bg-blue-50/50 dark:hover:bg-blue-950/50 font-semibold'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        {!msg.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                        )}
                        <span className={`text-xs truncate ${!msg.isRead ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          {msg.fromName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-mono">
                        {msg.date}
                      </span>
                    </div>

                    <div className={`text-xs truncate ${!msg.isRead ? 'font-semibold text-slate-900 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                      {msg.subject}
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-2 mt-1 font-normal leading-relaxed">
                      {msg.body}
                    </p>

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                        <Paperclip className="w-3 h-3" />
                        <span>{msg.attachments.length} pièce jointe</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Email Detail Viewer (on mobile, shown only when an email is selected) */}
        <div className={`
          flex-1 flex-col bg-white dark:bg-slate-900 overflow-hidden
          ${selectedEmailId ? 'flex' : 'hidden md:flex'}
        `}>
          {!selectedEmail ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
                <Mail className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Aucun message sélectionné</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Sélectionnez un mail dans la liste pour en visualiser le contenu.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Mobile Back Button Bar */}
              <div className="md:hidden px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedEmailId(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Retour aux messages</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleReply(selectedEmail)}
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded-lg cursor-pointer"
                    title="Répondre"
                  >
                    <Reply className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteEmail(selectedEmail.id);
                      setSelectedEmailId(null);
                    }}
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-rose-600 rounded-lg cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message Header & Action Buttons */}
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 space-y-3 sm:space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {selectedEmail.subject}
                  </h3>

                  <div className="hidden md:flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleReply(selectedEmail)}
                      className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      title="Répondre"
                    >
                      <Reply className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openComposeModal({ subject: `Fwd: ${selectedEmail.subject}`, replyBody: selectedEmail.body })}
                      className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      title="Transférer"
                    >
                      <Forward className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteEmail(selectedEmail.id);
                        setSelectedEmailId(null);
                      }}
                      className="p-2 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs shrink-0">
                      {selectedEmail.fromName[0] || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {selectedEmail.fromName}{' '}
                        <span className="font-mono text-slate-400 dark:text-slate-500 font-normal text-[11px]">
                          &lt;{selectedEmail.from}&gt;
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        À : {selectedEmail.to.join(', ')}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap font-mono self-start sm:self-auto">
                    {selectedEmail.date}
                  </span>
                </div>
              </div>

              {/* Attachments if any */}
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 sm:gap-3 overflow-x-auto">
                  {selectedEmail.attachments.map(att => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 shadow-2xs shrink-0"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium truncate max-w-40">{att.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({att.size})</span>
                      <button
                        type="button"
                        onClick={() => showToast(`Téléchargement de ${att.name}`, 'info')}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 ml-1 cursor-pointer"
                        title="Télécharger"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Message Body */}
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto whitespace-pre-line text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                {selectedEmail.body}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {renderDeleteModal()}
    </div>
  );
};
