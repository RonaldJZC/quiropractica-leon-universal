'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import {
  Activity,
  ArrowLeft,
  Camera,
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
  QrCode,
  Search,
  Scale,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  WalletCards,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type ScheduleItem = {
  id: string;
  patientId: string;
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
  qrValue?: string | null;
};

type DashboardData = {
  schedule: ScheduleItem[];
  patients: Patient[];
  stats: { today: number; checkedIn: number; completed: number; patients: number };
  demo?: boolean;
};

type View = 'scanner' | 'today' | 'patients' | 'calendar' | 'supplements';

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'scanner', label: 'Escanear QR', icon: Camera },
  { id: 'today', label: 'Hoy', icon: LayoutDashboard },
  { id: 'patients', label: 'Pacientes', icon: Users },
  { id: 'calendar', label: 'Agenda', icon: CalendarDays },
  { id: 'supplements', label: 'Suplementos', icon: Leaf },
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
  const [view, setView] = useState<View>('scanner');
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
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/55">Quiropráctica</p>
              <p className="font-bold tracking-tight">León Universal</p>
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
              <h1 className="text-xl font-black tracking-tight">{patientOpen ? 'Expediente del paciente' : title}</h1>
            </div>
          </div>
          <Button onClick={() => setNewPatientOpen(true)} className={cn('h-11 rounded-xl px-4 font-bold', patientOpen && 'hidden')}>
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
            patientOpen ? (
              <PatientRecordPage
                key={patientOpen.id}
                patient={patientOpen}
                onBack={() => { setPatientOpen(null); setView('patients'); }}
                onDeleted={() => { setPatientOpen(null); setView('patients'); void refresh(); }}
                onSaved={() => void refresh()}
              />
            ) : (
            <>
              {data.demo && (
                <div className="mb-5 flex items-center gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
                  <Activity className="size-5 shrink-0" />
                  Estás viendo datos de ejemplo. El primer paciente real que registres quedará guardado en la base de datos.
                </div>
              )}
              {view === 'scanner' && <QrScannerView onRegistered={() => void refresh()} />}
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
            </>
            )
          )}
        </div>
      </SidebarInset>

      <NewPatientDialog
        open={newPatientOpen}
        onOpenChange={setNewPatientOpen}
        onSaved={() => void refresh()}
        onFinished={(patient) => { setNewPatientOpen(false); setPatientOpen(patient); }}
      />
      <SupplementDialog
        patients={data?.patients ?? []}
        open={supplementOpen}
        onOpenChange={setSupplementOpen}
      />
    </SidebarProvider>
  );
}

type CheckInResult = {
  patientId: string;
  name: string;
  checkedInAt: string;
  appointmentTime: string;
  used: number;
  total: number;
  alreadyRegistered?: boolean;
  walkIn?: boolean;
  demo?: boolean;
};

