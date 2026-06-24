import { initializeApp } from 'firebase/app'
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  CustomProvider,
  getToken,
} from 'firebase/app-check'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAtVDGmDVCwWunWW2ocgeHWnAsUhHuXvcg',
  authDomain: 'sign-mt.firebaseapp.com',
  projectId: 'sign-mt',
  appId: '1:665830225099:web:18e0669d5847a4b047974e',
}

const RECAPTCHA_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6Ldsxb8oAAAAAGyUZbyd0QruivPSudqAWFygR-4t'

let appCheck = null
let initError = null

function createProvider() {
  const debugToken = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG?.trim()
  if (debugToken) {
    return new CustomProvider({
      getToken: () =>
        Promise.resolve({
          token: debugToken,
          expireTimeMillis: Date.now() + 55 * 60 * 1000,
        }),
    })
  }

  if (import.meta.env.DEV) {
    // Firebase imprime en consola: "App Check debug token: XXXX..."
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = true
    console.info(
      '[Signara] App Check en modo debug. Tras la primera traducción de seña, busca en consola ' +
        '"App Check debug token" y añádelo en .env como VITE_FIREBASE_APPCHECK_DEBUG=<token> ' +
        '(regístralo en Firebase Console → sign-mt → App Check → Apps → Manage debug tokens).',
    )
  }

  return new ReCaptchaV3Provider(RECAPTCHA_KEY)
}

export function isAppCheckConfigured() {
  return Boolean(import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG?.trim())
}

export async function getAppCheckToken() {
  if (initError) throw initError
  try {
    if (!appCheck) {
      const app = initializeApp(firebaseConfig)
      appCheck = initializeAppCheck(app, {
        provider: createProvider(),
        isTokenAutoRefreshEnabled: true,
      })
    }
    const { token } = await getToken(appCheck, false)
    return token
  } catch (err) {
    initError = err
    throw err
  }
}

/** Intenta obtener token; no lanza (para comprobar disponibilidad). */
export async function tryAppCheckToken() {
  try {
    return await getAppCheckToken()
  } catch {
    return null
  }
}
