import React, { useState } from 'react';
import { 
  RefreshCw, 
  ArrowRight, 
  CheckCircle2, 
  Mail, 
  Send, 
  Inbox, 
  HardDrive, 
  Clock, 
  Sparkles,
  ExternalLink,
  Users,
  ShieldCheck,
  TrendingUp,
  Zap,
  Activity,
  Plus,
  FileSpreadsheet,
  Globe,
  Check,
  Copy,
  ChevronRight,
  Server,
  Filter,
  LineChart,
  BarChart3
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const TableauDeBord: React.FC = () => {
  const { 
    mailboxes, 
    emails, 
    currentEnterprise, 
    lastSyncTime, 
    refreshStats, 
    isRefreshing,
    setCurrentTab,
    openWebmailForAccount,
    simulateIncomingEmail,
    setIsAddDomainModalOpen,
    setIsNewMailboxModalOpen,
    showToast,
    isCreator,
    selectedEnterpriseScope,
    buttonColor
  } = useApp();

  const [chartFilter, setChartFilter] = useState<'all' | 'received' | 'sent'>('all');
  const [chartMode, setChartMode] = useState<'spline' | 'bars'>('spline');
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  const activeMailboxes = mailboxes.filter(m => m.status === 'active');
  const totalMails = emails.length;
  const receivedMails = emails.filter(e => e.folder === 'inbox');
  const sentMails = emails.filter(e => e.folder === 'sent');
  const totalUnread = mailboxes.reduce((acc, m) => acc + m.unreadCount, 0);
  const totalStorageBytes = mailboxes.reduce((acc, m) => acc + m.storageUsedBytes, 0);

  // Maximum quota calculation (5 GB per mailbox default)
  const maxStorageQuotaBytes = Math.max(mailboxes.length * 5 * 1024 * 1024 * 1024, 10 * 1024 * 1024 * 1024);
  const storagePercentage = Math.min(Math.max((totalStorageBytes / maxStorageQuotaBytes) * 100, 0.5), 100);

  const formatStorage = (bytes: number) => {
    if (bytes === 0) return '0 o';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
  };

  const daysLabels = ['sam. 17', 'dim. 18', 'lun. 19', 'mar. 20', 'mer. 21', 'jeu. 22', 'ven. 23'];

  // 7-day activity metrics
  const activityData = React.useMemo(() => {
    const baseSent = [2, 1, 6, 9, 7, 4, Math.max(sentMails.length, 5)];
    const baseReceived = [4, 3, 11, 15, 12, 8, Math.max(receivedMails.length, 10)];
    return { baseSent, baseReceived };
  }, [sentMails.length, receivedMails.length]);

  const maxChartValue = Math.max(
    ...activityData.baseSent,
    ...activityData.baseReceived,
    16
  );

  // High-precision smooth Spline & Chart geometry calculations
  const chartGeometry = React.useMemo(() => {
    const totalDays = daysLabels.length; // 7
    const svgWidth = 640;
    const svgHeight = 150;
    const paddingLeft = 32;
    const paddingRight = 32;
    const paddingTop = 16;
    const paddingBottom = 22;
    const graphWidth = svgWidth - paddingLeft - paddingRight;
    const graphHeight = svgHeight - paddingTop - paddingBottom;

    const receivedPts = activityData.baseReceived.map((val, idx) => {
      const x = paddingLeft + (idx / (totalDays - 1)) * graphWidth;
      const y = paddingTop + graphHeight - (val / maxChartValue) * graphHeight;
      return { x, y, val, day: daysLabels[idx] };
    });

    const sentPts = activityData.baseSent.map((val, idx) => {
      const x = paddingLeft + (idx / (totalDays - 1)) * graphWidth;
      const y = paddingTop + graphHeight - (val / maxChartValue) * graphHeight;
      return { x, y, val, day: daysLabels[idx] };
    });

    // Catmull-Rom to Cubic Bezier continuous smooth curve
    const getSmoothPath = (pts: { x: number; y: number }[]) => {
      if (pts.length < 2) return '';
      let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? 0 : i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) / 5.5;
        const cp1y = p1.y + (p2.y - p0.y) / 5.5;
        const cp2x = p2.x - (p3.x - p1.x) / 5.5;
        const cp2y = p2.y - (p3.y - p1.y) / 5.5;

        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return d;
    };

    const baselineY = paddingTop + graphHeight;
    const receivedLinePath = getSmoothPath(receivedPts);
    const sentLinePath = getSmoothPath(sentPts);

    const receivedAreaPath = `${receivedLinePath} L ${receivedPts[receivedPts.length - 1].x.toFixed(1)} ${baselineY} L ${receivedPts[0].x.toFixed(1)} ${baselineY} Z`;
    const sentAreaPath = `${sentLinePath} L ${sentPts[sentPts.length - 1].x.toFixed(1)} ${baselineY} L ${sentPts[0].x.toFixed(1)} ${baselineY} Z`;

    return {
      svgWidth,
      svgHeight,
      paddingLeft,
      paddingRight,
      baselineY,
      receivedPts,
      sentPts,
      receivedLinePath,
      sentLinePath,
      receivedAreaPath,
      sentAreaPath,
      graphWidth
    };
  }, [activityData, daysLabels, maxChartValue]);

  const getInitials = (name: string, email: string) => {
    if (!name) return email.slice(0, 2).toUpperCase();
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 w-full space-y-5 sm:space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">Messagerie d'entreprise</span>
            <span>/</span>
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              {isCreator && selectedEnterpriseScope === 'all' ? 'Toutes les entreprises (Vue Concepteur)' : currentEnterprise.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Tableau de bord
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Serveur en ligne
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isCreator && selectedEnterpriseScope === 'all'
              ? `Vue consolidée globale multi-entreprises · Synchronisé à ${lastSyncTime}`
              : `Domaine principal @${currentEnterprise.defaultDomain} · Mis à jour ${lastSyncTime}`
            }
          </p>
        </div>

        {/* Action button toolbar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshStats}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all shadow-2xs active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards with Modern Icons & Tabular Numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {/* Boîtes actives */}
        <div className="kpi-card group bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#050a14] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-default">
          <div className="flex items-center justify-between">
            <span className="kpi-title text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-100 transition-colors truncate">
              Boîtes actives
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="kpi-value text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight transition-colors">
              {activeMailboxes.length}
            </div>
            <div className="kpi-subtext text-[10px] sm:text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors mt-1 flex items-center gap-1 truncate">
              <span>{mailboxes.length} au total</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">· 100%</span>
            </div>
          </div>
        </div>

        {/* Reçus (24 h) */}
        <div className="kpi-card group bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#050a14] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-default">
          <div className="flex items-center justify-between">
            <span className="kpi-title text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-100 transition-colors truncate">
              Reçus (24 h)
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Inbox className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="kpi-value text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight transition-colors">
              {receivedMails.length}
            </div>
            <div className="kpi-subtext text-[10px] sm:text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors mt-1 flex items-center gap-1 truncate">
              <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{receivedMails.length} sur 7 j</span>
            </div>
          </div>
        </div>

        {/* Envoyés (24 h) */}
        <div className="kpi-card group bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#050a14] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-default">
          <div className="flex items-center justify-between">
            <span className="kpi-title text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-100 transition-colors truncate">
              Envoyés (24 h)
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Send className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="kpi-value text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight transition-colors">
              {sentMails.length}
            </div>
            <div className="kpi-subtext text-[10px] sm:text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors mt-1 truncate">
              <span>{sentMails.length} sur 7 j</span>
            </div>
          </div>
        </div>

        {/* Non lus */}
        <div className="kpi-card group bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#050a14] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-default">
          <div className="flex items-center justify-between">
            <span className="kpi-title text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-100 transition-colors truncate">
              Non lus
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Mail className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="kpi-value text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight transition-colors">
              {totalUnread}
            </div>
            <div className="kpi-subtext text-[10px] sm:text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors mt-1 truncate">
              <span>{totalUnread} en attente</span>
            </div>
          </div>
        </div>

        {/* Envois (1 h) */}
        <div className="kpi-card group bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#050a14] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-default">
          <div className="flex items-center justify-between">
            <span className="kpi-title text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-100 transition-colors truncate">
              Flux d'envoi
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="kpi-value text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight transition-colors">
              Fluide
            </div>
            <div className="kpi-subtext text-[10px] sm:text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 transition-colors mt-1 truncate">
              0 blocage
            </div>
          </div>
        </div>

        {/* Stockage mails */}
        <div className="kpi-card group bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#050a14] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-default">
          <div className="flex items-center justify-between">
            <span className="kpi-title text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-100 transition-colors truncate">
              Stockage
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shrink-0">
              <HardDrive className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="kpi-value text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight transition-colors">
              {formatStorage(totalStorageBytes)}
            </div>
            <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${storagePercentage}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Activité sur 7 jours & État du serveur */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activité sur 7 jours with Ultra-Modern Visualizer */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between relative overflow-hidden group">
          {/* Subtle luminous background ambient glow */}
          <div 
            className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none transition-all duration-700 group-hover:opacity-20"
            style={{ backgroundColor: buttonColor || '#2563eb' }}
          />

          {/* Header controls & stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-xs"
                  style={{ backgroundColor: buttonColor || '#2563eb' }}
                >
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Activité sur 7 jours
                    </h2>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60">
                      <TrendingUp className="w-3 h-3" />
                      +14.8%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Flux de messagerie en temps réel · {activityData.baseReceived.reduce((a, b) => a + b, 0) + activityData.baseSent.reduce((a, b) => a + b, 0)} messages traités
                  </p>
                </div>
              </div>
            </div>

            {/* Filter and Mode Toggles */}
            <div className="flex items-center flex-wrap gap-2">
              {/* Spline vs Bars mode toggle */}
              <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setChartMode('spline')}
                  title="Affichage courbe lissée"
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    chartMode === 'spline'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <LineChart className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Courbe</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('bars')}
                  title="Affichage barres"
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    chartMode === 'bars'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Barres</span>
                </button>
              </div>

              {/* Data stream filter */}
              <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setChartFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                    chartFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Tous
                </button>
                <button
                  type="button"
                  onClick={() => setChartFilter('received')}
                  className={`px-2 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                    chartFilter === 'received'
                      ? 'bg-white dark:bg-slate-700 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  style={{ color: chartFilter === 'received' ? (buttonColor || '#2563eb') : undefined }}
                >
                  Reçus
                </button>
                <button
                  type="button"
                  onClick={() => setChartFilter('sent')}
                  className={`px-2 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                    chartFilter === 'sent'
                      ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Envoyés
                </button>
              </div>

              {/* Modern Legend */}
              <div className="hidden xl:flex items-center gap-3 text-xs pl-2 border-l border-slate-200 dark:border-slate-800">
                {(chartFilter === 'all' || chartFilter === 'received') && (
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-2 h-2 rounded-full ring-2 ring-blue-500/20"
                      style={{ backgroundColor: buttonColor || '#2563eb' }}
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Reçus</span>
                  </div>
                )}
                {(chartFilter === 'all' || chartFilter === 'sent') && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500 ring-2 ring-teal-500/20" />
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Envoyés</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Modern Visualizer */}
          <div className="relative w-full pt-1 pb-1">
            {chartMode === 'spline' ? (
              /* High-Performance SVG Area Spline with dynamic gradients & halos */
              <div className="relative w-full h-44 sm:h-48 select-none">
                <svg
                  viewBox={`0 0 ${chartGeometry.svgWidth} ${chartGeometry.svgHeight}`}
                  preserveAspectRatio="none"
                  className="w-full h-full overflow-visible"
                >
                  <defs>
                    {/* Linear Gradient for Received Area */}
                    <linearGradient id="areaGradientReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={buttonColor || '#2563eb'} stopOpacity="0.32" />
                      <stop offset="70%" stopColor={buttonColor || '#2563eb'} stopOpacity="0.05" />
                      <stop offset="100%" stopColor={buttonColor || '#2563eb'} stopOpacity="0.0" />
                    </linearGradient>

                    {/* Linear Gradient for Sent Area */}
                    <linearGradient id="areaGradientSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.28" />
                      <stop offset="70%" stopColor="#14b8a6" stopOpacity="0.04" />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Filter for smooth glow effect */}
                    <filter id="chartGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18" />
                    </filter>
                  </defs>

                  {/* Horizontal grid guide lines */}
                  {[16, 12, 8, 4, 0].map(val => {
                    const y = 16 + (150 - 16 - 22) - (val / maxChartValue) * (150 - 16 - 22);
                    return (
                      <g key={val}>
                        <line
                          x1={chartGeometry.paddingLeft - 4}
                          y1={y}
                          x2={chartGeometry.svgWidth - chartGeometry.paddingRight + 4}
                          y2={y}
                          className="stroke-slate-100 dark:stroke-slate-800/80"
                          strokeWidth="1"
                          strokeDasharray={val === 0 ? undefined : '3 4'}
                        />
                        <text
                          x={chartGeometry.paddingLeft - 10}
                          y={y + 3.5}
                          textAnchor="end"
                          className="fill-slate-400 dark:fill-slate-500 font-mono text-[9px] select-none"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Received Area fill */}
                  {(chartFilter === 'all' || chartFilter === 'received') && (
                    <path
                      d={chartGeometry.receivedAreaPath}
                      fill="url(#areaGradientReceived)"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Sent Area fill */}
                  {(chartFilter === 'all' || chartFilter === 'sent') && (
                    <path
                      d={chartGeometry.sentAreaPath}
                      fill="url(#areaGradientSent)"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Sent spline curve stroke */}
                  {(chartFilter === 'all' || chartFilter === 'sent') && (
                    <path
                      d={chartGeometry.sentLinePath}
                      fill="none"
                      stroke="#14b8a6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                      filter="url(#chartGlow)"
                    />
                  )}

                  {/* Received spline curve stroke */}
                  {(chartFilter === 'all' || chartFilter === 'received') && (
                    <path
                      d={chartGeometry.receivedLinePath}
                      fill="none"
                      stroke={buttonColor || '#2563eb'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                      filter="url(#chartGlow)"
                    />
                  )}

                  {/* Vertical scanner line when hovering */}
                  {hoveredDayIdx !== null && (
                    <g>
                      <line
                        x1={chartGeometry.receivedPts[hoveredDayIdx]?.x ?? 0}
                        y1={16}
                        x2={chartGeometry.receivedPts[hoveredDayIdx]?.x ?? 0}
                        y2={chartGeometry.baselineY}
                        stroke="currentColor"
                        className="text-slate-300 dark:text-slate-600"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    </g>
                  )}

                  {/* Data points nodes & interaction targets */}
                  {daysLabels.map((day, idx) => {
                    const rPt = chartGeometry.receivedPts[idx];
                    const sPt = chartGeometry.sentPts[idx];
                    const isHovered = hoveredDayIdx === idx;

                    return (
                      <g key={day}>
                        {/* Invisible expanded hit zone for smooth pointer tracking */}
                        <rect
                          x={rPt.x - 28}
                          y={0}
                          width={56}
                          height={chartGeometry.svgHeight}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredDayIdx(idx)}
                          onMouseLeave={() => setHoveredDayIdx(null)}
                        />

                        {/* Sent Point node */}
                        {(chartFilter === 'all' || chartFilter === 'sent') && (
                          <g>
                            {isHovered && (
                              <circle
                                cx={sPt.x}
                                cy={sPt.y}
                                r="7"
                                fill="#14b8a6"
                                fillOpacity="0.25"
                                className="animate-pulse"
                              />
                            )}
                            <circle
                              cx={sPt.x}
                              cy={sPt.y}
                              r={isHovered ? 4.5 : 3}
                              fill="#ffffff"
                              stroke="#14b8a6"
                              strokeWidth={isHovered ? 2.5 : 2}
                              className="transition-all duration-150"
                            />
                          </g>
                        )}

                        {/* Received Point node */}
                        {(chartFilter === 'all' || chartFilter === 'received') && (
                          <g>
                            {isHovered && (
                              <circle
                                cx={rPt.x}
                                cy={rPt.y}
                                r="7"
                                fill={buttonColor || '#2563eb'}
                                fillOpacity="0.25"
                                className="animate-pulse"
                              />
                            )}
                            <circle
                              cx={rPt.x}
                              cy={rPt.y}
                              r={isHovered ? 4.5 : 3}
                              fill="#ffffff"
                              stroke={buttonColor || '#2563eb'}
                              strokeWidth={isHovered ? 2.5 : 2}
                              className="transition-all duration-150"
                            />
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Modern Scrubber Tooltip */}
                {hoveredDayIdx !== null && (
                  <div
                    className="absolute -top-3 z-30 pointer-events-none transform -translate-x-1/2 transition-transform duration-75"
                    style={{
                      left: `${((chartGeometry.receivedPts[hoveredDayIdx]?.x ?? 0) / chartGeometry.svgWidth) * 100}%`
                    }}
                  >
                    <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white px-3 py-2 rounded-xl shadow-xl border border-slate-700/80 text-xs min-w-[130px]">
                      <div className="flex items-center justify-between font-semibold border-b border-slate-700/60 pb-1 mb-1.5 text-[11px] text-slate-300">
                        <span>{daysLabels[hoveredDayIdx]}</span>
                        <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> 100% OK
                        </span>
                      </div>
                      <div className="space-y-1">
                        {(chartFilter === 'all' || chartFilter === 'received') && (
                          <div className="flex items-center justify-between gap-3 text-[11px]">
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <span 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: buttonColor || '#3b82f6' }}
                              />
                              Reçus :
                            </span>
                            <span className="font-mono font-bold text-white tabular-nums">
                              {activityData.baseReceived[hoveredDayIdx]}
                            </span>
                          </div>
                        )}
                        {(chartFilter === 'all' || chartFilter === 'sent') && (
                          <div className="flex items-center justify-between gap-3 text-[11px]">
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <span className="w-2 h-2 rounded-full bg-teal-400" />
                              Envoyés :
                            </span>
                            <span className="font-mono font-bold text-white tabular-nums">
                              {activityData.baseSent[hoveredDayIdx]}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Neo-Modern Rounded Capsule Bars Mode */
              <div className="relative h-44 sm:h-48 w-full flex flex-col justify-between">
                {/* Horizontal Guide Lines */}
                {[16, 12, 8, 4, 0].map(val => (
                  <div key={val} className="relative flex items-center w-full border-b border-slate-100 dark:border-slate-800/80 h-8">
                    <span className="absolute -left-5 text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                      {val}
                    </span>
                  </div>
                ))}

                {/* Bars track */}
                <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-between px-3 sm:px-6">
                  {daysLabels.map((day, idx) => {
                    const sentCount = activityData.baseSent[idx] || 0;
                    const receivedCount = activityData.baseReceived[idx] || 0;
                    const isHovered = hoveredDayIdx === idx;

                    return (
                      <div
                        key={day}
                        onMouseEnter={() => setHoveredDayIdx(idx)}
                        onMouseLeave={() => setHoveredDayIdx(null)}
                        className="flex flex-col items-center group flex-1 cursor-pointer relative"
                      >
                        {/* Tooltip bubble on hover */}
                        {isHovered && (
                          <div className="absolute -top-12 bg-slate-900 text-white dark:bg-slate-800 dark:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-mono shadow-xl border border-slate-700/60 whitespace-nowrap z-30 pointer-events-none animate-in fade-in duration-100">
                            <span className="font-bold text-slate-200">{day}</span> : {receivedCount} reçus · {sentCount} envoyés
                          </div>
                        )}

                        <div className="flex items-end justify-center gap-1.5 sm:gap-2 h-32 w-full">
                          {/* Received Neo Capsule Bar */}
                          {(chartFilter === 'all' || chartFilter === 'received') && (
                            <div
                              style={{ 
                                height: `${Math.max((receivedCount / maxChartValue) * 115, 8)}px`,
                                backgroundColor: buttonColor || '#2563eb'
                              }}
                              className={`w-3 sm:w-4 rounded-t-full opacity-90 hover:opacity-100 transition-all duration-200 shadow-xs ${
                                isHovered ? 'scale-y-105 brightness-110 shadow-md ring-2 ring-blue-400/40' : ''
                              }`}
                            />
                          )}

                          {/* Sent Neo Capsule Bar */}
                          {(chartFilter === 'all' || chartFilter === 'sent') && (
                            <div
                              style={{ height: `${Math.max((sentCount / maxChartValue) * 115, 8)}px` }}
                              className={`w-3 sm:w-4 rounded-t-full bg-gradient-to-t from-teal-600 to-teal-400 hover:from-teal-500 hover:to-teal-300 transition-all duration-200 shadow-xs ${
                                isHovered ? 'scale-y-105 brightness-110 shadow-md ring-2 ring-teal-400/40' : ''
                              }`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* X-Axis Day labels row */}
            <div className="flex items-center justify-between px-4 sm:px-8 mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-2">
              {daysLabels.map((day, idx) => {
                const isHovered = hoveredDayIdx === idx;
                return (
                  <button
                    key={day}
                    type="button"
                    onMouseEnter={() => setHoveredDayIdx(idx)}
                    onMouseLeave={() => setHoveredDayIdx(null)}
                    className="flex flex-col items-center cursor-pointer transition-colors"
                  >
                    <span
                      className={`text-[11px] whitespace-nowrap font-medium transition-colors ${
                        isHovered
                          ? 'font-bold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                      style={{ color: isHovered ? (buttonColor || '#2563eb') : undefined }}
                    >
                      {day}
                    </span>
                    <span 
                      className={`w-1 h-1 rounded-full mt-0.5 transition-all ${
                        isHovered ? 'scale-150' : 'opacity-0'
                      }`}
                      style={{ backgroundColor: buttonColor || '#2563eb' }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* État du serveur & Infrastructure */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  État des protocoles
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                100% Opérationnel
              </span>
            </div>

            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">SMTP Réception</span>
                </div>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">Port 25 · ACTIF</span>
              </div>

              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">SMTP Envoi (TLS)</span>
                </div>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">Port 587 · ACTIF</span>
              </div>

              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">IMAP Sécurisé</span>
                </div>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">Port 993 · SSL</span>
              </div>

              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">Sécurité SPF/DKIM</span>
                </div>
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">VALIDÉ</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-3">
            <button
              type="button"
              onClick={() => simulateIncomingEmail()}
              className="w-full text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer border border-blue-200/50 dark:border-blue-900/50 shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Simuler un e-mail entrant</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Derniers mails reçus & Boîtes les plus actives */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Derniers mails reçus */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Derniers mails reçus
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Flux temps réel de la boîte de réception
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentTab('mailboxes')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Toutes les boîtes</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {receivedMails.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                <Mail className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                Aucun message reçu pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {receivedMails.slice(0, 5).map((msg, idx) => (
                  <div
                    key={`${msg.id}-${idx}`}
                    onClick={() => {
                      const mb = mailboxes.find(m => m.id === msg.mailboxId);
                      if (mb) openWebmailForAccount(mb);
                    }}
                    className="py-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl px-2.5 -mx-2.5 transition-colors group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Avatar initials */}
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-semibold text-[11px] flex items-center justify-center shrink-0">
                        {getInitials(msg.fromName, msg.from)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {msg.fromName}
                          </span>
                          {!msg.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" title="Non lu" />
                          )}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate mt-0.5">
                          {msg.subject}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          Vers <span className="font-mono">{msg.mailboxEmail}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 font-mono">
                      {msg.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Boîtes les plus actives (7 j) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Boîtes les plus actives (7 j)
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Répartition des flux par collaborateur
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentTab('accounts')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Gérer les comptes</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <th className="pb-2.5 font-medium">BOÎTE COLLABORATEUR</th>
                    <th className="pb-2.5 text-right font-medium">REÇUS</th>
                    <th className="pb-2.5 text-right font-medium">ENVOYÉS</th>
                    <th className="pb-2.5 text-right font-medium">NON LUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {mailboxes.map((mb, idx) => {
                    const mbReceived = emails.filter(e => e.mailboxId === mb.id && e.folder === 'inbox').length;
                    const mbSent = emails.filter(e => e.mailboxId === mb.id && e.folder === 'sent').length;

                    return (
                      <tr 
                        key={`${mb.id}-${idx}`} 
                        onClick={() => openWebmailForAccount(mb)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px] group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{mb.name}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate">{mb.email}</div>
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                          {mbReceived}
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                          {mbSent}
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums">
                          {mb.unreadCount > 0 ? (
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {mb.unreadCount}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
