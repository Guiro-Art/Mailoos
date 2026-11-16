import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  X, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Shield, 
  KeyRound, 
  Mail, 
  UserPlus, 
  ShieldAlert, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  LogIn, 
  Power, 
  Calendar, 
  Building2, 
  Lock, 
  Activity, 
  CheckSquare, 
  AlertTriangle,
  Fingerprint,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  Sliders,
  Globe,
  Users,
  FileSpreadsheet,
  Settings,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AdminUser, PermissionResource, PermissionAction } from '../types';

interface AdministrateursProps {
  embedded?: boolean;
  onNavigateToRBAC?: () => void;
  onNavigateToSecurity?: () => void;
}

export const Administrateurs: React.FC<AdministrateursProps> = ({ 
  embedded = false,
  onNavigateToRBAC,
  onNavigateToSecurity
}) => {
  const { 
    admins, 
    currentAdmin, 
    currentEnterprise, 
    enterprises,
    addAdmin, 
    updateAdmin, 
    deleteAdmin, 
    toggleTargetAdmin2FA, 
    toggleTargetAdminStatus, 
    updateAdminPassword, 
    switchAdminAccount, 
    rolePermissions, 
    auditLogs, 
    showToast, 
    buttonColor, 
    isCreator, 
    canView, 
    canCreate, 
    canEdit, 
    canDelete,
    reassignAdminRole,
    resetAdminCredentials,
    getUserPermissions
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals & Drawers
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('Entreprise');
  const [newAdminEnterpriseId, setNewAdminEnterpriseId] = useState(currentEnterprise.id);

  // User IAM Details Drawer
  const [inspectAdminId, setInspectAdminId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'rbac' | 'security' | 'audit'>('overview');
  
  // Password generation / revelation in drawer
  const [revealedPasswordId, setRevealedPasswordId] = useState<string | null>(null);
  const [customPasswordInput, setCustomPasswordInput] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const inspectedAdmin = useMemo(() => {
    return admins.find(a => a.id === inspectAdminId) || null;
  }, [admins, inspectAdminId]);

  // Filtered admins list
  const filteredAdmins = useMemo(() => {
    return admins.filter(admin => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        admin.name.toLowerCase().includes(q) || 
        admin.email.toLowerCase().includes(q) || 
        (admin.role || '').toLowerCase().includes(q);

      const matchesRole = selectedRoleFilter === 'all' || 
        admin.role?.toLowerCase() === selectedRoleFilter.toLowerCase();

      const matchesStatus = selectedStatusFilter === 'all' || 
        admin.status === selectedStatusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [admins, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // Overall IAM metrics
  const metrics = useMemo(() => {
    const total = admins.length;
    const active = admins.filter(a => a.status === 'active').length;
    const with2FA = admins.filter(a => a.has2FA).length;
    const rolesCount = new Set(admins.map(a => a.role)).size;
    return { total, active, with2FA, rolesCount };
  }, [admins]);

  const handleCopy = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    showToast('Copié dans le presse-papiers', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminName.trim()) {
      showToast('Veuillez renseigner le nom et l\'adresse e-mail.', 'error');
      return;
    }
    addAdmin(newAdminName, newAdminEmail, newAdminRole);
    setNewAdminName('');
    setNewAdminEmail('');
    setIsAddAdminOpen(false);
  };

  const handleQuickResetCredentials = (adminId: string) => {
    const newPass = resetAdminCredentials(adminId, customPasswordInput.trim() || undefined);
    setCustomPasswordInput('');
    showToast(`Identifiants régénérés : ${newPass}`, 'success');
  };

  const handleSwitchAccount = (adminId: string) => {
    const target = admins.find(a => a.id === adminId);
    if (!isCreator && target?.isCreator) {
      showToast("Accès réservé au Concepteur de la plateforme.", "error");
      return;
    }
    switchAdminAccount(adminId);
    setInspectAdminId(null);
  };

  const getEnterpriseName = (entId?: string) => {
    if (!entId || entId === 'all') return 'Globale (Toutes)';
    const ent = enterprises.find(e => e.id === entId);
    return ent ? ent.name : entId;
  };

  const getInitials = (name: string, email: string) => {
    if (!name) return email.slice(0, 2).toUpperCase();
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const resourceDefinitions: { id: PermissionResource; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'accounts', label: 'Comptes & Boîtes mail', icon: Users },
    { id: 'domains', label: 'Domaines & DNS', icon: Globe },
    { id: 'import', label: 'Imports Excel', icon: FileSpreadsheet },
    { id: 'admins', label: 'Gestion Administrateurs', icon: ShieldCheck },
    { id: 'settings', label: 'Paramètres Plateforme', icon: Settings },
    { id: 'audit', label: 'Journal d\'Audit', icon: FileText },
  ];

  if (!canView('admins')) {
    return (
      <div className={embedded ? "p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl" : "px-4 sm:px-6 lg:px-8 py-10 w-full"}>
        <div className="max-w-md mx-auto text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Accès restreint au module Administrateurs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            Votre profil actuel ({currentAdmin.role}) n'a pas la permission de consultation (VOIR) sur la gestion des administrateurs et identités IAM.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6 animate-in fade-in duration-150"}>
      
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Identités & Administrateurs (IAM)
            </h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 font-mono">
              Interconnecté RBAC
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Contrôle d'accès des administrateurs, affectation des rôles RBAC et gestion des identifiants sécurisés.
          </p>
        </div>

        {canCreate('admins') && (
          <button
            type="button"
            onClick={() => setIsAddAdminOpen(true)}
            style={{ backgroundColor: buttonColor }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-xs transition-all shadow-sm hover:shadow-md active:scale-98 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Ajouter un administrateur</span>
          </button>
        )}
      </div>

      {/* KPI Stats Strip (Unboxed Clean Typography) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block">Comptes Administrateurs</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">{metrics.total} comptes</span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3" /> {metrics.active} actifs
          </span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block">Rôles RBAC Actifs</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">{metrics.rolesCount} rôles</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            {rolePermissions.length} définis au total
          </span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block">Couverture MFA / 2FA</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">{metrics.with2FA} / {metrics.total}</span>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5 block font-mono">
            {Math.round((metrics.with2FA / (metrics.total || 1)) * 100)}% protégés
          </span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block">Périmètre Actif</span>
          <span className="text-base font-bold text-slate-900 dark:text-white truncate mt-1 block">
            {isCreator ? 'Vue Globale (Concepteur)' : currentEnterprise.name}
          </span>
          <span className="text-[11px] text-slate-400 truncate block font-mono">
            {isCreator ? 'Accès inter-entreprises' : currentEnterprise.defaultDomain}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par nom, e-mail ou rôle..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Role Filter */}
          <select
            value={selectedRoleFilter}
            onChange={e => setSelectedRoleFilter(e.target.value)}
            className="theme-select px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden cursor-pointer transition-colors shadow-2xs"
          >
            <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium py-1.5">Tous les rôles ({admins.length})</option>
            {rolePermissions.map(r => (
              <option key={r.role} value={r.role} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium py-1.5">
                {r.label} ({admins.filter(a => a.role === r.role).length})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={e => setSelectedStatusFilter(e.target.value as any)}
            className="theme-select px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden cursor-pointer transition-colors shadow-2xs"
          >
            <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium py-1.5">Tous statuts</option>
            <option value="active" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium py-1.5">Actifs uniquement</option>
            <option value="inactive" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium py-1.5">Inactifs / Suspendus</option>
          </select>
        </div>
      </div>

      {/* Main IAM Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Desktop & Tablet Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 pl-6 pr-4">Identité & Utilisateur</th>
                <th className="py-3.5 px-4">Organisation / Périmètre</th>
                <th className="py-3.5 px-4">Rôle & Droits RBAC</th>
                <th className="py-3.5 px-4">Sécurité & 2FA</th>
                <th className="py-3.5 px-4">Dernière Connexion</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 pr-6 pl-4 text-right">Actions IAM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Aucun administrateur ne correspond aux critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map(admin => {
                  const isCurrent = admin.id === currentAdmin.id;
                  const roleConfig = rolePermissions.find(r => r.role.toLowerCase() === (admin.role || '').toLowerCase());
                  const perms = getUserPermissions(admin.id);
                  const allowedCount = Object.values(perms).reduce((acc, curr) => {
                    return acc + Object.values(curr).filter(Boolean).length;
                  }, 0);

                  return (
                    <tr 
                      key={admin.id} 
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Identity */}
                      <td className="py-3.5 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div 
                            style={{ 
                              backgroundColor: admin.isCreator ? '#2563eb' : (roleConfig?.badgeColor || '#4f46e5'),
                              color: '#ffffff'
                            }}
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
                          >
                            {getInitials(admin.name, admin.email)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                              <span className="truncate">{admin.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                  Vous
                                </span>
                              )}
                              {admin.isCreator && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  Concepteur
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate">{admin.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Enterprise Scope */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium truncate">{getEnterpriseName(admin.enterpriseId)}</span>
                        </div>
                      </td>

                      {/* RBAC Role & Perm Count */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span 
                            style={{ color: roleConfig?.badgeColor || '#2563eb' }}
                            className="font-semibold block"
                          >
                            {roleConfig?.label || admin.role}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {admin.isCreator ? 'Privilèges absolus (30/30)' : `${allowedCount}/30 actions autorisées`}
                          </span>
                        </div>
                      </td>

                      {/* Security & 2FA */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleTargetAdmin2FA(admin.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                              admin.has2FA 
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                            title={admin.has2FA ? '2FA activée - Cliquer pour basculer' : '2FA désactivée - Cliquer pour activer'}
                          >
                            <Fingerprint className="w-3 h-3" />
                            <span>{admin.has2FA ? '2FA Actif' : 'Sans 2FA'}</span>
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {admin.passwordUpdatedAt || 'Pass configuré'}
                          </span>
                        </div>
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        <div className="space-y-0.5 font-mono text-[11px]">
                          <div>{admin.lastLogin || 'Récent'}</div>
                          <div className="text-[10px] text-slate-400">{admin.lastLoginIp || '102.180.170.117'}</div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => toggleTargetAdminStatus(admin.id)}
                          disabled={isCurrent}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            admin.status === 'active' 
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${admin.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>{admin.status === 'active' ? 'Actif' : 'Suspendu'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pr-6 pl-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Manage Access / Open Drawer */}
                          <button
                            type="button"
                            onClick={() => {
                              setInspectAdminId(admin.id);
                              setDrawerTab('overview');
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer"
                            title="Gérer les accès et identifiants IAM"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          {/* Quick Switch / Emulate */}
                          {!isCurrent && (isCreator || !admin.isCreator) && (
                            <button
                              type="button"
                              onClick={() => handleSwitchAccount(admin.id)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                              title="Émuler ce compte pour tester les droits"
                            >
                              <LogIn className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete */}
                          {canDelete('admins') && !isCurrent && !admin.isCreator && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(admin.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer ce compte administrateur"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Mobile Admin Cards View */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredAdmins.length === 0 ? (
            <div className="py-12 text-center text-slate-400 px-4">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Aucun administrateur ne correspond aux critères.
            </div>
          ) : (
            filteredAdmins.map(admin => {
              const isCurrent = admin.id === currentAdmin.id;
              const roleConfig = rolePermissions.find(r => r.role.toLowerCase() === (admin.role || '').toLowerCase());

              return (
                <div key={`mob-adm-${admin.id}`} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div 
                        style={{ 
                          backgroundColor: admin.isCreator ? '#2563eb' : (roleConfig?.badgeColor || '#4f46e5'),
                          color: '#ffffff'
                        }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
                      >
                        {getInitials(admin.name, admin.email)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                          <span className="truncate">{admin.name}</span>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 font-semibold">
                              Vous
                            </span>
                          )}
                          {admin.isCreator && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 font-semibold">
                              Concepteur
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">{admin.email}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleTargetAdminStatus(admin.id)}
                      disabled={isCurrent}
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        admin.status === 'active' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' 
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${admin.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {admin.status === 'active' ? 'Actif' : 'Suspendu'}
                    </button>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="block text-[10px] text-slate-400">Rôle RBAC</span>
                      <span style={{ color: roleConfig?.badgeColor || '#2563eb' }} className="font-semibold">
                        {roleConfig?.label || admin.role}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-400">Entreprise</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-28 block">
                        {getEnterpriseName(admin.enterpriseId)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-400">Sécurité</span>
                      <button
                        type="button"
                        onClick={() => toggleTargetAdmin2FA(admin.id)}
                        className={`font-semibold inline-flex items-center gap-1 ${admin.has2FA ? 'text-emerald-600' : 'text-slate-500'}`}
                      >
                        <Fingerprint className="w-3 h-3" />
                        <span>{admin.has2FA ? '2FA' : 'Sans'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setInspectAdminId(admin.id);
                        setDrawerTab('overview');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Gérer IAM</span>
                    </button>

                    {!isCurrent && (isCreator || !admin.isCreator) && (
                      <button
                        type="button"
                        onClick={() => handleSwitchAccount(admin.id)}
                        className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 transition-colors"
                        title="Émuler ce compte"
                      >
                        <LogIn className="w-4 h-4" />
                      </button>
                    )}

                    {canDelete('admins') && !isCurrent && !admin.isCreator && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(admin.id)}
                        className="p-1.5 rounded-lg text-rose-600 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 transition-colors"
                        title="Supprimer"
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

      {/* Complete Enterprise IAM Inspector / Drawer */}
      {inspectedAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div 
                  style={{ backgroundColor: inspectedAdmin.isCreator ? '#2563eb' : '#4f46e5', color: '#fff' }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm"
                >
                  {getInitials(inspectedAdmin.name, inspectedAdmin.email)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {inspectedAdmin.name}
                    {inspectedAdmin.isCreator && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300">
                        Concepteur
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                    <span>{inspectedAdmin.email}</span>
                    <span>·</span>
                    <span>{getEnterpriseName(inspectedAdmin.enterpriseId)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectAdminId(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs Navigation inside Drawer */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 text-xs">
              <button
                type="button"
                onClick={() => setDrawerTab('overview')}
                className={`py-3 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'overview'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                Vue d'ensemble
              </button>

              <button
                type="button"
                onClick={() => setDrawerTab('rbac')}
                className={`py-3 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'rbac'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                Rôle & Matrice RBAC
              </button>

              <button
                type="button"
                onClick={() => setDrawerTab('security')}
                className={`py-3 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'security'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                Sécurité & Identifiants
              </button>

              <button
                type="button"
                onClick={() => setDrawerTab('audit')}
                className={`py-3 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'audit'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                Journal d'activité
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              
              {/* Tab 1: Overview */}
              {drawerTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Identifiant IAM unique</span>
                      <span className="font-mono text-slate-900 dark:text-white font-semibold mt-0.5 block">{inspectedAdmin.id}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Rôle assigné</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400 mt-0.5 block">{inspectedAdmin.role}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Date de création du compte</span>
                      <span className="text-slate-900 dark:text-white mt-0.5 block">{inspectedAdmin.createdAt}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Statut du compte</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block capitalize">
                        {inspectedAdmin.status === 'active' ? 'Opérationnel / Actif' : 'Désactivé'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>Actions d'émulation de session</span>
                      <span className="text-[10px] text-slate-400 font-normal">Audit tracé</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Vous pouvez basculer immédiatement sur la session de cet administrateur pour auditer les écrans exactement comme il les voit.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSwitchAccount(inspectedAdmin.id)}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:border-blue-500 cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5 text-blue-500" />
                      <span>Basculer sur cette session utilisateur</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: RBAC Matrix */}
              {drawerTab === 'rbac' && (
                <div className="space-y-4">
                  {/* Role Selector */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="block font-semibold text-slate-900 dark:text-white">
                      Rôle RBAC Attribué à cet administrateur :
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={inspectedAdmin.role}
                        disabled={!isCreator && inspectedAdmin.isCreator}
                        onChange={e => reassignAdminRole(inspectedAdmin.id, e.target.value)}
                        className="theme-select flex-1 px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                      >
                        {rolePermissions.map(r => (
                          <option key={r.role} value={r.role} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium py-1.5">
                            {r.label} ({r.role})
                          </option>
                        ))}
                      </select>
                      {onNavigateToRBAC && (
                        <button
                          type="button"
                          onClick={() => {
                            setInspectAdminId(null);
                            onNavigateToRBAC();
                          }}
                          className="px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 rounded-xl hover:underline cursor-pointer shrink-0"
                        >
                          Éditer matrice RBAC →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Effective permissions breakdown */}
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                      <span>Permissions effectives sur chaque module :</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {inspectedAdmin.isCreator ? 'Accès Concepteur Débridé' : 'Synchronisé sur le rôle'}
                      </span>
                    </h4>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {resourceDefinitions.map(res => {
                        const userPerms = getUserPermissions(inspectedAdmin.id)[res.id];
                        const ResIcon = res.icon;
                        const actions: { id: PermissionAction; label: string }[] = [
                          { id: 'view', label: 'Voir' },
                          { id: 'create', label: 'Ajouter' },
                          { id: 'edit', label: 'Modifier' },
                          { id: 'delete', label: 'Supprimer' },
                          { id: 'export', label: 'Exporter' },
                        ];

                        return (
                          <div key={res.id} className="p-3 flex items-center justify-between bg-white dark:bg-slate-900">
                            <div className="flex items-center gap-2">
                              <ResIcon className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-slate-800 dark:text-slate-200">{res.label}</span>
                            </div>

                            <div className="flex items-center gap-1.5 font-mono text-[10px]">
                              {actions.map(act => {
                                const isAllowed = userPerms?.[act.id] ?? false;
                                return (
                                  <span
                                    key={act.id}
                                    className={`px-1.5 py-0.5 rounded ${
                                      isAllowed 
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through opacity-60'
                                    }`}
                                  >
                                    {act.label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Security & Credentials */}
              {drawerTab === 'security' && (
                <div className="space-y-4">
                  {/* Password Management */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-blue-500" />
                        <span>Identifiants & Mot de passe</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Dernière modif : {inspectedAdmin.passwordUpdatedAt || 'Initiale'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Mot de passe du compte :</span>
                        <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white mt-0.5 block">
                          {revealedPasswordId === inspectedAdmin.id 
                            ? (inspectedAdmin.password || 'Admin1234!') 
                            : '••••••••••••••••'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRevealedPasswordId(prev => prev === inspectedAdmin.id ? null : inspectedAdmin.id)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                          title="Afficher/Masquer le mot de passe"
                        >
                          {revealedPasswordId === inspectedAdmin.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(inspectedAdmin.password || 'Admin1234!', 'pwd')}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                          title="Copier le mot de passe"
                        >
                          {copiedKey === 'pwd' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Generate new credentials */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        Définir ou régénérer le mot de passe :
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Laisser vide pour générer un mot de passe fort automatique"
                          value={customPasswordInput}
                          onChange={e => setCustomPasswordInput(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuickResetCredentials(inspectedAdmin.id)}
                          className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer"
                        >
                          Appliquer
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2FA Toggle & MFA Status */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Fingerprint className="w-4 h-4 text-purple-500" />
                        <span>Double Authentification (2FA TOTP)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {inspectedAdmin.has2FA 
                          ? 'Activée. L\'administrateur doit saisir un code TOTP à 6 chiffres.' 
                          : 'Désactivée. L\'accès nécessite uniquement mot de passe.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleTargetAdmin2FA(inspectedAdmin.id)}
                      className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                        inspectedAdmin.has2FA 
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100' 
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {inspectedAdmin.has2FA ? 'Désactiver 2FA' : 'Activer 2FA'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 4: Audit */}
              {drawerTab === 'audit' && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    Dernières opérations enregistrées pour cet administrateur :
                  </h4>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {auditLogs
                      .filter(l => l.adminEmail.toLowerCase() === inspectedAdmin.email.toLowerCase())
                      .slice(0, 8)
                      .map(log => (
                        <div key={log.id} className="p-3 text-xs bg-white dark:bg-slate-900 flex items-start justify-between">
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">{log.action}</span>
                            <span className="text-slate-400 text-[11px] block mt-0.5">{log.target} {log.detail ? `· ${log.detail}` : ''}</span>
                          </div>
                          <div className="text-right font-mono text-[10px] text-slate-400">
                            <div>{log.date}</div>
                            <div>{log.ip}</div>
                          </div>
                        </div>
                      ))}
                    {auditLogs.filter(l => l.adminEmail.toLowerCase() === inspectedAdmin.email.toLowerCase()).length === 0 && (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        Aucune action enregistrée pour cet administrateur.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {isAddAdminOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div 
                  style={{ backgroundColor: `${buttonColor}15`, color: buttonColor }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                >
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Créer un compte administrateur IAM
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Définissez l'identité, l'organisation et le rôle RBAC
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAdminOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdminSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom complet
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Jean Dupont"
                  value={newAdminName}
                  onChange={e => setNewAdminName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse e-mail professionnelle
                </label>
                <input
                  type="email"
                  required
                  placeholder="j.dupont@entreprise.com"
                  value={newAdminEmail}
                  onChange={e => setNewAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Organisation / Entreprise rattachée
                </label>
                <select
                  value={newAdminEnterpriseId}
                  onChange={e => setNewAdminEnterpriseId(e.target.value)}
                  className="theme-select w-full px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                >
                  {enterprises.map(e => (
                    <option key={e.id} value={e.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium py-1.5">
                      {e.name} ({e.defaultDomain})
                    </option>
                  ))}
                  {isCreator && (
                    <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium py-1.5">
                      Toutes les organisations (Global Concepteur)
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rôle RBAC initial
                </label>
                <select
                  value={newAdminRole}
                  onChange={e => setNewAdminRole(e.target.value)}
                  className="theme-select w-full px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                >
                  {rolePermissions.map(r => (
                    <option key={r.role} value={r.role} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium py-1.5">
                      {r.label} ({r.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                Un mot de passe sécurisé provisoire (<strong className="font-mono text-slate-700 dark:text-slate-200">Admin1234!</strong>) sera généré automatiquement.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAdminOpen(false)}
                  className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: buttonColor }}
                  className="px-4 py-2 font-semibold text-white rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  Créer l'administrateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Confirmer la suppression</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Êtes-vous sûr de vouloir révoquer l'accès de cet administrateur ? Cette action est irréversible.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteAdmin(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 cursor-pointer shadow-xs"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
