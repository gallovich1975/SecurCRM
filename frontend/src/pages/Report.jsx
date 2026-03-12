import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { projectsAPI, clientsAPI, servicesAPI } from '../lib/api';
import { formatCurrency, getStatusLabel, getServiceTypeLabel } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
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
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Clock,
  Target,
  Percent,
} from 'lucide-react';

const CHART_COLORS = ['#4338ca', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const Report = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, clientsRes, servicesRes] = await Promise.all([
        projectsAPI.getAll(),
        clientsAPI.getAll(),
        servicesAPI.getAll(),
      ]);
      setProjects(projectsRes.data);
      setClients(clientsRes.data);
      setServices(servicesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.nome || 'N/A';
  };

  const getServiceName = (serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    return service?.nome || serviceId;
  };

  // Calculate statistics
  const completedProjects = projects.filter((p) => p.stato === 'completato');
  const activeProjects = projects.filter((p) => p.stato === 'in_corso');

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalCost = projects.reduce((sum, p) => sum + (p.costo_totale || 0), 0);
  const totalMargin = totalBudget - totalCost;
  const marginPercentage = totalBudget > 0 ? ((totalMargin / totalBudget) * 100).toFixed(1) : 0;

  const totalHours = projects.reduce((sum, p) => sum + (p.ore_totali || 0), 0);
  const avgHourlyRate = totalHours > 0 ? totalCost / totalHours : 0;

  // Profitability by project
  const projectProfitability = projects
    .filter((p) => p.budget > 0)
    .map((p) => ({
      nome: p.nome,
      cliente: getClientName(p.client_id),
      budget: p.budget,
      costo: p.costo_totale || 0,
      margine: p.budget - (p.costo_totale || 0),
      percentuale: ((p.budget - (p.costo_totale || 0)) / p.budget * 100).toFixed(1),
      ore: p.ore_totali || 0,
      stato: p.stato,
    }))
    .sort((a, b) => b.margine - a.margine);

  // Profitability by service type
  const serviceStats = {};
  projects.forEach((p) => {
    const servizi = p.servizi || [];
    const budgetPerService = (p.budget || 0) / Math.max(servizi.length, 1);
    const costoPerService = (p.costo_totale || 0) / Math.max(servizi.length, 1);
    servizi.forEach((serviceId) => {
      const service = services.find((s) => s.id === serviceId);
      const tipo = service?.tipo || 'altro';
      if (!serviceStats[tipo]) {
        serviceStats[tipo] = { budget: 0, costo: 0, progetti: 0 };
      }
      serviceStats[tipo].budget += budgetPerService;
      serviceStats[tipo].costo += costoPerService;
      serviceStats[tipo].progetti += 1;
    });
  });

  const serviceChartData = Object.entries(serviceStats).map(([tipo, stats]) => ({
    name: getServiceTypeLabel(tipo),
    budget: Math.round(stats.budget),
    costo: Math.round(stats.costo),
    margine: Math.round(stats.budget - stats.costo),
    progetti: stats.progetti,
  }));

  // Client stats
  const clientStats = {};
  projects.forEach((p) => {
    const clientId = p.client_id;
    if (!clientStats[clientId]) {
      clientStats[clientId] = { budget: 0, costo: 0, progetti: 0 };
    }
    clientStats[clientId].budget += p.budget || 0;
    clientStats[clientId].costo += p.costo_totale || 0;
    clientStats[clientId].progetti += 1;
  });

  const topClients = Object.entries(clientStats)
    .map(([clientId, stats]) => ({
      cliente: getClientName(clientId),
      budget: stats.budget,
      costo: stats.costo,
      margine: stats.budget - stats.costo,
      progetti: stats.progetti,
    }))
    .sort((a, b) => b.budget - a.budget)
    .slice(0, 5);

  if (loading) {
    return (
      <Layout title="Report">
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Report">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="report-kpi">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100">
                <Euro className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Budget Totale</p>
                <p className="text-lg font-bold currency">{formatCurrency(totalBudget)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Costo Totale</p>
                <p className="text-lg font-bold currency">{formatCurrency(totalCost)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totalMargin >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {totalMargin >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Margine</p>
                <p className={`text-lg font-bold currency ${totalMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(totalMargin)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Percent className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Margine %</p>
                <p className={`text-lg font-bold ${marginPercentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {marginPercentage}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profitability by Service */}
          <Card data-testid="service-chart">
            <CardHeader>
              <CardTitle className="text-lg">Redditività per Servizio</CardTitle>
            </CardHeader>
            <CardContent>
              {serviceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={serviceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `€${v/1000}k`} />
                    <Tooltip
                      formatter={(value, name) => [formatCurrency(value), name === 'budget' ? 'Budget' : name === 'costo' ? 'Costo' : 'Margine']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                    <Bar dataKey="budget" name="Budget" fill="#4338ca" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="costo" name="Costo" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="margine" name="Margine" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400">
                  Nessun dato disponibile
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Clients */}
          <Card data-testid="clients-chart">
            <CardHeader>
              <CardTitle className="text-lg">Top 5 Clienti per Fatturato</CardTitle>
            </CardHeader>
            <CardContent>
              {topClients.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topClients} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `€${v/1000}k`} />
                    <YAxis type="category" dataKey="cliente" tick={{ fontSize: 11 }} stroke="#9ca3af" width={100} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="budget" name="Budget" fill="#4338ca" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400">
                  Nessun dato disponibile
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Projects Table */}
        <Card data-testid="projects-profitability-table">
          <CardHeader>
            <CardTitle className="text-lg">Redditività Progetti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>Progetto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Margine</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Ore</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectProfitability.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                        Nessun progetto con budget definito
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectProfitability.map((project, index) => (
                      <TableRow key={index} className="table-row-hover">
                        <TableCell className="font-medium">{project.nome}</TableCell>
                        <TableCell className="text-slate-500">{project.cliente}</TableCell>
                        <TableCell className="text-right font-medium currency">
                          {formatCurrency(project.budget)}
                        </TableCell>
                        <TableCell className="text-right text-slate-500 currency">
                          {formatCurrency(project.costo)}
                        </TableCell>
                        <TableCell className={`text-right font-medium currency ${project.margine >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {project.margine >= 0 ? '+' : ''}{formatCurrency(project.margine)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${parseFloat(project.percentuale) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {project.percentuale}%
                        </TableCell>
                        <TableCell className="text-right text-slate-500">
                          {project.ore}h
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getStatusLabel(project.stato)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Progetti Totali</p>
            <p className="text-2xl font-bold mt-1">{projects.length}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">In Corso</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{activeProjects.length}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Completati</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{completedProjects.length}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Ore Totali</p>
            <p className="text-2xl font-bold mt-1">{totalHours.toFixed(1)}h</p>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
