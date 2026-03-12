import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { projectsAPI, clientsAPI, servicesAPI, timeEntriesAPI, usersAPI } from '../lib/api';
import { formatDate, formatCurrency, getStatusColor, getStatusLabel, getServiceTypeLabel } from '../lib/utils';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Checkbox } from '../components/ui/checkbox';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  CalendarIcon,
  Clock,
  Users,
  Euro,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const projectSchema = z.object({
  nome: z.string().min(2, 'Nome richiesto'),
  client_id: z.string().min(1, 'Cliente richiesto'),
  servizi: z.array(z.string()).optional(),
  descrizione: z.string().optional(),
  budget: z.coerce.number().min(0).default(0),
  data_inizio: z.date().optional(),
  data_fine_prevista: z.date().optional(),
  team_members: z.array(z.string()).optional(),
});

const timeEntrySchema = z.object({
  ore: z.coerce.number().min(0.5, 'Minimo 0.5 ore'),
  descrizione: z.string().optional(),
  costo_orario: z.coerce.number().min(0).optional(),
});

export const Progetti = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      servizi: [],
      team_members: [],
      budget: 0,
    },
  });

  const {
    register: registerTime,
    handleSubmit: handleSubmitTime,
    reset: resetTime,
    formState: { errors: timeErrors },
  } = useForm({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      ore: 1,
      costo_orario: 50,
    },
  });

  const selectedServices = watch('servizi') || [];
  const selectedTeam = watch('team_members') || [];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, clientsRes, servicesRes, usersRes] = await Promise.all([
        projectsAPI.getAll(),
        clientsAPI.getAll(),
        servicesAPI.getAll(),
        usersAPI.getAll(),
      ]);
      setProjects(projectsRes.data);
      setClients(clientsRes.data);
      setServices(servicesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      toast.error('Errore nel caricamento dati');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeEntries = async (projectId) => {
    try {
      const response = await timeEntriesAPI.getAll(projectId);
      setTimeEntries(response.data);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        data_inizio: data.data_inizio?.toISOString(),
        data_fine_prevista: data.data_fine_prevista?.toISOString(),
      };
      if (editingProject) {
        await projectsAPI.update(editingProject.id, payload);
        toast.success('Progetto aggiornato');
      } else {
        await projectsAPI.create(payload);
        toast.success('Progetto creato');
      }
      fetchData();
      setDialogOpen(false);
      setEditingProject(null);
      reset({ servizi: [], team_members: [], budget: 0 });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const onSubmitTime = async (data) => {
    try {
      await timeEntriesAPI.create({
        project_id: selectedProject.id,
        user_id: users[0]?.id, // Current user
        ore: data.ore,
        descrizione: data.descrizione,
        costo_orario: data.costo_orario,
      });
      toast.success('Ore registrate');
      fetchData();
      fetchTimeEntries(selectedProject.id);
      setTimeDialogOpen(false);
      resetTime({ ore: 1, costo_orario: 50 });
    } catch (error) {
      toast.error('Errore');
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    reset({
      ...project,
      data_inizio: project.data_inizio ? new Date(project.data_inizio) : undefined,
      data_fine_prevista: project.data_fine_prevista ? new Date(project.data_fine_prevista) : undefined,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo progetto?')) return;
    try {
      await projectsAPI.delete(id);
      toast.success('Progetto eliminato');
      fetchData();
    } catch (error) {
      toast.error('Errore');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await projectsAPI.updateStatus(id, status);
      toast.success('Stato aggiornato');
      fetchData();
    } catch (error) {
      toast.error('Errore');
    }
  };

  const handleViewDetail = (project) => {
    setSelectedProject(project);
    fetchTimeEntries(project.id);
    setDetailDialogOpen(true);
  };

  const handleDeleteTimeEntry = async (id) => {
    try {
      await timeEntriesAPI.delete(id);
      toast.success('Registrazione eliminata');
      fetchData();
      fetchTimeEntries(selectedProject.id);
    } catch (error) {
      toast.error('Errore');
    }
  };

  const toggleService = (serviceId) => {
    const newServices = selectedServices.includes(serviceId)
      ? selectedServices.filter((s) => s !== serviceId)
      : [...selectedServices, serviceId];
    setValue('servizi', newServices);
  };

  const toggleTeamMember = (userId) => {
    const newTeam = selectedTeam.includes(userId)
      ? selectedTeam.filter((u) => u !== userId)
      : [...selectedTeam, userId];
    setValue('team_members', newTeam);
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.nome || 'N/A';
  };

  const getUserName = (userId) => {
    const user = users.find((u) => u.id === userId);
    return user ? `${user.nome} ${user.cognome}` : 'N/A';
  };

  const getServiceName = (serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    return service?.nome || serviceId;
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getClientName(project.client_id).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.stato === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getProfitability = (project) => {
    if (!project.budget) return null;
    const profit = project.budget - (project.costo_totale || 0);
    const percentage = ((project.budget - project.costo_totale) / project.budget) * 100;
    return { profit, percentage };
  };

  return (
    <Layout title="Progetti">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cerca progetti..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-projects-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="filter-project-status">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="pianificato">Pianificato</SelectItem>
                <SelectItem value="in_corso">In corso</SelectItem>
                <SelectItem value="in_pausa">In pausa</SelectItem>
                <SelectItem value="completato">Completato</SelectItem>
                <SelectItem value="annullato">Annullato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingProject(null);
              reset({ servizi: [], team_members: [], budget: 0 });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-project-btn">
                <Plus className="h-4 w-4 mr-2" /> Nuovo Progetto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Modifica Progetto' : 'Nuovo Progetto'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input {...register('nome')} data-testid="project-nome-input" />
                    {errors.nome && <p className="text-sm text-red-500">{errors.nome.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <Controller
                      name="client_id"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger data-testid="project-client-select">
                            <SelectValue placeholder="Seleziona cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.client_id && <p className="text-sm text-red-500">{errors.client_id.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Budget (€)</Label>
                  <Input type="number" step="0.01" {...register('budget')} data-testid="project-budget-input" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Inizio</Label>
                    <Controller
                      name="data_inizio"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, 'dd/MM/yyyy', { locale: it }) : 'Seleziona data'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={it} />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fine Prevista</Label>
                    <Controller
                      name="data_fine_prevista"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, 'dd/MM/yyyy', { locale: it }) : 'Seleziona data'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={it} />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Servizi</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
                    {services.map((service) => (
                      <div key={service.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                        <Checkbox
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={() => toggleService(service.id)}
                        />
                        <span className="text-sm">{service.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Team</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                        <Checkbox
                          checked={selectedTeam.includes(user.id)}
                          onCheckedChange={() => toggleTeamMember(user.id)}
                        />
                        <span className="text-sm">{user.nome} {user.cognome}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrizione</Label>
                  <Textarea {...register('descrizione')} rows={3} />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-project-btn">
                    {editingProject ? 'Salva' : 'Crea'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="projects-grid">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-2 bg-slate-200 rounded w-full" />
                </div>
              </Card>
            ))
          ) : filteredProjects.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">
              Nessun progetto
            </div>
          ) : (
            filteredProjects.map((project) => {
              const profitability = getProfitability(project);
              return (
                <Card key={project.id} className="card-hover">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{project.nome}</h3>
                        <p className="text-sm text-slate-500">{getClientName(project.client_id)}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`project-menu-${project.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetail(project)}>
                            <Eye className="h-4 w-4 mr-2" /> Dettagli
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(project)}>
                            <Pencil className="h-4 w-4 mr-2" /> Modifica
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {project.stato === 'pianificato' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'in_corso')}>
                              <Play className="h-4 w-4 mr-2" /> Avvia
                            </DropdownMenuItem>
                          )}
                          {project.stato === 'in_corso' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'in_pausa')}>
                                <Pause className="h-4 w-4 mr-2" /> Pausa
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'completato')}>
                                <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" /> Completa
                              </DropdownMenuItem>
                            </>
                          )}
                          {project.stato === 'in_pausa' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'in_corso')}>
                              <Play className="h-4 w-4 mr-2" /> Riprendi
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(project.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <Badge className={`mb-3 ${getStatusColor(project.stato)}`}>
                      {getStatusLabel(project.stato)}
                    </Badge>

                    <div className="space-y-3">
                      {project.budget > 0 && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">Budget</span>
                            <span className="font-medium currency">{formatCurrency(project.budget)}</span>
                          </div>
                          <Progress
                            value={Math.min(((project.costo_totale || 0) / project.budget) * 100, 100)}
                            className="h-1.5"
                          />
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-slate-400">Costo: {formatCurrency(project.costo_totale || 0)}</span>
                            {profitability && (
                              <span className={profitability.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                {profitability.profit >= 0 ? '+' : ''}{formatCurrency(profitability.profit)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {project.ore_totali || 0}h
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {project.team_members?.length || 0}
                        </span>
                      </div>

                      {project.servizi?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.servizi.slice(0, 3).map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">
                              {getServiceName(s)}
                            </Badge>
                          ))}
                          {project.servizi.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{project.servizi.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProject?.nome}</DialogTitle>
            </DialogHeader>
            {selectedProject && (
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Panoramica</TabsTrigger>
                  <TabsTrigger value="time">Ore Lavorate</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <p className="text-xs text-slate-500">Budget</p>
                      <p className="text-lg font-bold currency">{formatCurrency(selectedProject.budget)}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-slate-500">Costo</p>
                      <p className="text-lg font-bold currency">{formatCurrency(selectedProject.costo_totale)}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-slate-500">Ore</p>
                      <p className="text-lg font-bold">{selectedProject.ore_totali || 0}h</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-slate-500">Margine</p>
                      <p className={`text-lg font-bold ${(selectedProject.budget - selectedProject.costo_totale) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(selectedProject.budget - (selectedProject.costo_totale || 0))}
                      </p>
                    </Card>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-500">Cliente</Label>
                      <p className="font-medium">{getClientName(selectedProject.client_id)}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Stato</Label>
                      <Badge className={getStatusColor(selectedProject.stato)}>
                        {getStatusLabel(selectedProject.stato)}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-slate-500">Data Inizio</Label>
                      <p>{formatDate(selectedProject.data_inizio)}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Data Fine Prevista</Label>
                      <p>{formatDate(selectedProject.data_fine_prevista)}</p>
                    </div>
                  </div>

                  {selectedProject.team_members?.length > 0 && (
                    <div>
                      <Label className="text-slate-500">Team</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedProject.team_members.map((userId) => (
                          <Badge key={userId} variant="outline">{getUserName(userId)}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProject.descrizione && (
                    <div>
                      <Label className="text-slate-500">Descrizione</Label>
                      <p className="text-sm text-slate-600 mt-1">{selectedProject.descrizione}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="time" className="space-y-4 mt-4">
                  <div className="flex justify-end">
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => setTimeDialogOpen(true)}
                      data-testid="add-time-entry-btn"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Registra Ore
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Utente</TableHead>
                        <TableHead>Ore</TableHead>
                        <TableHead>Costo</TableHead>
                        <TableHead>Descrizione</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                            Nessuna registrazione
                          </TableCell>
                        </TableRow>
                      ) : (
                        timeEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{formatDate(entry.data)}</TableCell>
                            <TableCell>{getUserName(entry.user_id)}</TableCell>
                            <TableCell>{entry.ore}h</TableCell>
                            <TableCell className="currency">{formatCurrency(entry.ore * (entry.costo_orario || 0))}</TableCell>
                            <TableCell className="text-slate-500">{entry.descrizione || '-'}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600"
                                onClick={() => handleDeleteTimeEntry(entry.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Time Entry Dialog */}
        <Dialog open={timeDialogOpen} onOpenChange={setTimeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registra Ore</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitTime(onSubmitTime)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ore *</Label>
                  <Input type="number" step="0.5" {...registerTime('ore')} data-testid="time-ore-input" />
                  {timeErrors.ore && <p className="text-sm text-red-500">{timeErrors.ore.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Costo Orario (€)</Label>
                  <Input type="number" step="0.01" {...registerTime('costo_orario')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Textarea {...registerTime('descrizione')} rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setTimeDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-time-btn">
                  Salva
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};
