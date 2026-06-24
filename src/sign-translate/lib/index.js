/**
 * Cliente ML de sign-translate (backend principal).
 * El servidor Python vive en src/sign-translate/ (api.py).
 */

export const SIGN_TRANSLATE_ROOT = '/src/sign-translate'

export const SIGN_DETECTOR_MODEL_URL = '/models/sign-detector/model.json'

export { ML_API_URL, ML_WS_URL, checkMlApiHealth, createMlPredictSocket, getMlApiCache, warmupMlApi } from '../../utils/mlApi.js'
