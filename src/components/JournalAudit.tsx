import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Activity,
  X,
  ShieldAlert,
  Printer
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PrintModal } from './PrintModal';

export const JournalAudit: React.FC = () => {
  const { auditLogs, currentEnterprise, showToast, canView, canExport } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'password' | 'create' | 'view'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const pageSize = 12;

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ip.includes(searchQuery);

    if (!matchesSearch) return false;

    if (actionFilter === 'password') {
      return log.action.toLowerCase().includes('mot de passe');
    }
    if (actionFilter === 'create') {
      return log.action.toLowerCase().includes('créat') || log.action.toLowerCase().includes('ajout');
    }
    if (actionFilter === 'view') {
      return log.action.toLowerCase().includes('consulté') || log.action.toLowerCase().includes('ouvert');
    }

    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const pagedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportLogs = () => {
    const escapeCsvCell = (val: string | undefined | null): string => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = ["Date", "Administrateur", "Action", "Cible", "Détail", "Adresse IP"];
    const rows = filteredLogs.map(l => [
      escapeCsvCell(l.date),
      escapeCsvCell(l.adminEmail),
      escapeCsvCell(l.action),
      escapeCsvCell(l.target),
      escapeCsvCell(l.detail),
      escapeCsvCell(l.ip)
    ].join(";"));

    const csvContent = "\uFEFF" + [headers.map(escapeCsvCell).join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `journal_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Journal d'audit exporté (compatible Excel)", 'success');
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  if (!canView('audit')) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-10 w-full animate-in fade-in duration-200">
        <div className="max-w-md mx-auto text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Accès restreint au Journal d'audit
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Votre rôle actuel ne dispose pas du droit de consultation (VOIR) sur les événements et logs de sécurité.
          </p>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            Contactez votre Super Admin ou configurez la matrice dans <strong className="text-slate-700 dark:text-slate-300">Paramètres &gt; Droits & Permissions (RBAC)</strong>.
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
            <span className="font-medium text-slate-700 dark:text-slate-300">Sécurité & Conformité</span>
            <span>/</span>
            <span className="text-blue-600 dark:text-blue-400 font-medium">Journal d'audit</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Journal des événements de sécurité
            </h1>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              ({auditLogs.length} logs)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Traçabilité immuable de toutes les actions administratives et accès aux courriels.
          </p>
        </div>

        {canExport('audit') && (
          <div className="flex items-center shadow-2xs rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleExportLogs}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer border-r border-slate-200 dark:border-slate-800"
              title="Exporter le journal au format CSV (point-virgule, compatible Excel)"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Exporter CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Imprimer le journal d'audit"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Imprimer</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 max-w-2xl">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher une action, adresse IP ou cible..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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

          {/* Action Filter Chips */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => { setActionFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                actionFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tous
            </button>
            <button
              type="button"
              onClick={() => { setActionFilter('password'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                actionFilter === 'password'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mots de passe
            </button>
            <button
              type="button"
              onClick={() => { setActionFilter('create'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                actionFilter === 'create'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Créations
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log: Desktop & Tablet Table & Mobile Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Desktop & Tablet Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5 font-medium">HORODATAGE</th>
                <th className="py-3 px-5 font-medium">ADMINISTRATEUR</th>
                <th className="py-3 px-5 font-medium">ÉVÉNEMENT</th>
                <th className="py-3 px-5 font-medium">CIBLE</th>
                <th className="py-3 px-5 font-medium">DÉTAIL</th>
                <th className="py-3 px-5 font-medium text-right">ORIGINE IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <Activity className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    Aucun événement d'audit ne correspond aux filtres.
                  </td>
                </tr>
              ) : (
                pagedLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                      {log.date}
                    </td>

                    <td className="py-3 px-5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {log.adminEmail}
                    </td>

                    <td className="py-3 px-5 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-5 font-mono text-slate-600 dark:text-slate-400 truncate max-w-xs">
                      {log.target}
                    </td>

                    <td className="py-3 px-5 text-slate-500 dark:text-slate-400 truncate max-w-xs">
                      {log.detail || '—'}
                    </td>

                    <td className="py-3 px-5 font-mono tabular-nums text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                        {log.ip}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Events Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {pagedLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 px-4">
              <Activity className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              Aucun événement d'audit ne correspond aux filtres.
            </div>
          ) : (
            pagedLogs.map(log => (
              <div key={`mob-log-${log.id}`} className="p-4 space-y-2 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    {log.action}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 tabular-nums">
                    {log.date}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 font-mono truncate">
                  Admin : <strong className="text-slate-800 dark:text-slate-200">{log.adminEmail}</strong>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 font-mono truncate">
                  Cible : <span className="text-blue-600 dark:text-blue-400 font-medium">{log.target}</span>
                </div>

                {log.detail && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    {log.detail}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 font-mono">
                  <span>Adresse IP</span>
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                    {log.ip}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
          Affichage {filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} à {Math.min(currentPage * pageSize, filteredLogs.length)} sur {filteredLogs.length} événements
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Précédent
          </button>

          <span className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Page {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Suivant
          </button>
        </div>
      </div>

      {/* Modal d'aperçu avant impression & export */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Journal des événements de sécurité"
        subtitle={`Audit et traçabilité immuable - Filtre : ${actionFilter === 'all' ? 'Toutes les actions' : actionFilter === 'password' ? 'Mots de passe' : 'Créations'}${searchQuery ? ` ("${searchQuery}")` : ''}`}
        enterpriseName={currentEnterprise.name}
        stats={[
          { label: "Total événements", value: auditLogs.length },
          { label: "Filtrés", value: filteredLogs.length },
          { label: "Dernière action", value: auditLogs[0]?.action || "Aucune" },
          { label: "Horodatage", value: auditLogs[0]?.date || "—" },
        ]}
        columns={["Horodatage", "Administrateur", "Action", "Cible", "Détail", "Adresse IP"]}
        rows={filteredLogs.map(l => [
          l.date,
          l.adminEmail,
          l.action,
          l.target,
          l.detail || '—',
          l.ip
        ])}
      />
    </div>
  );
};
