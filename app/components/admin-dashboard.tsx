'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import {
  Activity,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  ImagePlus,
  LayoutDashboard,
  Leaf,
  LoaderCircle,
  LogOut,
  MoreHorizontal,
  Plus,
  Printer,
  QrCode,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CLINIC_QR_CODE } from '@/lib/clinic';
import { cn } from '@/lib/utils';

type ScheduleItem = {
  id: string;
  time: string;
  name: string;
  status: string;
  used: number;
  total: number;
};

type Patient = {
  id: string;
  name: string;
  phone: string | null;
  used: number;
  total: number;
};

type DashboardData = {
  schedule: ScheduleItem[];
  patients: Patient[];
  stats: { today: number; checkedIn: number; completed: number; patients: number };
  demo?: boolean;
};

type View = 'today' | 'patients' | 'calendar' | 'supplements' | 'qr';

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'today', label: 'Hoy', icon: LayoutDashboard },
  { id: 'patients', label: 'Pacientes', icon: Users },
  { id: 'calendar', label: 'Agenda', icon: CalendarDays },
  { id: 'supplements', label: 'Suplementos', icon: Leaf },
  { id: 'qr', label: 'Código QR', icon: QrCode },
];

const statusLabels: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Programada', className: 'bg-slate-100 text-slate-700' },
  checked_in: { label: 'Llegó', className: 'bg-cyan-100 text-cyan-800' },
  in_session: { label: 'En atención', className: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Completada', className: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-700' },
  no_show: { label: 'No asistió', className: 'bg-orange-100 text-orange-800' },
};

export function AdminDashboard({ user }: { user: { name: string; email: string } }) {
  const [view, setView] = useState<View>('today');
  const [data, setData] = useState<DashboardData | null>(null);
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [patientOpen, setPatientOpen] = useState<Patient | null>(null);
  const [supplementOpen, setSupplementOpen] = useState(false);

  async function refresh() {
    const response = await fetch('/api/admin/dashboard');
    if (response.ok) setData((await response.json()) as DashboardData);
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/admin/dashboard', { signal: controller.signal })
      .then(async (response): Promise<DashboardData | null> =>
        response.ok ? ((await response.json()) as DashboardData) : null,
      )
      .then((nextData) => {
        if (nextData) setData(nextData);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const title = navItems.find((item) => item.id === view)?.label ?? 'Hoy';

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas" className="border-r-0">
        <SidebarHeader className="px-4 pb-5 pt-5">
          <div className="flex items-center gap-3 px-1">
            <span className="grid size-10 place-items-center rounded-2xl bg-cyan-300 text-slate-950">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/55">Centro</p>
              <p className="font-bold tracking-tight">Quiropráctico</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Gestión</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={view === item.id}
                        onClick={() => setView(item.id)}
                        className="h-11 rounded-xl px-3"
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <div className="rounded-2xl bg-sidebar-accent p-3">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-cyan-300 text-sm font-black text-slate-950">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Profesional</p>
                <p className="truncate text-xs text-sidebar-foreground/55">{user.email}</p>
              </div>
            </div>
            {/* oxlint-disable-next-line next/no-html-link-for-pages -- sign-out must be a top-level browser navigation */}
            <a
              href="/signout-with-chatgpt?return_to=%2F"
              className="mt-3 flex h-9 items-center justify-center gap-2 rounded-xl border border-sidebar-border text-xs font-semibold transition hover:bg-white/5"
            >
              <LogOut className="size-3.5" />
              Cerrar sesión
            </a>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#f5f8f8]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border bg-white/85 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">Panel profesional</p>
              <h1 className="text-xl font-black tracking-tight">{title}</h1>
            </div>
          </div>
          <Button onClick={() => setNewPatientOpen(true)} className="h-11 rounded-xl px-4 font-bold">
            <UserPlus className="size-4" />
            <span className="hidden sm:inline">Nuevo paciente</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </header>

        <div className="mx-auto w-full max-w-[1240px] p-4 sm:p-7">
          {!data ? (
            <div className="grid min-h-[55vh] place-items-center text-muted-foreground">
              <div className="text-center">
                <LoaderCircle className="mx-auto size-8 animate-spin text-cyan-700" />
                <p className="mt-3 font-medium">Preparando el panel…</p>
              </div>
            </div>
          ) : (
            <>
              {data.demo && (
                <div className="mb-5 flex items-center gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
                  <Activity className="size-5 shrink-0" />
                  Estás viendo datos de ejemplo. El primer paciente real que registres quedará guardado en la base de datos.
                </div>
              )}
              {view === 'today' && (
                <TodayView
                  data={data}
                  onStatusChange={async (id, status) => {
                    const response = await fetch('/api/admin/appointments', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ appointmentId: id, status }),
                    });
                    if (response.ok) {
                      setData((current) =>
                        current
                          ? {
                              ...current,
                              schedule: current.schedule.map((item) =>
                                item.id === id
                                  ? {
                                      ...item,
                                      status,
                                      used:
                                        status === 'completed' && item.status !== 'completed'
                                          ? Math.min(item.total, item.used + 1)
                                          : item.used,
                                    }
                                  : item,
                              ),
                            }
                          : current,
                      );
                    }
                  }}
                  onPatient={setPatientOpen}
                />
              )}
              {view === 'patients' && (
                <PatientsView patients={data.patients} onPatient={setPatientOpen} onNew={() => setNewPatientOpen(true)} />
              )}
              {view === 'calendar' && <CalendarView schedule={data.schedule} />}
              {view === 'supplements' && (
                <SupplementsView patients={data.patients} onNew={() => setSupplementOpen(true)} />
              )}
              {view === 'qr' && <QrPoster />}
            </>
          )}
        </div>
      </SidebarInset>

      <NewPatientDialog
        open={newPatientOpen}
        onOpenChange={setNewPatientOpen}
        onSaved={() => void refresh()}
      />
      <PatientDialog patient={patientOpen} onOpenChange={(open) => !open && setPatientOpen(null)} />
      <SupplementDialog
        patients={data?.patients ?? []}
        open={supplementOpen}
        onOpenChange={setSupplementOpen}
      />
    </SidebarProvider>
  );
}

