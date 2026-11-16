import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Copy, 
  Check, 
  ExternalLink, 
  Smartphone, 
  QrCode, 
  X, 
  CheckCircle2, 
  Server, 
  Key, 
  Shield, 
  HelpCircle,
  Palette,
  RotateCcw,
  Sparkles,
  Sliders,
  Fingerprint,
  AlertCircle,
  Layers,
  Users,
  Eye,
  EyeOff,
  LogOut,
  Building2,
  RefreshCw,
  Loader2,
  Activity,
  Inbox
} from 'lucide-react';
import { useApp, BUTTON_COLOR_PRESETS } from '../context/AppContext';
import { Administrateurs } from './Administrateurs';
import { PermissionsMatrix } from './PermissionsMatrix';
import {
  fetchSmtpRelayStatus,
  testBrevoSmtpRelayConnection,
  SmtpConnectionTestResult
} from '../services/smtpService';
import {
  authenticateDomainOnBrevo,
  fetchInboundWorkerScript,
  testInboundEmailReception
} from '../services/mailDelivery';

export type SettingsSubTab = 'administrateurs' | 'permissions' | 'securite' | 'serveurs' | 'apparence' | 'tous';

interface ParametresProps {
  initialTab?: SettingsSubTab;
}

export const Parametres: React.FC<ParametresProps> = ({ initialTab = 'administrateurs' }) => {
  const { 
    admins,
    rolePermissions,
    currentAdmin, 
    toggleAdmin2FA, 
    logAuditAction, 
    showToast,
    currentEnterprise,
    buttonColor,
    setButtonColor,
    changeCurrentAdminPassword,
    isCreator,
    canView,
    securityPolicy,
    updateSecurityPolicy,
    brevoStatus,
    refreshBrevoStatus,
    mailboxes,
    sendEmail
  } = useApp();

  const [isTestingMail, setIsTestingMail] = useState(false);
  const [isAuthenticatingDomain, setIsAuthenticatingDomain] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<SmtpConnectionTestResult | null>(null);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [backupGmailEnabled, setBackupGmailEnabled] = useState(true);
  const [isLoadingWorker, setIsLoadingWorker] = useState(false);
  const [workerScript, setWorkerScript] = useState<string>('');
  const [showWorkerCode, setShowWorkerCode] = useState(false);
  const [isTestingInbound, setIsTestingInbound] = useState(false);
  const [inboundTestStatus, setInboundTestStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>(() => {
    try {
      const requested = sessionStorage.getItem('mailoos_settings_tab') as SettingsSubTab | null;
      if (requested) {
        sessionStorage.removeItem('mailoos_settings_tab');
        return requested;
      }
    } catch {
      // ignore storage access issues
    }
    if (!isCreator && !canView('settings')) return 'securite';
    return initialTab;
  });

  React.useEffect(() => {
    if (activeSubTab === 'serveurs' || activeSubTab === 'tous') {
      fetchSmtpRelayStatus().then(setSmtpStatus).catch(() => {});
    }
  }, [activeSubTab]);

  const handleTestSmtpConnection = async () => {
    if (isTestingSmtp) return;
    setIsTestingSmtp(true);
    try {
      const result = await testBrevoSmtpRelayConnection();
      setSmtpStatus(result);
      logAuditAction(
        'Test connexion relais SMTP Brevo',
        `${result.host}:${result.port}`,
        result.connected
          ? `Succès (${result.latencyMs ?? 0} ms)`
          : `Échec (${result.errorCode || 'ERREUR'})`
      );
      showToast(result.message, result.connected ? 'success' : 'warning');
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // Password change state for current connected account
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  
  // 2FA Modal
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [copiedSettingKey, setCopiedSettingKey] = useState<string | null>(null);

  // Password strength calculation
  const passwordStrength = React.useMemo(() => {
    if (!newPassword) return { score: 0, label: 'Vide', color: 'bg-slate-200' };
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (newPassword.length >= 12) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    if (score <= 2) return { score: 1, label: 'Faible', color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, label: 'Moyen', color: 'bg-amber-500' };
    if (score <= 4) return { score: 3, label: 'Fort', color: 'bg-blue-500' };
    return { score: 4, label: 'Très robuste', color: 'bg-emerald-500' };
  }, [newPassword]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Veuillez saisir votre mot de passe actuel', 'error');
      return;
    }
    if (newPassword.length < securityPolicy.minPasswordLength) {
      showToast(`Le mot de passe doit contenir au moins ${securityPolicy.minPasswordLength} caractères`, 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('La confirmation ne correspond pas au nouveau mot de passe', 'error');
      return;
    }

    const res = changeCurrentAdminPassword(currentPassword, newPassword);
    if (res.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleCopySetting = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSettingKey(keyId);
    showToast('Paramètre copié dans le presse-papiers', 'success');
    setTimeout(() => setCopiedSettingKey(null), 2000);
  };

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.trim().length !== 6) {
      showToast('Le code TOTP doit comporter 6 chiffres', 'error');
      return;
    }
    toggleAdmin2FA();
    setIs2FAModalOpen(false);
    setTotpCode('');
    showToast('Double authentification activée avec succès', 'success');
  };

  const allSubTabs = [
    { 
      id: 'administrateurs' as const, 
      label: 'Administrateurs', 
      icon: Users, 
      badge: admins.length, 
      visible: isCreator || canView('admins') 
    },
    { 
      id: 'permissions' as const, 
      label: 'Permissions', 
      icon: Key, 
      badge: rolePermissions.length, 
      visible: isCreator || canView('settings') 
    },
    { 
      id: 'securite' as const, 
      label: 'Sécurité', 
      icon: Lock, 
      visible: true 
    },
    { 
      id: 'serveurs' as const, 
      label: 'Serveurs', 
      icon: Server, 
      visible: true 
    },
    { 
      id: 'apparence' as const, 
      label: 'Apparence', 
      icon: Palette, 
      visible: true 
    },
    { 
      id: 'tous' as const, 
      label: 'Vue globale', 
      icon: Sparkles, 
      visible: isCreator 
    },
  ];

  const subTabs = allSubTabs.filter(t => t.visible);
  const domain = currentEnterprise.defaultDomain;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Administration Système</span>
            <span>/</span>
            <span className="text-blue-600 dark:text-blue-400 font-medium">Console IAM & Gouvernance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Paramètres & Sécurité d'Entreprise
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestion unifiée des identités IAM, contrôle d'accès RBAC, politiques de sécurité et infrastructure pour <span className="font-semibold text-slate-800 dark:text-slate-200">{currentEnterprise.name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
            Session active : <strong className="text-slate-900 dark:text-white">{currentAdmin.name}</strong> ({currentAdmin.role})
          </div>
        </div>
      </div>

      {/* Modern Connected Sub Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              {typeof tab.badge !== 'undefined' && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive 
                    ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Administrateurs (IAM Users) */}
      {(activeSubTab === 'administrateurs' || activeSubTab === 'tous') && (
        <Administrateurs 
          embedded={true} 
          onNavigateToRBAC={() => setActiveSubTab('permissions')}
          onNavigateToSecurity={() => setActiveSubTab('securite')}
        />
      )}

      {/* Tab 2: Droits & Permissions (RBAC Matrix) */}
      {(activeSubTab === 'permissions' || activeSubTab === 'tous') && (
        <PermissionsMatrix 
          onSelectAdmin={() => setActiveSubTab('administrateurs')}
        />
      )}

      {/* Tab 3: Sécurité, Authentification & Mots de passe */}
      {(activeSubTab === 'securite' || activeSubTab === 'tous') && (
        <div className="space-y-6">
          
          {/* Global Enterprise Security Policy */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Politique de Sécurité Globale de l'Organisation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Règles de conformité imposées à l'ensemble des administrateurs et collaborateurs
                  </p>
                </div>
              </div>

              {isCreator && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Règles appliquées
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Rule 1: Min length */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-semibold text-slate-900 dark:text-white block">Longueur minimale du mot de passe</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Exigée pour toute création ou réinitialisation</p>
                <div className="flex items-center gap-2 pt-1">
                  {[8, 10, 12, 14].map(len => (
                    <button
                      key={len}
                      type="button"
                      disabled={!isCreator}
                      onClick={() => updateSecurityPolicy({ minPasswordLength: len })}
                      className={`px-2.5 py-1 rounded-lg font-mono font-semibold transition-all ${
                        securityPolicy.minPasswordLength === len
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {len} car.
                    </button>
                  ))}
                </div>
              </div>

              {/* Rule 2: 2FA Enforcement */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-semibold text-slate-900 dark:text-white block">Double Authentification (2FA)</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Exigence pour les comptes à privilèges</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!isCreator}
                    onClick={() => updateSecurityPolicy({ enforce2FAForPrivileged: !securityPolicy.enforce2FAForPrivileged })}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      securityPolicy.enforce2FAForPrivileged
                        ? 'bg-purple-600 text-white'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {securityPolicy.enforce2FAForPrivileged ? 'Obligatoire (Strict)' : 'Optionnel / Recommandé'}
                  </button>
                </div>
              </div>

              {/* Rule 3: Session Duration */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-semibold text-slate-900 dark:text-white block">Expiration de session</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Durée avant déconnexion automatique</p>
                <div className="flex items-center gap-2 pt-1 font-mono">
                  {[30, 60, 240].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      disabled={!isCreator}
                      onClick={() => updateSecurityPolicy({ sessionTimeoutMinutes: mins })}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        securityPolicy.sessionTimeoutMinutes === mins
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Current Connected Account Security Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Box 1: Change My Password */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Modifier mon mot de passe
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Compte connecté : {currentAdmin.email}
                  </p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 pr-10 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      minLength={securityPolicy.minPasswordLength}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 pr-10 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {newPassword && (
                    <div className="mt-1.5 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 flex-1 max-w-[120px] mr-2">
                        <div className={`h-1 flex-1 rounded-full ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-slate-200'}`} />
                        <div className={`h-1 flex-1 rounded-full ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-slate-200'}`} />
                        <div className={`h-1 flex-1 rounded-full ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-slate-200'}`} />
                        <div className={`h-1 flex-1 rounded-full ${passwordStrength.score >= 4 ? passwordStrength.color : 'bg-slate-200'}`} />
                      </div>
                      <span className="text-slate-500 font-medium">{passwordStrength.label}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    minLength={securityPolicy.minPasswordLength}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    style={{ backgroundColor: buttonColor }}
                    className="px-4 py-2 text-white font-semibold rounded-xl text-xs shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    Enregistrer le nouveau mot de passe
                  </button>
                </div>
              </form>
            </div>

            {/* Box 2: 2FA MFA Security */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Double Authentification (2FA TOTP)
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Protection renforcée par code à usage unique
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
                    currentAdmin.has2FA 
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${currentAdmin.has2FA ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span>{currentAdmin.has2FA ? '2FA Activé' : 'Non activé'}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Lors de chaque connexion sur la console, un code TOTP temporaire généré par votre application (Google Authenticator, Microsoft Authenticator) sera requis en complément de votre mot de passe.
                </p>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Recommandation de sécurité :</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Le Concepteur et les administrateurs avec accès critique doivent maintenir la double authentification active pour prévenir tout risque de compromission.
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                {currentAdmin.has2FA ? (
                  <button
                    type="button"
                    onClick={toggleAdmin2FA}
                    className="px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-xl transition-colors border border-rose-200 dark:border-rose-900/60 cursor-pointer"
                  >
                    Désactiver le 2FA sur mon compte
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIs2FAModalOpen(true)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    Configurer et Activer le 2FA
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab 4: Serveurs & Protocoles */}
      {(activeSubTab === 'serveurs' || activeSubTab === 'tous') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Serveurs & Protocoles de Messagerie
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Paramètres de connexion IMAP, SMTP, POP3 et webmail pour les clients de messagerie (Outlook, Thunderbird, Mail iOS).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* IMAP */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-white">Serveur Entrant IMAP (Recommandé)</span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">Port 993 (SSL/TLS)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="font-mono text-xs">mail.{domain}</span>
                <button
                  type="button"
                  onClick={() => handleCopySetting(`mail.${domain}`, 'imap')}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  {copiedSettingKey === 'imap' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* SMTP */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-white">Serveur Sortant SMTP (Brevo Gratuit)</span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">Port {brevoStatus.smtpPort} (STARTTLS)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="font-mono text-xs">{brevoStatus.smtpHost}</span>
                <button
                  type="button"
                  onClick={() => handleCopySetting(brevoStatus.smtpHost, 'smtp')}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  {copiedSettingKey === 'smtp' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Brevo Outbound Relay Integration Status & API Security */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${brevoStatus.configured && brevoStatus.brevoApiValid !== false ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="font-bold text-slate-900 dark:text-white">
                  Relais d'envoi réel Brevo ({brevoStatus.dailyQuotaFree} e-mails/jour gratuits)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  API Sécurisée (HMAC + Anti-Spoofing)
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  brevoStatus.configured && brevoStatus.brevoApiValid !== false
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}>
                  {brevoStatus.configured
                    ? brevoStatus.brevoApiValid === false
                      ? 'Clé Brevo invalide (HTTP 401)'
                      : `Actif (${brevoStatus.mode === 'brevo-api' ? 'API HTTPS Brevo validée' : 'SMTP Brevo'})`
                    : 'En attente du secret serveur BREVO_API_KEY'}
                </span>
                {brevoStatus.configured && brevoStatus.brevoApiValid && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    brevoStatus.mailoosDomainAuthenticated
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}>
                    {brevoStatus.mailoosDomainAuthenticated
                      ? 'Domaine mailoos.com authentifié sur Brevo'
                      : 'mailoos.com à authentifier dans Brevo'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => refreshBrevoStatus().then(() => showToast('Statut API & Brevo vérifié en direct', 'info'))}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Tester statut
                </button>
                {brevoStatus.configured && brevoStatus.brevoApiValid && !brevoStatus.mailoosDomainAuthenticated && (
                  <button
                    type="button"
                    disabled={isAuthenticatingDomain}
                    onClick={async () => {
                      setIsAuthenticatingDomain(true);
                      try {
                        const res = await authenticateDomainOnBrevo(domain);
                        showToast(res.message, res.ok && res.authenticated ? 'success' : res.ok ? 'info' : 'warning');
                        await refreshBrevoStatus();
                      } finally {
                        setIsAuthenticatingDomain(false);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-60"
                  >
                    {isAuthenticatingDomain ? 'Vérification Brevo...' : `Vérifier ${domain} sur Brevo`}
                  </button>
                )}
                {brevoStatus.configured && brevoStatus.brevoApiValid && mailboxes.length > 0 && (
                  <button
                    type="button"
                    disabled={isTestingMail}
                    onClick={async () => {
                      const mailoosMb = mailboxes.find(m => m.email.endsWith('@mailoos.com')) || mailboxes[0];
                      if (!mailoosMb || !currentAdmin?.email) return;
                      setIsTestingMail(true);
                      try {
                        await sendEmail(
                          mailoosMb.id,
                          [currentAdmin.email],
                          'Test de livraison Mailoos via Brevo',
                          `Bonjour ${currentAdmin.name},\n\nCet e-mail confirme que votre API Mailoos sécurisée et le relais Brevo fonctionnent correctement pour ${domain}.\n\nCordialement,\nPlateforme Mailoos`
                        );
                      } finally {
                        setIsTestingMail(false);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-60"
                  >
                    {isTestingMail ? 'Envoi...' : `Envoyer test à ${currentAdmin.email}`}
                  </button>
                )}
              </div>
            </div>

            {brevoStatus.verifyError && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{brevoStatus.verifyError}</span>
              </div>
            )}

            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              L'envoi réel d'e-mails depuis les boîtes <span className="font-mono font-semibold">@{domain}</span> et l'assistant IA passent exclusivement par le backend sécurisé Mailoos (jetons Bearer HMAC-SHA256, limitation de débit et protection anti-usurpation). Aucune clé API n'est exposée au navigateur.
            </p>

            {/* Checklist format Secrets Brevo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-200">BREVO_API_KEY</span>
                  <span className={`text-[10px] font-semibold ${brevoStatus.keyFormatValid && brevoStatus.brevoApiValid !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {brevoStatus.keyFormatValid
                      ? brevoStatus.brevoApiValid === false
                        ? 'Refusée (401)'
                        : 'Format OK'
                      : 'Format invalide'}
                  </span>
                </div>
                <span className="block text-[10px] font-mono text-slate-400 mt-0.5">Attendu : xkeysib-...</span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-200">BREVO_SMTP_HOST / PORT</span>
                  <span className={`text-[10px] font-semibold ${smtpStatus?.envVars.hostValid && smtpStatus?.envVars.portValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {smtpStatus?.envVars.hostValid && smtpStatus?.envVars.portValid ? 'Valides' : 'Repli actif'}
                  </span>
                </div>
                <span className="block text-[10px] font-mono text-slate-400 mt-0.5">smtp-relay.brevo.com · 587</span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-200">BREVO_SMTP_USER / PASS</span>
                  <span className={`text-[10px] font-semibold ${smtpStatus?.connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {smtpStatus?.connected ? 'AUTH OK' : smtpStatus?.configured ? 'À vérifier' : 'Manquants'}
                  </span>
                </div>
                <span className="block text-[10px] font-mono text-slate-400 mt-0.5">...@smtp-brevo.com · xsmtpsib-...</span>
              </div>
            </div>

            {brevoStatus.brevoDnsRecords && Object.keys(brevoStatus.brevoDnsRecords).length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="block text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                  Enregistrements DNS détectés depuis votre compte Brevo pour mailoos.com
                </span>
                {Object.entries(brevoStatus.brevoDnsRecords).map(([key, rec]) => (
                  <div
                    key={key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase text-slate-500 mr-2">
                        {rec.type || 'TXT'} · {rec.host || key}
                      </span>
                      <span className={`text-[10px] font-semibold ${rec.status ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {rec.status ? 'Validé' : 'À ajouter sur Cloudflare'}
                      </span>
                      <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all mt-0.5">
                        {rec.value}
                      </div>
                    </div>
                    {rec.value && (
                      <button
                        type="button"
                        onClick={() => handleCopySetting(rec.value!, `brevo-dns-${key}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] shrink-0 cursor-pointer"
                      >
                        {copiedSettingKey === `brevo-dns-${key}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copier</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div className="min-w-0">
                <span className="block text-[10px] uppercase font-semibold text-slate-400">SPF combiné Cloudflare + Brevo (à mettre sur Cloudflare DNS)</span>
                <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all">
                  v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopySetting('v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all', 'spf-brevo')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] shrink-0 cursor-pointer"
              >
                {copiedSettingKey === 'spf-brevo' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copier SPF</span>
              </button>
            </div>
          </div>

          {/* Dedicated Brevo SMTP Relay Connection Test Panel */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  smtpStatus?.connected
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    : smtpStatus?.tested
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Test de connexion au relais SMTP Brevo
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Vérification directe TCP / {smtpStatus?.secure ? 'SSL-TLS' : 'STARTTLS'} et authentification via les variables serveur.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 border ${
                  smtpStatus?.connected
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : smtpStatus?.tested && !smtpStatus.connected
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    : smtpStatus?.configured
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    smtpStatus?.connected
                      ? 'bg-emerald-500'
                      : smtpStatus?.tested && !smtpStatus.connected
                      ? 'bg-rose-500'
                      : smtpStatus?.configured
                      ? 'bg-blue-500'
                      : 'bg-amber-500'
                  }`} />
                  {smtpStatus?.connected
                    ? `Connecté (${smtpStatus.latencyMs ?? 0} ms)`
                    : smtpStatus?.tested && !smtpStatus.connected
                    ? `Échec (${smtpStatus.errorCode || 'Non connecté'})`
                    : smtpStatus?.configured
                    ? 'Identifiants prêts · Non testé'
                    : 'Identifiants SMTP manquants'}
                </span>

                <button
                  type="button"
                  disabled={isTestingSmtp}
                  onClick={handleTestSmtpConnection}
                  style={{ backgroundColor: buttonColor }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[11px] font-semibold shadow-2xs hover:opacity-95 cursor-pointer disabled:opacity-60"
                >
                  {isTestingSmtp ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Test SMTP en cours...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Tester la connexion SMTP</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Env vars grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="block text-[10px] font-mono text-slate-400">BREVO_SMTP_HOST</span>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {smtpStatus?.host || brevoStatus.smtpHost}
                  </span>
                  <span className={`text-[10px] font-semibold ${smtpStatus?.envVars.hostValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {smtpStatus?.envVars.hostValid ? 'OK' : 'Repli'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="block text-[10px] font-mono text-slate-400">BREVO_SMTP_PORT</span>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                    {smtpStatus?.port || brevoStatus.smtpPort} ({smtpStatus?.secure ? 'SSL' : 'STARTTLS'})
                  </span>
                  <span className={`text-[10px] font-semibold ${smtpStatus?.envVars.portValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {smtpStatus?.envVars.portValid ? 'OK' : 'Repli'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="block text-[10px] font-mono text-slate-400">BREVO_SMTP_USER</span>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {smtpStatus?.maskedUser || 'Non défini'}
                  </span>
                  <span className={`text-[10px] font-semibold ${smtpStatus?.envVars.userSet ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {smtpStatus?.envVars.userSet ? 'Défini' : 'Manquant'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="block text-[10px] font-mono text-slate-400">BREVO_SMTP_PASS</span>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                    {smtpStatus?.envVars.passSet ? '••••••••••••' : 'Non défini'}
                  </span>
                  <span className={`text-[10px] font-semibold ${smtpStatus?.envVars.passSet ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {smtpStatus?.envVars.passSet ? 'Défini' : 'Manquant'}
                  </span>
                </div>
              </div>
            </div>

            {smtpStatus && (
              <div className={`p-3 rounded-lg border text-[11px] flex items-start justify-between gap-3 ${
                smtpStatus.connected
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : smtpStatus.tested
                  ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                <div className="flex items-start gap-2">
                  {smtpStatus.connected ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{smtpStatus.message}</span>
                </div>
                <span className="font-mono text-[10px] opacity-75 shrink-0">
                  {new Date(smtpStatus.checkedAt).toLocaleTimeString('fr-FR')}
                </span>
              </div>
            )}
          </div>

          {/* Real-Time Inbound Reception Panel (Cloudflare Email Worker -> Mailoos) */}
          <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Inbox className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Réception réelle des e-mails dans Mailoos (Cloudflare → Boîtes mail)
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Recevez directement les vrais messages envoyés à <span className="font-mono font-semibold">@{domain}</span> dans l'onglet Boîtes mail, 24h/24 et gratuitement.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isTestingInbound}
                  onClick={async () => {
                    const targetMb = mailboxes.find(m => m.email.endsWith(`@${domain}`)) || mailboxes[0];
                    const targetAddr = targetMb?.email || `salif.guiro@${domain}`;
                    setIsTestingInbound(true);
                    try {
                      const res = await testInboundEmailReception(targetAddr);
                      setInboundTestStatus({ ok: res.delivered, message: res.message });
                      showToast(res.message, res.delivered ? 'success' : 'warning');
                      if (res.delivered) {
                        logAuditAction('Test réception réelle Mailoos', targetAddr, res.emailId || 'OK');
                      }
                    } finally {
                      setIsTestingInbound(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-60"
                >
                  {isTestingInbound ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Tester l'arrivée d'un mail</span>
                </button>

                <button
                  type="button"
                  disabled={isLoadingWorker}
                  onClick={async () => {
                    setIsLoadingWorker(true);
                    try {
                      const res = await fetchInboundWorkerScript(
                        domain,
                        backupGmailEnabled ? currentAdmin?.email : undefined
                      );
                      if (res.ok && res.script) {
                        setWorkerScript(res.script);
                        await navigator.clipboard.writeText(res.script).catch(() => {});
                        setCopiedSettingKey('cf-worker');
                        showToast('Script Cloudflare Email Worker copié ! Collez-le dans Cloudflare.', 'success');
                        setTimeout(() => setCopiedSettingKey(null), 3000);
                      } else {
                        showToast(res.message || 'Impossible de générer le script', 'error');
                      }
                    } finally {
                      setIsLoadingWorker(false);
                    }
                  }}
                  style={{ backgroundColor: buttonColor }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[11px] font-semibold shadow-2xs hover:opacity-95 cursor-pointer disabled:opacity-60"
                >
                  {isLoadingWorker ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : copiedSettingKey === 'cf-worker' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {copiedSettingKey === 'cf-worker'
                      ? 'Script copié !'
                      : 'Copier le script Cloudflare Worker'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={backupGmailEnabled}
                  onChange={e => {
                    setBackupGmailEnabled(e.target.checked);
                    setWorkerScript('');
                  }}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
                  Garder aussi une copie de secours dans <span className="font-mono font-semibold">{currentAdmin?.email || 'salifguiro00@gmail.com'}</span>
                </span>
              </label>

              <button
                type="button"
                onClick={async () => {
                  if (!showWorkerCode && !workerScript) {
                    setIsLoadingWorker(true);
                    const res = await fetchInboundWorkerScript(
                      domain,
                      backupGmailEnabled ? currentAdmin?.email : undefined
                    );
                    setIsLoadingWorker(false);
                    if (res.ok && res.script) setWorkerScript(res.script);
                  }
                  setShowWorkerCode(v => !v);
                }}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer self-start sm:self-auto"
              >
                {showWorkerCode ? 'Masquer le code' : 'Afficher le code'}
              </button>
            </div>

            {inboundTestStatus && (
              <div className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
                inboundTestStatus.ok
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{inboundTestStatus.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">1. Ouvrir Cloudflare</span>
                <span><strong>E-mail</strong> → <strong>Routage des e-mails</strong> → onglet <strong>Email Workers</strong>.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">2. Créer le Worker</span>
                <span>Cliquez sur <strong>Créer</strong> (nom ex : <code className="font-mono">mailoos-inbox</code>) → <strong>Créer</strong>.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">3. Coller & Déployer</span>
                <span>Remplacez tout le code par le script copié ci-dessus puis cliquez sur <strong>Déployer</strong>.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">4. Activer la règle</span>
                <span>Dans <strong>Règles de routage</strong> (ou <strong>Adresse fourre-tout</strong>), choisissez <strong>Envoyer vers un Worker</strong> → <code className="font-mono">mailoos-inbox</code>.</span>
              </div>
            </div>

            {showWorkerCode && workerScript && (
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[10px] overflow-x-auto max-h-64 border border-slate-700">
                {workerScript}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Apparence & Thème */}
      {(activeSubTab === 'apparence' || activeSubTab === 'tous') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div className="flex items-center gap-3">
              <div 
                style={{ backgroundColor: buttonColor }}
                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-xs shrink-0 transition-colors"
              >
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Thème & Couleur d'Interface Personnelle
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Chaque administrateur choisit sa couleur préférée en toute liberté, sans affecter l'affichage des autres comptes.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setButtonColor('#2563eb');
                showToast('Couleur personnelle réinitialisée au Bleu Royal (#2563EB)', 'info');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer self-start sm:self-auto shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Bleu par défaut</span>
            </button>
          </div>

          {/* User Isolation Callout */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div 
                style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
              >
                {currentAdmin.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">{currentAdmin.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {currentAdmin.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Profil actif : <span className="font-mono">{currentAdmin.email}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 px-3 py-1.5 rounded-lg shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Préférence strictement individuelle enregistrée</span>
            </div>
          </div>

          {/* Custom Color Selector (Spécialement à son goût) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" style={{ color: buttonColor }} />
                  Couleur sur-mesure (Sélecteur libre)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Choisissez précisément n'importe quelle nuance à votre goût personnel.
                </p>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                {buttonColor.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-12 h-10 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600 shadow-2xs shrink-0 cursor-pointer">
                <input
                  type="color"
                  value={buttonColor}
                  onChange={e => {
                    setButtonColor(e.target.value);
                  }}
                  className="absolute -top-2 -left-2 w-16 h-14 cursor-pointer border-none bg-transparent"
                  title="Ouvrir le sélecteur de couleur complet"
                />
              </div>

              <input
                type="text"
                value={buttonColor}
                onChange={e => {
                  const val = e.target.value;
                  if (val.startsWith('#') && val.length <= 7) {
                    setButtonColor(val);
                  }
                }}
                placeholder="#2563eb"
                className="w-32 px-3 py-2 text-xs font-mono font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase focus:outline-hidden"
              />

              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {['#2563eb', '#10b981', '#6366f1', '#8b5cf6', '#d97706', '#ec4899', '#06b6d4', '#e11d48'].map(hex => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setButtonColor(hex)}
                    style={{ backgroundColor: hex }}
                    title={hex}
                    className={`w-6 h-6 rounded-full shrink-0 border-2 transition-transform hover:scale-110 cursor-pointer ${
                      buttonColor.toLowerCase() === hex.toLowerCase() 
                        ? 'border-white ring-2 ring-slate-900 dark:ring-white scale-110' 
                        : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Nuanciers certifiés d'entreprise */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Nuanciers certifiés d'entreprise
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {BUTTON_COLOR_PRESETS.map(preset => {
                const isSelected = buttonColor.toLowerCase() === preset.primary.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setButtonColor(preset.primary);
                      showToast(`Nuance personnelle appliquée : ${preset.name}`, 'success');
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div 
                      style={{ backgroundColor: preset.primary }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-2xs"
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate w-full">
                      {preset.name.split(' (')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Component Preview */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Aperçu en temps réel de votre interface
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                style={{ backgroundColor: buttonColor }}
                className="px-3.5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-transform active:scale-95 cursor-default"
              >
                Bouton d'action principal
              </button>

              <div 
                style={{ backgroundColor: `${buttonColor}15`, color: buttonColor, borderColor: `${buttonColor}30` }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Badge actif & indicateur</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: buttonColor }} />
                <span className="text-slate-700 dark:text-slate-300">Périmètre isolé actif</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {is2FAModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Activer la Double Authentification
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Application TOTP (Google Authenticator)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIs2FAModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl shadow-xs border border-slate-200 flex items-center justify-center">
                  <QrCode className="w-28 h-28 text-slate-900" />
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Clé secrète : <strong className="text-slate-700 dark:text-slate-200">JBSWY3DPEHPK3PXP</strong>
                </div>
              </div>

              <form onSubmit={handleVerify2FA} className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Saisissez le code de validation à 6 chiffres :
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="ex: 123456"
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2.5 text-center text-xl font-mono tracking-widest border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 text-center">
                    (Code de test rapide : <strong>123456</strong>)
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIs2FAModalOpen(false)}
                    className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl"
                  >
                    Valider et Activer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
