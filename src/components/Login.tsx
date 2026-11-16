import React, { useState, useMemo } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight, 
  KeyRound, 
  Shield, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  X,
  Check,
  Fingerprint,
  Sparkles,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Login: React.FC = () => {
  const { login, buttonColor, resetUserPassword, admins } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [step2FA, setStep2FA] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot / Change Password Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Dynamic organization recognition based on input
  const recognizedTenant = useMemo(() => {
    const val = (email || '').trim().toLowerCase();
    if (!val) return null;
    if (val === 'superadmin' || val.includes('salifguiro') || val.includes('salif.guiro') || val.includes('concepteur')) {
      return {
        name: 'Plateforme Globale (Concepteur)',
        role: 'Concepteur & Super Admin',
        scope: 'Accès illimité à toutes les entreprises',
        badgeColor: 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
      };
    }
    if (val.includes('sultanvoyage')) {
      return {
        name: 'Sultan Voyages BF',
        role: 'Admin Entreprise (Sultan Voyages)',
        scope: 'Isolé à sultanvoyagebf.com',
        badgeColor: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
      };
    }
    if (val.includes('mailoos') || val.includes('aslab')) {
      return {
        name: 'Mailoos Cloud',
        role: 'Espace Mailoos',
        scope: 'Isolé à mailoos.com',
        badgeColor: 'border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
      };
    }
    return null;
  }, [email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Veuillez renseigner votre identifiant professionnel et votre mot de passe.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const res = login(email, password, step2FA ? totpCode : undefined);
      setIsLoading(false);

      if (res.require2FA) {
        setStep2FA(true);
        setErrorMessage(null);
        return;
      }

      if (!res.success) {
        setErrorMessage(res.error || "Identifiants invalides.");
      }
    }, 280);
  };

  const handleOpenResetModal = () => {
    setResetEmail(email.trim() || 'salifguiro00@gmail.com');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setResetError(null);
    setIsResetModalOpen(true);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (!resetEmail.trim()) {
      setResetError("Veuillez saisir votre identifiant ou adresse e-mail.");
      return;
    }

    if (resetNewPassword.length < 8) {
      setResetError("Le nouveau mot de passe doit comporter au moins 8 caractères pour respecter la politique de sécurité.");
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("La confirmation ne correspond pas au nouveau mot de passe saisi.");
      return;
    }

    setIsResetting(true);
    setTimeout(() => {
      const res = resetUserPassword(resetEmail, resetNewPassword);
      setIsResetting(false);

      if (res.success) {
        setEmail(resetEmail);
        setPassword(resetNewPassword);
        setIsResetModalOpen(false);
        setSuccessMessage("Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.");
        setErrorMessage(null);
      } else {
        setResetError(res.message);
      }
    }, 350);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center transition-colors">
      <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          
          {/* Left Column: Enterprise Security & Brand Narrative (Desktop & large screens) */}
          <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white p-8 sm:p-12 flex-col justify-between relative overflow-hidden">
            {/* Background decorative mesh */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

            <div className="relative z-10">
              {/* Brand Logo & Name */}
              <div className="flex items-center gap-3 mb-10">
                <div 
                  style={{ backgroundColor: buttonColor }}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20"
                >
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    Mailoos Identity
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20">
                      Enterprise IAM
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400">
                    Infrastructure souveraine de messagerie & gestion des accès
                  </p>
                </div>
              </div>

              {/* Mission Statement */}
              <div className="space-y-4 mb-10">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  Contrôle d'accès unifié et isolation multi-tenant.
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Connexion sécurisée aux consoles de gestion de messagerie. Chaque organisation bénéficie d'un cloisonnement strict de ses domaines, boîtes mail et journaux.
                </p>
              </div>

              {/* Enterprise Feature Points */}
              <div className="space-y-4 pt-6 border-t border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">Gouvernance RBAC Granulaire</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Matrice de droits stricts (Voir, Créer, Modifier, Supprimer, Exporter) par ressource.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">Isolation Multi-Entreprises</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Accès cloisonné par organisation. Seul le Concepteur dispose de la visibilité globale.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">Authentification Forte & Audit</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Support TOTP 2FA, conformité des mots de passe et traçabilité immuable par IP.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Status Footprint */}
            <div className="relative z-10 pt-8 mt-8 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Services IAM opérationnels
              </span>
              <span>TLS 1.3 · Chiffrement AES-256</span>
            </div>
          </div>

          {/* Right Column: High-Fidelity Authentication Form */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white dark:bg-slate-900">
            <div className="max-w-md w-full mx-auto space-y-6">
              
              {/* Mobile Brand Header (Visible on phones & small tablets) */}
              <div className="lg:hidden flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div 
                  style={{ backgroundColor: buttonColor }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20"
                >
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Mailoos Identity
                    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                      IAM
                    </span>
                  </h1>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Portail de messagerie d'entreprise
                  </p>
                </div>
              </div>

              {/* Form Title & Subtitle */}
              <div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {step2FA ? 'Vérification à deux facteurs' : 'Connexion à la console'}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {step2FA 
                    ? 'Confirmez votre identité avec le code temporaire sécurisé' 
                    : 'Entrez vos identifiants d\'administrateur ou de gestionnaire'}
                </p>
              </div>

              {/* Dynamic recognized organization badge */}
              {recognizedTenant && !step2FA && (
                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${recognizedTenant.badgeColor}`}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <div>
                      <span className="font-semibold block">{recognizedTenant.name}</span>
                      <span className="text-[11px] opacity-80">{recognizedTenant.role} · {recognizedTenant.scope}</span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 shrink-0 opacity-80" />
                </div>
              )}

              {/* Error & Success Toasts */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{successMessage}</span>
                </div>
              )}

              {/* Main Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!step2FA ? (
                  <>
                    {/* Identifier field */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Identifiant ou adresse e-mail professionnelle
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          autoFocus
                          autoComplete="username"
                          placeholder="nom@entreprise.com ou identifiant"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Password field */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Mot de passe
                        </label>
                        <button
                          type="button"
                          onClick={handleOpenResetModal}
                          className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          placeholder="••••••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Remember me & encryption badge */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400 select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={e => setRememberMe(e.target.checked)}
                          className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Mémoriser ma session</span>
                      </label>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-mono">
                        <Shield className="w-3 h-3 text-emerald-500" />
                        Zero-Trust
                      </span>
                    </div>
                  </>
                ) : (
                  /* 2FA TOTP Step */
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                        <Fingerprint className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Validation à deux facteurs (TOTP)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Saisissez le code temporaire à 6 chiffres généré par votre application d'authentification (TOTP).
                      </p>
                    </div>

                    <div>
                      <input
                        type="text"
                        required
                        autoFocus
                        maxLength={6}
                        placeholder="••••••"
                        value={totpCode}
                        onChange={e => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>

                    <div className="flex flex-col gap-2 pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setStep2FA(false);
                          setTotpCode('');
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        ← Revenir à la saisie du mot de passe
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{ backgroundColor: buttonColor }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-semibold text-xs transition-all shadow-md hover:shadow-lg active:scale-98 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{step2FA ? 'Valider et accéder à la console' : 'Se connecter'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Enterprise Security Footprint & Notice */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 gap-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Accès authentifié & surveillé · TLS 1.3</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">IAM Sovereign Enterprise</span>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Forgot / Change Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div 
                  style={{ backgroundColor: `${buttonColor}15`, color: buttonColor }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                >
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Récupération & Réinitialisation du mot de passe
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Procédure de sécurité self-service d'entreprise
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Identifiant ou adresse e-mail
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetEmail('salifguiro00@gmail.com')}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Préremplir Super Admin
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="salifguiro00@gmail.com ou superadmin"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nouveau mot de passe (min. 8 caractères)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="••••••••••••"
                    value={resetNewPassword}
                    onChange={e => setResetNewPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirmer le nouveau mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="••••••••••••"
                    value={resetConfirmPassword}
                    onChange={e => setResetConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-300">Politique de sécurité appliquée :</div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> Minimum 8 caractères
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> Mise à jour immédiate du compte IAM
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  style={{ backgroundColor: buttonColor }}
                  className="px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-all hover:shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isResetting ? 'Mise à jour...' : 'Enregistrer le nouveau mot de passe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