function TodayView({
  data,
  onStatusChange,
  onPatient,
}: {
  data: DashboardData;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onPatient: (patient: Patient) => void;
}) {
  const cards = [
    { label: 'Citas de hoy', value: data.stats.today, icon: CalendarDays, tone: 'bg-slate-950 text-white' },
    { label: 'Ya llegaron', value: data.stats.checkedIn, icon: Clock3, tone: 'bg-cyan-100 text-cyan-950' },
    { label: 'Completadas', value: data.stats.completed, icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-950' },
    { label: 'Pacientes', value: data.stats.patients, icon: Users, tone: 'bg-white text-slate-950' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-cyan-800">Resumen diario</p>
          <h2 className="mt-1 text-3xl font-black tracking-[-0.035em]">Tu consulta, de un vistazo.</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {new Intl.DateTimeFormat('es-PE', { dateStyle: 'full' }).format(new Date())}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className={`rounded-3xl border-0 shadow-sm ${card.tone}`}>
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <p className="text-sm font-medium opacity-65">{card.label}</p>
                  <p className="mt-3 text-4xl font-black tracking-tight">{card.value}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-2xl bg-current/10">
                  <Icon className="size-5" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.75fr]">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="flex-row items-center justify-between px-5 pb-2 sm:px-6">
            <div>
              <CardTitle className="text-xl font-extrabold">Agenda de hoy</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Las llegadas aparecen automáticamente.</p>
            </div>
            <Badge variant="secondary" className="rounded-full">{data.schedule.length} citas</Badge>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-4">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Hora</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Sesiones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.schedule.map((item) => {
                  const status = statusLabels[item.status] ?? statusLabels.scheduled;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-bold">{item.time}</TableCell>
                      <TableCell>
                        <button className="font-semibold hover:underline" onClick={() => onPatient({ id: item.id.replace('demo-', 'demo-'), name: item.name, phone: null, used: item.used, total: item.total })}>
                          {item.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.used} de {item.total}</TableCell>
                      <TableCell><Badge className={`rounded-full border-0 ${status.className}`}>{status.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        {item.status === 'checked_in' && (
                          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void onStatusChange(item.id, 'in_session')}>Atender</Button>
                        )}
                        {item.status === 'in_session' && (
                          <Button size="sm" className="rounded-lg bg-emerald-700 hover:bg-emerald-800" onClick={() => void onStatusChange(item.id, 'completed')}>Completar</Button>
                        )}
                        {item.status === 'scheduled' && <span className="text-xs text-muted-foreground">En espera</span>}
                        {item.status === 'completed' && <Check className="ml-auto size-5 text-emerald-700" />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 bg-primary text-primary-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-extrabold">Próxima atención</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black">10:30</p>
            <p className="mt-2 text-lg font-bold">Luis Vargas</p>
            <Badge className="mt-3 rounded-full bg-cyan-300 text-slate-950 hover:bg-cyan-300">Ya llegó</Badge>
            <div className="mt-8 rounded-2xl bg-white/10 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-white/65">Plan actual</span>
                <strong>5 de 10</strong>
              </div>
              <Progress value={50} className="mt-3 bg-white/15" />
            </div>
            <Button className="mt-4 h-11 w-full rounded-xl bg-white text-primary hover:bg-white/90">Abrir ficha <ChevronRight /></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PatientsView({ patients, onPatient, onNew }: { patients: Patient[]; onPatient: (patient: Patient) => void; onNew: () => void }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => patients.filter((patient) => patient.name.toLowerCase().includes(query.toLowerCase())),
    [patients, query],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Pacientes</h2>
          <p className="mt-1 text-muted-foreground">Expedientes, sesiones y evolución clínica.</p>
        </div>
        <Button onClick={onNew} className="h-11 rounded-xl"><Plus /> Registrar paciente</Button>
      </div>
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar paciente…" className="h-12 rounded-xl bg-muted/60 pl-11" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((patient) => (
            <button key={patient.id} onClick={() => onPatient(patient)} className="rounded-2xl border border-border p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md">
              <div className="flex items-start gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-cyan-100 font-black text-cyan-900">{patient.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{patient.name}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{patient.phone || 'Sin teléfono'}</span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground" />
              </div>
              <div className="mt-4 flex justify-between text-sm"><span className="text-muted-foreground">Plan de sesiones</span><strong>{patient.used} / {patient.total}</strong></div>
              <Progress value={patient.total ? (patient.used / patient.total) * 100 : 0} className="mt-2" />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CalendarView({ schedule }: { schedule: ScheduleItem[] }) {
  const hours = ['8:00 a. m.', '9:00 a. m.', '10:00 a. m.', '11:00 a. m.', '12:00 p. m.', '1:00 p. m.', '2:00 p. m.', '3:00 p. m.', '4:00 p. m.', '5:00 p. m.'];
  return (
    <div className="space-y-5">
      <div><h2 className="text-3xl font-black tracking-tight">Agenda</h2><p className="mt-1 text-muted-foreground">Horario disponible de 8:00 a. m. a 9:00 p. m.</p></div>
      <Card className="overflow-hidden rounded-3xl border-0 shadow-sm">
        <CardHeader className="border-b"><CardTitle className="flex items-center justify-between"><span>Hoy</span><Badge variant="secondary">{schedule.length} citas</Badge></CardTitle></CardHeader>
        <CardContent className="p-0">
          {hours.map((hour, index) => {
            const item = schedule[index];
            return (
              <div key={hour} className="grid min-h-16 grid-cols-[110px_1fr] border-b last:border-0">
                <div className="border-r px-4 py-4 text-sm font-semibold text-muted-foreground">{hour}</div>
                <div className="p-2">
                  {item && (
                    <div className="flex h-full items-center justify-between rounded-xl border-l-4 border-cyan-500 bg-cyan-50 px-4 py-2">
                      <div><p className="font-bold">{item.name}</p><p className="text-xs text-muted-foreground">Sesión quiropráctica · {item.time}</p></div>
                      <Badge className={`border-0 ${statusLabels[item.status]?.className}`}>{statusLabels[item.status]?.label}</Badge>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function SupplementsView({ patients, onNew }: { patients: Patient[]; onNew: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h2 className="text-3xl font-black tracking-tight">Suplementos</h2><p className="mt-1 text-muted-foreground">Productos recomendados y seguimiento por paciente.</p></div>
        <Button onClick={onNew} className="h-11 rounded-xl"><Plus /> Registrar recomendación</Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader><CardTitle>Recomendaciones recientes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              ['Luis Vargas', 'Fórmula herbal B-12', '2 cápsulas después del desayuno'],
              ['Ana Torres', 'Complejo de ginseng', '1 cápsula por la mañana'],
              ['Rosa Medina', 'Extracto de cúrcuma', '1 cápsula con alimentos'],
            ].map(([patient, supplement, instruction]) => (
              <div key={patient} className="flex items-start gap-4 rounded-2xl border p-4">
                <span className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-800"><Leaf className="size-5" /></span>
                <div className="min-w-0 flex-1"><p className="font-bold">{supplement}</p><p className="mt-0.5 text-sm text-muted-foreground">{patient} · {instruction}</p></div>
                <Button variant="ghost" size="icon-sm" aria-label={`Más opciones para ${supplement}`}><MoreHorizontal /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-0 bg-emerald-950 text-white shadow-sm">
          <CardContent className="p-6">
            <Leaf className="size-8 text-emerald-300" />
            <p className="mt-8 text-sm text-white/60">Pacientes con seguimiento</p>
            <p className="mt-1 text-5xl font-black">{Math.min(3, patients.length)}</p>
            <p className="mt-5 text-sm leading-6 text-white/65">Registra producto, cantidad, instrucciones, lote y vencimiento sin mezclarlo con los medicamentos declarados por el paciente.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QrPoster() {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [checkInUrl, setCheckInUrl] = useState('');
  useEffect(() => {
    const url = `${window.location.origin}/?qr=${encodeURIComponent(CLINIC_QR_CODE)}`;
    void QRCode.toDataURL(url, { width: 620, margin: 2, color: { dark: '#073842', light: '#ffffff' } }).then((dataUrl) => {
      setCheckInUrl(url);
      setQrDataUrl(dataUrl);
    });
  }, []);

  return (
    <div className="space-y-5">
      <div><h2 className="text-3xl font-black tracking-tight">Código QR de entrada</h2><p className="mt-1 text-muted-foreground">Imprime este cartel y colócalo en un lugar bien iluminado.</p></div>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div id="qr-poster" className="mx-auto max-w-md rounded-[2rem] border-8 border-primary bg-white p-7 text-center">
              <div className="flex items-center justify-center gap-2 text-primary"><Sparkles className="size-5" /><strong className="uppercase tracking-[0.16em]">Centro Quiropráctico</strong></div>
              <h3 className="mt-7 text-3xl font-black tracking-tight text-slate-950">Registra tu llegada</h3>
              <p className="mt-2 text-slate-600">Abre la cámara de tu celular y escanea el código.</p>
              {qrDataUrl ? <Image unoptimized src={qrDataUrl} width={288} height={288} alt="Código QR para registrar la llegada" className="mx-auto mt-5 aspect-square w-full max-w-72" /> : <div className="mx-auto mt-5 grid aspect-square max-w-72 place-items-center bg-muted"><LoaderCircle className="animate-spin" /></div>}
              <div className="mt-5 rounded-2xl bg-cyan-50 p-4 text-sm font-semibold text-cyan-950">Luego busca tu nombre y confirma tu código personal.</div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-6"><QrCode className="size-7 text-cyan-700" /><h3 className="mt-5 text-xl font-extrabold">Listo para imprimir</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">El QR abre esta misma página con la ubicación confirmada. No contiene nombres, citas ni información clínica.</p><div className="mt-5 flex flex-wrap gap-3"><Button onClick={() => window.print()} className="rounded-xl"><Printer /> Imprimir cartel</Button>{qrDataUrl && <a href={qrDataUrl} download="qr-entrada-clinica.png" className={cn(buttonVariants({ variant: 'outline' }), 'rounded-xl')}><Download /> Descargar QR</a>}</div></CardContent></Card>
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-6"><p className="text-sm font-semibold text-muted-foreground">Dirección del registro</p><p className="mt-2 break-all rounded-xl bg-muted p-3 font-mono text-xs">{checkInUrl}</p></CardContent></Card>
        </div>
      </div>
    </div>
  );
}

function NewPatientDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ firstName: string; lastName: string; pin: string } | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch('/api/admin/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, totalSessions: Number(payload.totalSessions) }) });
    const body = (await response.json()) as { error?: string; firstName?: string; lastName?: string; pin?: string };
    setSaving(false);
    if (!response.ok) { setError(body.error || 'No se pudo guardar.'); return; }
    setResult({ firstName: body.firstName!, lastName: body.lastName!, pin: body.pin! });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) { setResult(null); setError(''); } }}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto rounded-[1.75rem] p-6 sm:p-7">
        {result ? (
          <div className="py-5 text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-8" /></span><DialogTitle className="mt-6 text-2xl font-black">Paciente registrado</DialogTitle><DialogDescription className="mt-2 text-base">Entrega este código a {result.firstName} {result.lastName}. Se mostrará solamente esta vez.</DialogDescription><div className="mx-auto mt-6 max-w-xs rounded-2xl bg-slate-950 px-6 py-5 font-mono text-3xl font-black tracking-[0.25em] text-white">{result.pin}</div><Button className="mt-6 h-11 rounded-xl" onClick={() => onOpenChange(false)}>Terminar</Button></div>
        ) : (
          <><DialogHeader><DialogTitle className="text-xl font-extrabold">Registrar paciente</DialogTitle><DialogDescription className="text-base">Crea su expediente, plan de sesiones y primera cita.</DialogDescription></DialogHeader><form onSubmit={submit} className="mt-2 grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="firstName">Nombres</Label><Input id="firstName" name="firstName" required className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="lastName">Apellidos</Label><Input id="lastName" name="lastName" required className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="phone">Teléfono</Label><Input id="phone" name="phone" inputMode="tel" className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="birthDate">Fecha de nacimiento</Label><Input id="birthDate" name="birthDate" type="date" className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="sex">Sexo</Label><Select name="sex"><SelectTrigger id="sex" className="h-11 w-full rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent><SelectItem value="female">Femenino</SelectItem><SelectItem value="male">Masculino</SelectItem><SelectItem value="not_specified">No especificado</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="totalSessions">Plan de sesiones</Label><Input id="totalSessions" name="totalSessions" type="number" min="1" max="99" defaultValue="8" className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="appointmentDate">Fecha de primera cita</Label><Input id="appointmentDate" name="appointmentDate" type="date" defaultValue={today} className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="appointmentTime">Hora de la cita</Label><Input id="appointmentTime" name="appointmentTime" type="time" min="08:00" max="21:00" className="h-11 rounded-xl" /></div>{error && <p className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}<Button type="submit" disabled={saving} className="mt-2 h-12 rounded-xl font-bold sm:col-span-2">{saving ? <LoaderCircle className="animate-spin" /> : <UserPlus />} Guardar y generar código</Button></form></>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PatientDialog({ patient, onOpenChange }: { patient: Patient | null; onOpenChange: (open: boolean) => void }) {
  const [uploading, setUploading] = useState('');
  const [message, setMessage] = useState('');
  async function upload(file: File | undefined, category: string) {
    if (!file || !patient) return;
    setUploading(category); setMessage('');
    if (patient.id.startsWith('demo-')) { await new Promise((resolve) => setTimeout(resolve, 600)); setMessage(`Fotografía “${category === 'before' ? 'antes' : 'después'}” preparada en la demostración.`); setUploading(''); return; }
    const data = new FormData(); data.set('file', file); data.set('patientId', patient.id); data.set('category', category);
    const response = await fetch('/api/admin/media', { method: 'POST', body: data });
    const body = (await response.json()) as { error?: string; fileName?: string };
    setMessage(response.ok ? `Fotografía ${body.fileName} guardada.` : body.error || 'No se pudo guardar.'); setUploading('');
  }
  return (
    <Dialog open={Boolean(patient)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[1.75rem] p-6 sm:p-7"><DialogHeader><DialogTitle className="text-2xl font-black">{patient?.name}</DialogTitle><DialogDescription>Resumen del expediente y plan de atención.</DialogDescription></DialogHeader>{patient && <div className="mt-2 space-y-5"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-muted p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sesiones</p><p className="mt-2 text-2xl font-black">{patient.used} / {patient.total}</p></div><div className="rounded-2xl bg-cyan-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-800">Teléfono</p><p className="mt-2 font-bold">{patient.phone || 'Sin registrar'}</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Estado</p><p className="mt-2 font-bold">Plan activo</p></div></div><div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Progreso del plan</span><strong>{Math.max(0, patient.total - patient.used)} restantes</strong></div><Progress value={patient.total ? (patient.used / patient.total) * 100 : 0} className="mt-2" /></div><div><h3 className="font-extrabold">Fotografías de evolución</h3><p className="mt-1 text-sm text-muted-foreground">Archivos privados ligados al expediente.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{(['before', 'after'] as const).map((category) => <label key={category} className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/50 p-4 text-center transition hover:bg-cyan-50"><input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => void upload(event.target.files?.[0], category)} /><ImagePlus className="size-6 text-cyan-800" /><span className="mt-2 text-sm font-bold">Foto {category === 'before' ? 'antes' : 'después'}</span><span className="mt-1 text-xs text-muted-foreground">{uploading === category ? 'Guardando…' : 'Tomar o seleccionar'}</span></label>)}</div>{message && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">{message}</p>}</div><div className="flex flex-wrap gap-2"><Button variant="outline" className="rounded-xl"><FileText /> Nueva nota clínica</Button><Button variant="outline" className="rounded-xl"><Leaf /> Añadir suplemento</Button></div></div>}</DialogContent>
    </Dialog>
  );
}

function SupplementDialog({ patients, open, onOpenChange }: { patients: Patient[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState('');
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setMessage(''); const payload = Object.fromEntries(new FormData(event.currentTarget).entries()); const response = await fetch('/api/admin/supplements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const body = (await response.json()) as { error?: string }; setSaving(false); if (response.ok) setMessage('Suplemento registrado correctamente.'); else setMessage(body.error || 'No se pudo guardar.'); }
  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setMessage(''); }}><DialogContent className="max-w-lg rounded-[1.75rem] p-6 sm:p-7"><DialogHeader><DialogTitle className="text-xl font-extrabold">Registrar suplemento</DialogTitle><DialogDescription>Guarda la recomendación separada de los medicamentos declarados.</DialogDescription></DialogHeader><form onSubmit={submit} className="mt-2 grid gap-4"><div className="space-y-2"><Label htmlFor="supplement-patient">Paciente</Label><Select name="patientId" required><SelectTrigger id="supplement-patient" className="h-11 w-full rounded-xl"><SelectValue placeholder="Seleccionar paciente" /></SelectTrigger><SelectContent>{patients.map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="supplement-name">Nombre del suplemento</Label><Input id="supplement-name" name="name" required className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="instructions">Indicaciones de uso</Label><Input id="instructions" name="instructions" placeholder="Ej. 1 cápsula después del desayuno" className="h-11 rounded-xl" /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="quantity">Cantidad</Label><Input id="quantity" name="quantity" className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="lotNumber">Lote</Label><Input id="lotNumber" name="lotNumber" className="h-11 rounded-xl" /></div></div>{message && <p className="rounded-xl bg-muted p-3 text-sm font-medium">{message}</p>}<Button type="submit" disabled={saving} className="h-12 rounded-xl font-bold">{saving ? <LoaderCircle className="animate-spin" /> : <Leaf />} Guardar recomendación</Button></form></DialogContent></Dialog>
  );
}
