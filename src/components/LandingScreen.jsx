import { useState } from 'react'

const NAV = [
  { id: 'inicio', label: 'Inicio', href: '#inicio' },
  { id: 'funciones', label: 'Funciones', href: '#funciones' },
  { id: 'como-funciona', label: 'Cómo funciona', href: '#como-funciona' },
]

export default function LandingScreen({ onStart }) {
  const [activeNav, setActiveNav] = useState('inicio')

  return (
    <div className="landing-page-bg relative min-h-screen font-display text-pastel-ink">
      {/* ── Header fijo (fuera del recuadro) ── */}
      <header className="sticky top-0 z-50 border-b border-pastel-ink/10 bg-pastel-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-8">
          <a
            href="#inicio"
            onClick={() => setActiveNav('inicio')}
            className="text-2xl font-extrabold tracking-tight text-pastel-grape"
          >
            Signara
          </a>
          <nav className="hidden items-center gap-2 md:flex">
            {NAV.map(({ id, label, href }) => (
              <a
                key={id}
                href={href}
                onClick={() => setActiveNav(id)}
                className={
                  'rounded-full border-2 px-4 py-2 text-sm font-bold transition ' +
                  (activeNav === id
                    ? 'border-pastel-purple-line bg-pastel-purple text-pastel-grape'
                    : 'border-pastel-ink/15 bg-white text-pastel-sub hover:text-pastel-ink')
                }
              >
                {label}
              </a>
            ))}
          </nav>
          <button
            onClick={onStart}
            className="rounded-full bg-pastel-grape px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(126,100,201,0.6)] transition hover:scale-[1.03] hover:brightness-105 focus:outline-none focus:ring-4 focus:ring-pastel-purple"
          >
            Probar
          </button>
        </div>
      </header>

      {/* ── Hero (panel estilo "Welcome") ── */}
      <section id="inicio" className="scroll-mt-20 px-4 pt-6 md:px-6 md:pt-8">
        <div className="mx-auto max-w-6xl rounded-[2.5rem] border-2 border-pastel-ink/10 bg-[#FAF6EC] p-6 shadow-[0_30px_70px_-40px_rgba(45,42,38,0.55)] md:p-10">
          {/* contenido en 2 columnas */}
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-8">
            {/* izquierda */}
            <div className="animate-fade-up">
              <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
                Comunícate <br className="hidden sm:block" />
                sin <Pill color="purple">barreras</Pill>
              </h1>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-pastel-grape">
                Lengua de señas para todos
              </p>
              <div className="mt-5 max-w-md space-y-4 text-sm leading-relaxed text-pastel-sub md:text-base">
                <p>
                  Signara traduce tu voz y tu texto a lengua de señas con un avatar, e interpreta
                  señas con la cámara en tiempo real.
                </p>
                <p>
                  Creemos que la comunicación debe ser accesible para todos.
                </p>
              </div>
              <button
                onClick={onStart}
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-pastel-purple px-7 py-4 text-sm font-bold text-pastel-grape shadow-[0_14px_30px_-12px_rgba(126,100,201,0.7)] ring-2 ring-pastel-purple-line transition hover:scale-[1.03] hover:brightness-[1.02] focus:outline-none focus:ring-4 focus:ring-pastel-purple"
              >
                Empezar ahora
                <ArrowRightIcon />
              </button>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-pastel-sub">
                <span className="inline-flex items-center gap-1.5 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-pastel-green-line">
                  <CheckIcon /> Tiempo real
                </span>
                <span className="inline-flex items-center gap-1.5 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-pastel-green-line">
                  <CheckIcon /> Sin registro
                </span>
                <span className="inline-flex items-center gap-1.5 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-pastel-green-line">
                  <CheckIcon /> En tu navegador
                </span>
              </div>
            </div>

            {/* derecha: pila de tarjetas */}
            <div className="relative">
              <SmileySticker className="-top-3 right-0 hidden lg:flex" />
              <div className="mb-5 flex items-center gap-2 text-sm font-bold text-pastel-ink">
                ¿Qué resuelve Signara?
                <ArrowDownIcon />
              </div>
              <CardStack onStart={onStart} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Impacto ── */}
      <section className="px-4 py-10 md:px-6">
        <div className="mx-auto max-w-6xl rounded-[2rem] border-2 border-pastel-purple-line bg-pastel-purple/50 px-8 py-12 text-center md:px-14">
          <p className="text-5xl font-extrabold text-pastel-grape md:text-6xl">+70 millones</p>
          <p className="mx-auto mt-4 max-w-2xl text-base font-bold text-pastel-ink md:text-lg">
            de personas en el mundo se comunican con lengua de señas.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-pastel-sub">
            La mayoría de quienes oyen no la conocen. Signara construye ese puente entre los dos
            mundos.
          </p>
          <p className="mt-5 text-[11px] uppercase tracking-wider text-pastel-sub/70">
            Fuente: Federación Mundial de Personas Sordas
          </p>
        </div>
      </section>

      {/* ── Funciones ── */}
      <section id="funciones" className="scroll-mt-24 px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="relative flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionLabel color="green">Funciones</SectionLabel>
              <h2 className="mt-5 max-w-xl text-3xl font-extrabold leading-tight md:text-[2.6rem]">
                Todo lo que Signara hace por ti
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-pastel-sub">
              Dos formas de comunicarte y un avatar que da vida a cada seña, en tiempo real.
            </p>
            <SmileySticker className="-top-6 right-0 hidden md:block" />
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <FeatureCard
              color="green"
              tag="Voz y texto"
              title="Traducir"
              description="Escribe o habla en español y míralo convertido en señas con un avatar."
              icon={<TranslateIcon />}
              onStart={onStart}
            />
            <FeatureCard
              color="blue"
              tag="Cámara + IA"
              title="Interpretar"
              description="Apunta la cámara a las señas y conviértelas en texto o voz al instante."
              icon={<CameraIcon />}
              onStart={onStart}
            />
            <FeatureCard
              color="purple"
              tag="Animado"
              title="Avatar 3D"
              description="Un avatar realiza las señas con movimientos naturales y fáciles de seguir."
              icon={<AvatarIcon />}
              onStart={onStart}
            />
          </div>
        </div>
      </section>

      {/* ── Caso de uso (antes vs con) ── */}
      <section className="px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <SectionLabel color="yellow">El cambio</SectionLabel>
            <h2 className="mt-5 text-3xl font-extrabold md:text-[2.6rem]">
              De la barrera a la conversación
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            <CompareCard
              variant="before"
              title="Sin Signara"
              items={[
                'Dependes de un intérprete o de escribir notas',
                'Malentendidos y momentos incómodos',
                'La comunicación se vuelve lenta y frustrante',
              ]}
            />
            <CompareCard
              variant="after"
              title="Con Signara"
              items={[
                'Traduces e interpretas al instante',
                'Te haces entender sin intermediarios',
                'Conversaciones fluidas y naturales',
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── Por qué Signara + confianza ── */}
      <section className="px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <SectionLabel color="blue">Por qué Signara</SectionLabel>
            <h2 className="mt-5 text-3xl font-extrabold md:text-[2.6rem]">Hecho para que empieces ya</h2>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            <TrustBadge icon={<BoltIcon />} title="Tiempo real" description="Traduce e interpreta al instante." />
            <TrustBadge icon={<CheckIcon />} title="Sin registro" description="Entra y úsalo al momento." />
            <TrustBadge icon={<GlobeIcon />} title="En tu navegador" description="Nada que instalar." />
            <TrustBadge icon={<CodeIcon />} title="Código abierto" description="Transparente y comunitario." />
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section id="como-funciona" className="scroll-mt-24 px-6 pb-24 pt-4 md:px-10 md:pb-32">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <SectionLabel color="purple">Cómo funciona</SectionLabel>
            <h2 className="mt-5 text-3xl font-extrabold md:text-[2.6rem]">Empieza en 3 pasos</h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            <StepCard color="green" number="01" title="Elige tu modo" description="Traducir o interpretar, según lo que necesites." />
            <StepCard color="blue" number="02" title="Interactúa" description="Escribe, habla o usa la cámara para empezar." />
            <StepCard color="purple" number="03" title="Conecta" description="Comunicación sin barreras con quien quieras." />
          </div>

        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-4 pb-16 md:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border-2 border-pastel-purple-line bg-pastel-purple px-8 py-16 text-center md:px-14 md:py-20">
          <HeartSticker className="left-[12%] top-10 hidden rotate-[-12deg] md:block" />
          <HeartSticker className="bottom-12 right-[14%] hidden rotate-[14deg] md:block" small />
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight text-pastel-ink md:text-5xl">
            Empieza a comunicarte sin barreras hoy
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm font-semibold text-pastel-grape md:text-base">
            Sin registro y directo en tu navegador.
          </p>
          <button
            onClick={onStart}
            className="mt-9 inline-flex items-center gap-2 rounded-full bg-pastel-grape px-9 py-4 text-base font-bold text-white shadow-[0_16px_36px_-12px_rgba(126,100,201,0.85)] transition hover:scale-[1.03] hover:brightness-105 focus:outline-none focus:ring-4 focus:ring-white/50"
          >
            Probar Signara
            <ArrowRightIcon />
          </button>
        </div>
      </section>

      <footer className="border-t border-pastel-ink/10 px-6 py-8 text-center">
        <p className="text-xs text-pastel-sub">
          © {new Date().getFullYear()} Signara — hecho con accesibilidad en mente
        </p>
      </footer>
    </div>
  )
}

