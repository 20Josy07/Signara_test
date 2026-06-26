import numpy as np
from core.config import MAX_FEATURES

def extraer_puntos(resultados):

    # Función auxiliar
    def get_coords(landmarks, count):

        if landmarks:
            return np.array(
                [[res.x, res.y, res.z] for res in landmarks.landmark]
            ).flatten()

        return np.zeros(count * 3)

    # Cara refinada = 478 puntos
    face = get_coords(resultados.face_landmarks, 478)

    # Pose
    pose = get_coords(resultados.pose_landmarks, 33)

    # Mano izquierda
    lh = get_coords(resultados.left_hand_landmarks, 21)

    # Mano derecha
    rh = get_coords(resultados.right_hand_landmarks, 21)

    puntos = np.concatenate([face, pose, lh, rh])

    # Seguridad
    if len(puntos) != MAX_FEATURES:
        print(f"⚠ ERROR FEATURES: {len(puntos)}")

    return puntos