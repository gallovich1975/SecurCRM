import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { dashboardAPI, projectsAPI, clientsAPI } from '../lib/api';
import { formatCurrency, formatDate, getRelativeTime, getStatusColor, getStatusLabel } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import {
  Users,
  FolderKanban,
  FileText,
  Receipt,
  TrendingUp,
  TrendingDown,
  CalendarClock,
  ArrowRight,
  Euro,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const CHART_COLORS = ['#4338ca', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [servicesData, setServicesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, projectsRes, revenueRes, servicesRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getProjectsInProgress(),
        dashboardAPI.getRevenueChart(),
        dashboardAPI.getServicesDistribution(),
      ]);
      setStats(statsRes.data);
      setProjects(projectsRes.data);
      setRevenueData(revenueRes.data);
      setServicesData(servicesRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="dashboard-grid">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </Layout>
    );
  }

  const kpiCards = [
    {
      title: 'Clienti',
      value: stats?.clienti || 0,
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      link: '/clienti',
    },
    {
      title: 'Progetti Attivi',
      value: stats?.progetti_attivi || 0,
      icon: FolderKanban,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      link: '/progetti',
      subtitle: `${stats?.progetti_totali || 0} totali`,
    },
    {
      title: 'Preventivi in Attesa',
      value: stats?.preventivi_in_attesa || 0,
      icon: FileText,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      link: '/preventivi',
      subtitle: `${stats?.preventivi_approvati || 0} approvati`,
    },
    {
      title: 'Scadenze Imminenti',
      value: stats?.scadenze_imminenti || 0,
      icon: CalendarClock,
      color: stats?.scadenze_imminenti > 0 ? 'text-red-600' : 'text-slate-600',
      bgColor: stats?.scadenze_imminenti > 0 ? 'bg-red-100' : 'bg-slate-100',
      link: '/scadenziario',
    },
  ];

  const financialCards = [
    {
      title: 'Fatturato Totale',
      value: formatCurrency(stats?.fatturato_totale || 0),
      icon: Receipt,
      trend: 'up',
    },
    {
      title: 'Incassato',
      value: formatCurrency(stats?.incassato || 0),
      icon: Euro,
      trend: 'up',
      color: 'text-emerald-600',
    },
    {
      title: 'Da Incassare',
      value: formatCurrency(stats?.da_incassare || 0),
      icon: Clock,
      trend: 'neutral',
      color: 'text-amber-600',
    },
    {
      title: 'Margine Progetti',
      value: formatCurrency(stats?.margine || 0),
      icon: stats?.margine >= 0 ? TrendingUp : TrendingDown,
      trend: stats?.margine >= 0 ? 'up' : 'down',
      color: stats?.margine >= 0 ? 'text-emerald-600' : 'text-red-600',
    },
  ];

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="dashboard-grid" data-testid="kpi-cards">
          {kpiCards.map((card, index) => (
            <Link key={index} to={card.link}>
              <Card className="kpi-card card-hover cursor-pointer" data-testid={`kpi-${card.title.toLowerCase().replace(/\s/g, '-')}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{card.title}</p>
                      <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
                      {card.subtitle && (
                        <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
                      )}
                    </div>
                    <div className={`p-3 rounded-xl ${card.bgColor}`}>
                      <card.icon className={`h-6 w-6 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="financial-cards">
          {financialCards.map((card, index) => (
            <Card key={index} className="bg-white border-slate-100">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.trend === 'up' ? 'bg-emerald-100' : card.trend === 'down' ? 'bg-red-100' : 'bg-slate-100'}`}>
                    <card.icon className={`h-5 w-5 ${card.color || 'text-slate-600'}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">{card.title}</p>
                    <p className={`text-lg font-semibold currency ${card.color || 'text-slate-900'}`}>
                      {card.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card className="chart-container" data-testid="revenue-chart">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Fatturato Mensile</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mese" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `€${v/1000}k`} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), 'Fatturato']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="fatturato" fill="#4338ca" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-400">
                  Nessun dato disponibile
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services Distribution */}
          <Card className="chart-container" data-testid="services-chart">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Distribuzione Servizi</CardTitle>
            </CardHeader>
            <CardContent>
              {servicesData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie
                        data={servicesData}
                        dataKey="valore"
                        nameKey="servizio"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                      >
                        {servicesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {servicesData.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="text-sm text-slate-600 flex-1">{item.servizio}</span>
                        <span className="text-sm font-medium currency">{formatCurrency(item.valore)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-400">
                  Nessun dato disponibile
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Projects and Deadlines Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projects in Progress */}
          <Card className="bg-white border-slate-100" data-testid="projects-in-progress">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold">Lavori in Corso</CardTitle>
              <Link to="/progetti">
                <Button variant="ghost" size="sm" className="text-indigo-600">
                  Vedi tutti <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.slice(0, 5).map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{project.nome}</p>
                        <p className="text-xs text-slate-500">{project.client_nome}</p>
                      </div>
                      <Badge className={getStatusColor(project.stato)}>
                        {getStatusLabel(project.stato)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">
                  Nessun progetto in corso
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card className="bg-white border-slate-100" data-testid="upcoming-deadlines">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold">Scadenze Imminenti</CardTitle>
              <Link to="/scadenziario">
                <Button variant="ghost" size="sm" className="text-indigo-600">
                  Vedi tutte <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {stats?.scadenze_lista?.length > 0 ? (
                <div className="space-y-3">
                  {stats.scadenze_lista.map((deadline) => (
                    <div
                      key={deadline.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{deadline.titolo}</p>
                        <p className="text-xs text-slate-500">{formatDate(deadline.data_scadenza)}</p>
                      </div>
                      <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded">
                        {getRelativeTime(deadline.data_scadenza)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">
                  Nessuna scadenza imminente
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