/* ── Pastilla de color del titular ── */
const PILL_COLORS = {
  green: 'bg-pastel-green border-pastel-green-line',
  blue: 'bg-white border-pastel-blue-line',
  purple: 'bg-pastel-purple border-pastel-purple-line',
  yellow: 'bg-pastel-yellow border-pastel-yellow-line',
}

function Pill({ color, children }) {
  return (
    <span
      className={
        'inline-block rounded-2xl border-2 px-4 py-1.5 shadow-[0_8px_18px_-8px_rgba(45,42,38,0.4)] ' +
        PILL_COLORS[color]
      }
    >
      {children}
    </span>
  )
}

const LABEL_COLORS = {
  green: 'bg-pastel-green border-pastel-green-line',
  blue: 'bg-pastel-blue border-pastel-blue-line',
  yellow: 'bg-pastel-yellow border-pastel-yellow-line',
  purple: 'bg-pastel-purple border-pastel-purple-line',
}

function SectionLabel({ color, children }) {
  return (
    <span
      className={
        'inline-block rounded-full border-2 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-pastel-ink ' +
        LABEL_COLORS[color]
      }
    >
      {children}
    </span>
  )
}

/* ── Tarjeta de función (estilo "teacher card" del mosaico) ── */
const CARD_COLORS = {
  green: 'border-pastel-green-line bg-pastel-green/40',
  blue: 'border-pastel-blue-line bg-pastel-blue/40',
  purple: 'border-pastel-purple-line bg-pastel-purple/40',
}

