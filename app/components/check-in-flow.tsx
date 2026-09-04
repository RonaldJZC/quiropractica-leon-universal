'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LoaderCircle,
  QrCode,
  RotateCcw,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { CLINIC_QR_CODE } from '@/lib/clinic';

type Appointment = {
  appointmentId: string;
  firstName: string;
  lastInitial: string;
  time: string;
};

type Success = {
  firstName: string;
  appointmentTime: string;
  checkedInAt: string;
};

export function CheckInFlow() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Appointment[]>([]);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<'pin' | 'scan'>('pin');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [success, setSuccess] = useState<Success | null>(null);
  const [preScanned, setPreScanned] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPreScanned(new URLSearchParams(window.location.search).get('qr') === CLINIC_QR_CODE);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    void Promise.resolve(
      context.registerTool(
        {
          name: 'start_patient_check_in',
          title: 'Iniciar registro de llegada',
          description:
            'Abre el flujo visible de llegada y busca entre las citas de hoy usando el nombre indicado.',
          inputSchema: {
            type: 'object',
            properties: {
              searchQuery: { type: 'string', minLength: 3 },
            },
            required: ['searchQuery'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          async execute(input) {
            const searchQuery =
              typeof input === 'object' && input !== null &&
              typeof (input as { searchQuery?: unknown }).searchQuery === 'string'
                ? (input as { searchQuery: string }).searchQuery.trim()
                : '';
            if (searchQuery.length < 3) {
              throw new Error('La búsqueda debe tener al menos tres caracteres.');
            }
            setQuery(searchQuery);
            searchRef.current?.focus();
            searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await Promise.resolve();
            return { status: 'started', searchQuery };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/appointments?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as { appointments?: Appointment[] };
        setResults(data.appointments ?? []);
      } catch (requestError) {
        if ((requestError as Error).name !== 'AbortError') setResults([]);
      } finally {
        setLoading(false);
      }
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const registerArrival = useCallback(async (qrCode: string) => {
    if (!selected || checkingIn) return;
    setCheckingIn(true);
    setError('');
    try {
      const response = await fetch('/api/public/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: selected.appointmentId,
          pin,
          qrCode,
        }),
      });
      const data = (await response.json()) as Success & { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo registrar la llegada.');
      setDialogOpen(false);
      setSuccess(data);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setCheckingIn(false);
    }
  }, [checkingIn, pin, selected]);

  useEffect(() => {
    if (!dialogOpen || step !== 'scan' || !videoRef.current) return;

    let scanner: { start: () => Promise<void>; stop: () => void; destroy: () => void } | null = null;
    let cancelled = false;

    void import('qr-scanner').then(async ({ default: QrScanner }) => {
      if (cancelled || !videoRef.current) return;
      scanner = new QrScanner(
        videoRef.current,
        (result) => void registerArrival(result.data),
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        },
      );
      try {
        await scanner.start();
      } catch {
        setError('No pudimos abrir la cámara. Puedes usar el botón de prueba o pedir ayuda.');
      }
    });

    return () => {
      cancelled = true;
      scanner?.stop();
      scanner?.destroy();
    };
  }, [dialogOpen, registerArrival, step]);

  function reset() {
    setSuccess(null);
    setQuery('');
    setSelected(null);
    setPin('');
    setError('');
    setStep('pin');
  }

  if (success) {
    const time = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(success.checkedInAt));

    return (
      <Card className="overflow-hidden rounded-[2rem] border-white bg-white/95 shadow-[0_28px_80px_-30px_rgba(6,47,55,0.32)]">
        <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500" />
        <CardContent className="flex min-h-[520px] flex-col items-center justify-center px-7 py-12 text-center sm:px-10">
          <span className="grid size-24 place-items-center rounded-full bg-emerald-100 text-emerald-700 shadow-[0_0_0_14px_rgba(209,250,229,0.45)]">
            <Check className="size-12 stroke-[3]" aria-hidden="true" />
          </span>
          <p className="mt-10 text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
            Llegada registrada
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">
            Bienvenido, {success.firstName}
          </h2>
          <p className="mt-3 max-w-sm text-base leading-7 text-muted-foreground">
            Tu cita es a las {success.appointmentTime}. Avisamos al profesional que
            llegaste a las {time}.
          </p>
          <Button variant="outline" className="mt-9 h-12 rounded-xl px-5" onClick={reset}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Registrar otra llegada
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden rounded-[2rem] border-white bg-white/95 shadow-[0_28px_80px_-30px_rgba(6,47,55,0.32)]">
        <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500" />
        <CardHeader className="space-y-3 px-6 pb-3 pt-7 sm:px-8 sm:pt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-extrabold tracking-tight">
                Registrar mi llegada
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                Escribe al menos tres letras de tu nombre.
              </CardDescription>
            </div>
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-800">
              <QrCode className="size-6" aria-hidden="true" />
            </span>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-7 sm:px-8 sm:pb-8">
          <label htmlFor="patient-search" className="mb-2 block text-sm font-bold">
            Tu nombre
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={searchRef}
              id="patient-search"
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                setSelected(null);
                if (nextQuery.trim().length < 3) {
                  setResults([]);
                  setLoading(false);
                }
              }}
              autoComplete="off"
              placeholder="Ejemplo: Carlos"
              className="h-14 rounded-2xl border-border bg-muted/55 pl-12 text-base shadow-none focus-visible:bg-white"
            />
            {loading && (
              <LoaderCircle className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-cyan-700" />
            )}
          </div>

          <div className="mt-4 min-h-36" aria-live="polite">
            {query.trim().length < 3 ? (
              <div className="flex h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-5 text-center">
                <Search className="mb-2 size-6 text-muted-foreground/70" aria-hidden="true" />
                <p className="text-sm font-medium text-muted-foreground">
                  Aquí aparecerán únicamente las citas de hoy.
                </p>
              </div>
            ) : !loading && results.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center rounded-2xl bg-amber-50 px-5 text-center text-amber-950">
                <CalendarClock className="mb-2 size-6" aria-hidden="true" />
                <p className="font-semibold">No encontramos una cita para hoy.</p>
                <p className="mt-1 text-sm opacity-75">Revisa el nombre o pide ayuda al profesional.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((appointment) => {
                  const isSelected = appointment.appointmentId === selected?.appointmentId;
                  return (
                    <button
                      key={appointment.appointmentId}
                      type="button"
                      onClick={() => setSelected(appointment)}
                      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground shadow-md'
                          : 'border-border bg-white hover:border-cyan-300 hover:bg-cyan-50/60'
                      }`}
                    >
                      <span className={`grid size-11 shrink-0 place-items-center rounded-full text-sm font-black ${isSelected ? 'bg-white/15 text-white' : 'bg-cyan-100 text-cyan-900'}`}>
                        {appointment.firstName.charAt(0)}{appointment.lastInitial.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{appointment.firstName} {appointment.lastInitial}</span>
                        <span className={`mt-0.5 flex items-center gap-1.5 text-sm ${isSelected ? 'text-white/75' : 'text-muted-foreground'}`}>
                          <Clock3 className="size-3.5" aria-hidden="true" />
                          Cita de hoy · {appointment.time}
                        </span>
                      </span>
                      {isSelected ? <CheckCircle2 className="size-5" /> : <ChevronRight className="size-5 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Button
            size="lg"
            disabled={!selected}
            onClick={() => {
              setStep('pin');
              setError('');
              setDialogOpen(true);
            }}
            className="mt-5 h-14 w-full rounded-2xl text-base font-bold shadow-lg shadow-primary/15"
          >
            Continuar con mi código
            <ArrowRight className="size-5" aria-hidden="true" />
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-[1.75rem] p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold">
              {step === 'pin' ? 'Confirma tu código' : 'Escanea el QR de la entrada'}
            </DialogTitle>
            <DialogDescription className="text-base leading-6">
              {step === 'pin'
                ? `Cita de ${selected?.firstName} ${selected?.lastInitial} a las ${selected?.time}.`
                : 'Apunta la cámara al código QR impreso en la puerta.'}
            </DialogDescription>
          </DialogHeader>

          {step === 'pin' ? (
            <div className="py-4">
              <InputOTP
                value={pin}
                onChange={(value) => {
                  setPin(value);
                  setError('');
                }}
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="Código personal de seis dígitos"
                containerClassName="justify-center"
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot key={index} index={index} className="size-12 rounded-xl border text-lg font-bold first:rounded-xl last:rounded-xl" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {preScanned && (
                <p className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-800">
                  <CheckCircle2 className="size-4" /> QR de entrada confirmado
                </p>
              )}
              <p className="mt-4 text-center text-sm text-muted-foreground">
                En la demostración, Carlos usa <strong className="text-foreground">482731</strong>.
              </p>
            </div>
          ) : (
            <div className="py-2">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-950">
                <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                {checkingIn && (
                  <div className="absolute inset-0 grid place-items-center bg-slate-950/75 text-white">
                    <div className="text-center">
                      <LoaderCircle className="mx-auto size-9 animate-spin" />
                      <p className="mt-3 font-semibold">Registrando llegada…</p>
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="secondary"
                className="mt-3 h-11 w-full rounded-xl"
                disabled={checkingIn}
                onClick={() => void registerArrival(CLINIC_QR_CODE)}
              >
                <QrCode className="size-4" />
                Usar QR de demostración
              </Button>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            {step === 'scan' && (
              <Button variant="outline" className="h-12 rounded-xl" onClick={() => setStep('pin')}>
                <ArrowLeft className="size-4" />
                Atrás
              </Button>
            )}
            {step === 'pin' && (
              <Button
                className="h-12 w-full rounded-xl font-bold"
                disabled={pin.length !== 6}
                onClick={() =>
                  preScanned
                    ? void registerArrival(CLINIC_QR_CODE)
                    : (setStep('scan'), setError(''))
                }
              >
                {checkingIn ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : preScanned ? (
                  <Check className="size-4" />
                ) : (
                  <Camera className="size-4" />
                )}
                {preScanned ? 'Confirmar mi llegada' : 'Abrir cámara para escanear'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
