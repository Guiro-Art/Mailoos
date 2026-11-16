import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  Search, 
  Download, 
  Plus, 
  Mail, 
  Eye, 
  Key, 
  Trash2, 
  X, 
  Copy, 
  Check, 
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  User,
  Power,
  ShieldAlert,
  HardDrive,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MailboxAccount } from '../types';
import { PrintModal } from './PrintModal';

export const ComptesMail: React.FC = () => {
  const { 
    mailboxes, 
    domains, 
    currentEnterprise, 
    addMailbox, 
    deleteMailbox, 
    toggleMailboxStatus, 
    updateMailboxPassword,
    openWebmailForAccount,
    viewPasswordAccount,
    setViewPasswordAccount,
    resetPasswordAccount,
    setResetPasswordAccount,
    isNewMailboxModalOpen,
    setIsNewMailboxModalOpen,
    logAuditAction,
    showToast,
    buttonColor,
    theme,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  
  // Deletion modals state
  const [mailboxToDelete, setMailboxToDelete] = useState<MailboxAccount | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  
  // New Mailbox Form State
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newAddressPrefix, setNewAddressPrefix] = useState('');
  const [newSelectedDomain, setNewSelectedDomain] = useState(
    domains[0]?.name || currentEnterprise.defaultDomain
  );
  const [isDomainSelectHovered, setIsDomainSelectHovered] = useState(false);
  const [isDomainSelectFocused, setIsDomainSelectFocused] = useState(false);

  React.useEffect(() => {
    setNewSelectedDomain(domains[0]?.name || currentEnterprise.defaultDomain);
  }, [currentEnterprise.id, domains]);

  // New Password State
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copiedCurrentPassword, setCopiedCurrentPassword] = useState(false);

  // Filtered Mailboxes
  const filteredMailboxes = mailboxes.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'active') return matchesSearch && m.status === 'active';
    if (statusFilter === 'disabled') return matchesSearch && m.status === 'disabled';
    return matchesSearch;
  });

  const activeCount = mailboxes.filter(m => m.status === 'active').length;
  const disabledCount = mailboxes.filter(m => m.status === 'disabled').length;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredMailboxes.map(m => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleViewPassword = (account: MailboxAccount) => {
    setViewPasswordAccount(account);
    logAuditAction('Mot de passe consulté', account.email);
  };

  const handleCopyCurrentPassword = () => {
    if (!viewPasswordAccount) return;
    navigator.clipboard.writeText(viewPasswordAccount.password);
    setCopiedCurrentPassword(true);
    showToast('Mot de passe copié', 'success');
    setTimeout(() => setCopiedCurrentPassword(false), 2000);
  };

  const handleOpenResetPassword = (account: MailboxAccount) => {
    setResetPasswordAccount(account);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!#$@%&';
    let res = '';
    for (let i = 0; i < 14; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(res);
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordAccount || !generatedPassword) return;
    updateMailboxPassword(resetPasswordAccount.id, generatedPassword);
    setResetPasswordAccount(null);
  };

  const handleCreateMailbox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressPrefix.trim()) {
      showToast("Veuillez saisir l'adresse email", 'error');
      return;
    }
    addMailbox(newFirstName, newLastName, newAddressPrefix, newSelectedDomain);
    setNewFirstName('');
    setNewLastName('');
    setNewAddressPrefix('');
    setIsNewMailboxModalOpen(false);
  };

  const handleExportCsv = () => {
    const escapeCsvCell = (val: string | number | undefined | null): string => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = ["Nom", "Adresse", "Mails", "Non Lus", "Statut", "Espace Utilisé"];
    const rows = filteredMailboxes.map(m => [
      escapeCsvCell(m.name),
      escapeCsvCell(m.email),
      escapeCsvCell(m.mailsCount),
      escapeCsvCell(m.unreadCount),
      escapeCsvCell(m.status === 'active' ? 'Actif' : 'Désactivé'),
      escapeCsvCell(`${(m.storageUsedBytes / (1024 * 1024)).toFixed(1)} Mo`)
    ].join(";"));

    // \uFEFF UTF-8 BOM ensures Microsoft Excel and spreadsheet apps detect UTF-8 encoding (rendering accents like é, è cleanly)
    // Semicolon (;) ensures Microsoft Excel in French and international locales splits each value into its own dedicated column
    const csvContent = "\uFEFF" + [headers.map(escapeCsvCell).join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `comptes_mail_${currentEnterprise.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exportation CSV téléchargée (colonnes distinctes pour Excel)', 'success');
  };

  const handleExportXlsx = () => {
    try {
      const data = filteredMailboxes.map(m => ({
        "Nom": m.name,
        "Adresse": m.email,
        "Mails": m.mailsCount,
        "Non Lus": m.unreadCount,
        "Statut": m.status === 'active' ? 'Actif' : 'Désactivé',
        "Espace Utilisé": `${(m.storageUsedBytes / (1024 * 1024)).toFixed(1)} Mo`
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      worksheet['!cols'] = [
        { wch: 26 }, // Nom
        { wch: 32 }, // Adresse
        { wch: 14 }, // Mails
        { wch: 14 }, // Non Lus
        { wch: 14 }, // Statut
        { wch: 18 }  // Espace Utilisé
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Comptes Mail");
      XLSX.writeFile(workbook, `comptes_mail_${currentEnterprise.name.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
      showToast('Exportation Excel (.xlsx) téléchargée', 'success');
    } catch {
      handleExportCsv();
    }
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const getInitials = (name: string, email: string) => {
    if (!name) return email.slice(0, 2).toUpperCase();
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  if (!canView('accounts')) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-16 w-full flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 border border-amber-200 dark:border-amber-800/60">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Accès restreint par les permissions (RBAC)</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1.5 leading-relaxed">
          Votre rôle actuel ne dispose pas du droit de consultation (VOIR) sur le module des comptes mail. Vous pouvez modifier cette règle dans les <strong>Paramètres &gt; Droits &amp; Permissions (RBAC)</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 w-full space-y-5 sm:space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">Utilisateurs</span>
            <span>/</span>
            <span className="text-blue-600 dark:text-blue-400 font-medium">Boîtes & Collaborateurs</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Comptes de messagerie
            </h1>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              ({mailboxes.length} boîte{mailboxes.length > 1 ? 's' : ''})
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gérez les boîtes aux lettres professionnelles rattachées à <span className="font-semibold text-slate-700 dark:text-slate-300">{currentEnterprise.name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {canExport('accounts') && (
            <div className="flex items-center shadow-2xs rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer border-r border-slate-200 dark:border-slate-800"
                title="Exporter au format CSV (point-virgule, colonnes séparées pour Excel)"
              >
                <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Exporter CSV</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="Imprimer la liste des comptes de messagerie"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Imprimer</span>
              </button>
            </div>
          )}

          {canCreate('accounts') ? (
            <button
              type="button"
              onClick={() => setIsNewMailboxModalOpen(true)}
              style={{ backgroundColor: buttonColor }}
              className="theme-primary-btn flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle boîte</span>
            </button>
          ) : (
            <div 
              title="Création restreinte par la matrice des droits (RBAC)"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-not-allowed border border-slate-200/80 dark:border-slate-800"
            >
              <Plus className="w-4 h-4 opacity-40" />
              <span>Création restreinte</span>
            </div>
          )}
        </div>
      </div>

      {/* Action and Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 max-w-2xl">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher par nom ou adresse e-mail..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Segmented status filter */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tous ({mailboxes.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Actifs ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('disabled')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'disabled'
                  ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Désactivés ({disabledCount})
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action banner when rows are selected */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/90 dark:border-rose-900/60 px-4 py-3 rounded-xl shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 text-xs text-rose-900 dark:text-rose-200 font-medium">
            <span className="w-5 h-5 rounded-full bg-rose-200 dark:bg-rose-900/70 text-rose-900 dark:text-rose-100 font-bold flex items-center justify-center text-[11px]">
              {selectedIds.length}
            </span>
            <span>
              <strong>{selectedIds.length}</strong> compte{selectedIds.length > 1 ? 's' : ''} sélectionné{selectedIds.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Désélectionner tout
            </button>
            {canDelete('accounts') && (
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer les {selectedIds.length} comptes</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mail Accounts Table (Desktop & Tablet) & Card List (Mobile) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Desktop & Tablet Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredMailboxes.length}
                    onChange={handleSelectAll}
                    disabled={!canDelete('accounts')}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 dark:bg-slate-800 dark:border-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </th>
                <th className="py-3 px-4 font-medium">UTILISATEUR</th>
                <th className="py-3 px-4 font-medium">ADRESSE E-MAIL</th>
                <th className="py-3 px-4 font-medium text-center">MAILS</th>
                <th className="py-3 px-4 font-medium text-center">NON LUS</th>
                <th className="py-3 px-4 font-medium">STOCKAGE</th>
                <th className="py-3 px-4 font-medium">STATUT</th>
                <th className="py-3 px-5 font-medium text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMailboxes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <User className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    Aucun compte trouvé correspondant aux critères.
                  </td>
                </tr>
              ) : (
                filteredMailboxes.map((account, idx) => {
                  const isSelected = selectedIds.includes(account.id);
                  const storageUsedMo = (account.storageUsedBytes / (1024 * 1024)).toFixed(0);

                  return (
                    <tr 
                      key={`${account.id}-${idx}`} 
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-blue-50/40 dark:bg-blue-950/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(account.id)}
                          disabled={!canDelete('accounts')}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 dark:bg-slate-800 dark:border-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* NOM with Avatar */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {getInitials(account.name, account.email)}
                          </div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {account.name}
                          </span>
                        </div>
                      </td>

                      {/* ADRESSE (clicking opens webmail directly) */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => openWebmailForAccount(account)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-mono text-left truncate block max-w-xs cursor-pointer"
                          title="Ouvrir cette boîte mail"
                        >
                          {account.email}
                        </button>
                      </td>

                      {/* MAILS */}
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        {account.mailsCount}
                      </td>

                      {/* NON LUS */}
                      <td className="py-3 px-4 text-center font-mono tabular-nums">
                        {account.unreadCount > 0 ? (
                          <span className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded text-[11px]">
                            {account.unreadCount}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">0</span>
                        )}
                      </td>

                      {/* STOCKAGE */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {storageUsedMo} Mo / 5 Go
                        </div>
                        <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div 
                            className="bg-blue-600 dark:bg-blue-500 h-full rounded-full" 
                            style={{ width: `${Math.max(2, (account.storageUsedBytes / account.storageLimitBytes) * 100)}%` }}
                          />
                        </div>
                      </td>

                      {/* STATUT */}
                      <td className="py-3 px-4">
                        {account.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Désactivé
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {/* Lire les mails */}
                          <button
                            type="button"
                            onClick={() => openWebmailForAccount(account)}
                            title="Ouvrir le webmail"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Mail className="w-4 h-4" />
                          </button>

                          {/* Voir le mot de passe */}
                          <button
                            type="button"
                            onClick={() => handleViewPassword(account)}
                            title="Consulter le mot de passe"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Nouveau mot de passe (MODIFIER) */}
                          {canEdit('accounts') && (
                            <button
                              type="button"
                              onClick={() => handleOpenResetPassword(account)}
                              title="Réinitialiser le mot de passe"
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                          )}

                          {/* Activer / Désactiver button (MODIFIER) */}
                          {canEdit('accounts') && (
                            <button
                              type="button"
                              onClick={() => toggleMailboxStatus(account.id)}
                              title={account.status === 'active' ? "Désactiver la boîte" : "Activer la boîte"}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Supprimer button (SUPPRIMER) */}
                          {canDelete('accounts') && (
                            <button
                              type="button"
                              onClick={() => setMailboxToDelete(account)}
                              title="Supprimer ce compte mail"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (Phone Layout) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredMailboxes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 px-4">
              <User className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              Aucun compte trouvé correspondant aux critères.
            </div>
          ) : (
            filteredMailboxes.map((account, idx) => {
              const isSelected = selectedIds.includes(account.id);
              const storageUsedMo = (account.storageUsedBytes / (1024 * 1024)).toFixed(0);

              return (
                <div 
                  key={`mobile-${account.id}-${idx}`}
                  className={`p-4 space-y-3 transition-colors ${
                    isSelected ? 'bg-blue-50/50 dark:bg-blue-950/30' : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(account.id)}
                        disabled={!canDelete('accounts')}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 dark:bg-slate-800 dark:border-slate-700 cursor-pointer shrink-0"
                      />
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {getInitials(account.name, account.email)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {account.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => openWebmailForAccount(account)}
                          className="text-[11px] font-mono text-blue-600 dark:text-blue-400 truncate block text-left hover:underline"
                        >
                          {account.email}
                        </button>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      account.status === 'active' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${account.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {account.status === 'active' ? 'Actif' : 'Désactivé'}
                    </span>
                  </div>

                  {/* Metrics Row */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="block text-[10px] text-slate-400">Total mails</span>
                      <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{account.mailsCount}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Non lus</span>
                      <span className={`font-bold font-mono ${account.unreadCount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                        {account.unreadCount}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Stockage</span>
                      <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{storageUsedMo} Mo / 5 Go</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => openWebmailForAccount(account)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Webmail</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleViewPassword(account)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                      title="Consulter le mot de passe"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {canEdit('accounts') && (
                      <button
                        type="button"
                        onClick={() => handleOpenResetPassword(account)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                        title="Réinitialiser le mot de passe"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                    )}

                    {canEdit('accounts') && (
                      <button
                        type="button"
                        onClick={() => toggleMailboxStatus(account.id)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                        title={account.status === 'active' ? "Désactiver" : "Activer"}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    )}

                    {canDelete('accounts') && (
                      <button
                        type="button"
                        onClick={() => setMailboxToDelete(account)}
                        className="p-1.5 rounded-lg text-rose-600 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 transition-colors"
                        title="Supprimer ce compte"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Voir le mot de passe actuel */}
      {viewPasswordAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Mot de passe du compte
              </h3>
              <button
                type="button"
                onClick={() => setViewPasswordAccount(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-mono">
              {viewPasswordAccount.email}
            </p>

            <div className="flex items-center gap-2">
              <div className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-wider">
                {viewPasswordAccount.password}
              </div>
              <button
                type="button"
                onClick={handleCopyCurrentPassword}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors shrink-0 flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              >
                {copiedCurrentPassword ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nouveau mot de passe */}
      {resetPasswordAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Régénérer le mot de passe
              </h3>
              <button
                type="button"
                onClick={() => setResetPasswordAccount(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-mono">
              {resetPasswordAccount.email}
            </p>

            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mot de passe aléatoire généré
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={generatedPassword}
                    onChange={e => setGeneratedPassword(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-sm font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!#$@%&';
                      let res = '';
                      for (let i = 0; i < 14; i++) {
                        res += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      setGeneratedPassword(res);
                    }}
                    title="Régénérer"
                    className="p-2.5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordAccount(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs cursor-pointer active:scale-95"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nouvelle boîte mail */}
      {isNewMailboxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Créer une nouvelle boîte mail
              </h3>
              <button
                type="button"
                onClick={() => setIsNewMailboxModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMailbox} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={e => setNewFirstName(e.target.value)}
                    placeholder="Ex: Ousmane"
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={e => setNewLastName(e.target.value)}
                    placeholder="Ex: Kinda"
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse e-mail
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={newAddressPrefix}
                    onChange={e => setNewAddressPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    placeholder="contact"
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden transition-colors text-right font-mono"
                  />
                  <span className="text-slate-400 font-bold">@</span>
                  <select
                    value={newSelectedDomain}
                    onChange={e => setNewSelectedDomain(e.target.value)}
                    onMouseEnter={() => setIsDomainSelectHovered(true)}
                    onMouseLeave={() => setIsDomainSelectHovered(false)}
                    onFocus={() => setIsDomainSelectFocused(true)}
                    onBlur={() => setIsDomainSelectFocused(false)}
                    style={{ 
                      accentColor: buttonColor,
                      borderColor: (isDomainSelectHovered || isDomainSelectFocused) ? buttonColor : undefined,
                      borderWidth: (isDomainSelectHovered || isDomainSelectFocused) ? '2px' : '1px',
                      backgroundColor: isDomainSelectHovered 
                        ? (theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : '#f8fafc') 
                        : undefined,
                      boxShadow: isDomainSelectFocused 
                        ? `0 0 0 3px ${buttonColor}45` 
                        : (isDomainSelectHovered ? `0 0 0 3.5px ${buttonColor}40` : undefined)
                    }}
                    className="theme-select flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-hidden font-mono text-slate-900 dark:text-slate-100 cursor-pointer transition-all duration-150 font-medium"
                  >
                    {domains.map(d => (
                      <option key={d.id} value={d.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium py-1.5">{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewMailboxModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: buttonColor }}
                  className="theme-primary-btn px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  Créer le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmation de suppression d'un compte mail */}
      {mailboxToDelete && (
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

                {/* Account details card */}
                <div className="mt-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1 text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">{mailboxToDelete.name}</div>
                  <div className="text-blue-600 dark:text-blue-400 font-mono font-medium break-all">{mailboxToDelete.email}</div>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
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

                {/* Warning note */}
                <div className="mt-3.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Attention :</strong> Cette action est irréversible. Tous les messages seront effacés et le quota sera libéré.
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
                      deleteMailbox(id);
                      setSelectedIds(prev => prev.filter(i => i !== id));
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
      )}

      {/* Modal: Confirmation de suppression groupée */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Supprimer {selectedIds.length} compte{selectedIds.length > 1 ? 's' : ''} mail
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsBulkDeleteModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Êtes-vous sûr de vouloir supprimer définitivement ces {selectedIds.length} comptes de messagerie ?
                </p>

                {/* List of accounts to be deleted */}
                <div className="mt-3.5 max-h-48 overflow-y-auto rounded-xl border border-slate-200/90 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  {filteredMailboxes
                    .filter(m => selectedIds.includes(m.id))
                    .map(acc => (
                      <div key={acc.id} className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800">
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{acc.name}</span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono ml-2 text-[11px] truncate">{acc.email}</span>
                        </div>
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px] shrink-0">{acc.mailsCount} mails</span>
                      </div>
                    ))}
                </div>

                <div className="flex items-center justify-end gap-2.5 mt-5">
                  <button
                    type="button"
                    onClick={() => setIsBulkDeleteModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      selectedIds.forEach(id => deleteMailbox(id));
                      setSelectedIds([]);
                      setIsBulkDeleteModalOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer les {selectedIds.length} comptes</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'aperçu avant impression & export */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Comptes de messagerie professionnelle"
        subtitle={`Liste officielle des comptes - Filtre : ${statusFilter === 'all' ? 'Tous' : statusFilter === 'active' ? 'Actifs' : 'Désactivés'}${searchQuery ? ` ("${searchQuery}")` : ''}`}
        enterpriseName={currentEnterprise.name}
        stats={[
          { label: "Total boîtes", value: mailboxes.length },
          { label: "Actives", value: activeCount },
          { label: "Désactivées", value: disabledCount },
          { label: "Mails cumulés", value: mailboxes.reduce((acc, m) => acc + m.mailsCount, 0) },
        ]}
        columns={["#", "Nom du titulaire", "Adresse e-mail", "Messages", "Non lus", "Statut", "Espace utilisé"]}
        rows={filteredMailboxes.map((m, idx) => [
          idx + 1,
          m.name,
          m.email,
          m.mailsCount,
          m.unreadCount,
          m.status === 'active' ? 'Actif' : 'Désactivé',
          `${(m.storageUsedBytes / (1024 * 1024)).toFixed(0)} Mo`
        ])}
      />
    </div>
  );
};
