/**
 * AnimatedBackground
 * Degradado animado multicolor (Ink → Iris → Azure → Mist) con capas de luz.
 */
export default function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 landing-gradient-bg" />
      <div className="absolute -top-1/4 -left-1/4 h-[70vmax] w-[70vmax] rounded-full bg-palette-iris/25 blur-[120px] animate-glow-drift-1" />
      <div className="absolute top-1/3 -right-1/4 h-[60vmax] w-[60vmax] rounded-full bg-palette-azure/20 blur-[100px] animate-glow-drift-2" />
      <div className="absolute -bottom-1/4 left-1/3 h-[55vmax] w-[55vmax] rounded-full bg-palette-mist/15 blur-[110px] animate-glow-drift-3" />
      <div className="absolute inset-0 landing-diagonal-lines opacity-[0.07]" />
      <div className="absolute inset-0 landing-grid opacity-[0.06]" />
      <div className="absolute inset-0 bg-gradient-to-b from-palette-ink/30 via-transparent to-palette-ink/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-palette-ink/40 via-transparent to-palette-ink/40" />
    </div>
  )
}
