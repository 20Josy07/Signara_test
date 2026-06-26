import { useEffect, useState } from 'react'
import LandingScreen from './components/LandingScreen.jsx'
import ModeSelection from './components/ModeSelection.jsx'
import TranslationScreen from './components/TranslationScreen.jsx'
import InterpretScreen from './components/InterpretScreen.jsx'
import ScreenTransition from './components/ScreenTransition.jsx'
/**
 * App
 * Top-level state machine for the demo screens:
 *
 *   landing  -> mode  -> translate
 *                     -> interpret
 *
 * 'translate'  : entrada texto/voz -> animación 3D de lengua de señas
 * 'interpret'  : camara -> reconocimiento de senas -> texto / audio
 *
 * La pantalla activa se refleja en el hash de la URL (#mode, #translate, #interpret).
 */

const VALID_SCREENS = ['landing', 'mode', 'translate', 'interpret']
const SCREEN_DEPTH = { landing: 0, mode: 1, translate: 2, interpret: 2 }

function motionClassForTransition(from, to) {
  const delta = (SCREEN_DEPTH[to] ?? 0) - (SCREEN_DEPTH[from] ?? 0)
  if (delta > 0) return 'animate-motion-enter-forward'
  if (delta < 0) return 'animate-motion-enter-back'
  return 'animate-motion-fade-through'
}

/** Pantalla actual desde el hash (#mode, #translate, #interpret). */
function screenFromLocation() {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase()
  if (hash && VALID_SCREENS.includes(hash) && hash !== 'landing') return hash
  return 'landing'
}

function syncLocation(screen) {
  const url = new URL(window.location.href)
  url.hash = screen === 'landing' ? '' : screen
  window.history.replaceState(null, '', url)
}

export default function App() {
  const [screen, setScreen] = useState(screenFromLocation)
  const [motionClass, setMotionClass] = useState('animate-motion-enter')

  useEffect(() => {
    const onNavigate = () => {
      const next = screenFromLocation()
      setScreen((current) => {
        if (next !== current) {
          setMotionClass(motionClassForTransition(current, next))
        }
        return next
      })
    }
    window.addEventListener('hashchange', onNavigate)
    window.addEventListener('popstate', onNavigate)
    return () => {
      window.removeEventListener('hashchange', onNavigate)
      window.removeEventListener('popstate', onNavigate)
    }
  }, [])

  const navigate = (next) => {
    if (!VALID_SCREENS.includes(next)) return
    setMotionClass(motionClassForTransition(screen, next))
    syncLocation(next)
    setScreen(next)
  }

  return (
    <div className="min-h-screen w-full">
      <ScreenTransition
        screen={screen}
        enterClass={motionClass}
        render={(currentScreen) => {
          if (currentScreen === 'landing') {
            return <LandingScreen onStart={() => navigate('mode')} />
          }
          if (currentScreen === 'mode') {
            return (
              <ModeSelection
                onBack={() => navigate('landing')}
                onSelect={(m) => navigate(m)}
              />
            )
          }
          if (currentScreen === 'translate') {
            return (
              <TranslationScreen
                initialMode="text"
                onBack={() => navigate('mode')}
                onHome={() => navigate('landing')}
              />
            )
          }
          if (currentScreen === 'interpret') {
            return (
              <InterpretScreen
                onBack={() => navigate('mode')}
                onHome={() => navigate('landing')}
              />
            )
          }
          return null
        }}
      />
    </div>
  )
}