function QrScannerView({ onRegistered }: { onRegistered: () => void }) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'start_patient_qr_scan',
          title: 'Abrir lector de pacientes',
          description: 'Abre la cámara del panel para escanear la tarjeta QR que presenta un paciente.',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          async execute() {
            setResult(null);
            setError('');
            setCameraOpen(true);
            containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return { status: 'scanner_opened' };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const registerQr = useCallback(async (qrValue: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setProcessing(true);
    setError('');
    try {
      const response = await fetch('/api/admin/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrValue }),
      });
      const body = (await response.json()) as CheckInResult & { error?: string };
      if (!response.ok) throw new Error(body.error || 'No se pudo registrar la llegada.');
      setResult(body);
      setCameraOpen(false);
      onRegistered();
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setProcessing(false);
      busyRef.current = false;
    }
  }, [onRegistered]);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current) return;
    let scanner: { start: () => Promise<void>; stop: () => void; destroy: () => void } | null = null;
    let cancelled = false;

    void import('qr-scanner').then(async ({ default: QrScanner }) => {
      if (cancelled || !videoRef.current) return;
      scanner = new QrScanner(
        videoRef.current,
        (scanResult) => void registerQr(scanResult.data),
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 4,
        },
      );
      try {
        await scanner.start();
      } catch {
        setError('No se pudo abrir la cámara. Revisa el permiso del navegador.');
        setCameraOpen(false);
      }
    });

    return () => {
      cancelled = true;
      scanner?.stop();
      scanner?.destroy();
    };
  }, [cameraOpen, registerQr]);

  function reset() {
    setResult(null);
    setError('');
    setCameraOpen(false);
  }

  return (
    <div ref={containerRef} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="overflow-hidden rounded-[2rem] border-0 bg-slate-950 text-white shadow-xl">
        <CardContent className="relative grid min-h-[620px] place-items-center p-6 text-center sm:p-9">
          {result ? (
            <div className="w-full max-w-lg">
              <span className={`mx-auto grid size-24 place-items-center rounded-full ${result.alreadyRegistered ? 'bg-amber-300 text-amber-950' : 'bg-emerald-300 text-emerald-950'}`}>
                {result.alreadyRegistered ? <Clock3 className="size-11" /> : <Check className="size-12 stroke-[3]" />}
              </span>
              <p className={`mt-8 text-sm font-bold uppercase tracking-[0.18em] ${result.alreadyRegistered ? 'text-amber-300' : 'text-emerald-300'}`}>
                {result.alreadyRegistered ? 'Asistencia ya registrada' : 'Llegada registrada'}
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{result.name}</h2>
              <div className="mx-auto mt-7 grid max-w-md grid-cols-2 gap-3 text-left">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/55">Hora</p>
                  <p className="mt-2 text-xl font-black">{result.appointmentTime}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/55">Sesiones</p>
                  <p className="mt-2 text-xl font-black">{result.used} de {result.total}</p>
                </div>
              </div>
              {result.walkIn && <p className="mx-auto mt-4 max-w-md rounded-xl bg-cyan-300/15 px-4 py-3 text-sm text-cyan-100">No tenía cita para hoy; se añadió como llegada sin cita.</p>}
              {result.demo && <p className="mt-4 text-sm text-white/55">Resultado de demostración. No modifica la agenda.</p>}
              <Button onClick={reset} className="mt-8 h-14 rounded-2xl bg-white px-7 text-base font-black text-slate-950 hover:bg-white/90">
                <QrCode className="size-5" /> Escanear otro paciente
              </Button>
            </div>
          ) : cameraOpen ? (
            <div className="w-full max-w-lg">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">Cámara activa</p>
              <h2 className="mt-3 text-3xl font-black">Apunta al QR del paciente</h2>
              <div className="relative mx-auto mt-7 aspect-[4/5] max-h-[430px] overflow-hidden rounded-[1.75rem] border-2 border-cyan-300/50 bg-black">
                <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                {processing && <div className="absolute inset-0 grid place-items-center bg-slate-950/75"><LoaderCircle className="size-10 animate-spin text-cyan-300" /></div>}
              </div>
              <Button variant="outline" onClick={() => setCameraOpen(false)} className="mt-5 h-12 rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                Cancelar
              </Button>
            </div>
          ) : (
            <div>
              <span className="mx-auto grid size-24 place-items-center rounded-[2rem] bg-cyan-300 text-slate-950">
                <Camera className="size-11" />
              </span>
              <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">Control de asistencia</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight">Escanea la tarjeta del paciente</h2>
              <p className="mx-auto mt-4 max-w-md text-base leading-7 text-white/65">
                El paciente solo muestra el QR recibido por WhatsApp o impreso. No necesita abrir ninguna aplicación.
              </p>
              <Button onClick={() => { setError(''); setCameraOpen(true); }} className="mt-8 h-14 rounded-2xl bg-cyan-300 px-7 text-base font-black text-slate-950 hover:bg-cyan-200">
                <Camera className="size-5" /> Abrir cámara
              </Button>
            </div>
          )}
          {error && <p role="alert" className="absolute bottom-7 mx-6 rounded-xl bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-100">{error}</p>}
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-bold text-cyan-800">Cómo funciona</p>
            <ol className="mt-5 space-y-5">
              {['El paciente muestra su tarjeta.', 'Escaneas el QR con este lector.', 'La llegada aparece en la agenda.'].map((label, index) => (
                <li key={label} className="flex gap-3 text-sm leading-6">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</span>
                  <span>{label}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-0 bg-cyan-50 shadow-sm">
          <CardContent className="p-6">
            <QrCode className="size-7 text-cyan-800" />
            <h3 className="mt-4 font-extrabold">Probar sin cámara</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Usa una tarjeta de demostración para comprobar el resultado.</p>
            <Button variant="outline" onClick={() => void registerQr('QLU-DEMO:LUIS')} disabled={processing} className="mt-4 w-full rounded-xl bg-white">
              {processing ? <LoaderCircle className="animate-spin" /> : <Sparkles />} Probar con Luis
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
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
                        <button className="font-semibold hover:underline" onClick={() => onPatient({ id: item.patientId, name: item.name, phone: null, used: item.used, total: item.total })}>
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

type PatientQrResult = {
  firstName: string;
  lastName: string;
  qrValue: string;
  patient: Patient;
};

async function buildPatientCard(name: string, qrValue: string) {
  const qrDataUrl = await QRCode.toDataURL(qrValue, {
    width: 430,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#071b2e', light: '#ffffff' },
  });
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 680;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear la tarjeta.');

  context.fillStyle = '#e8fbff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#071b2e';
  context.beginPath();
  context.roundRect(34, 34, 1012, 612, 42);
  context.fill();
  context.fillStyle = '#67e8f9';
  context.fillRect(34, 34, 18, 612);

  context.fillStyle = '#67e8f9';
  context.font = '700 28px Arial';
  context.fillText('QUIROPRÁCTICA', 104, 130);
  context.fillStyle = '#ffffff';
  context.font = '900 48px Arial';
  context.fillText('LEÓN UNIVERSAL', 104, 188);

  context.fillStyle = '#94a3b8';
  context.font = '700 23px Arial';
  context.fillText('PACIENTE', 104, 315);
  context.fillStyle = '#ffffff';
  context.font = '900 43px Arial';
  const shortName = name.length > 24 ? `${name.slice(0, 23)}…` : name;
  context.fillText(shortName, 104, 372);
  context.fillStyle = '#cbd5e1';
  context.font = '400 24px Arial';
  context.fillText('Presenta esta tarjeta al llegar.', 104, 452);
  context.fillText('No contiene información clínica.', 104, 492);

  const qrImage = document.createElement('img');
  qrImage.src = qrDataUrl;
  await new Promise<void>((resolve, reject) => {
    qrImage.onload = () => resolve();
    qrImage.onerror = () => reject(new Error('No se pudo cargar el QR.'));
  });
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.roundRect(660, 96, 326, 430, 28);
  context.fill();
  context.drawImage(qrImage, 696, 124, 254, 254);
  context.fillStyle = '#071b2e';
  context.font = '900 22px Arial';
  context.textAlign = 'center';
  context.fillText('CÓDIGO PERSONAL', 823, 432);
  context.fillStyle = '#475569';
  context.font = '400 18px Arial';
  context.fillText('Muéstralo al profesional', 823, 468);
  context.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

function PatientQrCard({ name, qrValue }: { name: string; qrValue: string }) {
  const [cardUrl, setCardUrl] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let active = true;
    void buildPatientCard(name, qrValue).then((url) => {
      if (active) setCardUrl(url);
    });
    return () => { active = false; };
  }, [name, qrValue]);

  const fileName = `tarjeta-qr-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;

  async function share() {
    if (!cardUrl) return;
    setSharing(true);
    try {
      const blob = await (await fetch(cardUrl)).blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Tarjeta QR de ${name}`,
          text: 'Tarjeta de paciente de Quiropráctica León Universal.',
          files: [file],
        });
      } else {
        const link = document.createElement('a');
        link.href = cardUrl;
        link.download = fileName;
        link.click();
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="overflow-hidden rounded-3xl border bg-slate-950 p-3 shadow-lg">
        {cardUrl ? (
          <Image unoptimized src={cardUrl} width={1080} height={680} alt={`Tarjeta QR de ${name}`} className="h-auto w-full rounded-2xl" />
        ) : (
          <div className="grid aspect-[1080/680] place-items-center text-white"><LoaderCircle className="size-8 animate-spin" /></div>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button onClick={() => void share()} disabled={!cardUrl || sharing} className="h-12 rounded-xl font-bold">
          {sharing ? <LoaderCircle className="animate-spin" /> : <QrCode />} Enviar o compartir
        </Button>
        {cardUrl && (
          <a href={cardUrl} download={fileName} className={cn(buttonVariants({ variant: 'outline' }), 'h-12 rounded-xl px-5 font-bold')}>
            <Download /> Descargar imagen
          </a>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Puedes enviarla por WhatsApp o imprimirla. El QR no muestra datos médicos.</p>
    </div>
  );
}

function NewPatientDialog({ open, onOpenChange, onSaved, onFinished }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void; onFinished: (patient: Patient) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PatientQrResult | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch('/api/admin/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, totalSessions: Number(payload.totalSessions) }) });
    const body = (await response.json()) as { error?: string; patientId?: string; firstName?: string; lastName?: string; qrValue?: string };
    setSaving(false);
    if (!response.ok) { setError(body.error || 'No se pudo guardar.'); return; }
    const phone = typeof payload.phone === 'string' ? payload.phone : '';
    const patient: Patient = {
      id: body.patientId!,
      name: `${body.firstName} ${body.lastName}`,
      phone: phone || null,
      used: 0,
      total: Number(payload.totalSessions) || 1,
      qrValue: body.qrValue!,
    };
    setResult({ firstName: body.firstName!, lastName: body.lastName!, qrValue: body.qrValue!, patient });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) { setResult(null); setError(''); } }}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-[1.75rem] p-6 sm:p-7">
        {result ? (
          <div className="py-2 text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-8" /></span><DialogTitle className="mt-5 text-2xl font-black">Paciente y tarjeta creados</DialogTitle><DialogDescription className="mt-2 text-base">Envía esta imagen a {result.firstName} {result.lastName} para que la muestre en cada visita.</DialogDescription><PatientQrCard name={`${result.firstName} ${result.lastName}`} qrValue={result.qrValue} /><Button className="mt-4 h-12 rounded-xl px-6 font-bold" onClick={() => onFinished(result.patient)}>Terminar y abrir expediente <ChevronRight /></Button></div>
        ) : (
          <><DialogHeader><DialogTitle className="text-xl font-extrabold">Registrar paciente</DialogTitle><DialogDescription className="text-base">Crea su expediente, plan de sesiones, primera cita y tarjeta QR.</DialogDescription></DialogHeader><form onSubmit={submit} className="mt-2 grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="firstName">Nombres</Label><Input id="firstName" name="firstName" required className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="lastName">Apellidos</Label><Input id="lastName" name="lastName" required className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="phone">Teléfono</Label><Input id="phone" name="phone" inputMode="tel" className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="birthDate">Fecha de nacimiento</Label><Input id="birthDate" name="birthDate" type="date" className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="sex">Sexo</Label><Select name="sex"><SelectTrigger id="sex" className="h-11 w-full rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent><SelectItem value="female">Femenino</SelectItem><SelectItem value="male">Masculino</SelectItem><SelectItem value="not_specified">No especificado</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="totalSessions">Plan de sesiones</Label><Input id="totalSessions" name="totalSessions" type="number" min="1" max="99" defaultValue="8" className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="appointmentDate">Fecha de primera cita</Label><Input id="appointmentDate" name="appointmentDate" type="date" defaultValue={today} className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="appointmentTime">Hora de la cita</Label><Input id="appointmentTime" name="appointmentTime" type="time" min="08:00" max="21:00" className="h-11 rounded-xl" /></div>{error && <p className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}<Button type="submit" disabled={saving} className="mt-2 h-12 rounded-xl font-bold sm:col-span-2">{saving ? <LoaderCircle className="animate-spin" /> : <UserPlus />} Guardar y crear tarjeta QR</Button></form></>
        )}
      </DialogContent>
    </Dialog>
  );
}

type PatientRecord = {
  assessment: null | {
    reason?: string; conditions?: string; bodyAnalysis?: string; weightKg?: number;
    heightCm?: number; bmi?: number; healthyWeightMinKg?: number; healthyWeightMaxKg?: number;
    targetWeightKg?: number; dietPlan?: string; notes?: string; assessedAt?: string;
  };
  plan: null | { totalSessions: number; usedSessions: number; sessionsPerWeek: number; startDate?: string; totalAmountCents: number };
  payments: { id: string; amountCents: number; method?: string; paidAt: string }[];
  supplements: { id: string; name: string; instructions?: string; quantity?: string }[];
};

function PatientRecordPage({ patient, onBack, onDeleted, onSaved }: { patient: Patient; onBack: () => void; onDeleted: () => void; onSaved: () => void }) {
  const [uploading, setUploading] = useState('');
  const [message, setMessage] = useState('');
  const [qrValue, setQrValue] = useState<string | null>(patient?.qrValue ?? null);
  const [showQr, setShowQr] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');

  const loadRecord = useCallback(async () => {
    if (!patient || patient.id.startsWith('demo-')) return;
    await Promise.resolve();
    setRecordLoading(true);
    const response = await fetch(`/api/admin/records?patientId=${encodeURIComponent(patient.id)}`);
    const body = (await response.json()) as PatientRecord & { error?: string };
    setRecordLoading(false);
    if (!response.ok) { setMessage(body.error || 'No se pudo cargar el expediente.'); return; }
    setRecord(body);
    setWeight(body.assessment?.weightKg?.toString() ?? '');
    setHeight(body.assessment?.heightCm?.toString() ?? '');
    setTargetWeight(body.assessment?.targetWeightKg?.toString() ?? '');
  }, [patient]);

  // oxlint-disable-next-line react-compiler/react-compiler -- load the selected patient's server record when the dialog opens
  useEffect(() => { void loadRecord(); }, [loadRecord]);

  const liveBmi = Number(weight) > 0 && Number(height) > 0
    ? Number(weight) / ((Number(height) / 100) ** 2)
    : null;
  const healthyMin = Number(height) > 0 ? 18.5 * ((Number(height) / 100) ** 2) : null;
  const healthyMax = Number(height) > 0 ? 24.9 * ((Number(height) / 100) ** 2) : null;
  const kilosToTarget = Number(weight) > 0 && Number(targetWeight) > 0 ? Math.max(0, Number(weight) - Number(targetWeight)) : null;
  const paidCents = record?.payments.reduce((sum, payment) => sum + payment.amountCents, 0) ?? 0;
  const totalCents = record?.plan?.totalAmountCents ?? 0;

  async function upload(file: File | undefined, category: string) {
    if (!file || !patient) return;
    setUploading(category); setMessage('');
    if (patient.id.startsWith('demo-')) { await new Promise((resolve) => setTimeout(resolve, 600)); setMessage(`Fotografía “${category === 'before' ? 'antes' : 'después'}” preparada en la demostración.`); setUploading(''); return; }
    const data = new FormData(); data.set('file', file); data.set('patientId', patient.id); data.set('category', category);
    const response = await fetch('/api/admin/media', { method: 'POST', body: data });
    const body = (await response.json()) as { error?: string; fileName?: string };
    setMessage(response.ok ? `Fotografía ${body.fileName} guardada.` : body.error || 'No se pudo guardar.'); setUploading('');
  }

  async function createQr() {
    if (!patient) return;
    if (patient.id.startsWith('demo-')) {
      setQrValue(patient.qrValue ?? 'QLU-DEMO:LUIS');
      setShowQr(true);
      return;
    }
    setQrLoading(true);
    setMessage('');
    const response = await fetch('/api/admin/patients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: patient.id }),
    });
    const body = (await response.json()) as { error?: string; qrValue?: string };
    setQrLoading(false);
    if (!response.ok || !body.qrValue) {
      setMessage(body.error || 'No se pudo crear la tarjeta QR.');
      return;
    }
    setQrValue(body.qrValue);
    setShowQr(true);
  }

  async function saveAssessment(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patient) return;
    setSavingRecord(true); setMessage('');
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch('/api/admin/records', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, patientId: patient.id }),
    });
    const body = (await response.json()) as { error?: string };
    setSavingRecord(false);
    if (!response.ok) { setMessage(body.error || 'No se pudo guardar la evaluación.'); return; }
    setMessage('Evaluación, plan y pago guardados correctamente.');
    await loadRecord();
    onSaved();
  }

  async function deletePatient() {
    if (!patient) return;
    setDeleting(true); setMessage('');
    const response = await fetch('/api/admin/patients', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: patient.id }),
    });
    const body = (await response.json()) as { error?: string };
    setDeleting(false);
    if (!response.ok) { setMessage(body.error || 'No se pudo eliminar.'); return; }
    onDeleted();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <Button variant="ghost" onClick={onBack} className="-ml-3 mb-3 rounded-xl text-white/75 hover:bg-white/10 hover:text-white"><ArrowLeft /> Volver a pacientes</Button>
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{patient.name}</h2>
          <p className="mt-2 text-white/60">Evaluación, tratamiento, pagos, suplementos y evolución.</p>
        </div>
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-cyan-300 text-xl font-black text-slate-950">{patient.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
      </div>
      <div className="space-y-5 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-muted p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sesiones</p><p className="mt-2 text-2xl font-black">{patient.used} / {patient.total}</p></div>
              <div className="rounded-2xl bg-cyan-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-800">Teléfono</p><p className="mt-2 font-bold">{patient.phone || 'Sin registrar'}</p></div>
              <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Estado</p><p className="mt-2 font-bold">Plan activo</p></div>
            </div>
            <div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Progreso del plan</span><strong>{Math.max(0, patient.total - patient.used)} restantes</strong></div>
              <Progress value={patient.total ? (patient.used / patient.total) * 100 : 0} className="mt-2" />
            </div>
            {recordLoading ? (
              <div className="flex items-center gap-2 rounded-2xl bg-muted p-4 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Cargando expediente…</div>
            ) : !patient.id.startsWith('demo-') && (
              <form key={record?.assessment?.assessedAt ?? 'new'} onSubmit={saveAssessment} className="space-y-5 rounded-3xl border bg-white p-5">
                <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-cyan-100 text-cyan-900"><Scale className="size-5" /></span><div><h3 className="font-extrabold">Evaluación y plan</h3><p className="text-sm text-muted-foreground">Registra lo observado y lo declarado por el paciente.</p></div></div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2"><Label htmlFor="weightKg">Peso actual (kg)</Label><Input id="weightKg" name="weightKg" type="number" min="1" max="400" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} className="h-11 rounded-xl" /></div>
                  <div className="space-y-2"><Label htmlFor="heightCm">Talla (cm)</Label><Input id="heightCm" name="heightCm" type="number" min="50" max="250" step="0.1" value={height} onChange={(event) => setHeight(event.target.value)} className="h-11 rounded-xl" /></div>
                  <div className="space-y-2"><Label htmlFor="targetWeightKg">Peso meta acordado (kg)</Label><Input id="targetWeightKg" name="targetWeightKg" type="number" min="1" max="400" step="0.1" value={targetWeight} onChange={(event) => setTargetWeight(event.target.value)} className="h-11 rounded-xl" /></div>
                </div>
                {liveBmi && healthyMin && healthyMax && (
                  <div className="grid gap-3 rounded-2xl bg-slate-950 p-4 text-white sm:grid-cols-3">
                    <div><p className="text-xs text-white/60">IMC orientativo</p><p className="mt-1 text-2xl font-black">{liveBmi.toFixed(1)}</p></div>
                    <div><p className="text-xs text-white/60">Rango de referencia por IMC</p><p className="mt-1 font-bold">{healthyMin.toFixed(1)}–{healthyMax.toFixed(1)} kg</p></div>
                    <div><p className="text-xs text-white/60">Diferencia hasta la meta</p><p className="mt-1 font-bold">{kilosToTarget !== null ? `${kilosToTarget.toFixed(1)} kg` : 'Sin meta'}</p></div>
                  </div>
                )}
                <p className="text-xs leading-5 text-muted-foreground">El IMC es solo una referencia de tamizaje. La meta y las recomendaciones deben ser confirmadas por un profesional de salud considerando edad, composición corporal y antecedentes.</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="reason">Motivo de consulta</Label><Textarea id="reason" name="reason" defaultValue={record?.assessment?.reason} placeholder="Dolor, molestia, tiempo de evolución…" className="min-h-24 rounded-xl" /></div>
                  <div className="space-y-2"><Label htmlFor="conditions">Enfermedades y antecedentes declarados</Label><Textarea id="conditions" name="conditions" defaultValue={record?.assessment?.conditions} placeholder="Diagnósticos, operaciones, alergias, medicamentos…" className="min-h-24 rounded-xl" /></div>
                  <div className="space-y-2"><Label htmlFor="bodyAnalysis">Análisis corporal</Label><Textarea id="bodyAnalysis" name="bodyAnalysis" defaultValue={record?.assessment?.bodyAnalysis} placeholder="Postura, movilidad, zonas observadas…" className="min-h-24 rounded-xl" /></div>
                  <div className="space-y-2"><Label htmlFor="dietPlan">Dieta o recomendaciones</Label><Textarea id="dietPlan" name="dietPlan" defaultValue={record?.assessment?.dietPlan} placeholder="Indicaciones acordadas y seguimiento…" className="min-h-24 rounded-xl" /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2"><Label htmlFor="totalSessions">Sesiones del plan</Label><Input id="totalSessions" name="totalSessions" type="number" min="1" max="99" defaultValue={record?.plan?.totalSessions ?? patient.total} className="h-11 rounded-xl" /></div>
                  <div className="space-y-2"><Label htmlFor="sessionsPerWeek">Veces por semana</Label><Input id="sessionsPerWeek" name="sessionsPerWeek" type="number" min="1" max="7" defaultValue={record?.plan?.sessionsPerWeek ?? 3} className="h-11 rounded-xl" /></div>
                  <div className="space-y-2"><Label htmlFor="startDate">Inicio del plan</Label><Input id="startDate" name="startDate" type="date" defaultValue={record?.plan?.startDate ?? new Date().toISOString().slice(0, 10)} className="h-11 rounded-xl" /></div>
                  <div className="space-y-2"><Label htmlFor="totalAmount">Monto total (S/)</Label><Input id="totalAmount" name="totalAmount" type="number" min="0" step="0.01" defaultValue={totalCents ? (totalCents / 100).toFixed(2) : ''} className="h-11 rounded-xl" /></div>
                </div>
                <div className="grid gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <div className="space-y-2"><Label htmlFor="paymentAmount">Nuevo abono (S/)</Label><Input id="paymentAmount" name="paymentAmount" type="number" min="0" step="0.01" placeholder="0.00" className="h-11 rounded-xl bg-white" /></div>
                  <div className="space-y-2"><Label htmlFor="paymentMethod">Forma de pago</Label><Select name="paymentMethod"><SelectTrigger id="paymentMethod" className="h-11 w-full rounded-xl bg-white"><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent><SelectItem value="cash">Efectivo</SelectItem><SelectItem value="yape">Yape</SelectItem><SelectItem value="plin">Plin</SelectItem><SelectItem value="transfer">Transferencia</SelectItem><SelectItem value="card">Tarjeta</SelectItem></SelectContent></Select></div>
                  <div className="min-w-36 rounded-xl bg-white px-4 py-2.5"><p className="text-xs text-muted-foreground">Pagado / saldo</p><p className="font-black">S/ {(paidCents / 100).toFixed(2)} · S/ {(Math.max(0, totalCents - paidCents) / 100).toFixed(2)}</p></div>
                </div>
                <div className="space-y-2"><Label htmlFor="notes">Notas adicionales</Label><Textarea id="notes" name="notes" defaultValue={record?.assessment?.notes} className="min-h-20 rounded-xl" /></div>
                <Button type="submit" disabled={savingRecord} className="h-12 w-full rounded-xl font-bold">{savingRecord ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />} Guardar evaluación y plan</Button>
              </form>
            )}
            {record && (record.payments.length > 0 || record.supplements.length > 0) && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border p-4"><h3 className="flex items-center gap-2 font-extrabold"><WalletCards className="size-5 text-emerald-700" /> Historial de pagos</h3><div className="mt-3 space-y-2">{record.payments.map((payment) => <div key={payment.id} className="flex justify-between rounded-xl bg-muted px-3 py-2 text-sm"><span>{payment.method || 'Pago'} · {new Date(payment.paidAt).toLocaleDateString('es-PE')}</span><strong>S/ {(payment.amountCents / 100).toFixed(2)}</strong></div>)}</div></div>
                <div className="rounded-2xl border p-4"><h3 className="flex items-center gap-2 font-extrabold"><Leaf className="size-5 text-emerald-700" /> Suplementos indicados</h3><div className="mt-3 space-y-2">{record.supplements.map((item) => <div key={item.id} className="rounded-xl bg-muted px-3 py-2 text-sm"><strong>{item.name}</strong><p className="text-muted-foreground">{item.instructions || 'Sin indicaciones registradas'}</p></div>)}</div></div>
              </div>
            )}
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div><h3 className="font-extrabold">Tarjeta personal QR</h3><p className="mt-1 text-sm text-muted-foreground">El paciente la presenta en cada visita.</p></div>
                {qrValue ? (
                  <Button onClick={() => setShowQr((current) => !current)} className="rounded-xl"><QrCode /> {showQr ? 'Ocultar tarjeta' : 'Ver y compartir'}</Button>
                ) : (
                  <Button onClick={() => void createQr()} disabled={qrLoading} className="rounded-xl">{qrLoading ? <LoaderCircle className="animate-spin" /> : <QrCode />} Crear tarjeta</Button>
                )}
              </div>
              {showQr && qrValue && <PatientQrCard name={patient.name} qrValue={qrValue} />}
            </div>
            <div>
              <h3 className="font-extrabold">Fotografías de evolución</h3>
              <p className="mt-1 text-sm text-muted-foreground">Archivos privados ligados al expediente.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(['before', 'after'] as const).map((category) => (
                  <label key={category} className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/50 p-4 text-center transition hover:bg-cyan-50">
                    <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => void upload(event.target.files?.[0], category)} />
                    <ImagePlus className="size-6 text-cyan-800" />
                    <span className="mt-2 text-sm font-bold">Foto {category === 'before' ? 'antes' : 'después'}</span>
                    <span className="mt-1 text-xs text-muted-foreground">{uploading === category ? 'Guardando…' : 'Tomar o seleccionar'}</span>
                  </label>
                ))}
              </div>
            </div>
            {message && <p className="rounded-xl bg-muted p-3 text-sm font-medium">{message}</p>}
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => document.getElementById('reason')?.focus()}><FileText /> Ir a evaluación</Button>
              {!patient.id.startsWith('demo-') && (
                <AlertDialog>
                  <AlertDialogTrigger render={<Button variant="outline" className="rounded-xl border-red-200 text-red-700 hover:bg-red-50" />}><Trash2 /> Eliminar paciente</AlertDialogTrigger>
                  <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar a {patient.name}?</AlertDialogTitle><AlertDialogDescription>Se borrarán su expediente, citas, asistencias, pagos, fotos registradas y suplementos. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void deletePatient()} disabled={deleting} className="bg-red-700 hover:bg-red-800">{deleting ? 'Eliminando…' : 'Sí, eliminar'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>
              )}
            </div>
      </div>
    </div>
  );
}

