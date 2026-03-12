from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'agencyos-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="AgencyOS API", version="1.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== ENUMS =====================
class UserRole(str, Enum):
    ADMIN = "admin"
    COLLABORATORE = "collaboratore"

class QuoteStatus(str, Enum):
    BOZZA = "bozza"
    INVIATO = "inviato"
    APPROVATO = "approvato"
    RIFIUTATO = "rifiutato"

class InvoiceStatus(str, Enum):
    DA_EMETTERE = "da_emettere"
    EMESSA = "emessa"
    PAGATA = "pagata"
    SCADUTA = "scaduta"

class InvoiceType(str, Enum):
    ACCONTO = "acconto"
    SALDO = "saldo"
    RICORRENTE = "ricorrente"

class RecurrenceType(str, Enum):
    MENSILE = "mensile"
    TRIMESTRALE = "trimestrale"
    SEMESTRALE = "semestrale"
    ANNUALE = "annuale"

class ProjectStatus(str, Enum):
    PIANIFICATO = "pianificato"
    IN_CORSO = "in_corso"
    IN_PAUSA = "in_pausa"
    COMPLETATO = "completato"
    ANNULLATO = "annullato"

class ServiceType(str, Enum):
    SITO_ECOMMERCE = "sito_ecommerce"
    SITO_AZIENDALE = "sito_aziendale"
    SEO = "seo"
    ADS = "ads"
    GRAFICA = "grafica"
    ALTRO = "altro"

class NotificationType(str, Enum):
    SCADENZA_FATTURA = "scadenza_fattura"
    SCADENZA_RINNOVO = "scadenza_rinnovo"
    SCADENZA_PROGETTO = "scadenza_progetto"
    GENERALE = "generale"

# ===================== MODELS =====================
class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    nome: str
    cognome: str
    ruolo: UserRole = UserRole.COLLABORATORE

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserResponse(BaseModel):
    id: str
    email: str
    nome: str
    cognome: str
    ruolo: UserRole
    is_active: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ClientBase(BaseModel):
    nome: str
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    azienda: Optional[str] = None
    partita_iva: Optional[str] = None
    indirizzo: Optional[str] = None
    note: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class ContractBase(BaseModel):
    titolo: str
    client_id: str
    descrizione: Optional[str] = None
    data_firma: Optional[datetime] = None
    valore: Optional[float] = 0

class ContractCreate(ContractBase):
    file_data: Optional[str] = None  # Base64 encoded
    file_name: Optional[str] = None
    file_type: Optional[str] = None

