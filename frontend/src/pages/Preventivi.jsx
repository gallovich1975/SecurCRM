import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { quotesAPI, clientsAPI, servicesAPI } from '../lib/api';
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
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
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  CalendarIcon,
  FileText,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const quoteSchema = z.object({
  titolo: z.string().min(2, 'Titolo richiesto'),
  client_id: z.string().min(1, 'Cliente richiesto'),
  descrizione: z.string().optional(),
  importo: z.coerce.number().min(0, 'Importo non valido'),
  data_validita: z.date().optional(),
  servizi: z.array(z.string()).optional(),
});

export const Preventivi = () => {
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      servizi: [],
      importo: 0,
    },
  });

  const selectedServices = watch('servizi') || [];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [quotesRes, clientsRes, servicesRes] = await Promise.all([
        quotesAPI.getAll(),
        clientsAPI.getAll(),
        servicesAPI.getAll(),
      ]);
      setQuotes(quotesRes.data);
      setClients(clientsRes.data);
      setServices(servicesRes.data);
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
        data_validita: data.data_validita?.toISOString(),
      };
      if (editingQuote) {
        await quotesAPI.update(editingQuote.id, payload);
        toast.success('Preventivo aggiornato');
      } else {
        await quotesAPI.create(payload);
        toast.success('Preventivo creato');
      }
      fetchData();
      setDialogOpen(false);
      setEditingQuote(null);
      reset({ servizi: [], importo: 0 });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const handleEdit = (quote) => {
    setEditingQuote(quote);
    reset({
      ...quote,
      data_validita: quote.data_validita ? new Date(quote.data_validita) : undefined,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo preventivo?')) return;
    try {
      await quotesAPI.delete(id);
      toast.success('Preventivo eliminato');
      fetchData();
    } catch (error) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await quotesAPI.updateStatus(id, status);
      toast.success('Stato aggiornato');
      fetchData();
    } catch (error) {
      toast.error('Errore nell\'aggiornamento');
    }
  };

  const toggleService = (serviceId) => {
    const current = selectedServices;
    const newServices = current.includes(serviceId)
      ? current.filter((s) => s !== serviceId)
      : [...current, serviceId];
    setValue('servizi', newServices);
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.nome || 'N/A';
  };

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.titolo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getClientName(quote.client_id).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.stato === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout title="Preventivi">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cerca preventivi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-quotes-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="filter-status-select">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="bozza">Bozza</SelectItem>
                <SelectItem value="inviato">Inviato</SelectItem>
                <SelectItem value="approvato">Approvato</SelectItem>
                <SelectItem value="rifiutato">Rifiutato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingQuote(null);
              reset({ servizi: [], importo: 0 });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-quote-btn">
                <Plus className="h-4 w-4 mr-2" /> Nuovo Preventivo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingQuote ? 'Modifica Preventivo' : 'Nuovo Preventivo'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Titolo *</Label>
                    <Input {...register('titolo')} data-testid="quote-titolo-input" />
                    {errors.titolo && <p className="text-sm text-red-500">{errors.titolo.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <Controller
                      name="client_id"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger data-testid="quote-client-select">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Importo (€)</Label>
                    <Input type="number" step="0.01" {...register('importo')} data-testid="quote-importo-input" />
                    {errors.importo && <p className="text-sm text-red-500">{errors.importo.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Data Validità</Label>
                    <Controller
                      name="data_validita"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start font-normal"
                              data-testid="quote-data-btn"
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
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Servizi inclusi</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-slate-50"
                      >
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
                  <Label>Descrizione</Label>
                  <Textarea {...register('descrizione')} rows={3} data-testid="quote-descrizione-input" />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-quote-btn">
                    {editingQuote ? 'Salva' : 'Crea'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card className="table-wrapper" data-testid="quotes-table">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Numero</TableHead>
                <TableHead>Titolo</TableHead>
                <TableHead className="hidden md:table-cell">Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Importo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="hidden lg:table-cell">Validità</TableHead>
                <TableHead className="w-20">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="spinner mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredQuotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    {searchQuery || statusFilter !== 'all' ? 'Nessun risultato' : 'Nessun preventivo'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotes.map((quote) => (
                  <TableRow key={quote.id} className="table-row-hover">
                    <TableCell className="font-mono text-sm text-slate-500">{quote.numero}</TableCell>
                    <TableCell className="font-medium">{quote.titolo}</TableCell>
                    <TableCell className="hidden md:table-cell text-slate-500">
                      {getClientName(quote.client_id)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-medium currency">
                      {formatCurrency(quote.importo)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(quote.stato)}>
                        {getStatusLabel(quote.stato)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-slate-500">
                      {formatDate(quote.data_validita)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`quote-menu-${quote.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(quote)}>
                            <Pencil className="h-4 w-4 mr-2" /> Modifica
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {quote.stato === 'bozza' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'inviato')}>
                              <Send className="h-4 w-4 mr-2" /> Segna come Inviato
                            </DropdownMenuItem>
                          )}
                          {quote.stato === 'inviato' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'approvato')}>
                                <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" /> Approva
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'rifiutato')}>
                                <XCircle className="h-4 w-4 mr-2 text-red-600" /> Rifiuta
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(quote.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
};
