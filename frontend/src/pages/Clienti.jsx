import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { clientsAPI, contractsAPI } from '../lib/api';
import { formatDate, formatCurrency, getInitials } from '../lib/utils';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  Upload,
  Building2,
  Mail,
  Phone,
  Download,
  Eye,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const clientSchema = z.object({
  nome: z.string().min(2, 'Nome richiesto'),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  telefono: z.string().optional(),
  azienda: z.string().optional(),
  partita_iva: z.string().optional(),
  indirizzo: z.string().optional(),
  note: z.string().optional(),
});

export const Clienti = () => {
  const [clients, setClients] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clientSchema),
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.getAll();
      setClients(response.data);
    } catch (error) {
      toast.error('Errore nel caricamento clienti');
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async (clientId) => {
    try {
      const response = await contractsAPI.getAll(clientId);
      setContracts(response.data);
    } catch (error) {
      toast.error('Errore nel caricamento contratti');
    }
  };

  const onSubmit = async (data) => {
    try {
      if (editingClient) {
        await clientsAPI.update(editingClient.id, data);
        toast.success('Cliente aggiornato');
      } else {
        await clientsAPI.create(data);
        toast.success('Cliente creato');
      }
      fetchClients();
      setDialogOpen(false);
      setEditingClient(null);
      reset();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    reset(client);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo cliente?')) return;
    try {
      await clientsAPI.delete(id);
      toast.success('Cliente eliminato');
      fetchClients();
    } catch (error) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  const handleViewContracts = (client) => {
    setSelectedClient(client);
    fetchContracts(client.id);
    setContractDialogOpen(true);
  };

  const handleFileUpload = async (e, clientId) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = event.target.result.split(',')[1];
        await contractsAPI.create({
          titolo: file.name.replace(/\.[^/.]+$/, ''),
          client_id: clientId,
          file_data: base64,
          file_name: file.name,
          file_type: file.type,
        });
        toast.success('Contratto caricato');
        fetchContracts(clientId);
      } catch (error) {
        toast.error('Errore nel caricamento');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadContract = (contract) => {
    if (!contract.file_data) return;
    const link = document.createElement('a');
    link.href = `data:${contract.file_type};base64,${contract.file_data}`;
    link.download = contract.file_name || 'contratto';
    link.click();
  };

  const handleDeleteContract = async (id) => {
    try {
      await contractsAPI.delete(id);
      toast.success('Contratto eliminato');
      fetchContracts(selectedClient.id);
    } catch (error) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.azienda?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout title="Clienti">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cerca clienti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-clients-input"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingClient(null);
              reset({});
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-client-btn">
                <Plus className="h-4 w-4 mr-2" /> Nuovo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Modifica Cliente' : 'Nuovo Cliente'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input {...register('nome')} data-testid="client-nome-input" />
                    {errors.nome && <p className="text-sm text-red-500">{errors.nome.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Azienda</Label>
                    <Input {...register('azienda')} data-testid="client-azienda-input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" {...register('email')} data-testid="client-email-input" />
                    {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Telefono</Label>
                    <Input {...register('telefono')} data-testid="client-telefono-input" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Partita IVA</Label>
                  <Input {...register('partita_iva')} data-testid="client-piva-input" />
                </div>
                <div className="space-y-2">
                  <Label>Indirizzo</Label>
                  <Input {...register('indirizzo')} data-testid="client-indirizzo-input" />
                </div>
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea {...register('note')} data-testid="client-note-input" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-client-btn">
                    {editingClient ? 'Salva' : 'Crea'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card className="table-wrapper" data-testid="clients-table">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="w-12"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Azienda</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Telefono</TableHead>
                <TableHead className="hidden lg:table-cell">Data</TableHead>
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
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    {searchQuery ? 'Nessun risultato' : 'Nessun cliente'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id} className="table-row-hover">
                    <TableCell>
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-indigo-700">
                          {getInitials(client.nome)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{client.nome}</TableCell>
                    <TableCell className="hidden md:table-cell text-slate-500">
                      {client.azienda || '-'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-slate-500">
                      {client.email || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-slate-500">
                      {client.telefono || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-slate-500">
                      {formatDate(client.created_at)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`client-menu-${client.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewContracts(client)}>
                            <FileText className="h-4 w-4 mr-2" /> Contratti
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(client)}>
                            <Pencil className="h-4 w-4 mr-2" /> Modifica
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(client.id)}
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

        {/* Contracts Dialog */}
        <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Contratti - {selectedClient?.nome}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Upload area */}
              <div className="file-upload-area">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  id="contract-upload"
                  onChange={(e) => handleFileUpload(e, selectedClient?.id)}
                />
                <label htmlFor="contract-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600">Clicca per caricare un contratto</p>
                  <p className="text-xs text-slate-400">PDF, DOC, DOCX</p>
                </label>
              </div>

              {/* Contracts list */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {contracts.length === 0 ? (
                  <p className="text-center text-slate-400 py-4">Nessun contratto</p>
                ) : (
                  contracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-indigo-600" />
                        <div>
                          <p className="text-sm font-medium">{contract.titolo}</p>
                          <p className="text-xs text-slate-400">
                            {contract.file_name} • {formatDate(contract.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {contract.file_data && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadContract(contract)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          onClick={() => handleDeleteContract(contract.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};
