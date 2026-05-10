import Logo from './Logo.jsx'

/**
 * ModeSelection
 * Two cards:
 *   1. Traducir   - español (texto o voz) -> lengua de señas (avatar)
 *   2. Interpretar - cámara -> identifica señas -> texto / audio
 */
export default function ModeSelection({ onSelect, onBack }) {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver
      </button>

      <div className="text-center mb-10 animate-fade-up">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/95 shadow-glow">
          <Logo size={64} />
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white">
          ¿Qué quieres hacer?
        </h2>
        <p className="mt-3 text-white/80 text-lg font-light">
          Elige el modo para empezar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl animate-fade-up">
        <ModeCard
          title="Traducir"
          description="Convierte texto o voz en español a lengua de señas con un avatar."
          accent="from-signara-blue to-signara-navy"
          icon={<TranslateIcon />}
          tags={['Texto', 'Voz', 'Avatar']}
          onClick={() => onSelect('translate')}
        />
        <ModeCard
          title="Interpretar"
          description="Usa tu cámara para identificar señas y traducirlas a texto o audio."
          accent="from-signara-purple to-signara-lilac"
          icon={<CameraIcon />}
          tags={['Cámara', 'Texto', 'Audio']}
          onClick={() => onSelect('interpret')}
        />
      </div>
    </section>
  )
}

function ModeCard({ title, description, accent, icon, tags = [], onClick }) {
  return (
    <button
      onClick={onClick}
      className="group glass-card p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-glow focus:outline-none focus:ring-4 focus:ring-signara-purple/30"
    >
      <div className={"mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br " + accent + " text-white shadow-soft group-hover:scale-110 transition-transform"}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-signara-navy">{title}</h3>
      <p className="mt-2 text-signara-navy/70 leading-relaxed">{description}</p>
      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-signara-sky/40 text-signara-navy">
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold gradient-text">
        Empezar
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

function TranslateIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8l6 6" />
      <path d="M4 14l6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="M22 22l-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}