const CARD_TAG_COLORS = {
  green: 'border-pastel-green-line bg-white',
  blue: 'border-pastel-blue-line bg-white',
  purple: 'border-pastel-purple-line bg-white',
}

const CARD_ICON_COLORS = {
  green: 'border-pastel-green-line',
  blue: 'border-pastel-blue-line',
  purple: 'border-pastel-purple-line',
}

function FeatureCard({ color, tag, title, description, icon, onStart }) {
  return (
    <button
      onClick={onStart}
      className={
        'group flex h-full flex-col rounded-[1.75rem] border-2 p-7 text-left shadow-[0_16px_36px_-22px_rgba(45,42,38,0.45)] transition hover:-translate-y-1.5 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-pastel-ink/10 ' +
        CARD_COLORS[color]
      }
    >
      <div className="flex items-center justify-between">
        <span
          className={
            'rounded-full border-2 px-3 py-1 text-[11px] font-bold text-pastel-ink ' + CARD_TAG_COLORS[color]
          }
        >
          {tag}
        </span>
        <span
          className={
            'flex h-12 w-12 items-center justify-center rounded-2xl border-2 bg-white text-pastel-ink transition group-hover:scale-105 ' +
            CARD_ICON_COLORS[color]
          }
        >
          {icon}
        </span>
      </div>

      <h3 className="mt-8 text-xl font-extrabold text-pastel-ink">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-pastel-sub">{description}</p>

      <span className="mt-6 inline-flex items-center gap-2 self-end">
        <span className="text-sm font-bold text-pastel-ink">Probar</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-pastel-ink/15 bg-white text-pastel-ink transition group-hover:translate-x-0.5">
          <ArrowRightIcon />
        </span>
      </span>
    </button>
  )
}

