# AgencyOS - PRD (Product Requirements Document)

## Problema Originale
Gestionale per agenzia web con funzionalità di:
- Memorizzazione contratti firmati (PDF/Word)
- Gestione preventivi
- Scadenziario fatture (acconti, saldi, ricorrenti)
- Alert scadenze e rinnovi
- Dashboard interattiva con KPI
- Gestione servizi (e-commerce, siti aziendali, SEO, ADS, grafica)
- Gestione progetti con team
- Analisi redditività con costi orari

## Scelte Utente
- Autenticazione: JWT (email/password)
- Notifiche: In-app + Email (configurabile)
- Multi-utente con ruoli: Admin e Collaboratore
- Lingua: Italiano
- Design: Light mode

## Architettura

### Backend (FastAPI + MongoDB)
- **Auth**: JWT con bcrypt per password hashing
- **Collections**: users, clients, contracts, quotes, invoices, deadlines, services, projects, time_entries, notifications, settings
- **API**: RESTful con prefisso /api

### Frontend (React + Shadcn UI)
- **Routing**: React Router DOM
- **State**: Context API per auth
- **UI**: Shadcn components, Tailwind CSS
- **Charts**: Recharts

## Funzionalità Implementate (12/01/2026)

### Autenticazione
- [x] Registrazione utenti (primo utente = admin)
- [x] Login con JWT
- [x] Ruoli: admin, collaboratore
- [x] Protected routes

### Dashboard
- [x] KPI cards (clienti, progetti, preventivi, scadenze)
- [x] Financial summary (fatturato, incassato, da incassare, margine)
- [x] Grafico fatturato mensile
- [x] Grafico distribuzione servizi
- [x] Lavori in corso
- [x] Scadenze imminenti

### Gestione Clienti
- [x] CRUD clienti
- [x] Upload contratti (PDF/Word in base64)
- [x] Download contratti
- [x] Ricerca e filtri

### Preventivi
- [x] CRUD preventivi
- [x] Stati: bozza, inviato, approvato, rifiutato
- [x] Collegamento a cliente e servizi
- [x] Numerazione automatica (PRV-YYYY-XXXX)

### Fatturazione
- [x] CRUD fatture
- [x] Tipi: acconto, saldo, ricorrente
- [x] Ricorrenze: mensile, trimestrale, semestrale, annuale
- [x] Stati: da_emettere, emessa, pagata, scaduta
- [x] Creazione automatica scadenza
- [x] Stats riassuntive

### Scadenziario
- [x] CRUD scadenze
- [x] Collegamento a clienti, progetti, fatture
- [x] Ricorrenze configurabili
- [x] Filtri: scadute, imminenti, completate
- [x] Completamento scadenze

### Progetti
- [x] CRUD progetti
- [x] Stati: pianificato, in_corso, in_pausa, completato, annullato
- [x] Team members
- [x] Budget e tracking costi
- [x] Registrazione ore lavorate
- [x] Calcolo margine automatico

### Servizi
- [x] CRUD servizi
- [x] Tipi: e-commerce, sito aziendale, SEO, ADS, grafica, altro
- [x] Prezzo base e costo orario
- [x] Stato attivo/inattivo

### Report
- [x] KPI riassuntive
- [x] Redditività per servizio
- [x] Top clienti per fatturato
- [x] Tabella redditività progetti

### Impostazioni
- [x] Dati agenzia (nome, P.IVA, indirizzo)
- [x] Costo orario default
- [x] Configurazione SMTP email
- [x] Gestione utenti (solo admin)

### Responsive Design
- [x] Layout desktop con sidebar fissa
- [x] Layout mobile con menu hamburger
- [x] Cards e tabelle responsive

## Backlog (P0/P1/P2)

### P0 - Critiche
- [ ] Invio effettivo email per alert scadenze (richiede configurazione SMTP)

### P1 - Importanti
- [ ] Export PDF preventivi e fatture
- [ ] Duplicazione preventivi/fatture
- [ ] Dashboard personalizzabile (drag & drop KPI)
- [ ] Notifiche push browser

### P2 - Nice to have
- [ ] Dark mode toggle
- [ ] Multi-lingua
- [ ] Integrazione calendario (Google Calendar)
- [ ] Import/export dati CSV
- [ ] Backup automatico
- [ ] Grafici avanzati (trend, comparazioni)

## Prossimi Passi
1. Configurare servizio email (SendGrid/SMTP) per alert
2. Implementare export PDF per documenti
3. Aggiungere duplicazione preventivi per velocizzare workflow
