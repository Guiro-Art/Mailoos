import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Globe, 
  FileSpreadsheet, 
  Users, 
  Mail, 
  ShieldCheck, 
  FileText, 
  Settings, 
  Bell, 
  LogOut, 
  ExternalLink,
  ChevronDown,
  Building2,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NavTab, PermissionResource } from '../types';

export const Sidebar: React.FC = () => {
  const { 
    currentTab, 
    setCurrentTab, 
    currentEnterprise, 
    enterprises, 
    setCurrentEnterprise,
    addEnterprise,
    selectedEnterpriseScope,
    setSelectedEnterpriseScope,
    isCreator,
    currentAdmin, 
    showToast,
    logout,
    mailboxes,
    openWebmailForAccount,
    isSidebarCollapsed,
    toggleSidebar,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    buttonColor,
    canView
  } = useApp();

  const [hoveredTab, setHoveredTab] = useState<NavTab | null>(null);
  const [isWebmailHovered, setIsWebmailHovered] = useState(false);
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const [isToggleHovered, setIsToggleHovered] = useState(false);
  const [isMobileCloseHovered, setIsMobileCloseHovered] = useState(false);
  const [isEnterpriseMenuOpen, setIsEnterpriseMenuOpen] = useState(false);
  const [isEnterpriseBtnHovered, setIsEnterpriseBtnHovered] = useState(false);
  const [hoveredEntId, setHoveredEntId] = useState<string | null>(null);
  const [isNewEntHovered, setIsNewEntHovered] = useState(false);
  const [showNewEnterpriseModal, setShowNewEnterpriseModal] = useState(false);
  const [newEnterpriseName, setNewEnterpriseName] = useState('');
  const [newEnterpriseDomain, setNewEnterpriseDomain] = useState('');

  const navItems: { tab: NavTab; label: string; icon: React.FC<{ className?: string; style?: React.CSSProperties }> }[] = [
    { tab: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { tab: 'mailboxes', label: 'Boîtes mail', icon: Mail },
    { tab: 'accounts', label: 'Comptes mail', icon: Users },
    { tab: 'import', label: 'Importer (Excel)', icon: FileSpreadsheet },
    { tab: 'audit', label: "Journal d'audit", icon: FileText },
    { tab: 'domains', label: 'Domaines', icon: Globe },
    { tab: 'settings', label: 'Paramètres', icon: Settings },
  ];

  const handleCreateEnterprise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnterpriseName || !newEnterpriseDomain) return;
    addEnterprise(newEnterpriseName, newEnterpriseDomain);
    setNewEnterpriseName('');
    setNewEnterpriseDomain('');
    setShowNewEnterpriseModal(false);
    setIsEnterpriseMenuOpen(false);
  };

  const handleOpenWebmail = () => {
    if (mailboxes.length > 0) {
      openWebmailForAccount(mailboxes[0]);
    } else {
      setCurrentTab('mailboxes');
    }
    if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
  };

  const [isLgScreen, setIsLgScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    const handleResize = () => {
      const isLg = window.innerWidth >= 1024;
      setIsLgScreen(isLg);
      if (isLg && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileSidebarOpen, setIsMobileSidebarOpen]);

  const handleToggleSidebar = () => {
    if (isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
    toggleSidebar();
  };

  const isCollapsed = isLgScreen ? isSidebarCollapsed : false;
  const totalUnread = mailboxes.reduce((acc, m) => acc + (m.unreadCount || 0), 0);

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside 
        className={`
          bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 select-none transition-all duration-200 ease-in-out overflow-hidden
          ${isMobileSidebarOpen 
            ? 'fixed inset-y-0 left-0 z-50 w-72 sm:w-80 max-w-[85vw] shadow-2xl translate-x-0' 
            : 'fixed inset-y-0 left-0 z-50 w-72 sm:w-80 max-w-[85vw] -translate-x-full pointer-events-none'
          }
          lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:z-30 lg:translate-x-0 lg:pointer-events-auto lg:shadow-none
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {/* Logo brand & Toggle Button (Pinned Header) */}
        <div className={`shrink-0 p-4 pb-3 flex items-center border-b border-slate-100/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 z-10 ${isCollapsed ? 'flex-col gap-2 justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 min-w-0">
              <div 
                style={{ backgroundColor: buttonColor }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 transition-colors"
              >
                <Mail className="w-5 h-5" />
              </div>
              {!isCollapsed && (
                <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white truncate">
                  Mailoos
                </span>
              )}
            </div>

            {/* Toggle Buttons */}
            <div className="flex items-center gap-1">
              {/* Mobile Close Button */}
              {isMobileSidebarOpen && (
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  onMouseEnter={() => setIsMobileCloseHovered(true)}
                  onMouseLeave={() => setIsMobileCloseHovered(false)}
                  className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Fermer le menu"
                >
                  <X 
                    style={isMobileCloseHovered ? { color: buttonColor, stroke: buttonColor } : undefined} 
                    className="w-5 h-5 transition-colors" 
                  />
                </button>
              )}

              {/* Desktop Toggle Button */}
              <button
                type="button"
                onClick={handleToggleSidebar}
                onMouseEnter={() => setIsToggleHovered(true)}
                onMouseLeave={() => setIsToggleHovered(false)}
                title={isSidebarCollapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
                className={`hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                  isCollapsed ? 'w-full' : ''
                }`}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen style={{ color: buttonColor, stroke: buttonColor }} className="w-4 h-4" />
                ) : (
                  <PanelLeftClose 
                    style={isToggleHovered ? { color: buttonColor, stroke: buttonColor } : undefined} 
                    className="w-4 h-4 transition-colors" 
                  />
                )}
              </button>
            </div>
          </div>

        {/* Scrollable Body: Enterprise Selector, Navigation Links & Footer */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col justify-between sidebar-scrollable overscroll-contain">
          <div className="py-2.5">
            {/* Enterprise selector */}
            <div className="px-3 mb-2.5">
            <div className="relative">
              {isCollapsed ? (
                isCreator ? (
                  <button
                    type="button"
                    onClick={() => setIsEnterpriseMenuOpen(!isEnterpriseMenuOpen)}
                    onMouseEnter={() => setIsEnterpriseBtnHovered(true)}
                    onMouseLeave={() => setIsEnterpriseBtnHovered(false)}
                    title={`Espace : ${selectedEnterpriseScope === 'all' ? 'Toutes les entreprises (Vue Concepteur)' : currentEnterprise.name}`}
                    style={{
                      borderColor: isEnterpriseBtnHovered ? buttonColor : undefined,
                      boxShadow: isEnterpriseBtnHovered ? `0 0 0 2px ${buttonColor}35` : undefined,
                    }}
                    className="sidebar-enterprise-btn w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-center text-slate-800 dark:text-slate-200 font-bold text-xs transition-all group cursor-pointer"
                  >
                    <Building2 style={{ color: buttonColor }} className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                ) : (
                  <div
                    title={`Entreprise dédiée : ${currentEnterprise.name}`}
                    className="w-full h-10 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-500"
                  >
                    <Building2 style={{ color: buttonColor }} className="w-4 h-4" />
                  </div>
                )
              ) : (
                isCreator ? (
                  <button
                    type="button"
                    onClick={() => setIsEnterpriseMenuOpen(!isEnterpriseMenuOpen)}
                    onMouseEnter={() => setIsEnterpriseBtnHovered(true)}
                    onMouseLeave={() => setIsEnterpriseBtnHovered(false)}
                    style={{
                      borderColor: isEnterpriseBtnHovered ? buttonColor : undefined,
                      boxShadow: isEnterpriseBtnHovered ? `0 0 0 2px ${buttonColor}35` : undefined,
                    }}
                    className="sidebar-enterprise-btn w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Espace
                        </span>
                        <span 
                          style={{ backgroundColor: `${buttonColor}18`, color: buttonColor }}
                          className="text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 uppercase"
                        >
                          Concepteur
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {selectedEnterpriseScope === 'all' ? 'Toutes les entreprises' : currentEnterprise.name}
                      </div>
                    </div>
                    <ChevronDown 
                      style={isEnterpriseMenuOpen || isEnterpriseBtnHovered ? { color: buttonColor } : undefined}
                      className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0 ${isEnterpriseMenuOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>
                ) : (
                  <div className="w-full text-left p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Entreprise
                        </span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                          Dédiée
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {currentEnterprise.name}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
                        @{currentEnterprise.defaultDomain}
                      </div>
                    </div>
                    <span title="Accès cloisonné à votre entreprise">
                      <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    </span>
                  </div>
                )
              )}

              {/* Enterprise Dropdown Menu (Concepteur Only) */}
              {isEnterpriseMenuOpen && isCreator && (
                <div 
                  className={`
                    bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1.5 py-2
                    ${isCollapsed 
                      ? 'fixed left-20 top-16 w-64' 
                      : 'absolute top-full left-0 right-0 mt-1'
                    }
                  `}
                >
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-400 px-2.5 pb-1 uppercase tracking-wider">
                    Vue Concepteur Multi-Entreprise
                  </div>

                  {/* Option: Toutes les entreprises */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEnterpriseScope('all');
                      setIsEnterpriseMenuOpen(false);
                      showToast('Vue globale Concepteur : Toutes les entreprises', 'info');
                    }}
                    style={selectedEnterpriseScope === 'all' ? {
                      backgroundColor: buttonColor,
                      color: '#ffffff'
                    } : undefined}
                    className={`w-full text-left px-2.5 py-2 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer mb-1 ${
                      selectedEnterpriseScope === 'all'
                        ? 'font-semibold shadow-xs text-white' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="truncate">
                      <div className="font-semibold truncate">🏢 Toutes les entreprises</div>
                      <div className={`text-[10px] ${selectedEnterpriseScope === 'all' ? 'text-white/80' : 'text-slate-400'}`}>
                        Vue d'ensemble plateforme
                      </div>
                    </div>
                    {selectedEnterpriseScope === 'all' && (
                      <span className="w-2 h-2 rounded-full bg-white ml-1.5 shrink-0" />
                    )}
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>

                  <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 px-2.5 py-0.5 uppercase tracking-wider">
                    Entreprises individuelles
                  </div>

                  {enterprises.map(ent => (
                    <button
                      key={ent.id}
                      type="button"
                      onClick={() => {
                        setSelectedEnterpriseScope(ent.id);
                        setIsEnterpriseMenuOpen(false);
                        showToast(`Espace actif : ${ent.name}`, 'info');
                      }}
                      onMouseEnter={() => setHoveredEntId(ent.id)}
                      onMouseLeave={() => setHoveredEntId(null)}
                      style={selectedEnterpriseScope === ent.id ? {
                        backgroundColor: buttonColor,
                        color: '#ffffff'
                      } : hoveredEntId === ent.id ? {
                        backgroundColor: `${buttonColor}18`,
                        color: buttonColor
                      } : undefined}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        selectedEnterpriseScope === ent.id 
                          ? 'sidebar-dropdown-active font-semibold shadow-xs text-white' 
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-semibold truncate">{ent.name}</div>
                        <div className={`text-[10px] font-normal truncate ${selectedEnterpriseScope === ent.id ? 'text-white/80' : 'text-slate-400 dark:text-slate-400'}`}>
                          @{ent.defaultDomain}
                        </div>
                      </div>
                      {selectedEnterpriseScope === ent.id && (
                        <span className="dot-indicator w-2 h-2 rounded-full shrink-0 ml-1.5 bg-white" />
                      )}
                    </button>
                  ))}

                  <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEnterpriseMenuOpen(false);
                      setShowNewEnterpriseModal(true);
                    }}
                    onMouseEnter={() => setIsNewEntHovered(true)}
                    onMouseLeave={() => setIsNewEntHovered(false)}
                    style={{ 
                      color: buttonColor,
                      backgroundColor: isNewEntHovered ? `${buttonColor}18` : undefined
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nouvelle entreprise</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {navItems
              .filter(item => {
                if (isCreator) return true;
                if (item.tab === 'dashboard' || item.tab === 'mailboxes') return true;
                return canView(item.tab as PermissionResource);
              })
              .map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.tab;
              const isHovered = hoveredTab === item.tab;
              const isRestricted = (item.tab === 'domains' || item.tab === 'import' || item.tab === 'accounts' || item.tab === 'audit' || item.tab === 'settings') && !canView(item.tab as PermissionResource);

              return (
                <button
                  key={item.tab}
                  type="button"
                  title={isCollapsed ? `${item.label}${isRestricted ? ' (Accès restreint)' : ''}` : undefined}
                  onClick={() => {
                    setCurrentTab(item.tab);
                    if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
                  }}
                  onMouseEnter={() => setHoveredTab(item.tab)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={isActive ? {
                    backgroundColor: buttonColor,
                    color: '#ffffff'
                  } : isHovered ? {
                    backgroundColor: `${buttonColor}15`,
                  } : undefined}
                  className={`sidebar-nav-item w-full flex items-center ${
                    isCollapsed 
                      ? 'justify-center p-2.5' 
                      : 'gap-3 px-3 py-2 text-sm'
                  } font-medium rounded-xl transition-all relative group cursor-pointer ${
                    isActive 
                      ? 'is-active shadow-sm font-semibold text-white' 
                      : isRestricted 
                        ? 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400' 
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="relative shrink-0">
                    <Icon 
                      style={isActive ? { color: '#ffffff', stroke: '#ffffff' } : isHovered ? { color: buttonColor, stroke: buttonColor } : undefined}
                      className="sidebar-icon w-4 h-4 transition-colors" 
                    />
                    {isCollapsed && item.tab === 'mailboxes' && totalUnread > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate">{item.label}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.tab === 'mailboxes' && totalUnread > 0 && (
                          <span 
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isActive 
                                ? 'bg-white/20 text-white' 
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                            }`}
                          >
                            {totalUnread}
                          </span>
                        )}
                        {isRestricted && (
                          <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500 opacity-70" />
                        )}
                      </div>
                    </div>
                  )}
                  {isCollapsed && isActive && (
                    <span 
                      className="sidebar-active-indicator absolute left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white" 
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info & Actions */}
        <div className={`mt-auto shrink-0 p-3 pb-5 border-t border-slate-200/80 dark:border-slate-800 space-y-1.5 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {/* Webmail Quick Launch */}
          <button
            type="button"
            onClick={handleOpenWebmail}
            onMouseEnter={() => setIsWebmailHovered(true)}
            onMouseLeave={() => setIsWebmailHovered(false)}
            title={isCollapsed ? "Ouvrir le Webmail" : undefined}
            style={isWebmailHovered ? { backgroundColor: `${buttonColor}15` } : undefined}
            className={`sidebar-action-btn w-full flex items-center ${
              isCollapsed 
                ? 'justify-center p-2' 
                : 'gap-2.5 px-3 py-2 text-xs'
            } font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer group`}
          >
            <Mail 
              style={isWebmailHovered ? { color: buttonColor, stroke: buttonColor } : undefined} 
              className="w-4 h-4 text-slate-400 shrink-0 transition-colors" 
            />
            {!isCollapsed && (
              <>
                <span className="truncate">Webmail</span>
                <ExternalLink 
                  style={isWebmailHovered ? { color: buttonColor, stroke: buttonColor } : undefined} 
                  className="w-3 h-3 text-slate-400 ml-auto shrink-0 transition-colors" 
                />
              </>
            )}
          </button>

          {/* Current Admin & Logout */}
          <div className={`pt-1.5 ${isCollapsed ? 'w-full flex flex-col items-center' : ''}`}>
            {!isCollapsed && (
              <div className="px-1 mb-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {currentAdmin.name}
                  </span>
                  <span 
                    style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                    className="text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 uppercase tracking-wide"
                  >
                    {currentAdmin.role}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
                  {currentAdmin.email}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              onMouseEnter={() => setIsLogoutHovered(true)}
              onMouseLeave={() => setIsLogoutHovered(false)}
              title={isCollapsed ? `Déconnexion (${currentAdmin.email})` : undefined}
              className={`mt-0.5 flex items-center ${
                isCollapsed 
                  ? 'justify-center p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl w-full' 
                  : 'gap-2 px-1 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium'
              } transition-colors cursor-pointer`}
            >
              <LogOut 
                style={isLogoutHovered ? { color: '#e11d48', stroke: '#e11d48' } : undefined} 
                className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 shrink-0 transition-colors" 
              />
              {!isCollapsed && <span>Déconnexion</span>}
            </button>
          </div>
        </div>
        </div>
      </aside>

      {/* New Enterprise Modal */}
      {showNewEnterpriseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Ajouter une entreprise</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Créez un nouvel espace de messagerie professionnelle</p>
              </div>
            </div>

            <form onSubmit={handleCreateEnterprise} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom de l'entreprise
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sahel Logistics SARL"
                  value={newEnterpriseName}
                  onChange={e => setNewEnterpriseName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom de domaine principal
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: sahellogistics.com"
                  value={newEnterpriseDomain}
                  onChange={e => setNewEnterpriseDomain(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewEnterpriseModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  Créer l'entreprise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