/* ── Tarjeta de paso (estilo "card stack" del mosaico) ── */
const STEP_BADGE_COLORS = {
  green: 'border-pastel-green-line text-pastel-ink',
  blue: 'border-pastel-blue-line text-pastel-ink',
  purple: 'border-pastel-purple-line text-pastel-grape',
}

function StepCard({ color, number, title, description }) {
  return (
    <div className="rounded-[1.75rem] border-2 border-pastel-ink/10 bg-white p-7 shadow-[0_16px_36px_-22px_rgba(45,42,38,0.35)]">
      <span
        className={
          'flex h-12 w-12 items-center justify-center rounded-2xl border-2 bg-pastel-cream text-lg font-extrabold ' +
          STEP_BADGE_COLORS[color]
        }
      >
        {number}
      </span>
      <h3 className="mt-6 text-lg font-extrabold text-pastel-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-pastel-sub">{description}</p>
    </div>
  )
}

/* ── Stickers decorativos ── */
function HeartSticker({ className = '', small = false }) {
  const size = small ? 22 : 30
  return (
    <svg
      className={'pointer-events-none absolute drop-shadow-[0_6px_10px_rgba(45,42,38,0.18)] ' + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#FF7E92"
      aria-hidden="true"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

function SmileySticker({ className = '' }) {
  return (
    <span
      className={
        'pointer-events-none absolute flex h-12 w-12 items-center justify-center rounded-full border-2 border-pastel-ink/15 bg-pastel-yellow shadow-[0_6px_14px_-6px_rgba(45,42,38,0.3)] ' +
        className
      }
      aria-hidden="true"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2D2A26" strokeWidth="2" strokeLinecap="round">
        <circle cx="9" cy="10" r="0.6" fill="#2D2A26" />
        <circle cx="15" cy="10" r="0.6" fill="#2D2A26" />
        <path d="M8.5 14c1 1.5 6 1.5 7 0" />
      </svg>
    </span>
  )
}

/* ── Pila de tarjetas con contenido (estilo "Welcome") ── */
const STACK_COLORS = {
  green: { border: 'border-pastel-green-line', box: 'bg-pastel-green/50' },
  blue: { border: 'border-pastel-blue-line', box: 'bg-pastel-blue/50' },
  purple: { border: 'border-pastel-purple-line', box: 'bg-pastel-purple/50' },
}

function ContentCard({ color, number, icon, title, description, onStart, className = '' }) {
  const c = STACK_COLORS[color]
  return (
    <button
      onClick={onStart}
      className={
        'group absolute w-[200px] rounded-[1.75rem] border-2 bg-white p-5 text-left shadow-[0_24px_48px_-28px_rgba(45,42,38,0.5)] transition-all duration-300 ' +
        'hover:z-40 hover:-translate-y-4 hover:rotate-0 hover:scale-[1.05] hover:shadow-[0_34px_60px_-26px_rgba(45,42,38,0.55)] ' +
        'focus-visible:z-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pastel-ink/10 ' +
        c.border +
        ' ' +
        className
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-xl font-extrabold text-pastel-ink">{number}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-pastel-ink/15 bg-white text-pastel-ink opacity-0 transition group-hover:opacity-100 [&>svg]:h-3.5 [&>svg]:w-3.5">
          <ArrowRightIcon />
        </span>
      </div>
      <div className="mt-2 h-0.5 w-full rounded-full bg-pastel-ink/10" />
      <div className="my-5 flex justify-center">
        <span className={'flex h-16 w-16 items-center justify-center rounded-2xl text-pastel-ink [&>svg]:h-9 [&>svg]:w-9 ' + c.box}>
          {icon}
        </span>
      </div>
      <h3 className="text-base font-extrabold text-pastel-ink">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-pastel-sub">{description}</p>
    </button>
  )
}

function CardStack({ onStart }) {
  return (
    <div className="relative mx-auto h-[400px] w-full max-w-[460px]">
      <ContentCard
        color="green"
        number="01"
        icon={<ChatIcon />}
        title="Sin barreras"
        description="Habla con personas sordas aunque no sepas señas."
        onStart={onStart}
        className="left-0 top-8 z-[1] -rotate-[8deg]"
      />
      <ContentCard
        color="blue"
        number="02"
        icon={<BoltIcon />}
        title="Al instante"
        description="Traduce e interpreta en tiempo real, sin intérprete."
        onStart={onStart}
        className="left-1/2 top-0 z-[2] -translate-x-1/2 rotate-0"
      />
      <ContentCard
        color="purple"
        number="03"
        icon={<HeartIcon />}
        title="Para todos"
        description="Comunicación accesible e inclusiva para cualquiera."
        onStart={onStart}
        className="right-0 top-8 z-[3] rotate-[8deg]"
      />
    </div>
  )
}

/* ── Comparativa antes / con Signara ── */
function CompareCard({ variant, title, items }) {
  const before = variant === 'before'
  return (
    <div
      className={
        'rounded-[1.75rem] border-2 p-7 shadow-[0_16px_36px_-26px_rgba(45,42,38,0.4)] ' +
        (before ? 'border-pastel-ink/10 bg-white' : 'border-pastel-green-line bg-pastel-green/40')
      }
    >
      <h3 className="text-lg font-extrabold text-pastel-ink">{title}</h3>
      <ul className="mt-5 space-y-3">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-3 text-sm text-pastel-ink/80">
            <span
              className={
                'mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full [&>svg]:h-3 [&>svg]:w-3 ' +
                (before ? 'bg-pastel-pink/20 text-pastel-pink' : 'bg-white text-pastel-green-line')
              }
            >
              {before ? <XIcon /> : <CheckIcon />}
            </span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Señal de confianza ── */
function TrustBadge({ icon, title, description }) {
  return (
    <div className="rounded-2xl border-2 border-pastel-ink/10 bg-white p-5 text-center shadow-[0_14px_30px_-24px_rgba(45,42,38,0.4)]">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-pastel-blue/50 text-pastel-ink [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </span>
      <h3 className="mt-3 text-sm font-extrabold text-pastel-ink">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-pastel-sub">{description}</p>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
    </svg>
  )
}

function CodeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12" />
    </svg>
  )
}

function ScrollIndicator() {
  return (
    <a
      href="#funciones"
      className="mt-auto flex flex-col items-center gap-2 pt-12 text-pastel-sub/70 transition hover:text-pastel-ink"
      aria-label="Desplazarse hacia abajo"
    >
      <svg width="28" height="44" viewBox="0 0 28 44" fill="none" className="opacity-80">
        <rect x="1" y="1" width="26" height="42" rx="13" stroke="currentColor" strokeWidth="2" />
        <rect x="12" y="10" width="4" height="8" rx="2" fill="currentColor" className="animate-bounce" />
      </svg>
    </a>
  )
}

/* ── Iconos ── */
function TranslateIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h7M9 3v2c0 4-2.5 7-5 8M5 9c0 2.5 2.5 4.5 5 5.5" />
      <path d="M14 20l3.5-9 3.5 9M15.2 17h4.6" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function AvatarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21c0-3.87 3.13-7 7-7s7 3.13 7 7" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      <path d="M20 9h0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v3l-4-3" opacity="0.5" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20.3l-1.3-1.2C5.4 14.4 2 11.3 2 7.6 2 4.9 4.1 3 6.7 3c1.5 0 3 .7 3.9 1.9C11.5 3.7 13 3 14.5 3 17.1 3 19.2 4.9 19.2 7.6c0 3.7-3.4 6.8-8.7 11.5L12 20.3z" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  )
}

