from core.config import MAX_FEATURES

def extraer_puntos(resultados):

    datos = []

    # ================= FACE =================

    if resultados.face_landmarks:
        for lm in resultados.face_landmarks.landmark:
            datos.extend([lm.x, lm.y, lm.z])
    else:
        datos.extend([0.0] * (468 * 3))

    # ================= LEFT HAND =================

    if resultados.left_hand_landmarks:
        for lm in resultados.left_hand_landmarks.landmark:
            datos.extend([lm.x, lm.y, lm.z])
    else:
        datos.extend([0.0] * (21 * 3))

    # ================= RIGHT HAND =================

    if resultados.right_hand_landmarks:
        for lm in resultados.right_hand_landmark:
            datos.extend([lm.x, lm.y, lm.z])
    else:
        datos.extend([0.0] * (21 * 3))

    # ================= POSE =================

    if resultados.pose_landmarks:
        for lm in resultados.pose_landmarks.landmark:
            datos.extend([lm.x, lm.y, lm.z])
    else:
        datos.extend([0.0] * (33 * 3))

    # ================= SEGURIDAD =================

    if len(datos) < MAX_FEATURES:
        datos.extend([0.0] * (MAX_FEATURES - len(datos)))

    return datos[:MAX_FEATURES]