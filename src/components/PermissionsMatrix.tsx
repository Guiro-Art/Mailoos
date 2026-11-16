import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  Plus, 
  Pencil, 
  Trash2, 
  Download, 
  Check, 
  X, 
  RotateCcw, 
  PlusCircle, 
  Users, 
  Globe, 
  FileSpreadsheet, 
  FileText, 
  Settings, 
  Lock,
  ArrowRight,
  Shield,
  HelpCircle,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Building2,
  UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PermissionAction, PermissionResource, RolePermissionDefinition, AdminUser } from '../types';

interface PermissionsMatrixProps {
  onSelectAdmin?: (adminId: string) => void;
}

export const PermissionsMatrix: React.FC<PermissionsMatrixProps> = ({ onSelectAdmin }) => {
  const { 
    rolePermissions, 
    updateRolePermission, 
    resetRolePermissions, 
    addCustomRole, 
    deleteCustomRole,
    buttonColor, 
    admins,
    currentAdmin,
    showToast,
    isCreator,
    getAdminsForRole
  } = useApp();

  const [selectedRole, setSelectedRole] = useState<string>('Super Admin');
  const [isNewRoleModalOpen, setIsNewRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [copyFromRole, setCopyFromRole] = useState('Support');

  // Permission Simulator
  const [simulatedResource, setSimulatedResource] = useState<PermissionResource>('domains');
  const [simulatedAction, setSimulatedAction] = useState<PermissionAction>('delete');

  const currentRoleConfig = useMemo(() => {
    return rolePermissions.find(r => r.role.toLowerCase() === selectedRole.toLowerCase())
      || rolePermissions[0];
  }, [rolePermissions, selectedRole]);

  // Members currently assigned to this role
  const assignedMembers: AdminUser[] = useMemo(() => {
    return admins.filter(a => a.role?.toLowerCase() === currentRoleConfig.role.toLowerCase());
  }, [admins, currentRoleConfig]);

  const resources: { id: PermissionResource; label: string; icon: React.FC<{ className?: string }>; description: string }[] = [
    {
      id: 'accounts',
      label: 'Comptes mail & Boîtes',
      icon: Users,
      description: 'Gestion des adresses mail, quotas de stockage, mots de passe et statut actif/inactif'
    },
    {
      id: 'domains',
      label: 'Domaines & Enregistrements DNS',
      icon: Globe,
      description: 'Ajout de noms de domaine, diagnostic MX/SPF/DKIM/DMARC et vérification'
    },
    {
      id: 'import',
      label: 'Importation de listes Excel',
      icon: FileSpreadsheet,
      description: 'Téléversement de classeurs Excel, mapping des colonnes et création en lot'
    },
    {
      id: 'admins',
      label: 'Administrateurs & Identités IAM',
      icon: ShieldCheck,
      description: 'Attribution des comptes administrateurs, affectation des rôles et double authentification 2FA'
    },
    {
      id: 'settings',
      label: 'Paramètres & Personnalisation',
      icon: Settings,
      description: 'Couleurs de thème, configuration des serveurs IMAP/SMTP et gouvernance globale'
    },
    {
      id: 'audit',
      label: 'Journal d\'audit & Traçabilité',
      icon: FileText,
      description: 'Historique immuable de toutes les opérations administratives et adresses IP'
    }
  ];

  const actions: { id: PermissionAction; label: string; icon: React.FC<{ className?: string }>; color: string }[] = [
    { id: 'view', label: 'VOIR', icon: Eye, color: 'text-blue-600 dark:text-blue-400' },
    { id: 'create', label: 'AJOUTER', icon: Plus, color: 'text-emerald-600 dark:text-emerald-400' },
    { id: 'edit', label: 'MODIFIER', icon: Pencil, color: 'text-amber-600 dark:text-amber-400' },
    { id: 'delete', label: 'SUPPRIMER', icon: Trash2, color: 'text-rose-600 dark:text-rose-400' },
    { id: 'export', label: 'EXPORTER', icon: Download, color: 'text-indigo-600 dark:text-indigo-400' },
  ];

  const handleToggle = (resource: PermissionResource, action: PermissionAction) => {
    if (!isCreator) {
      showToast("Seul le Concepteur de la plateforme a le droit d'éditer la matrice RBAC.", "warning");
      return;
    }
    const currentValue = currentRoleConfig.permissions[resource]?.[action] ?? false;
    updateRolePermission(currentRoleConfig.role, resource, action, !currentValue);
  };

  const handleSetRowAll = (resource: PermissionResource, enableAll: boolean) => {
    if (!isCreator) {
      showToast("Action réservée au Concepteur de la plateforme.", "warning");
      return;
    }
    actions.forEach(act => {
      if (resource === 'audit' && (act.id === 'create' || act.id === 'edit' || act.id === 'delete')) {
        updateRolePermission(currentRoleConfig.role, resource, act.id, false);
      } else {
        updateRolePermission(currentRoleConfig.role, resource, act.id, enableAll);
      }
    });
    showToast(`Permissions de la ressource "${resource}" mises à jour`, 'info');
  };

  const handleSetRowReadOnly = (resource: PermissionResource) => {
    if (!isCreator) {
      showToast("Action réservée au Concepteur de la plateforme.", "warning");
      return;
    }
    actions.forEach(act => {
      updateRolePermission(currentRoleConfig.role, resource, act.id, act.id === 'view');
    });
    showToast(`Ressource "${resource}" passée en lecture seule`, 'info');
  };

  const handleGrantAllForRole = () => {
    if (!isCreator) {
      showToast("Action réservée au Concepteur de la plateforme.", "warning");
      return;
    }
    resources.forEach(res => {
      actions.forEach(act => {
        if (res.id === 'audit' && (act.id === 'create' || act.id === 'edit' || act.id === 'delete')) {
          updateRolePermission(currentRoleConfig.role, res.id, act.id, false);
        } else {
          updateRolePermission(currentRoleConfig.role, res.id, act.id, true);
        }
      });
    });
    showToast(`Toutes les permissions ont été accordées au rôle ${currentRoleConfig.label}`, 'success');
  };

  const handleSetAllReadOnlyForRole = () => {
    if (!isCreator) {
      showToast("Action réservée au Concepteur de la plateforme.", "warning");
      return;
    }
    resources.forEach(res => {
      actions.forEach(act => {
        updateRolePermission(currentRoleConfig.role, res.id, act.id, act.id === 'view');
      });
    });
    showToast(`Rôle ${currentRoleConfig.label} configuré en consultation seule`, 'info');
  };

  const handleCreateNewRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim() || !newRoleLabel.trim()) {
      showToast("Veuillez renseigner le code et le libellé du rôle.", "error");
      return;
    }
    addCustomRole(newRoleName, newRoleLabel, newRoleDesc, copyFromRole);
    setSelectedRole(newRoleName);
    setIsNewRoleModalOpen(false);
    setNewRoleName('');
    setNewRoleLabel('');
    setNewRoleDesc('');
  };

  // Evaluation of simulation
  const simulationResult = useMemo(() => {
    if (currentRoleConfig.role.toLowerCase() === 'concepteur') {
      return { allowed: true, reason: 'Privilèges absolus du Concepteur de plateforme.' };
    }
    const isAllowed = currentRoleConfig.permissions[simulatedResource]?.[simulatedAction] ?? false;
    return {
      allowed: isAllowed,
      reason: isAllowed 
        ? `L'action "${simulatedAction.toUpperCase()}" sur "${simulatedResource}" est expressément autorisée dans la matrice du rôle ${currentRoleConfig.label}.`
        : `L'action "${simulatedAction.toUpperCase()}" sur "${simulatedResource}" est formellement bloquée pour le rôle ${currentRoleConfig.label}.`
    };
  }, [currentRoleConfig, simulatedResource, simulatedAction]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Gouvernance des Droits & Matrice RBAC
            </h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 font-mono">
              Role-Based Access Control
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Définition centralisée des privilèges par rôle et synchronisation immédiate avec l'annuaire des administrateurs.
          </p>
        </div>

        {isCreator && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsNewRoleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-blue-500 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-blue-500" />
              <span>Nouveau rôle personnalisé</span>
            </button>

            <button
              type="button"
              onClick={() => resetRolePermissions(currentRoleConfig.role)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Réinitialiser ce rôle aux valeurs par défaut"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>
          </div>
        )}
      </div>

      {/* Role Selection Tabs Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800">
        {rolePermissions.map(r => {
          const isSelected = r.role.toLowerCase() === currentRoleConfig.role.toLowerCase();
          const membersCount = admins.filter(a => a.role?.toLowerCase() === r.role.toLowerCase()).length;
          
          return (
            <button
              key={r.role}
              type="button"
              onClick={() => setSelectedRole(r.role)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isSelected 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' 
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span 
                style={{ backgroundColor: r.badgeColor || '#4f46e5' }}
                className="w-2 h-2 rounded-full shrink-0" 
              />
              <span>{r.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isSelected 
                  ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                {membersCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Role Meta Card with Assigned Members */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {currentRoleConfig.label}
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Code : {currentRoleConfig.role}
              </span>
              {currentRoleConfig.isSystem ? (
                <span className="text-[10px] font-semibold text-slate-400 font-mono">Système natif</span>
              ) : (
                <span className="text-[10px] font-semibold text-pink-600 dark:text-pink-400 font-mono">Personnalisé</span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
              {currentRoleConfig.description}
            </p>
          </div>

          {/* Quick grant shortcuts for creator */}
          {isCreator && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleGrantAllForRole}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Tout autoriser
              </button>
              <button
                type="button"
                onClick={handleSetAllReadOnlyForRole}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                Lecture seule
              </button>
            </div>
          )}
        </div>

        {/* Assigned Administrators Preview (Interconnected) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Membres associés à ce rôle ({assignedMembers.length}) :
            </span>
            {assignedMembers.length === 0 ? (
              <span className="text-slate-400 italic">Aucun administrateur n'a ce rôle actuellement.</span>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {assignedMembers.map(m => (
                  <span 
                    key={m.id}
                    onClick={() => onSelectAdmin?.(m.id)}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono text-[11px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title={`Voir le profil IAM de ${m.name}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{m.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <span className="text-[11px] text-slate-400">
            {currentRoleConfig.role.toLowerCase() === 'concepteur' 
              ? 'Accès global absolu garanti par l\'architecture' 
              : 'Toutes les modifications prennent effet instantanément'}
          </span>
        </div>
      </div>

      {/* Main RBAC Permissions Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 pl-6 pr-4 min-w-[240px]">Ressource / Module</th>
                {actions.map(act => {
                  const ActIcon = act.icon;
                  return (
                    <th key={act.id} className="py-3.5 px-4 text-center min-w-[100px]">
                      <div className="flex items-center justify-center gap-1">
                        <ActIcon className="w-3.5 h-3.5" />
                        <span>{act.label}</span>
                      </div>
                    </th>
                  );
                })}
                {isCreator && (
                  <th className="py-3.5 pr-6 pl-4 text-right min-w-[120px]">Actions Ligne</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {resources.map(res => {
                const ResIcon = res.icon;
                const rowPerms = currentRoleConfig.permissions[res.id] || { view: false, create: false, edit: false, delete: false, export: false };

                return (
                  <tr key={res.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Resource Name & Description */}
                    <td className="py-4 pl-6 pr-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                          <ResIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {res.label}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            {res.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Action Cells */}
                    {actions.map(act => {
                      const isAllowed = rowPerms[act.id] ?? false;
                      const isImmutableAuditBlock = res.id === 'audit' && (act.id === 'create' || act.id === 'edit' || act.id === 'delete');

                      return (
                        <td key={act.id} className="py-4 px-4 text-center">
                          {isImmutableAuditBlock ? (
                            <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono select-none" title="Le journal d'audit est immuable">
                              N/A
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={!isCreator}
                              onClick={() => handleToggle(res.id, act.id)}
                              className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-all ${
                                isAllowed
                                  ? 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                              } ${!isCreator ? 'cursor-not-allowed opacity-80' : 'cursor-pointer active:scale-95'}`}
                              title={`${isAllowed ? 'Autorisé' : 'Refusé'} - ${isCreator ? 'Cliquer pour modifier' : 'Modification réservée au Concepteur'}`}
                            >
                              {isAllowed ? <Check className="w-4 h-4 stroke-[2.5]" /> : <X className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </td>
                      );
                    })}

                    {/* Row Shortcuts */}
                    {isCreator && (
                      <td className="py-4 pr-6 pl-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleSetRowAll(res.id, true)}
                            className="px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded cursor-pointer"
                            title="Tout autoriser sur cette ligne"
                          >
                            Tout
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetRowReadOnly(res.id)}
                            className="px-2 py-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded cursor-pointer"
                            title="Lecture seule sur cette ligne"
                          >
                            Voir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetRowAll(res.id, false)}
                            className="px-2 py-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded cursor-pointer"
                            title="Bloquer tout sur cette ligne"
                          >
                            Rien
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* IAM Permission Simulator */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-500" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Simulateur d'autorisation IAM
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Vérification en temps réel</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Module / Ressource</label>
            <select
              value={simulatedResource}
              onChange={e => setSimulatedResource(e.target.value as any)}
              className="theme-select w-full px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              {resources.map(r => (
                <option key={r.id} value={r.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium py-1.5">{r.label}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Action ciblée</label>
            <select
              value={simulatedAction}
              onChange={e => setSimulatedAction(e.target.value as any)}
              className="theme-select w-full px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              {actions.map(a => (
                <option key={a.id} value={a.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium py-1.5">{a.label}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-5 flex items-center justify-end pt-5 sm:pt-0">
            <div className={`p-3 rounded-xl border text-xs w-full flex items-center gap-2.5 ${
              simulationResult.allowed
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}>
              {simulationResult.allowed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span className="text-[11px] font-medium leading-tight">{simulationResult.reason}</span>
            </div>
          </div>
        </div>
      </div>

      {/* New Custom Role Modal */}
      {isNewRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div 
                  style={{ backgroundColor: `${buttonColor}15`, color: buttonColor }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                >
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Créer un nouveau rôle RBAC
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Définissez les privilèges sur mesure pour votre organisation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewRole} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Code technique du rôle (identifiant)
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: AuditeurFinancier"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Libellé affiché
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Auditeur Financier & Conformité"
                  value={newRoleLabel}
                  onChange={e => setNewRoleLabel(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description du périmètre
                </label>
                <textarea
                  rows={2}
                  placeholder="Détaillez les prérogatives accordées..."
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dupliquer les permissions initiales depuis :
                </label>
                <select
                  value={copyFromRole}
                  onChange={e => setCopyFromRole(e.target.value)}
                  className="theme-select w-full px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                >
                  {rolePermissions.map(r => (
                    <option key={r.role} value={r.role} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium py-1.5">{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewRoleModalOpen(false)}
                  className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: buttonColor }}
                  className="px-4 py-2 font-semibold text-white rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  Créer le rôle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
