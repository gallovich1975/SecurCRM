import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { servicesAPI } from '../lib/api';
import { formatCurrency, getServiceTypeLabel } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Globe,
  ShoppingCart,
  Search,
  Megaphone,
  Palette,
  Package,
  Euro,
  Clock,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const serviceSchema = z.object({
  nome: z.string().min(2, 'Nome richiesto'),
  tipo: z.enum(['sito_ecommerce', 'sito_aziendale', 'seo', 'ads', 'grafica', 'altro']),
  descrizione: z.string().optional(),
  prezzo_base: z.coerce.number().min(0).default(0),
  costo_orario: z.coerce.number().min(0).default(0),
  is_active: z.boolean().default(true),
});

const serviceIcons = {
  sito_ecommerce: ShoppingCart,
  sito_aziendale: Globe,
  seo: Search,
  ads: Megaphone,
  grafica: Palette,
  altro: Package,
};

const serviceColors = {
  sito_ecommerce: 'bg-purple-100 text-purple-700',
  sito_aziendale: 'bg-blue-100 text-blue-700',
  seo: 'bg-emerald-100 text-emerald-700',
  ads: 'bg-amber-100 text-amber-700',
  grafica: 'bg-pink-100 text-pink-700',
  altro: 'bg-slate-100 text-slate-700',
};

export const Servizi = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      is_active: true,
      prezzo_base: 0,
      costo_orario: 0,
    },
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await servicesAPI.getAll();
      setServices(response.data);
    } catch (error) {
      toast.error('Errore nel caricamento servizi');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      if (editingService) {
        await servicesAPI.update(editingService.id, data);
        toast.success('Servizio aggiornato');
      } else {
        await servicesAPI.create(data);
        toast.success('Servizio creato');
      }
      fetchServices();
      setDialogOpen(false);
      setEditingService(null);
      reset({ is_active: true, prezzo_base: 0, costo_orario: 0 });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    reset(service);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo servizio?')) return;
    try {
      await servicesAPI.delete(id);
      toast.success('Servizio eliminato');
      fetchServices();
    } catch (error) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  return (
    <Layout title="Servizi">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <p className="text-slate-500">Gestisci i servizi offerti dalla tua agenzia</p>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingService(null);
              reset({ is_active: true, prezzo_base: 0, costo_orario: 0 });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-service-btn">
                <Plus className="h-4 w-4 mr-2" /> Nuovo Servizio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingService ? 'Modifica Servizio' : 'Nuovo Servizio'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input {...register('nome')} data-testid="service-nome-input" />
                  {errors.nome && <p className="text-sm text-red-500">{errors.nome.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Controller
                    name="tipo"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger data-testid="service-tipo-select">
                          <SelectValue placeholder="Seleziona tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sito_ecommerce">Sito E-commerce</SelectItem>
                          <SelectItem value="sito_aziendale">Sito Aziendale</SelectItem>
                          <SelectItem value="seo">SEO</SelectItem>
                          <SelectItem value="ads">ADS</SelectItem>
                          <SelectItem value="grafica">Grafica</SelectItem>
                          <SelectItem value="altro">Altro</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.tipo && <p className="text-sm text-red-500">{errors.tipo.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prezzo Base (€)</Label>
                    <Input type="number" step="0.01" {...register('prezzo_base')} data-testid="service-prezzo-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Costo Orario (€)</Label>
                    <Input type="number" step="0.01" {...register('costo_orario')} data-testid="service-costo-input" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrizione</Label>
                  <Textarea {...register('descrizione')} rows={3} />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Servizio attivo</Label>
                  <Controller
                    name="is_active"
                    control={control}
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-service-btn">
                    {editingService ? 'Salva' : 'Crea'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="services-grid">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-10 w-10 bg-slate-200 rounded-lg" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </Card>
            ))
          ) : services.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun servizio configurato</p>
              <p className="text-sm">Crea il tuo primo servizio per iniziare</p>
            </div>
          ) : (
            services.map((service) => {
              const Icon = serviceIcons[service.tipo] || Package;
              return (
                <Card
                  key={service.id}
                  className={`p-5 card-hover ${!service.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${serviceColors[service.tipo] || 'bg-slate-100'}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`service-menu-${service.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(service)}>
                          <Pencil className="h-4 w-4 mr-2" /> Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(service.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{service.nome}</h3>
                      {!service.is_active && (
                        <Badge variant="outline" className="text-xs">Inattivo</Badge>
                      )}
                    </div>
                    <Badge className={serviceColors[service.tipo]}>
                      {getServiceTypeLabel(service.tipo)}
                    </Badge>

                    {service.descrizione && (
                      <p className="text-sm text-slate-500 line-clamp-2">{service.descrizione}</p>
                    )}

                    <div className="flex items-center gap-4 pt-2 text-sm">
                      {service.prezzo_base > 0 && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Euro className="h-4 w-4" />
                          <span className="font-medium currency">{formatCurrency(service.prezzo_base)}</span>
                        </span>
                      )}
                      {service.costo_orario > 0 && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{formatCurrency(service.costo_orario)}/h</span>
                        </span>
                      )}
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
