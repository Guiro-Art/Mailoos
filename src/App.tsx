import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { TableauDeBord } from './components/TableauDeBord';
import { Domaines } from './components/Domaines';
import { ImporterExcel } from './components/ImporterExcel';
import { ComptesMail } from './components/ComptesMail';
import { BoitesMail } from './components/BoitesMail';
import { JournalAudit } from './components/JournalAudit';
import { Parametres } from './components/Parametres';
import { ComposeMailModal } from './components/ComposeMailModal';
import { Login } from './components/Login';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  X, 
  Menu, 
  Bell, 
  Sun, 
  Moon, 
  LogOut, 
  KeyRound,
  LayoutDashboard,
  Mail,
  Users,
  Globe,
  Settings,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { 
    currentTab, 
    setCurrentTab,
    notifications, 
    removeToast, 
    toggleMobileSidebar, 
    setIsMobileSidebarOpen,
    currentEnterprise,
    currentAdmin,
    isCreator,
    selectedEnterpriseScope,
    isAuthenticated,
    logout,
    buttonColor,
    theme,
    toggleTheme,
    isNotificationsActive,
    toggleNotifications,
    mailboxes
  } = useApp();

  const [isMobileUserMenuOpen, setIsMobileUserMenuOpen] = React.useState(false);

  const totalUnread = mailboxes.reduce((acc, m) => acc + m.unreadCount, 0);

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <TableauDeBord />;
      case 'domains':
        return <Domaines />;
      case 'import':
        return <ImporterExcel />;
      case 'accounts':
        return <ComptesMail />;
      case 'mailboxes':
        return <BoitesMail />;
      case 'admins':
        return <Parametres initialTab="administrateurs" />;
      case 'audit':
        return <JournalAudit />;
      case 'settings':
        return <Parametres initialTab="administrateurs" />;
      default:
        return <TableauDeBord />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
        {/* Toast Notifications */}
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none px-3 sm:px-0">
          {notifications.map(toast => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-lg border transition-all animate-in slide-in-from-top-2 duration-200 ${
                toast.type === 'success'
                  ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/80 text-slate-800 dark:text-slate-100'
                  : toast.type === 'error'
                  ? 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800/80 text-slate-800 dark:text-slate-100'
                  : toast.type === 'warning'
                  ? 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800/80 text-slate-800 dark:text-slate-100'
                  : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800/80 text-slate-800 dark:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />}
                {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />}
                {toast.type === 'info' && <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                <span className="text-xs font-medium">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Login />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-150">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        {notifications.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-lg border transition-all animate-in slide-in-from-top-2 duration-200 ${
              toast.type === 'success'
                ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/80 text-slate-800 dark:text-slate-100'
                : toast.type === 'error'
                ? 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800/80 text-slate-800 dark:text-slate-100'
                : toast.type === 'warning'
                ? 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800/80 text-slate-800 dark:text-slate-100'
                : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800/80 text-slate-800 dark:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />}
              {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
              <span className="text-xs font-medium">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Main Sidebar (Drawer on mobile/tablet, full/collapsed on desktop) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header Bar across all pages */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between shrink-0 transition-colors shadow-2xs">
          {/* Left section: mobile hamburger & active company indicator */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={toggleMobileSidebar}
              className="lg:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Ouvrir le menu complet"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" title="Base Cloud Firestore connectée" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 truncate">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {isCreator && selectedEnterpriseScope === 'all' 
                    ? 'Toutes les entreprises' 
                    : currentEnterprise.name}
                </span>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline truncate font-mono">
                  {isCreator && selectedEnterpriseScope === 'all' 
                    ? 'Vue Concepteur Globale' 
                    : currentEnterprise.defaultDomain}
                </span>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Cloud Sécurisé
              </span>
            </div>
          </div>

          {/* Right section: Notifications, Mode Sombre & Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative">
            {/* Notifications Button */}
            <button
              type="button"
              onClick={toggleNotifications}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl border transition-all active:scale-95 shadow-2xs cursor-pointer ${
                isNotificationsActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
              }`}
              title={isNotificationsActive ? "Notifications directes actives" : "Activer les notifications"}
            >
              <Bell className={`w-3.5 h-3.5 shrink-0 ${isNotificationsActive ? 'text-emerald-600 dark:text-emerald-400 fill-emerald-500/20' : 'text-slate-500 dark:text-slate-400'}`} />
              <span className="hidden md:inline">
                {isNotificationsActive ? 'Notifs actives' : 'Notifications'}
              </span>
              {isNotificationsActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
            </button>

            {/* Dark Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl transition-all shadow-2xs active:scale-95 flex items-center justify-center w-8 h-8 cursor-pointer"
              title={theme === 'dark' ? "Passer en mode clair" : "Passer en mode sombre"}
              aria-label={theme === 'dark' ? "Passer en mode clair" : "Passer en mode sombre"}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
              )}
            </button>

            {/* Admin Profile - Responsive Desktop vs Mobile */}
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
              {/* Desktop Name & Role */}
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-36">
                  {currentAdmin.name}
                </span>
                <span 
                  style={{ color: buttonColor }}
                  className="text-[10px] font-bold uppercase truncate"
                >
                  {currentAdmin.role}
                </span>
              </div>

              {/* Avatar Button: Toggles Mobile Menu on small screens, jumps to settings on large */}
              <button
                type="button"
                onClick={() => setIsMobileUserMenuOpen(!isMobileUserMenuOpen)}
                title="Gérer mon profil & Sécurité"
                style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                className="w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700 hover:ring-2 hover:ring-blue-500/30 transition-all cursor-pointer"
              >
                {currentAdmin.name.slice(0, 2).toUpperCase()}
              </button>

              {/* Desktop Quick Password & Logout Buttons */}
              <button
                type="button"
                onClick={() => setCurrentTab('settings')}
                title="Changer mon mot de passe"
                className="hidden sm:flex p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={logout}
                title={`Déconnexion (${currentAdmin.email})`}
                className="hidden sm:flex p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile User Dropdown Popover */}
            {isMobileUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {currentAdmin.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                    {currentAdmin.email}
                  </div>
                  <div className="mt-1">
                    <span 
                      style={{ backgroundColor: `${buttonColor}18`, color: buttonColor }}
                      className="text-[9px] font-bold px-2 py-0.5 rounded uppercase"
                    >
                      {currentAdmin.role}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab('settings');
                      setIsMobileUserMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mon mot de passe & Sécurité</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setIsMobileUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content - with extra bottom padding on mobile for the fixed nav bar */}
        <main className="flex-1 overflow-y-auto min-w-0 pb-20 lg:pb-6">
          {renderContent()}
        </main>

        {/* Mobile & Tablet Bottom Navigation Bar (Thumb Friendly) */}
        <nav 
          aria-label="Navigation mobile"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-lg"
        >
          <button
            type="button"
            onClick={() => setCurrentTab('dashboard')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
              currentTab === 'dashboard'
                ? 'font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={{ color: currentTab === 'dashboard' ? (buttonColor || '#2563eb') : undefined }}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Accueil</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('mailboxes')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
              currentTab === 'mailboxes'
                ? 'font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={{ color: currentTab === 'mailboxes' ? (buttonColor || '#2563eb') : undefined }}
          >
            <div className="relative">
              <Mail className="w-4 h-4 mb-0.5" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-2 bg-blue-600 text-white text-[8px] font-bold px-1 rounded-full leading-none py-0.5">
                  {totalUnread}
                </span>
              )}
            </div>
            <span className="text-[10px] leading-tight">Boîtes</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('accounts')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
              currentTab === 'accounts'
                ? 'font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={{ color: currentTab === 'accounts' ? (buttonColor || '#2563eb') : undefined }}
          >
            <Users className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Comptes</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('domains')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
              currentTab === 'domains'
                ? 'font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={{ color: currentTab === 'domains' ? (buttonColor || '#2563eb') : undefined }}
          >
            <Globe className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Domaines</span>
          </button>

          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
          >
            <Menu className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Menu</span>
          </button>
        </nav>
      </div>

      {/* Email Composer Modal */}
      <ComposeMailModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
