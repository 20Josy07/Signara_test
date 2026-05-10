import Logo from './Logo.jsx'

/**
 * LandingScreen
 * Hero screen with the centered logo, brand name, tagline and CTA.
 */
export default function LandingScreen({ onStart }) {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="animate-fade-up">
        <div className="mx-auto mb-6 flex h-36 w-36 items-center justify-center rounded-4xl bg-white/95 shadow-glow animate-float">
          <Logo size={120} />
        </div>

        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-signara-sky to-signara-lilac">
            Signara
          </span>
        </h1>

        <p className="mt-5 max-w-xl mx-auto text-lg md:text-xl text-white/90 font-light leading-relaxed">
          Conectando dos mundos que hoy no logran comunicarse.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4">
          <button onClick={onStart} className="btn-primary text-base">
            Comenzar
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Texto · Voz · Lengua de Señas
          </p>
        </div>
      </div>

      <footer className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/60">
        © {new Date().getFullYear()} Signara — Hackathon MVP
      </footer>
    </section>
  )
}
