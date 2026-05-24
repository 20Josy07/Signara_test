import Logo from './Logo.jsx'
import AnimatedBackground from './AnimatedBackground.jsx'

const FEATURES = [
  {
    title: 'Texto/Voz a señas',
    description:
      'Escribe o habla en español y un avatar 3D traduce tu mensaje a lengua de señas en tiempo real.',
    icon: <TranslateIcon />,
    tags: ['Texto', 'Voz', 'Avatar 3D'],
    tag: 'Entrada oral/escrita',
    accent: 'from-palette-iris to-palette-azure',
  },
  {
    title: 'Señas a texto/voz',
    description:
      'Usa la cámara para interpretar señas y obtener texto o voz al instante.',
    icon: <CameraIcon />,
    tags: ['Cámara', 'Texto', 'Voz'],
    tag: 'Entrada visual',
    accent: 'from-palette-azure to-palette-mist',
  },
]

const VALUES = [
  { icon: <HeartIcon />, label: 'Accesible', desc: 'Para todos' },
  { icon: <BoltIcon />, label: 'Instantáneo', desc: 'En tiempo real' },
  { icon: <UsersIcon />, label: 'Inclusivo', desc: 'Sin barreras' },
]

const STEPS = [
  { n: '01', title: 'Elige tu modo', desc: 'Traducir o interpretar según lo que necesites.' },
  { n: '02', title: 'Interactúa', desc: 'Escribe, habla o usa la cámara.' },
  { n: '03', title: 'Conecta', desc: 'Comunicación sin barreras, al instante.' },
]

