import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  Paperclip, 
  Trash2, 
  Check, 
  Loader2,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateEmailContent, ComposePromptOptions } from '../services/geminiService';

export const ComposeMailModal: React.FC = () => {
  const { 
    isComposeModalOpen, 
    setIsComposeModalOpen, 
    composeInitialData, 
    activeWebmailAccount, 
    mailboxes, 
    sendEmail, 
    brevoStatus,
    showToast,
    buttonColor
  } = useApp();

  const senderAccount = activeWebmailAccount || mailboxes[0];

  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subjectInput, setSubjectInput] = useState('');
  const [bodyInput, setBodyInput] = useState('');
  
  // AI Assistant states
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [aiGoal, setAiGoal] = useState('');
  const [aiTone, setAiTone] = useState<'professionnel' | 'amical' | 'formel' | 'urgent'>('professionnel');
  const [isAiToneHovered, setIsAiToneHovered] = useState(false);
  const [isAiToneFocused, setIsAiToneFocused] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (composeInitialData) {
      if (composeInitialData.to) setToInput(composeInitialData.to);
      if (composeInitialData.subject) setSubjectInput(composeInitialData.subject);
      if (composeInitialData.replyBody) {
        setBodyInput(`\n\n--- Message d'origine ---\n${composeInitialData.replyBody}`);
      }
    } else {
      setToInput('');
      setCcInput('');
      setSubjectInput('');
      setBodyInput('');
    }
  }, [composeInitialData, isComposeModalOpen]);

  if (!isComposeModalOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;
    const recipients = toInput.split(',').map(s => s.trim()).filter(Boolean);
    if (recipients.length === 0) {
      showToast('Veuillez spécifier au moins un destinataire', 'error');
      return;
    }
    const ccRecipients = ccInput.split(',').map(s => s.trim()).filter(Boolean);

    setIsSending(true);
    try {
      await sendEmail(senderAccount.id, recipients, subjectInput, bodyInput, ccRecipients);
      setIsComposeModalOpen(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateAi = async () => {
    if (!aiGoal.trim() && !subjectInput) {
      showToast("Veuillez préciser le sujet ou l'objectif du mail", 'warning');
      return;
    }

    setIsGeneratingAi(true);
    try {
      const opts: ComposePromptOptions = {
        purpose: aiGoal.trim() || subjectInput,
        tone: aiTone,
        language: 'fr',
        replyToSubject: composeInitialData?.subject,
        replyToBody: composeInitialData?.replyBody
      };

      const result = await generateEmailContent(opts);
      if (!subjectInput) setSubjectInput(result.subject);
      setBodyInput(result.body);
      setIsAiDrawerOpen(false);
      showToast('E-mail rédigé avec succès par l\'IA !', 'success');
    } catch (err) {
      showToast('Erreur lors de la génération avec l\'IA', 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Nouveau message</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              De : <span className="font-semibold text-slate-900 dark:text-white font-mono">{senderAccount.email}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsComposeModalOpen(false)}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 space-y-3 flex-1 overflow-y-auto">
            {/* Destinataires */}
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 w-16">À :</span>
              <input
                type="text"
                required
                placeholder="destinataire@entreprise.com"
                value={toInput}
                onChange={e => setToInput(e.target.value)}
                className="flex-1 text-xs text-slate-900 dark:text-slate-100 bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden font-medium"
              />
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cc
                </button>
              )}
            </div>

            {/* Cc */}
            {showCc && (
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 animate-in fade-in">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 w-16">Cc :</span>
                <input
                  type="text"
                  placeholder="copie@entreprise.com"
                  value={ccInput}
                  onChange={e => setCcInput(e.target.value)}
                  className="flex-1 text-xs text-slate-900 dark:text-slate-100 bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden font-medium"
                />
              </div>
            )}

            {/* Objet */}
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 w-16">Objet :</span>
              <input
                type="text"
                required
                placeholder="Objet de votre e-mail"
                value={subjectInput}
                onChange={e => setSubjectInput(e.target.value)}
                className="flex-1 text-xs font-medium text-slate-900 dark:text-slate-100 bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden"
              />
            </div>

            {/* AI Assistant Banner / Drawer Toggle */}
            <div className="bg-blue-50/60 dark:bg-blue-950/40 rounded-xl p-3 border border-blue-100/80 dark:border-blue-900/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                    Assistant de rédaction IA Mailoos
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors cursor-pointer"
                >
                  {isAiDrawerOpen ? 'Fermer l\'assistant' : 'Rédiger avec l\'IA'}
                </button>
              </div>

              {isAiDrawerOpen && (
                <div className="mt-3 pt-3 border-t border-blue-100/70 dark:border-blue-900/60 space-y-3 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-900 dark:text-blue-200 mb-1">
                      Que souhaitez-vous exprimer ?
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Confirmer la réservation des billets d'avion et demander la liste des passeports"
                      value={aiGoal}
                      onChange={e => setAiGoal(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">Ton :</span>
                      <select
                        value={aiTone}
                        onChange={e => setAiTone(e.target.value as any)}
                        onMouseEnter={() => setIsAiToneHovered(true)}
                        onMouseLeave={() => setIsAiToneHovered(false)}
                        onFocus={() => setIsAiToneFocused(true)}
                        onBlur={() => setIsAiToneFocused(false)}
                        style={{ 
                          accentColor: buttonColor,
                          borderColor: (isAiToneHovered || isAiToneFocused) ? buttonColor : undefined,
                          borderWidth: isAiToneHovered ? '2px' : '1px',
                          backgroundColor: isAiToneHovered ? `${buttonColor}15` : undefined,
                          boxShadow: isAiToneFocused 
                            ? `0 0 0 3px ${buttonColor}40` 
                            : (isAiToneHovered ? `0 0 0 3.5px ${buttonColor}35` : undefined)
                        }}
                        className="theme-select px-2.5 py-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 cursor-pointer transition-all duration-150"
                      >
                        <option value="professionnel" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium py-1.5">Professionnel</option>
                        <option value="formel" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium py-1.5">Formel / Administratif</option>
                        <option value="urgent" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium py-1.5">Urgent</option>
                        <option value="amical" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium py-1.5">Chaleureux</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={handleGenerateAi}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-60 cursor-pointer"
                    >
                      {isGeneratingAi ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Génération...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Générer l'e-mail</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Message Body */}
            <div>
              <textarea
                required
                rows={9}
                placeholder="Rédigez votre message ici..."
                value={bodyInput}
                onChange={e => setBodyInput(e.target.value)}
                className="w-full text-xs text-slate-900 dark:text-slate-100 bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden leading-relaxed resize-none p-1 font-normal"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => showToast('Ajout de pièce jointe prêt', 'info')}
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Joindre un fichier"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border ${
                brevoStatus.configured && brevoStatus.brevoApiValid !== false
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${brevoStatus.configured && brevoStatus.brevoApiValid !== false ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {brevoStatus.configured
                  ? brevoStatus.brevoApiValid === false
                    ? 'Clé Brevo invalide (HTTP 401)'
                    : 'Relais Brevo actif (300/j)'
                  : 'Envoi réel : Secret BREVO_API_KEY requis'}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isSending}
                onClick={() => setIsComposeModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-60"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={isSending}
                style={{ backgroundColor: buttonColor }}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-60"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Envoi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Envoyer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
