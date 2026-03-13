import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { invoicesAPI, clientsAPI, projectsAPI } from '../lib/api';
import { formatDate, formatCurrency, getStatusColor, getStatusLabel, getInvoiceTypeLabel, getRecurrenceLabel, isOverdue } from '../lib/utils';
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
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  CalendarIcon,
  Receipt,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const invoiceSchema = z.object({
  titolo: z.string().min(2, 'Titolo richiesto'),
  client_id: z.string().min(1, 'Cliente richiesto'),
  project_id: z.string().optional(),
  importo: z.coerce.number().min(0, 'Importo non valido'),
  tipo: z.enum(['acconto', 'saldo', 'ricorrente']),
  data_scadenza: z.date({ required_error: 'Data scadenza richiesta' }),
  ricorrenza: z.enum(['mensile', 'trimestrale', 'semestrale', 'annuale']).optional().nullable(),
  note: z.string().optional(),
});

export const Fatturazione = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      tipo: 'saldo',
      importo: 0,
    },
  });

  const selectedType = watch('tipo');
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
      const [invoicesRes, clientsRes] = await Promise.all([
        invoicesAPI.getAll(),
        clientsAPI.getAll(),
      ]);
      setInvoices(invoicesRes.data);
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
        ricorrenza: data.tipo === 'ricorrente' ? data.ricorrenza : null,
      };
      await invoicesAPI.create(payload);
      toast.success('Fattura creata');
      fetchData();
      setDialogOpen(false);
      reset({ tipo: 'saldo', importo: 0 });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa fattura?')) return;
    try {
      await invoicesAPI.delete(id);
      toast.success('Fattura eliminata');
      fetchData();
    } catch (error) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await invoicesAPI.updateStatus(id, status);
      toast.success('Stato aggiornato');
      fetchData();
    } catch (error) {
      toast.error('Errore nell\'aggiornamento');
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.nome || 'N/A';
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.titolo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getClientName(invoice.client_id).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.stato === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.importo || 0), 0);
  const paidAmount = invoices.filter(inv => inv.stato === 'pagata').reduce((sum, inv) => sum + (inv.importo || 0), 0);
  const pendingAmount = invoices.filter(inv => inv.stato !== 'pagata').reduce((sum, inv) => sum + (inv.importo || 0), 0);
  const overdueCount = invoices.filter(inv => inv.stato !== 'pagata' && isOverdue(inv.data_scadenza)).length;

  return (
    <Layout title="Fatturazione">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="invoice-stats">
          <Card className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Totale Fatturato</p>
            <p className="text-xl font-bold currency mt-1">{formatCurrency(totalAmount)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Incassato</p>
            <p className="text-xl font-bold text-emerald-600 currency mt-1">{formatCurrency(paidAmount)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Da Incassare</p>
            <p className="text-xl font-bold text-amber-600 currency mt-1">{formatCurrency(pendingAmount)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Scadute</p>
            <p className={`text-xl font-bold mt-1 ${overdueCount > 0 ? 'text-red-600' : 'text-slate-600'}`}>
              {overdueCount}
            </p>
          </Card>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cerca fatture..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-invoices-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="filter-invoice-status">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="da_emettere">Da emettere</SelectItem>
                <SelectItem value="emessa">Emessa</SelectItem>
                <SelectItem value="pagata">Pagata</SelectItem>
                <SelectItem value="scaduta">Scaduta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) reset({ tipo: 'saldo', importo: 0 });
          }}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-invoice-btn">
                <Plus className="h-4 w-4 mr-2" /> Nuova Fattura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuova Fattura</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Titolo *</Label>
                  <Input {...register('titolo')} data-testid="invoice-titolo-input" />
                  {errors.titolo && <p className="text-sm text-red-500">{errors.titolo.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <Controller
                      name="client_id"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger data-testid="invoice-client-select">
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
                  <div className="space-y-2">
                    <Label>Progetto</Label>
                    <Controller
                      name="project_id"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || 'none'}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona progetto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nessuno</SelectItem>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Importo (€) *</Label>
                    <Input type="number" step="0.01" {...register('importo')} data-testid="invoice-importo-input" />
                    {errors.importo && <p className="text-sm text-red-500">{errors.importo.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Controller
                      name="tipo"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger data-testid="invoice-tipo-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="acconto">Acconto</SelectItem>
                            <SelectItem value="saldo">Saldo</SelectItem>
                            <SelectItem value="ricorrente">Ricorrente</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
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
                              data-testid="invoice-data-btn"
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
                  {selectedType === 'ricorrente' && (
                    <div className="space-y-2">
                      <Label>Ricorrenza</Label>
                      <Controller
                        name="ricorrenza"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mensile">Mensile</SelectItem>
                              <SelectItem value="trimestrale">Trimestrale</SelectItem>
                              <SelectItem value="semestrale">Semestrale</SelectItem>
                              <SelectItem value="annuale">Annuale</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea {...register('note')} rows={2} />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-invoice-btn">
                    Crea
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card className="table-wrapper" data-testid="invoices-table">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Numero</TableHead>
                <TableHead>Titolo</TableHead>
                <TableHead className="hidden md:table-cell">Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Importo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="hidden lg:table-cell">Scadenza</TableHead>
                <TableHead className="w-20">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="spinner mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                    {searchQuery || statusFilter !== 'all' ? 'Nessun risultato' : 'Nessuna fattura'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="table-row-hover">
                    <TableCell className="font-mono text-sm text-slate-500">{invoice.numero}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {invoice.stato !== 'pagata' && isOverdue(invoice.data_scadenza) && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        {invoice.titolo}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-slate-500">
                      {getClientName(invoice.client_id)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-medium currency">
                      {formatCurrency(invoice.importo)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getInvoiceTypeLabel(invoice.tipo)}</Badge>
                      {invoice.ricorrenza && (
                        <span className="text-xs text-slate-400 ml-1">
                          ({getRecurrenceLabel(invoice.ricorrenza)})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.stato)}>
                        {getStatusLabel(invoice.stato)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-slate-500">
                      {formatDate(invoice.data_scadenza)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`invoice-menu-${invoice.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {invoice.stato === 'da_emettere' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'emessa')}>
                              <Send className="h-4 w-4 mr-2" /> Segna come Emessa
                            </DropdownMenuItem>
                          )}
                          {(invoice.stato === 'emessa' || invoice.stato === 'scaduta') && (
                            <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'pagata')}>
                              <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" /> Segna come Pagata
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(invoice.id)}
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
