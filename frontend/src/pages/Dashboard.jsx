import React from 'react';
import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Settings, LogOut,
  Activity, Bell, MapPin, Gauge
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DashboardOverview from './DashboardOverview';
import DashboardAdmins from './DashboardAdmins';
import DashboardReleves from './DashboardReleves';
import DashboardCompteurs from './DashboardCompteurs';
import DashboardAdresses from './DashboardAdresses';
import DashboardAgents from './DashboardAgents';
import DashboardReports from './DashboardReports';

const SidebarItem = ({ icon: Icon, label, to, hidden }) => {
  if (hidden) return null;
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
          isActive
            ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
};

function Dashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard/overview') || path === '/dashboard') return 'Tableau de bord';
    if (path.includes('/dashboard/releves')) return 'Relevés';
    if (path.includes('/dashboard/admins')) return 'Gestion des utilisateurs';
    if (path.includes('/dashboard/compteurs')) return 'Gestion des compteurs';
    if (path.includes('/dashboard/adresses')) return 'Gestion des adresses';
    if (path.includes('/dashboard/agents')) return 'Affectation des agents';
    if (path.includes('/dashboard/reports')) return 'Rapports & comparatifs';
    return 'Tableau de bord';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      <aside className="fixed left-0 top-0 h-screen w-64 border-r border-slate-800 hidden md:flex flex-col p-4 bg-slate-950 z-30 overflow-y-auto">
        <div className="flex items-center gap-2 px-2 mb-8 mt-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Activity size={20} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">SI Relevés</span>
        </div>

        <nav className="space-y-1 flex-1">
          <SidebarItem
            icon={LayoutDashboard}
            label="Vue d'ensemble"
            to="/dashboard/overview"
          />
          <SidebarItem
            icon={FileText}
            label="Relevés"
            to="/dashboard/releves"
          />
          <SidebarItem
            icon={Gauge}
            label="Compteurs"
            to="/dashboard/compteurs"
          />
          <SidebarItem
            icon={MapPin}
            label="Adresses"
            to="/dashboard/adresses"
          />
          <SidebarItem
            icon={Users}
            label="Utilisateurs"
            to="/dashboard/admins"
            hidden={user?.role !== 'SUPERADMIN'}
          />
          <SidebarItem
            icon={Users}
            label="Agents"
            to="/dashboard/agents"
          />
          <SidebarItem
            icon={Settings}
            label="Rapports"
            to="/dashboard/reports"
          />
        </nav>

        <div className="pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-rose-400 transition-colors"
          >
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950 sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-slate-100">
            {getPageTitle()}
          </h2>

          <div className="flex items-center gap-6">
            <button
              type="button"
              className="relative text-slate-400 hover:text-slate-200"
            >
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full" />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-200">
                  {user?.nom} {user?.prenom}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {user?.role || 'Admin'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-400 border border-slate-700">
                {user?.nom?.[0]}
                {user?.prenom?.[0]}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/overview" element={<DashboardOverview />} />
            <Route path="/releves" element={<DashboardReleves />} />
            <Route path="/compteurs" element={<DashboardCompteurs />} />
            <Route path="/adresses" element={<DashboardAdresses />} />
            <Route path="/agents" element={<DashboardAgents />} />
            <Route path="/reports" element={<DashboardReports />} />
            <Route
              path="/admins"
              element={
                user?.role === 'SUPERADMIN' ? (
                  <DashboardAdmins />
                ) : (
                  <Navigate to="/dashboard/overview" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;