import numpy as np
from core.config import MAX_FEATURES

def extraer_puntos(resultados):
    # Función auxiliar para aplanar landmarks
    def get_coords(landmarks, count):
        if landmarks:
            return np.array([[res.x, res.y, res.z] for res in landmarks.landmark]).flatten()
        return np.zeros(count * 3)

    face = get_coords(resultados.face_landmarks, 468)
    pose = get_coords(resultados.pose_landmarks, 33)
    lh = get_coords(resultados.left_hand_landmarks, 21)
    rh = get_coords(resultados.right_hand_landmarks, 21)

    return np.concatenate([face, pose, lh, rh])