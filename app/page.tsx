import Link from 'next/link';
import { LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CheckInFlow } from '@/app/components/check-in-flow';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Inicio">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Centro
              </span>
              <span className="block text-base font-bold tracking-tight">Quiropráctico</span>
            </span>
          </Link>

          <Badge
            variant="secondary"
            className="hidden gap-2 rounded-full border border-border bg-white px-3.5 py-2 text-sm font-medium text-foreground sm:flex"
          >
            <span className="size-2 rounded-full bg-emerald-500" />
            Atención hoy · 8:00–21:00
          </Badge>
        </div>
      </header>

      <section className="relative isolate overflow-hidden">
        <div className="arrival-grid absolute inset-0 -z-10 opacity-60" />
        <div className="absolute -left-32 top-36 -z-10 size-80 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="absolute -right-32 top-16 -z-10 size-80 rounded-full bg-emerald-200/45 blur-3xl" />

        <div className="mx-auto grid min-h-[calc(100vh-78px)] max-w-[1180px] items-center gap-10 px-5 py-12 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-16">
          <div className="max-w-xl">
            <Badge className="mb-6 rounded-full bg-cyan-100 px-4 py-2 text-sm font-semibold text-cyan-950 hover:bg-cyan-100">
              Llegada rápida · Sin instalar aplicaciones
            </Badge>
            <h1 className="max-w-[11ch] text-balance text-4xl font-black leading-[1.03] tracking-[-0.045em] sm:text-6xl">
              Registra tu llegada en pocos segundos.
            </h1>
            <p className="mt-6 max-w-lg text-pretty text-lg leading-8 text-muted-foreground">
              Busca tu cita de hoy. Luego confirmarás tu código personal y el QR
              disponible en la entrada.
            </p>

            <ol className="mt-9 grid gap-3 sm:grid-cols-3 lg:max-w-xl">
              {[
                ['01', 'Busca tu nombre'],
                ['02', 'Confirma tu código'],
                ['03', 'Escanea el QR'],
              ].map(([number, label]) => (
                <li
                  key={number}
                  className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/65 p-3 shadow-sm backdrop-blur"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">
                    {number}
                  </span>
                  <span className="text-sm font-semibold leading-tight">{label}</span>
                </li>
              ))}
            </ol>

            <div className="mt-9 flex items-center gap-3 text-sm text-muted-foreground">
              <ShieldCheck className="size-5 text-emerald-700" aria-hidden="true" />
              Tus datos clínicos nunca se muestran en esta pantalla.
            </div>
          </div>

          <div>
            <CheckInFlow />
            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <LockKeyhole className="size-4" aria-hidden="true" />
              <span>¿Eres el profesional?</span>
              <Link href="/admin" className="font-bold text-primary underline-offset-4 hover:underline">
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