class Contract(ContractBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    file_data: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class QuoteBase(BaseModel):
    titolo: str
    client_id: str
    descrizione: Optional[str] = None
    importo: float = 0
    data_validita: Optional[datetime] = None
    servizi: List[str] = []

class QuoteCreate(QuoteBase):
    pass

class Quote(QuoteBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: str = ""
    stato: QuoteStatus = QuoteStatus.BOZZA
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class InvoiceBase(BaseModel):
    titolo: str
    client_id: str
    project_id: Optional[str] = None
    quote_id: Optional[str] = None
    importo: float = 0
    tipo: InvoiceType = InvoiceType.SALDO
    data_scadenza: datetime
    ricorrenza: Optional[RecurrenceType] = None
    note: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    pass

class Invoice(InvoiceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: str = ""
    stato: InvoiceStatus = InvoiceStatus.DA_EMETTERE
    data_emissione: Optional[datetime] = None
    data_pagamento: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class DeadlineBase(BaseModel):
    titolo: str
    descrizione: Optional[str] = None
    data_scadenza: datetime
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    invoice_id: Optional[str] = None
    ricorrenza: Optional[RecurrenceType] = None
    promemoria_giorni: int = 7

class DeadlineCreate(DeadlineBase):
    pass

class Deadline(DeadlineBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    completata: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class ServiceBase(BaseModel):
    nome: str
    tipo: ServiceType
    descrizione: Optional[str] = None
    prezzo_base: Optional[float] = 0
    costo_orario: Optional[float] = 0
    is_active: bool = True

class ServiceCreate(ServiceBase):
    pass

class Service(ServiceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectBase(BaseModel):
    nome: str
    client_id: str
    servizi: List[str] = []
    descrizione: Optional[str] = None
    budget: Optional[float] = 0
    data_inizio: Optional[datetime] = None
    data_fine_prevista: Optional[datetime] = None
    team_members: List[str] = []

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stato: ProjectStatus = ProjectStatus.PIANIFICATO
    data_fine_effettiva: Optional[datetime] = None
    costo_totale: float = 0
    ore_totali: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class TimeEntryBase(BaseModel):
    project_id: str
    user_id: str
    ore: float
    descrizione: Optional[str] = None
    data: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    costo_orario: Optional[float] = None

class TimeEntryCreate(TimeEntryBase):
    pass

class TimeEntry(TimeEntryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationBase(BaseModel):
    titolo: str
    messaggio: str
    tipo: NotificationType = NotificationType.GENERALE
    user_id: Optional[str] = None
    link: Optional[str] = None

class Notification(NotificationBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    letta: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmailSettings(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    enabled: bool = False

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "global_settings"
    email: EmailSettings = EmailSettings()
    agenzia_nome: Optional[str] = None
    agenzia_indirizzo: Optional[str] = None
    agenzia_partita_iva: Optional[str] = None
    costo_orario_default: float = 50.0

# ===================== AUTH HELPERS =====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, ruolo: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "ruolo": ruolo,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("ruolo") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Accesso riservato agli amministratori")
    return current_user

# ===================== AUTH ROUTES =====================
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    # First user is admin
    user_count = await db.users.count_documents({})
    ruolo = UserRole.ADMIN if user_count == 0 else user_data.ruolo
    
    user = User(
        email=user_data.email,
        nome=user_data.nome,
        cognome=user_data.cognome,
        ruolo=ruolo
    )
    
    doc = user.model_dump()
    doc['password_hash'] = hash_password(user_data.password)
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    token = create_token(user.id, user.email, user.ruolo)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            nome=user.nome,
            cognome=user.cognome,
            ruolo=user.ruolo,
            is_active=user.is_active
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    if not user.get('is_active', True):
        raise HTTPException(status_code=401, detail="Account disabilitato")
    
    token = create_token(user['id'], user['email'], user['ruolo'])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user['id'],
            email=user['email'],
            nome=user['nome'],
            cognome=user['cognome'],
            ruolo=user['ruolo'],
            is_active=user.get('is_active', True)
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user['id'],
        email=current_user['email'],
        nome=current_user['nome'],
        cognome=current_user['cognome'],
        ruolo=current_user['ruolo'],
        is_active=current_user.get('is_active', True)
    )

# ===================== USERS ROUTES =====================
@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: UserBase, admin: dict = Depends(get_admin_user)):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": user_data.model_dump()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return {"message": "Utente aggiornato"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    if user_id == admin['id']:
        raise HTTPException(status_code=400, detail="Non puoi eliminare te stesso")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return {"message": "Utente eliminato"}

# ===================== CLIENTS ROUTES =====================
@api_router.get("/clients", response_model=List[Client])
async def get_clients(current_user: dict = Depends(get_current_user)):
    clients = await db.clients.find({}, {"_id": 0}).to_list(1000)
    return clients

@api_router.post("/clients", response_model=Client)
async def create_client(client_data: ClientCreate, current_user: dict = Depends(get_current_user)):
    client = Client(**client_data.model_dump(), created_by=current_user['id'])
    doc = client.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.clients.insert_one(doc)
    return client

@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return client

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, client_data: ClientCreate, current_user: dict = Depends(get_current_user)):
    result = await db.clients.update_one({"id": client_id}, {"$set": client_data.model_dump()})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return {"message": "Cliente aggiornato"}

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return {"message": "Cliente eliminato"}

# ===================== CONTRACTS ROUTES =====================
@api_router.get("/contracts", response_model=List[Contract])
async def get_contracts(client_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"client_id": client_id} if client_id else {}
    contracts = await db.contracts.find(query, {"_id": 0}).to_list(1000)
    return contracts

@api_router.post("/contracts", response_model=Contract)
async def create_contract(contract_data: ContractCreate, current_user: dict = Depends(get_current_user)):
    contract = Contract(**contract_data.model_dump(), created_by=current_user['id'])
    doc = contract.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('data_firma'):
        doc['data_firma'] = doc['data_firma'].isoformat() if isinstance(doc['data_firma'], datetime) else doc['data_firma']
    await db.contracts.insert_one(doc)
    return contract

@api_router.get("/contracts/{contract_id}")
async def get_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contratto non trovato")
    return contract

@api_router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.contracts.delete_one({"id": contract_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contratto non trovato")
    return {"message": "Contratto eliminato"}

# ===================== QUOTES ROUTES =====================
@api_router.get("/quotes", response_model=List[Quote])
async def get_quotes(client_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"client_id": client_id} if client_id else {}
    quotes = await db.quotes.find(query, {"_id": 0}).to_list(1000)
    return quotes

@api_router.post("/quotes", response_model=Quote)
async def create_quote(quote_data: QuoteCreate, current_user: dict = Depends(get_current_user)):
    # Generate quote number
    count = await db.quotes.count_documents({})
    numero = f"PRV-{datetime.now().year}-{count + 1:04d}"
    
    quote = Quote(**quote_data.model_dump(), created_by=current_user['id'], numero=numero)
    doc = quote.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('data_validita'):
        doc['data_validita'] = doc['data_validita'].isoformat() if isinstance(doc['data_validita'], datetime) else doc['data_validita']
    await db.quotes.insert_one(doc)
    return quote

@api_router.put("/quotes/{quote_id}")
async def update_quote(quote_id: str, quote_data: QuoteCreate, current_user: dict = Depends(get_current_user)):
    update_data = quote_data.model_dump()
    if update_data.get('data_validita'):
        update_data['data_validita'] = update_data['data_validita'].isoformat() if isinstance(update_data['data_validita'], datetime) else update_data['data_validita']
    result = await db.quotes.update_one({"id": quote_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Preventivo non trovato")
    return {"message": "Preventivo aggiornato"}

@api_router.put("/quotes/{quote_id}/status")
async def update_quote_status(quote_id: str, stato: QuoteStatus, current_user: dict = Depends(get_current_user)):
    result = await db.quotes.update_one({"id": quote_id}, {"$set": {"stato": stato}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Preventivo non trovato")
    return {"message": "Stato aggiornato"}

@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.quotes.delete_one({"id": quote_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Preventivo non trovato")
    return {"message": "Preventivo eliminato"}

# ===================== INVOICES ROUTES =====================
@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(client_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"client_id": client_id} if client_id else {}
    invoices = await db.invoices.find(query, {"_id": 0}).to_list(1000)
    return invoices

@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    count = await db.invoices.count_documents({})
    numero = f"FAT-{datetime.now().year}-{count + 1:04d}"
    
    invoice = Invoice(**invoice_data.model_dump(), created_by=current_user['id'], numero=numero)
    doc = invoice.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['data_scadenza'] = doc['data_scadenza'].isoformat() if isinstance(doc['data_scadenza'], datetime) else doc['data_scadenza']
    await db.invoices.insert_one(doc)
    
    # Create deadline for this invoice
    deadline = Deadline(
        titolo=f"Scadenza fattura {numero}",
        data_scadenza=invoice_data.data_scadenza,
        client_id=invoice_data.client_id,
        invoice_id=invoice.id,
        ricorrenza=invoice_data.ricorrenza,
        created_by=current_user['id']
    )
    deadline_doc = deadline.model_dump()
    deadline_doc['created_at'] = deadline_doc['created_at'].isoformat()
    deadline_doc['data_scadenza'] = deadline_doc['data_scadenza'].isoformat() if isinstance(deadline_doc['data_scadenza'], datetime) else deadline_doc['data_scadenza']
    await db.deadlines.insert_one(deadline_doc)
    
    return invoice

@api_router.put("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, stato: InvoiceStatus, current_user: dict = Depends(get_current_user)):
    update_data = {"stato": stato}
    if stato == InvoiceStatus.EMESSA:
        update_data["data_emissione"] = datetime.now(timezone.utc).isoformat()
    elif stato == InvoiceStatus.PAGATA:
        update_data["data_pagamento"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    return {"message": "Stato aggiornato"}

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.invoices.delete_one({"id": invoice_id})
    await db.deadlines.delete_many({"invoice_id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    return {"message": "Fattura eliminata"}

# ===================== DEADLINES ROUTES =====================
@api_router.get("/deadlines", response_model=List[Deadline])
async def get_deadlines(current_user: dict = Depends(get_current_user)):
    deadlines = await db.deadlines.find({}, {"_id": 0}).to_list(1000)
    return deadlines

@api_router.post("/deadlines", response_model=Deadline)
async def create_deadline(deadline_data: DeadlineCreate, current_user: dict = Depends(get_current_user)):
    deadline = Deadline(**deadline_data.model_dump(), created_by=current_user['id'])
    doc = deadline.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['data_scadenza'] = doc['data_scadenza'].isoformat() if isinstance(doc['data_scadenza'], datetime) else doc['data_scadenza']
    await db.deadlines.insert_one(doc)
    return deadline

@api_router.put("/deadlines/{deadline_id}/complete")
async def complete_deadline(deadline_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.deadlines.update_one({"id": deadline_id}, {"$set": {"completata": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Scadenza non trovata")
    return {"message": "Scadenza completata"}

@api_router.delete("/deadlines/{deadline_id}")
async def delete_deadline(deadline_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.deadlines.delete_one({"id": deadline_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scadenza non trovata")
    return {"message": "Scadenza eliminata"}

# ===================== SERVICES ROUTES =====================
@api_router.get("/services", response_model=List[Service])
async def get_services(current_user: dict = Depends(get_current_user)):
    services = await db.services.find({}, {"_id": 0}).to_list(1000)
    return services

@api_router.post("/services", response_model=Service)
async def create_service(service_data: ServiceCreate, current_user: dict = Depends(get_current_user)):
    service = Service(**service_data.model_dump())
    doc = service.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.services.insert_one(doc)
    return service

@api_router.put("/services/{service_id}")
async def update_service(service_id: str, service_data: ServiceCreate, current_user: dict = Depends(get_current_user)):
    result = await db.services.update_one({"id": service_id}, {"$set": service_data.model_dump()})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    return {"message": "Servizio aggiornato"}

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    return {"message": "Servizio eliminato"}

# ===================== PROJECTS ROUTES =====================
@api_router.get("/projects", response_model=List[Project])
async def get_projects(client_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"client_id": client_id} if client_id else {}
    projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    return projects

@api_router.post("/projects", response_model=Project)
async def create_project(project_data: ProjectCreate, current_user: dict = Depends(get_current_user)):
    project = Project(**project_data.model_dump(), created_by=current_user['id'])
    doc = project.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('data_inizio'):
        doc['data_inizio'] = doc['data_inizio'].isoformat() if isinstance(doc['data_inizio'], datetime) else doc['data_inizio']
    if doc.get('data_fine_prevista'):
        doc['data_fine_prevista'] = doc['data_fine_prevista'].isoformat() if isinstance(doc['data_fine_prevista'], datetime) else doc['data_fine_prevista']
    await db.projects.insert_one(doc)
    return project

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
    return project

@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, project_data: ProjectCreate, current_user: dict = Depends(get_current_user)):
    update_data = project_data.model_dump()
    if update_data.get('data_inizio'):
        update_data['data_inizio'] = update_data['data_inizio'].isoformat() if isinstance(update_data['data_inizio'], datetime) else update_data['data_inizio']
    if update_data.get('data_fine_prevista'):
        update_data['data_fine_prevista'] = update_data['data_fine_prevista'].isoformat() if isinstance(update_data['data_fine_prevista'], datetime) else update_data['data_fine_prevista']
    result = await db.projects.update_one({"id": project_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
    return {"message": "Progetto aggiornato"}

@api_router.put("/projects/{project_id}/status")
async def update_project_status(project_id: str, stato: ProjectStatus, current_user: dict = Depends(get_current_user)):
    update_data = {"stato": stato}
    if stato == ProjectStatus.COMPLETATO:
        update_data["data_fine_effettiva"] = datetime.now(timezone.utc).isoformat()
    result = await db.projects.update_one({"id": project_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
    return {"message": "Stato aggiornato"}

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.projects.delete_one({"id": project_id})
    await db.time_entries.delete_many({"project_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
    return {"message": "Progetto eliminato"}

# ===================== TIME ENTRIES ROUTES =====================
@api_router.get("/time-entries", response_model=List[TimeEntry])
async def get_time_entries(project_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"project_id": project_id} if project_id else {}
    entries = await db.time_entries.find(query, {"_id": 0}).to_list(1000)
    return entries

@api_router.post("/time-entries", response_model=TimeEntry)
async def create_time_entry(entry_data: TimeEntryCreate, current_user: dict = Depends(get_current_user)):
    # Get default cost if not provided
    if not entry_data.costo_orario:
        settings = await db.settings.find_one({"id": "global_settings"}, {"_id": 0})
        entry_data.costo_orario = settings.get('costo_orario_default', 50.0) if settings else 50.0
    
    entry = TimeEntry(**entry_data.model_dump())
    doc = entry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['data'] = doc['data'].isoformat() if isinstance(doc['data'], datetime) else doc['data']
    await db.time_entries.insert_one(doc)
    
    # Update project totals
    costo = entry.ore * (entry.costo_orario or 50.0)
    await db.projects.update_one(
        {"id": entry.project_id},
        {"$inc": {"ore_totali": entry.ore, "costo_totale": costo}}
    )
    
    return entry

@api_router.delete("/time-entries/{entry_id}")
async def delete_time_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    entry = await db.time_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Registrazione non trovata")
    
    # Update project totals
    costo = entry['ore'] * (entry.get('costo_orario') or 50.0)
    await db.projects.update_one(
        {"id": entry['project_id']},
        {"$inc": {"ore_totali": -entry['ore'], "costo_totale": -costo}}
    )
    
    await db.time_entries.delete_one({"id": entry_id})
    return {"message": "Registrazione eliminata"}

# ===================== NOTIFICATIONS ROUTES =====================
@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"$or": [{"user_id": current_user['id']}, {"user_id": None}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notification_id}, {"$set": {"letta": True}})
    return {"message": "Notifica letta"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"$or": [{"user_id": current_user['id']}, {"user_id": None}]},
        {"$set": {"letta": True}}
    )
    return {"message": "Tutte le notifiche lette"}

# ===================== SETTINGS ROUTES =====================
@api_router.get("/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"id": "global_settings"}, {"_id": 0})
    if not settings:
        settings = Settings().model_dump()
        await db.settings.insert_one(settings)
    return settings

@api_router.put("/settings")
async def update_settings(settings_data: Settings, admin: dict = Depends(get_admin_user)):
    await db.settings.update_one(
        {"id": "global_settings"},
        {"$set": settings_data.model_dump()},
        upsert=True
    )
    return {"message": "Impostazioni aggiornate"}

# ===================== DASHBOARD ROUTES =====================
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Count totals
    clients_count = await db.clients.count_documents({})
    projects_count = await db.projects.count_documents({})
    active_projects = await db.projects.count_documents({"stato": ProjectStatus.IN_CORSO})
    
    # Quotes stats
    quotes_pending = await db.quotes.count_documents({"stato": QuoteStatus.INVIATO})
    quotes_approved = await db.quotes.count_documents({"stato": QuoteStatus.APPROVATO})
    
    # Invoice stats
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(1000)
    total_invoiced = sum(inv.get('importo', 0) for inv in invoices)
    total_paid = sum(inv.get('importo', 0) for inv in invoices if inv.get('stato') == InvoiceStatus.PAGATA)
    total_pending = sum(inv.get('importo', 0) for inv in invoices if inv.get('stato') in [InvoiceStatus.DA_EMETTERE, InvoiceStatus.EMESSA])
    
    # Upcoming deadlines
    now = datetime.now(timezone.utc)
    week_later = now + timedelta(days=7)
    deadlines = await db.deadlines.find({"completata": False}, {"_id": 0}).to_list(1000)
    upcoming_deadlines = []
    for d in deadlines:
        try:
            deadline_date = datetime.fromisoformat(d['data_scadenza'].replace('Z', '+00:00')) if isinstance(d['data_scadenza'], str) else d['data_scadenza']
            if deadline_date <= week_later:
                upcoming_deadlines.append(d)
        except:
            pass
    
    # Projects profitability
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    total_budget = sum(p.get('budget', 0) for p in projects)
    total_cost = sum(p.get('costo_totale', 0) for p in projects)
    
    return {
        "clienti": clients_count,
        "progetti_totali": projects_count,
        "progetti_attivi": active_projects,
        "preventivi_in_attesa": quotes_pending,
        "preventivi_approvati": quotes_approved,
        "fatturato_totale": total_invoiced,
        "incassato": total_paid,
        "da_incassare": total_pending,
        "scadenze_imminenti": len(upcoming_deadlines),
        "scadenze_lista": upcoming_deadlines[:5],
        "budget_totale": total_budget,
        "costo_totale": total_cost,
        "margine": total_budget - total_cost
    }

@api_router.get("/dashboard/projects-in-progress")
async def get_projects_in_progress(current_user: dict = Depends(get_current_user)):
    projects = await db.projects.find(
        {"stato": {"$in": [ProjectStatus.IN_CORSO, ProjectStatus.PIANIFICATO]}},
        {"_id": 0}
    ).to_list(20)
    
    # Enrich with client name
    for project in projects:
        client = await db.clients.find_one({"id": project['client_id']}, {"_id": 0})
        project['client_nome'] = client.get('nome', 'N/A') if client else 'N/A'
    
    return projects

@api_router.get("/dashboard/revenue-chart")
async def get_revenue_chart(current_user: dict = Depends(get_current_user)):
    # Get last 6 months revenue
    invoices = await db.invoices.find({"stato": InvoiceStatus.PAGATA}, {"_id": 0}).to_list(1000)
    
    months_data = {}
    for inv in invoices:
        try:
            date_str = inv.get('data_pagamento') or inv.get('created_at')
            if date_str:
                date = datetime.fromisoformat(date_str.replace('Z', '+00:00')) if isinstance(date_str, str) else date_str
                month_key = date.strftime('%Y-%m')
                months_data[month_key] = months_data.get(month_key, 0) + inv.get('importo', 0)
        except:
            pass
    
    # Format for chart
    chart_data = [{"mese": k, "fatturato": v} for k, v in sorted(months_data.items())[-6:]]
    return chart_data

@api_router.get("/dashboard/services-distribution")
async def get_services_distribution(current_user: dict = Depends(get_current_user)):
    projects = await db.projects.find({}, {"_id": 0, "servizi": 1, "budget": 1}).to_list(1000)
    services_list = await db.services.find({}, {"_id": 0}).to_list(1000)
    services_map = {s['id']: s.get('nome', s['id']) for s in services_list}
    
    service_totals = {}
    for p in projects:
        budget_per_service = p.get('budget', 0) / max(len(p.get('servizi', [])), 1)
        for service_id in p.get('servizi', []):
            service_name = services_map.get(service_id, service_id)
            service_totals[service_name] = service_totals.get(service_name, 0) + budget_per_service
    
    return [{"servizio": k, "valore": v} for k, v in service_totals.items()]

# ===================== ROOT =====================
@api_router.get("/")
async def root():
    return {"message": "AgencyOS API v1.0.0", "status": "running"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