function SupplementDialog({ patients, open, onOpenChange }: { patients: Patient[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState('');
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setMessage(''); const payload = Object.fromEntries(new FormData(event.currentTarget).entries()); const response = await fetch('/api/admin/supplements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const body = (await response.json()) as { error?: string }; setSaving(false); if (response.ok) setMessage('Suplemento registrado correctamente.'); else setMessage(body.error || 'No se pudo guardar.'); }
  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setMessage(''); }}><DialogContent className="max-w-lg rounded-[1.75rem] p-6 sm:p-7"><DialogHeader><DialogTitle className="text-xl font-extrabold">Registrar suplemento</DialogTitle><DialogDescription>Guarda la recomendación separada de los medicamentos declarados.</DialogDescription></DialogHeader><form onSubmit={submit} className="mt-2 grid gap-4"><div className="space-y-2"><Label htmlFor="supplement-patient">Paciente</Label><Select name="patientId" required><SelectTrigger id="supplement-patient" className="h-11 w-full rounded-xl"><SelectValue placeholder="Seleccionar paciente" /></SelectTrigger><SelectContent>{patients.map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="supplement-name">Nombre del suplemento</Label><Input id="supplement-name" name="name" required className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="instructions">Indicaciones de uso</Label><Input id="instructions" name="instructions" placeholder="Ej. 1 cápsula después del desayuno" className="h-11 rounded-xl" /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="quantity">Cantidad</Label><Input id="quantity" name="quantity" className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="lotNumber">Lote</Label><Input id="lotNumber" name="lotNumber" className="h-11 rounded-xl" /></div></div>{message && <p className="rounded-xl bg-muted p-3 text-sm font-medium">{message}</p>}<Button type="submit" disabled={saving} className="h-12 rounded-xl font-bold">{saving ? <LoaderCircle className="animate-spin" /> : <Leaf />} Guardar recomendación</Button></form></DialogContent></Dialog>
  );
}