export default function LandingScreen({ onStart }) {
  return (
    <div className="relative min-h-screen text-palette-pearl">
      <AnimatedBackground />

      <div className="relative z-10">
        <nav className="sticky top-0 z-20 border-b border-white/[0.08] bg-palette-ink/30 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
            <FadeIn className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-palette-surface ring-2 ring-palette-iris/30 shadow-halo">
                <Logo size={28} />
              </div>
              <span className="text-lg font-bold tracking-tight text-palette-surface">Signara</span>
            </FadeIn>

            <FadeIn className="hidden sm:flex items-center gap-8" delay={0.05}>
              <a href="#modos" className="text-sm text-palette-pearl/70 hover:text-palette-surface transition-colors">Modos</a>
              <a href="#como-funciona" className="text-sm text-palette-pearl/70 hover:text-palette-surface transition-colors">Cómo funciona</a>
            </FadeIn>

            <FadeIn delay={0.08}>
              <button onClick={onStart} className="btn-halo !px-5 !py-2.5 text-sm">
                Comenzar
                <ArrowIcon />
              </button>
            </FadeIn>
          </div>
        </nav>

        <section className="px-6 pt-12 pb-20 md:px-10 md:pt-20 md:pb-28">
          <div className="mx-auto grid max-w-6xl grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <FadeIn delay={0.1}>
                <span className="landing-badge">
                  <span className="h-2 w-2 rounded-full bg-halo animate-pulse" />
                  Lengua de señas · Tiempo real
                </span>
              </FadeIn>

              <FadeIn as="h1" className="mt-7 text-4xl md:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.1]" delay={0.18}>
                <span className="text-palette-surface">Conectando dos mundos</span>
                <br />
                <span className="landing-hero-accent">que hoy no se entienden</span>
              </FadeIn>

              <FadeIn as="p" className="mt-6 text-base md:text-lg text-palette-pearl/80 font-light leading-relaxed max-w-lg" delay={0.26}>
                Traduce español a señas con avatares 3D, o interpreta señas desde la cámara.
                Comunicación accesible, humana y al instante.
              </FadeIn>

              <FadeIn className="mt-8 flex flex-col sm:flex-row gap-3" delay={0.34}>
                <button onClick={onStart} className="btn-halo text-base">
                  Probar ahora
                  <ArrowIcon />
                </button>
                <a href="#modos" className="btn-outline">Ver modos</a>
              </FadeIn>

              <FadeIn className="mt-10 flex flex-wrap gap-3" delay={0.42}>
                {['Avatares 3D', 'Texto & Voz', 'Cámara IA'].map((s) => (
                  <span key={s} className="landing-stat-chip">{s}</span>
                ))}
              </FadeIn>
            </div>

            <FadeIn className="relative flex justify-center lg:justify-end" delay={0.3}>
              <div className="landing-hero-card w-full max-w-md">
                <div className="landing-hero-card-glow" />
                <div className="landing-hero-card-inner">
                  <div className="flex items-center justify-between">
                    <span className="landing-hero-card-label">Signara</span>
                    <span className="landing-hero-card-live">
                      <span className="h-1.5 w-1.5 rounded-full bg-palette-azure animate-pulse" />
                      En vivo
                    </span>
                  </div>

                  <div className="mt-6 flex justify-center">
                    <div className="relative">
                      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-palette-iris/25 to-palette-azure/25 blur-2xl" />
                      <div className="relative h-52 w-44 md:h-60 md:w-48 animate-float">
                        <img
                          src="/imagenes/avatar-landing.png"
                          alt="Avatar 3D de Signara"
                          className="h-full w-full object-contain object-bottom drop-shadow-xl"
                          draggable={false}
                        />
                      </div>
                    </div>
                  </div>

                  <h3 className="mt-6 text-center text-lg font-bold text-palette-ink">
                    Traducción en tiempo real
                  </h3>

                  <div className="mt-6 grid grid-cols-2 gap-2.5">
                    {[
                      { v: '3', l: 'Avatares' },
                      { v: '2', l: 'Modos' },
                    ].map(({ v, l }) => (
                      <div key={l} className="landing-hero-stat">
                        <p className="text-xl font-extrabold text-palette-iris">{v}</p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-palette-ink/50">{l}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                    {['Texto', 'Voz', 'Cámara'].map((t) => (
                      <span key={t} className="landing-hero-tag">{t}</span>
                    ))}
                  </div>

                  <button onClick={onStart} className="btn-halo w-full mt-6 !py-3 text-sm">
                    Empezar gratis
                    <ArrowIcon />
                  </button>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="px-6 pb-16 md:px-10">
          <div className="mx-auto grid max-w-4xl grid-cols-1 sm:grid-cols-3 gap-4">
            {VALUES.map((v, i) => (
              <FadeIn key={v.label} delay={0.1 + i * 0.08}>
                <div className="landing-value-card">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-halo text-palette-surface">
                    {v.icon}
                  </div>
                  <div className="mt-3">
                    <p className="font-semibold text-palette-surface">{v.label}</p>
                    <p className="text-xs text-palette-pearl/60">{v.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        <SectionDivider />

        <section id="modos" className="px-6 py-16 md:px-10 md:py-24 scroll-mt-20">
          <FadeIn className="mx-auto max-w-5xl text-center mb-12" delay={0.1}>
            <p className="landing-section-label">Dos modos</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-palette-surface">
              Elige cómo quieres <span className="gradient-halo">comunicarte</span>
            </h2>
            <p className="mt-4 text-palette-pearl/65 max-w-xl mx-auto">
              Texto o voz hacia señas, o señas hacia texto o voz.
            </p>
          </FadeIn>

          <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={0.15 + i * 0.1}>
                <FeatureCard {...f} onStart={onStart} />
              </FadeIn>
            ))}
          </div>
        </section>

        <SectionDivider />

        <section id="como-funciona" className="px-6 py-16 md:px-10 md:py-24 scroll-mt-20">
          <div className="mx-auto max-w-5xl">
            <FadeIn className="text-center mb-12" delay={0.1}>
              <p className="landing-section-label">Simple y directo</p>
              <h2 className="mt-3 text-3xl md:text-4xl font-bold text-palette-surface">¿Cómo funciona?</h2>
            </FadeIn>

            <FadeIn className="landing-steps-panel" delay={0.18}>
              <div className="hidden md:block absolute top-[3.25rem] left-[16%] right-[16%] h-px bg-gradient-to-r from-palette-iris/50 via-palette-azure/50 to-palette-mist/50" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
                {STEPS.map((s, i) => (
                  <FadeIn key={s.n} className="relative text-center" delay={0.22 + i * 0.08}>
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-halo text-base font-bold text-palette-surface shadow-halo ring-4 ring-palette-iris/10">
                      {s.n}
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-palette-surface">{s.title}</h3>
                    <p className="mt-2 text-sm text-palette-pearl/65 leading-relaxed">{s.desc}</p>
                  </FadeIn>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10 md:pb-24">
          <FadeIn className="landing-cta-banner mx-auto max-w-3xl" delay={0.1}>
            <div className="absolute -inset-px rounded-[2rem] bg-halo opacity-70 blur-[2px]" />
            <div className="relative rounded-[2rem] border border-white/15 bg-palette-surface/[0.07] backdrop-blur-2xl px-8 py-12 md:px-14 md:py-16 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-palette-surface shadow-halo">
                <Logo size={40} />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-palette-surface">
                ¿Listo para romper la barrera del silencio?
              </h2>
              <p className="mt-3 text-palette-pearl/70 max-w-md mx-auto">
                Sin instalación. Gratis. Hecho para hacer la comunicación más inclusiva.
              </p>
              <button onClick={onStart} className="btn-halo mt-8 text-base">
                Comenzar ahora
                <ArrowIcon />
              </button>
            </div>
          </FadeIn>
        </section>

        <footer className="px-6 py-8 text-center border-t border-white/[0.08] bg-palette-ink/20">
          <p className="text-xs text-palette-pearl/40">
            © {new Date().getFullYear()} Signara — Hackathon MVP · Hecho con accesibilidad en mente
          </p>
        </footer>
      </div>
    </div>
  )
}

function SectionDivider() {
  return (
    <div className="mx-auto max-w-5xl px-6 md:px-10">
      <div className="h-px bg-gradient-to-r from-transparent via-palette-iris/40 to-transparent" />
    </div>
  )
}

function FeatureCard({ title, description, icon, tags, tag, accent, onStart }) {
  return (
    <button
      onClick={onStart}
      className="group landing-feature-card w-full text-left focus:outline-none focus:ring-2 focus:ring-palette-iris/50"
    >
      <div className={'absolute top-0 left-6 right-6 h-px bg-gradient-to-r ' + accent + ' opacity-60 group-hover:opacity-100 transition-opacity'} />
      <div className={'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ' + accent + ' text-palette-surface shadow-halo group-hover:scale-105 transition-transform duration-300'}>
        {icon}
      </div>
      <span className="mt-5 inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-palette-iris/20 text-palette-mist border border-palette-iris/20">
        {tag}
      </span>
      <h3 className="mt-3 text-xl font-bold text-palette-surface">{title}</h3>
      <p className="mt-2 text-sm text-palette-pearl/70 leading-relaxed">{description}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-palette-azure/10 text-palette-mist border border-palette-azure/25">
            {t}
          </span>
        ))}
      </div>
      <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold gradient-halo opacity-80 group-hover:opacity-100 transition-opacity">
        Empezar
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  )
}

function FadeIn({ children, className = '', delay = 0, as: Tag = 'div' }) {
  const style = delay ? { animationDelay: `${delay}s` } : undefined
  return (
    <Tag className={'animate-fade-up ' + className} style={style}>
      {children}
    </Tag>
  )
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  )
}

function TranslateIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8l6 6" /><path d="M4 14l6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" />
      <path d="M22 22l-5-10-5 10" /><path d="M14 18h6" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
