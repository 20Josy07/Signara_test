/**
 * signPlayer.js
 * Abstraction layer between sign tokens and their playback source.
 *
 * Current mode → VIDEO: serves local mp4 clips via getSignSrc().
 * Future mode  → API:   sends the token to a 3D avatar animation endpoint,
 *                        which returns animation data to drive a live avatar.
 *
 * Switching modes at runtime (e.g. when the avatar API becomes available):
 *   import { setSignPlayerMode, SIGN_PLAYER_MODE } from './signPlayer'
 *   setSignPlayerMode(SIGN_PLAYER_MODE.API)
 *   setAvatarApiEndpoint('https://avatar-api.example.com/animate')
 */

import { getSignSrc } from './signMap.js'

export const SIGN_PLAYER_MODE = {
  VIDEO: 'video',
  API: 'api',
}

let _mode = SIGN_PLAYER_MODE.VIDEO
let _apiEndpoint = null

export function getSignPlayerMode() {
  return _mode
}

export function setSignPlayerMode(mode) {
  if (Object.values(SIGN_PLAYER_MODE).includes(mode)) _mode = mode
}

export function setAvatarApiEndpoint(url) {
  _apiEndpoint = url
}

export function getAvatarApiEndpoint() {
  return _apiEndpoint
}

/**
 * resolveSign
 * Maps a canonical sign token to its playback descriptor.
 *
 * @param {string} signToken - e.g. "HOLA", "POR_FAVOR"
 * @returns {{ type: 'video', src: string }
 *          | { type: 'animation', token: string, endpoint: string }
 *          | null}  null = sign not available in current mode
 *
 * When in API mode but no endpoint is set, falls back to VIDEO automatically.
 */
export function resolveSign(signToken) {
  if (!signToken) return null

  if (_mode === SIGN_PLAYER_MODE.API && _apiEndpoint) {
    return { type: 'animation', token: signToken, endpoint: _apiEndpoint }
  }

  const src = getSignSrc(signToken)
  if (!src) return null
  return { type: 'video', src }
}
