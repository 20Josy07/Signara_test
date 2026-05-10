import { normalizeSign } from '../utils/signMap.js'

/**
 * SignChips
 * Renders the translated sign sequence as pill-shaped chips. The chip at
 * `activeIndex` is highlighted (so it visually syncs with the avatar).
 */
export default function SignChips({ signs = [], activeIndex = -1 }) {
  if (!signs.length) {
    return (
      <p className="text-white/70 text-sm italic">
        Las señas aparecerán aquí después de traducir.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {signs.map((sign, i) => (
        <span
          key={`${sign}-${i}`}
          className={`chip transition-all duration-300 ${
            i === activeIndex ? 'chip-active scale-105' : ''
          }`}
        >
          <span className="text-[10px] font-bold opacity-60">{i + 1}</span>
          {normalizeSign(sign).replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  )
}
