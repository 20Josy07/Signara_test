import { useEffect, useState } from 'react'
import LandingScreen from './components/LandingScreen.jsx'
import ModeSelection from './components/ModeSelection.jsx'
import TranslationScreen from './components/TranslationScreen.jsx'
import InterpretScreen from './components/InterpretScreen.jsx'
import { setCurrentAvatar } from './utils/signMap.js'

/**
 * App
 * Top-level state machine for the demo screens:
 *
 *   landing  -> mode  -> translate
 *                     -> interpret
 *
 * 'translate'  : entrada texto/voz -> avatar de senas. El avatar se elige
 *                desde un modal en TranslationScreen (Alex / Anuar / Grace).
 * 'interpret'  : camara -> reconocimiento de senas -> texto / audio
 *
 * El avatar elegido se persiste en localStorage. La pantalla activa se refleja
 * en el hash de la URL (#mode, #translate, #interpret) para conservarla al recargar.
 */

const AVATAR_KEY = 'signara:avatarId'
const VALID_IDS = ['alex', 'anuar', 'grace']
const VALID_SCREENS = ['landing', 'mode', 'translate', 'interpret']

function readStoredAvatar() {
  try {
    const v = window.localStorage.getItem(AVATAR_KEY)
    if (VALID_IDS.includes(v)) return v
  } catch (_) {}
  return 'alex'
}

function saveStoredAvatar(id) {
  try {
    window.localStorage.setItem(AVATAR_KEY, id)
  } catch (_) {}
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
  const [avatarId, setAvatarId] = useState('alex')

  useEffect(() => {
    const stored = readStoredAvatar()
    setAvatarId(stored)
    setCurrentAvatar(stored)
  }, [])

  useEffect(() => {
    const onNavigate = () => setScreen(screenFromLocation())
    window.addEventListener('hashchange', onNavigate)
    window.addEventListener('popstate', onNavigate)
    return () => {
      window.removeEventListener('hashchange', onNavigate)
      window.removeEventListener('popstate', onNavigate)
    }
  }, [])

  const navigate = (next) => {
    if (!VALID_SCREENS.includes(next)) return
    syncLocation(next)
    setScreen(next)
  }

  const handleAvatarChange = (id) => {
    if (!VALID_IDS.includes(id)) return
    setAvatarId(id)
    setCurrentAvatar(id)
    saveStoredAvatar(id)
  }

  return (
    <div className="min-h-screen w-full">
      {screen === 'landing' && (
        <LandingScreen onStart={() => navigate('mode')} />
      )}

      {screen === 'mode' && (
        <ModeSelection
          onBack={() => navigate('landing')}
          onSelect={(m) => navigate(m)}
        />
      )}

      {screen === 'translate' && (
        <TranslationScreen
          initialMode="text"
          avatarId={avatarId}
          onAvatarChange={handleAvatarChange}
          onBack={() => navigate('mode')}
          onHome={() => navigate('landing')}
        />
      )}

      {screen === 'interpret' && (
        <InterpretScreen
          onBack={() => navigate('mode')}
          onHome={() => navigate('landing')}
        />
      )}
    </div>
  )
}
