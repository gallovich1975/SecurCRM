import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  CalendarClock,
  FolderKanban,
  Briefcase,
  BarChart3,
  Settings,
  LogOut,
  X,
  Menu,
} from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clienti', href: '/clienti', icon: Users },
  { name: 'Preventivi', href: '/preventivi', icon: FileText },
  { name: 'Fatturazione', href: '/fatturazione', icon: Receipt },
  { name: 'Scadenziario', href: '/scadenziario', icon: CalendarClock },
  { name: 'Progetti', href: '/progetti', icon: FolderKanban },
  { name: 'Servizi', href: '/servizi', icon: Briefcase },
  { name: 'Report', href: '/report', icon: BarChart3 },
];

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h1 className="text-xl font-bold text-indigo-700 tracking-tight">
              AgencyOS
            </h1>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onClose}
              data-testid="sidebar-close-btn"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="px-3 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'sidebar-link',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    )
                  }
                  data-testid={`sidebar-link-${item.name.toLowerCase()}`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              ))}
            </nav>

            <Separator className="my-4 mx-3" />

            <nav className="px-3">
              <NavLink
                to="/impostazioni"
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'sidebar-link',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  )
                }
                data-testid="sidebar-link-impostazioni"
              >
                <Settings className="h-5 w-5" />
                Impostazioni
              </NavLink>
            </nav>
          </ScrollArea>

          {/* User section */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-indigo-700">
                  {user?.nome?.[0]}{user?.cognome?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.nome} {user?.cognome}
                </p>
                <p className="text-xs text-slate-500 capitalize">{user?.ruolo}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-slate-600"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="h-4 w-4" />
              Esci
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};

export const MobileMenuButton = ({ onClick }) => (
  <Button
    variant="ghost"
    size="icon"
    className="lg:hidden"
    onClick={onClick}
    data-testid="mobile-menu-btn"
  >
    <Menu className="h-6 w-6" />
  </Button>
);
