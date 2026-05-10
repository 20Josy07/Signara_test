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
 * El avatar elegido se persiste en localStorage. App lo carga al iniciar y
 * lo recibe de vuelta via onAvatarChange cuando el usuario lo cambia desde
 * dentro de Traducir.
 */

const AVATAR_KEY = 'signara:avatarId'
const VALID_IDS = ['alex', 'anuar', 'grace']

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

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [avatarId, setAvatarId] = useState('alex')

  useEffect(() => {
    const stored = readStoredAvatar()
    setAvatarId(stored)
    setCurrentAvatar(stored)
  }, [])

  const handleAvatarChange = (id) => {
    if (!VALID_IDS.includes(id)) return
    setAvatarId(id)
    setCurrentAvatar(id)
    saveStoredAvatar(id)
  }

  return (
    <div className="min-h-screen w-full bg-signara-gradient text-white relative overflow-hidden">
      {/* Decorative blurred orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-signara-sky/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 w-[520px] h-[520px] rounded-full bg-signara-lilac/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-signara-purple/30 blur-3xl" />

      <div className="relative z-10">
        {screen === 'landing' && (
          <LandingScreen onStart={() => setScreen('mode')} />
        )}

        {screen === 'mode' && (
          <ModeSelection
            onBack={() => setScreen('landing')}
            onSelect={(m) => setScreen(m)}
          />
        )}

        {screen === 'translate' && (
          <TranslationScreen
            initialMode="text"
            avatarId={avatarId}
            onAvatarChange={handleAvatarChange}
            onBack={() => setScreen('mode')}
            onHome={() => setScreen('landing')}
          />
        )}

        {screen === 'interpret' && (
          <InterpretScreen
            onBack={() => setScreen('mode')}
            onHome={() => setScreen('landing')}
          />
        )}
      </div>
    </div>
  )
}
