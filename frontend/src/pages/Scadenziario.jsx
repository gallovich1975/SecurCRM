import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { deadlinesAPI, clientsAPI, projectsAPI } from '../lib/api';
import { formatDate, getRelativeTime, getRecurrenceLabel, isOverdue, isWithinDays } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
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
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import {
  Plus,
  CalendarIcon,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const deadlineSchema = z.object({
  titolo: z.string().min(2, 'Titolo richiesto'),
  descrizione: z.string().optional(),
  data_scadenza: z.date({ required_error: 'Data richiesta' }),
  client_id: z.string().optional(),
  project_id: z.string().optional(),
  ricorrenza: z.enum(['mensile', 'trimestrale', 'semestrale', 'annuale']).optional().nullable(),
  promemoria_giorni: z.coerce.number().min(0).default(7),
});

export const Scadenziario = () => {
  const [deadlines, setDeadlines] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(deadlineSchema),
    defaultValues: {
      promemoria_giorni: 7,
    },
  });

  const selectedClient = watch('client_id');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      projectsAPI.getAll(selectedClient).then(res => setProjects(res.data));
    }
  }, [selectedClient]);

  const fetchData = async () => {
    try {
      const [deadlinesRes, clientsRes] = await Promise.all([
        deadlinesAPI.getAll(),
        clientsAPI.getAll(),
      ]);
      setDeadlines(deadlinesRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Errore nel caricamento dati');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        data_scadenza: data.data_scadenza?.toISOString(),
        client_id: data.client_id || null,
        project_id: data.project_id || null,
        ricorrenza: data.ricorrenza || null,
      };
      await deadlinesAPI.create(payload);
      toast.success('Scadenza creata');
      fetchData();
      setDialogOpen(false);
      reset({ promemoria_giorni: 7 });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const handleComplete = async (id) => {
    try {
      await deadlinesAPI.complete(id);
      toast.success('Scadenza completata');
      fetchData();
    } catch (error) {
      toast.error('Errore');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa scadenza?')) return;
    try {
      await deadlinesAPI.delete(id);
      toast.success('Scadenza eliminata');
      fetchData();
    } catch (error) {
      toast.error('Errore');
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.nome || null;
  };

  const getDeadlineStatus = (deadline) => {
    if (deadline.completata) return { label: 'Completata', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
    if (isOverdue(deadline.data_scadenza)) return { label: 'Scaduta', color: 'bg-red-100 text-red-700', icon: AlertTriangle };
    if (isWithinDays(deadline.data_scadenza, 7)) return { label: 'Imminente', color: 'bg-amber-100 text-amber-700', icon: Clock };
    return { label: 'In scadenza', color: 'bg-slate-100 text-slate-700', icon: CalendarClock };
  };

  const filteredDeadlines = deadlines
    .filter((d) => showCompleted || !d.completata)
    .filter((d) => {
      if (filter === 'all') return true;
      if (filter === 'overdue') return !d.completata && isOverdue(d.data_scadenza);
      if (filter === 'upcoming') return !d.completata && isWithinDays(d.data_scadenza, 7);
      if (filter === 'completed') return d.completata;
      return true;
    })
    .sort((a, b) => {
      if (a.completata !== b.completata) return a.completata ? 1 : -1;
      return new Date(a.data_scadenza) - new Date(b.data_scadenza);
    });

  // Stats
  const overdueCount = deadlines.filter(d => !d.completata && isOverdue(d.data_scadenza)).length;
  const upcomingCount = deadlines.filter(d => !d.completata && isWithinDays(d.data_scadenza, 7) && !isOverdue(d.data_scadenza)).length;
  const completedCount = deadlines.filter(d => d.completata).length;

  return (
    <Layout title="Scadenziario">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="deadline-stats">
          <Card className="p-4 cursor-pointer hover:bg-slate-50" onClick={() => setFilter('all')}>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Totale</p>
            <p className="text-2xl font-bold mt-1">{deadlines.length}</p>
          </Card>
          <Card className="p-4 cursor-pointer hover:bg-slate-50" onClick={() => setFilter('overdue')}>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Scadute</p>
            <p className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? 'text-red-600' : ''}`}>{overdueCount}</p>
          </Card>
          <Card className="p-4 cursor-pointer hover:bg-slate-50" onClick={() => setFilter('upcoming')}>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Imminenti</p>
            <p className={`text-2xl font-bold mt-1 ${upcomingCount > 0 ? 'text-amber-600' : ''}`}>{upcomingCount}</p>
          </Card>
          <Card className="p-4 cursor-pointer hover:bg-slate-50" onClick={() => setFilter('completed')}>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Completate</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</p>
          </Card>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex items-center gap-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40" data-testid="filter-deadline-select">
                <SelectValue placeholder="Filtra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                <SelectItem value="overdue">Scadute</SelectItem>
                <SelectItem value="upcoming">Imminenti</SelectItem>
                <SelectItem value="completed">Completate</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-completed"
                checked={showCompleted}
                onCheckedChange={setShowCompleted}
              />
              <label htmlFor="show-completed" className="text-sm text-slate-600">
                Mostra completate
              </label>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) reset({ promemoria_giorni: 7 });
          }}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-deadline-btn">
                <Plus className="h-4 w-4 mr-2" /> Nuova Scadenza
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuova Scadenza</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Titolo *</Label>
                  <Input {...register('titolo')} data-testid="deadline-titolo-input" />
                  {errors.titolo && <p className="text-sm text-red-500">{errors.titolo.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Scadenza *</Label>
                    <Controller
                      name="data_scadenza"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start font-normal"
                              data-testid="deadline-data-btn"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, 'dd/MM/yyyy', { locale: it }) : 'Seleziona data'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              locale={it}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {errors.data_scadenza && <p className="text-sm text-red-500">{errors.data_scadenza.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Promemoria (giorni prima)</Label>
                    <Input type="number" {...register('promemoria_giorni')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Controller
                      name="client_id"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nessuno</SelectItem>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Progetto</Label>
                    <Controller
                      name="project_id"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nessuno</SelectItem>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ricorrenza</Label>
                  <Controller
                    name="ricorrenza"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Nessuna" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nessuna</SelectItem>
                          <SelectItem value="mensile">Mensile</SelectItem>
                          <SelectItem value="trimestrale">Trimestrale</SelectItem>
                          <SelectItem value="semestrale">Semestrale</SelectItem>
                          <SelectItem value="annuale">Annuale</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrizione</Label>
                  <Textarea {...register('descrizione')} rows={2} />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-deadline-btn">
                    Crea
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Deadlines List */}
        <div className="space-y-3" data-testid="deadlines-list">
          {loading ? (
            <Card className="p-8 text-center">
              <div className="spinner mx-auto" />
            </Card>
          ) : filteredDeadlines.length === 0 ? (
            <Card className="p-8 text-center text-slate-400">
              Nessuna scadenza
            </Card>
          ) : (
            filteredDeadlines.map((deadline) => {
              const status = getDeadlineStatus(deadline);
              const StatusIcon = status.icon;
              return (
                <Card
                  key={deadline.id}
                  className={`p-4 transition-all ${deadline.completata ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => !deadline.completata && handleComplete(deadline.id)}
                      className={`mt-1 flex-shrink-0 ${deadline.completata ? '' : 'hover:scale-110 transition-transform'}`}
                      disabled={deadline.completata}
                    >
                      <StatusIcon className={`h-6 w-6 ${status.color.includes('emerald') ? 'text-emerald-600' : status.color.includes('red') ? 'text-red-600' : status.color.includes('amber') ? 'text-amber-600' : 'text-slate-400'}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className={`font-medium ${deadline.completata ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {deadline.titolo}
                          </h3>
                          {deadline.descrizione && (
                            <p className="text-sm text-slate-500 mt-1">{deadline.descrizione}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                            <span>{formatDate(deadline.data_scadenza)}</span>
                            {!deadline.completata && (
                              <span className={`font-medium ${isOverdue(deadline.data_scadenza) ? 'text-red-600' : isWithinDays(deadline.data_scadenza, 7) ? 'text-amber-600' : ''}`}>
                                {getRelativeTime(deadline.data_scadenza)}
                              </span>
                            )}
                            {deadline.ricorrenza && (
                              <Badge variant="outline" className="text-xs">
                                {getRecurrenceLabel(deadline.ricorrenza)}
                              </Badge>
                            )}
                            {getClientName(deadline.client_id) && (
                              <span>• {getClientName(deadline.client_id)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={status.color}>{status.label}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-red-600"
                            onClick={() => handleDelete(deadline.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
};
