import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { settingsAPI, usersAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
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
  Building2,
  Mail,
  Users,
  Shield,
  Save,
  Plus,
  MoreHorizontal,
  Trash2,
  Euro,
  Loader2,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const agencySchema = z.object({
  agenzia_nome: z.string().optional(),
  agenzia_indirizzo: z.string().optional(),
  agenzia_partita_iva: z.string().optional(),
  costo_orario_default: z.coerce.number().min(0).default(50),
});

const emailSchema = z.object({
  smtp_host: z.string().optional(),
  smtp_port: z.coerce.number().optional(),
  smtp_user: z.string().optional(),
  smtp_password: z.string().optional(),
  from_email: z.string().email().optional().or(z.literal('')),
  from_name: z.string().optional(),
  enabled: z.boolean().default(false),
});

const userSchema = z.object({
  nome: z.string().min(2, 'Nome richiesto'),
  cognome: z.string().min(2, 'Cognome richiesto'),
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'Minimo 6 caratteri'),
  ruolo: z.enum(['admin', 'collaboratore']),
});

export const Impostazioni = () => {
  const { user, isAdmin } = useAuth();
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);

  const agencyForm = useForm({
    resolver: zodResolver(agencySchema),
  });

  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
  });

  const userForm = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      ruolo: 'collaboratore',
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, usersRes] = await Promise.all([
        settingsAPI.get(),
        usersAPI.getAll(),
      ]);
      setSettings(settingsRes.data);
      setUsers(usersRes.data);
      
      // Set form values
      agencyForm.reset({
        agenzia_nome: settingsRes.data.agenzia_nome || '',
        agenzia_indirizzo: settingsRes.data.agenzia_indirizzo || '',
        agenzia_partita_iva: settingsRes.data.agenzia_partita_iva || '',
        costo_orario_default: settingsRes.data.costo_orario_default || 50,
      });
      
      emailForm.reset({
        smtp_host: settingsRes.data.email?.smtp_host || '',
        smtp_port: settingsRes.data.email?.smtp_port || 587,
        smtp_user: settingsRes.data.email?.smtp_user || '',
        smtp_password: settingsRes.data.email?.smtp_password || '',
        from_email: settingsRes.data.email?.from_email || '',
        from_name: settingsRes.data.email?.from_name || '',
        enabled: settingsRes.data.email?.enabled || false,
      });
    } catch (error) {
      toast.error('Errore nel caricamento impostazioni');
    } finally {
      setLoading(false);
    }
  };

  const onSaveAgency = async (data) => {
    setSaving(true);
    try {
      await settingsAPI.update({
        ...settings,
        ...data,
      });
      toast.success('Impostazioni salvate');
      fetchData();
    } catch (error) {
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const onSaveEmail = async (data) => {
    setSaving(true);
    try {
      await settingsAPI.update({
        ...settings,
        email: data,
      });
      toast.success('Configurazione email salvata');
      fetchData();
    } catch (error) {
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const onCreateUser = async (data) => {
    try {
      // Use auth register endpoint
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Errore');
      }
      
      toast.success('Utente creato');
      fetchData();
      setUserDialogOpen(false);
      userForm.reset({ ruolo: 'collaboratore' });
    } catch (error) {
      toast.error(error.message || 'Errore nella creazione');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo utente?')) return;
    try {
      await usersAPI.delete(userId);
      toast.success('Utente eliminato');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  if (loading) {
    return (
      <Layout title="Impostazioni">
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Impostazioni">
      <div className="max-w-4xl mx-auto">
        <Tabs defaultValue="agency" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="agency" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Agenzia
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email
            </TabsTrigger>
            {isAdmin() && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Utenti
              </TabsTrigger>
            )}
          </TabsList>

          {/* Agency Settings */}
          <TabsContent value="agency">
            <Card data-testid="agency-settings">
              <CardHeader>
                <CardTitle>Dati Agenzia</CardTitle>
                <CardDescription>Configura i dati della tua agenzia</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={agencyForm.handleSubmit(onSaveAgency)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Agenzia</Label>
                      <Input {...agencyForm.register('agenzia_nome')} placeholder="La Mia Agenzia" data-testid="agency-nome-input" />
                    </div>
                    <div className="space-y-2">
                      <Label>Partita IVA</Label>
                      <Input {...agencyForm.register('agenzia_partita_iva')} placeholder="IT01234567890" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Indirizzo</Label>
                    <Input {...agencyForm.register('agenzia_indirizzo')} placeholder="Via Roma 1, 00100 Roma" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Euro className="h-4 w-4" /> Costo Orario Default
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...agencyForm.register('costo_orario_default')}
                      className="max-w-xs"
                      data-testid="agency-costo-input"
                    />
                    <p className="text-xs text-slate-500">
                      Questo valore verrà usato come default per le nuove registrazioni ore
                    </p>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={saving} data-testid="save-agency-btn">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Salva
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email">
            <Card data-testid="email-settings">
              <CardHeader>
                <CardTitle>Configurazione Email</CardTitle>
                <CardDescription>
                  Configura il server SMTP per ricevere notifiche via email
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={emailForm.handleSubmit(onSaveEmail)} className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium">Abilita notifiche email</p>
                      <p className="text-sm text-slate-500">Ricevi alert per scadenze e rinnovi</p>
                    </div>
                    <Controller
                      name="enabled"
                      control={emailForm.control}
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Server SMTP</Label>
                      <Input {...emailForm.register('smtp_host')} placeholder="smtp.example.com" data-testid="email-host-input" />
                    </div>
                    <div className="space-y-2">
                      <Label>Porta</Label>
                      <Input type="number" {...emailForm.register('smtp_port')} placeholder="587" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input {...emailForm.register('smtp_user')} placeholder="user@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" {...emailForm.register('smtp_password')} placeholder="••••••••" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email Mittente</Label>
                      <Input {...emailForm.register('from_email')} placeholder="noreply@agenzia.it" />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome Mittente</Label>
                      <Input {...emailForm.register('from_name')} placeholder="AgencyOS" />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={saving} data-testid="save-email-btn">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Salva
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Management */}
          {isAdmin() && (
            <TabsContent value="users">
              <Card data-testid="users-settings">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Gestione Utenti</CardTitle>
                    <CardDescription>Aggiungi e gestisci gli utenti del team</CardDescription>
                  </div>
                  <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-user-btn">
                        <Plus className="h-4 w-4 mr-2" /> Nuovo Utente
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nuovo Utente</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={userForm.handleSubmit(onCreateUser)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nome *</Label>
                            <Input {...userForm.register('nome')} data-testid="user-nome-input" />
                            {userForm.formState.errors.nome && (
                              <p className="text-sm text-red-500">{userForm.formState.errors.nome.message}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Cognome *</Label>
                            <Input {...userForm.register('cognome')} />
                            {userForm.formState.errors.cognome && (
                              <p className="text-sm text-red-500">{userForm.formState.errors.cognome.message}</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Email *</Label>
                          <Input type="email" {...userForm.register('email')} data-testid="user-email-input" />
                          {userForm.formState.errors.email && (
                            <p className="text-sm text-red-500">{userForm.formState.errors.email.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Password *</Label>
                          <Input type="password" {...userForm.register('password')} data-testid="user-password-input" />
                          {userForm.formState.errors.password && (
                            <p className="text-sm text-red-500">{userForm.formState.errors.password.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Ruolo *</Label>
                          <Controller
                            name="ruolo"
                            control={userForm.control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Amministratore</SelectItem>
                                  <SelectItem value="collaboratore">Collaboratore</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                            Annulla
                          </Button>
                          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-user-btn">
                            Crea
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Ruolo</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.nome} {u.cognome}
                            {u.id === user?.id && (
                              <Badge variant="outline" className="ml-2 text-xs">Tu</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-500">{u.email}</TableCell>
                          <TableCell>
                            <Badge className={u.ruolo === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}>
                              {u.ruolo === 'admin' ? 'Admin' : 'Collaboratore'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                              {u.is_active ? 'Attivo' : 'Disabilitato'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {u.id !== user?.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDeleteUser(u.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Elimina
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
};
