import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Plus, 
  RefreshCw, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  X,
  ExternalLink,
  ShieldCheck,
  Server,
  Layers,
  HelpCircle,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { checkLiveCloudflareDns, LiveDnsReport } from '../services/dnsLookup';

export const Domaines: React.FC = () => {
  const { 
    domains, 
    verifyDomain, 
    isAddDomainModalOpen, 
    setIsAddDomainModalOpen, 
    addDomain,
    showToast,
    buttonColor,
    canView,
    canCreate,
    canEdit
  } = useApp();

  const [newDomainInput, setNewDomainInput] = useState('');
  const [isInputHovered, setIsInputHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [liveReports, setLiveReports] = useState<Record<string, LiveDnsReport>>({});
  const autoCheckedRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    const mailoosDom = domains.find(d => d.name.toLowerCase() === 'mailoos.com');
    if (mailoosDom && !autoCheckedRef.current.has(mailoosDom.id)) {
      autoCheckedRef.current.add(mailoosDom.id);
      verifyDomain(mailoosDom.id, true).then(report => {
        if (report) {
          setLiveReports(prev => ({ ...prev, [mailoosDom.id]: report }));
        }
      }).catch(() => {
        checkLiveCloudflareDns(mailoosDom.name).then(report => {
          setLiveReports(prev => ({ ...prev, [mailoosDom.id]: report }));
        }).catch(() => {});
      });
    }
  }, [domains, verifyDomain]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    showToast('Copié dans le presse-papiers', 'success');
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleVerify = async (domId: string) => {
    setVerifyingId(domId);
    try {
      const report = await verifyDomain(domId);
      if (report) {
        setLiveReports(prev => ({ ...prev, [domId]: report }));
      }
    } finally {
      setVerifyingId(null);
    }
  };

  const handleSubmitNewDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainInput.trim()) return;
    const ok = addDomain(newDomainInput);
    if (ok) {
      setNewDomainInput('');
      setIsAddDomainModalOpen(false);
    }
  };

  if (!canView('domains')) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-10 w-full animate-in fade-in duration-200">
        <div className="max-w-md mx-auto text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Accès restreint au module Domaines
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Votre rôle actuel ne dispose pas du droit de consultation (VOIR) sur la gestion des domaines et des zones DNS.
          </p>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            Contactez votre Super Admin ou rendez-vous dans les <strong className="text-slate-700 dark:text-slate-300">Paramètres &gt; Droits & Permissions (RBAC)</strong> pour modifier les autorisations.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 w-full space-y-5 sm:space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">Configuration</span>
            <span>/</span>
            <span className="text-blue-600 dark:text-blue-400 font-medium">Noms de domaine & DNS</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Domaines de messagerie
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Chaque entreprise configure son propre domaine. Saisissez les enregistrements DNS (MX, SPF, DKIM, DMARC) chez votre registraire (OVH, LWS, Cloudflare, Hostinger, GoDaddy).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Guide registraire</span>
          </button>
          {canCreate('domains') && (
            <button
              type="button"
              onClick={() => setIsAddDomainModalOpen(true)}
              style={{ backgroundColor: buttonColor }}
              className="theme-primary-btn flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un domaine</span>
            </button>
          )}
        </div>
      </div>

      {/* Domain Cards */}
      <div className="space-y-6">
        {domains.map(dom => (
          <div key={dom.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
            {/* Domain Card Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {dom.name}
                    </span>
                    {dom.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Vérifié & Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3 text-amber-500" />
                        Propagation en cours
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {dom.recordsOkCount}/{dom.totalRecordsCount} enregistrements validés · {dom.activeMailboxesCount} boîte(s) active(s) · dernière vérification {dom.verifiedAt}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {liveReports[dom.id]?.isCloudflareNs && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 px-2.5 py-1 rounded-lg">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Cloudflare DNS Actif
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleVerify(dom.id)}
                  disabled={verifyingId === dom.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all shadow-2xs disabled:opacity-60 cursor-pointer active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verifyingId === dom.id ? 'animate-spin text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{verifyingId === dom.id ? 'Vérification Cloudflare...' : 'Vérifier DNS'}</span>
                </button>
              </div>
            </div>

            {/* Live Cloudflare Diagnostic Strip */}
            {liveReports[dom.id] && (
              <div className="border-b border-slate-100 dark:border-slate-800">
                <div className="px-5 py-3 bg-slate-50/90 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      Diagnostic en direct (1.1.1.1) :
                    </span>
                    {liveReports[dom.id].nameservers.length > 0 ? (
                      <span className="font-mono text-[10px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        NS : {liveReports[dom.id].nameservers.join(', ')}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Serveurs de noms en attente</span>
                    )}
                    <span className={`px-2 py-0.5 rounded font-semibold ${liveReports[dom.id].hasActiveMailRouting ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-amber-100/80 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'}`}>
                      MX : {liveReports[dom.id].hasActiveMailRouting ? `${liveReports[dom.id].mxRecords.length} actif(s)` : 'Non détecté'}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-semibold ${liveReports[dom.id].hasSpf ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-amber-100/80 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'}`}>
                      SPF : {liveReports[dom.id].hasSpf ? 'OK' : 'Manquant'}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-semibold ${liveReports[dom.id].hasDkim ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-amber-100/80 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'}`}>
                      DKIM : {liveReports[dom.id].hasDkim ? 'OK' : 'Manquant'}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-semibold ${liveReports[dom.id].hasDmarc ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-amber-100/80 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'}`}>
                      DMARC : {liveReports[dom.id].hasDmarc ? 'OK' : 'À ajouter'}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-semibold ${liveReports[dom.id].hasBrevoSpf ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-blue-100/80 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'}`}>
                      Envoi Brevo : {liveReports[dom.id].hasBrevoSpf ? 'SPF OK' : 'Optionnel (300/j)'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    Contrôlé à {liveReports[dom.id].checkedAt}
                  </span>
                </div>

                {dom.name.toLowerCase() === 'mailoos.com' && (!liveReports[dom.id].hasDmarc || !liveReports[dom.id].hasBrevoSpf) && (
                  <div className="px-5 py-2.5 bg-amber-50/70 dark:bg-amber-950/25 border-t border-amber-100 dark:border-amber-900/40 flex flex-col lg:flex-row lg:items-center justify-between gap-2 text-[11px] text-amber-900 dark:text-amber-200">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>
                        <strong>Finalisation DNS sur Cloudflare :</strong>{' '}
                        {!liveReports[dom.id].hasDmarc && (
                          <>ajoutez le <code className="font-mono bg-white/80 dark:bg-slate-900 px-1 rounded">TXT _dmarc</code></>
                        )}
                        {!liveReports[dom.id].hasDmarc && !liveReports[dom.id].hasBrevoSpf && ' et '}
                        {!liveReports[dom.id].hasBrevoSpf && (
                          <>incluez <code className="font-mono bg-white/80 dark:bg-slate-900 px-1 rounded">include:spf.brevo.com</code> dans votre SPF pour envoyer avec Brevo</>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {!liveReports[dom.id].hasDmarc && (
                        <button
                          type="button"
                          onClick={() => handleCopy('v=DMARC1; p=quarantine; adkim=r; aspf=r', `${dom.id}-quick-dmarc`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-semibold hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
                        >
                          {copiedKey === `${dom.id}-quick-dmarc` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>DMARC copié</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copier DMARC</span>
                            </>
                          )}
                        </button>
                      )}
                      {!liveReports[dom.id].hasBrevoSpf && (
                        <button
                          type="button"
                          onClick={() => handleCopy('v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all', `${dom.id}-quick-brevo-spf`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
                        >
                          {copiedKey === `${dom.id}-quick-brevo-spf` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>SPF Brevo copié</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copier SPF + Brevo</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DNS Records: Desktop & Tablet Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-5 font-medium">PROTOCOLE / RÔLE</th>
                    <th className="py-2.5 px-4 font-medium">TYPE</th>
                    <th className="py-2.5 px-4 font-medium">NOM / HÔTE</th>
                    <th className="py-2.5 px-4 font-medium">VALEUR CIBLE</th>
                    <th className="py-2.5 px-5 font-medium text-right">STATUT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dom.records.map((rec, idx) => {
                    const hostId = `${dom.id}-host-${idx}`;
                    const valId = `${dom.id}-val-${idx}`;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {rec.role}
                        </td>

                        <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {rec.type}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-800 dark:text-slate-200">
                              {rec.host}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(rec.host, hostId)}
                              title="Copier le nom d'hôte"
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded transition-colors cursor-pointer"
                            >
                              {copiedKey === hostId ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 max-w-lg break-all">
                          <div className="flex items-start gap-1.5">
                            <span className="leading-relaxed text-xs">
                              {rec.value}
                              {rec.priority && (
                                <span className="font-sans text-slate-400 dark:text-slate-500 font-normal ml-2">
                                  (priorité {rec.priority})
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(rec.value, valId)}
                              title="Copier la valeur"
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded transition-colors shrink-0 mt-0.5 cursor-pointer"
                            >
                              {copiedKey === valId ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          {rec.status === 'correct' ? (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Propagé
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-500" />
                              À ajouter
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* DNS Records: Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {dom.records.map((rec, idx) => {
                const hostId = `${dom.id}-mob-host-${idx}`;
                const valId = `${dom.id}-mob-val-${idx}`;

                return (
                  <div key={`mob-rec-${idx}`} className="p-4 space-y-2.5 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs">
                          {rec.type}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {rec.role}
                        </span>
                      </div>
                      {rec.status === 'correct' ? (
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Propagé
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          À ajouter
                        </span>
                      )}
                    </div>

                    {/* Host Name Row */}
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">Hôte / Nom</span>
                        <span className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200 truncate block">
                          {rec.host}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(rec.host, hostId)}
                        className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 shrink-0 inline-flex items-center gap-1"
                      >
                        {copiedKey === hostId ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">Copié</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Value Target Row */}
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Valeur / Cible</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(rec.value, valId)}
                          className="px-2 py-0.5 text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200 shrink-0 inline-flex items-center gap-1"
                        >
                          {copiedKey === valId ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">Copié</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copier</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all leading-relaxed bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">
                        {rec.value}
                        {rec.priority && (
                          <span className="block mt-1 font-sans text-slate-400 font-normal">
                            Priorité : {rec.priority}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Guide Registraire Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Guide de configuration DNS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-blue-700 dark:text-blue-300">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Recommandé : Utiliser Cloudflare (100% Gratuit)</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Cloudflare protège votre site contre les attaques DDoS, accélère le chargement dans le monde entier et offre <strong>Cloudflare Email Routing</strong> pour créer des adresses d'entreprise illimitées et recevoir gratuitement vos e-mails.
                </p>
              </div>

              <p>
                Connectez-vous à votre registraire (Cloudflare, OVH, LWS, Hostinger, Namecheap) et ajoutez ces enregistrements dans la <span className="font-semibold text-slate-800 dark:text-slate-200">Zone DNS</span> :
              </p>

              <div className="space-y-2.5">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-white mb-1">1. Enregistrements MX (Serveurs de messagerie)</div>
                  <div>Définissent les serveurs de destination pour recevoir vos e-mails. Avec Cloudflare Email Routing : <code>route2.mx.cloudflare.net</code> (57), <code>route1.mx.cloudflare.net</code> (59) et <code>route3.mx.cloudflare.net</code> (65).</div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-white mb-1">2. Enregistrement SPF (Anti-usurpation)</div>
                  <div>Texte TXT autorisant l'envoi légitime : <code>v=spf1 include:_spf.mx.cloudflare.net ~all</code> pour éviter les spams.</div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-white mb-1">3. Enregistrement DKIM & DMARC (Authenticité)</div>
                  <div>Garantit que vos e-mails sont certifiés pour Gmail, Outlook, Yahoo et Apple Mail sans risque de blocage.</div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Temps de propagation Cloudflare : &lt; 2 minutes
                </span>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  style={{ backgroundColor: buttonColor }}
                  className="px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors shadow-xs cursor-pointer active:scale-95"
                >
                  J'ai compris
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ajouter un domaine */}
      {isAddDomainModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Ajouter un nouveau domaine
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDomainModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom de domaine
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="ex: monentreprise.com"
                  value={newDomainInput}
                  onChange={e => setNewDomainInput(e.target.value)}
                  onMouseEnter={() => setIsInputHovered(true)}
                  onMouseLeave={() => setIsInputHovered(false)}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  style={{
                    accentColor: buttonColor,
                    borderColor: (isInputHovered || isInputFocused) ? buttonColor : undefined,
                    borderWidth: isInputHovered ? '2px' : '1px',
                    backgroundColor: isInputHovered ? `${buttonColor}15` : undefined,
                    boxShadow: isInputFocused 
                      ? `0 0 0 3px ${buttonColor}40` 
                      : (isInputHovered ? `0 0 0 3.5px ${buttonColor}35` : undefined)
                  }}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden transition-all"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                  Une paire de clés DKIM 2048-bit et les enregistrements SPF/MX seront configurés immédiatement.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddDomainModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: buttonColor }}
                  className="theme-primary-btn px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors shadow-xs cursor-pointer active:scale-95"
                >
                  Ajouter le domaine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
