"""
04_record_animations.py
Graba animaciones de señas como keyframes de MediaPipe para el avatar 3D.

A diferencia de 01_collect.py (que aplana todo en 1659 features para el LSTM),
este script guarda las coordenadas RAW por articulación:
  { lh: [[x,y,z]×21], rh: [[x,y,z]×21], pose: [[x,y,z]×33] }

Salida: src/sign-translate/animations/TOKEN.json

Uso:
    cd src/sign-translate
    python 04_record_animations.py
    > Nombre de la seña: HOLA
    > Presiona S para grabar, ESC para salir
"""

import cv2
import json
import os

import mediapipe as mp
import numpy as np

# ─── Config ───────────────────────────────────────────────────────────────────

ANIM_DIR = os.path.join(os.path.dirname(__file__), "animations")
FPS_TARGET = 30
NUM_FRAMES = 60  # duración máxima por toma (2 s a 30 fps)

# ─── MediaPipe ────────────────────────────────────────────────────────────────

mp_holistic = mp.solutions.holistic
mp_draw = mp.solutions.drawing_utils

holistic = mp_holistic.Holistic(
    min_detection_confidence=0.6,
    min_tracking_confidence=0.6,
    refine_face_landmarks=True,   # 478 landmarks: cara completa + iris (para expresiones del avatar)
)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def extract_raw(results):
    """
    Devuelve dict con listas [x,y,z] por landmark.
    face: 478 puntos (refine_face_landmarks=True) para expresiones del avatar.
    pose: 33 puntos — incluye hombros, codos, muñecas y torso.
    lh / rh: 21 puntos cada mano.
    """
    def lm_to_list(landmarks, n):
        if landmarks:
            return [[lm.x, lm.y, lm.z] for lm in landmarks.landmark]
        return [[0.0, 0.0, 0.0]] * n

    return {
        "face": lm_to_list(results.face_landmarks, 478),
        "lh":   lm_to_list(results.left_hand_landmarks, 21),
        "rh":   lm_to_list(results.right_hand_landmarks, 21),
        "pose": lm_to_list(results.pose_landmarks, 33),
    }


def save_animation(token, frames):
    os.makedirs(ANIM_DIR, exist_ok=True)
    path = os.path.join(ANIM_DIR, f"{token}.json")
    data = {"token": token, "fps": FPS_TARGET, "frames": frames}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"✅ Animación guardada: {path}  ({len(frames)} frames)")


# ─── Main ─────────────────────────────────────────────────────────────────────

etiqueta = input("Nombre de la seña a grabar (ej: HOLA, COMO_ESTAS): ").upper().strip()

cam = cv2.VideoCapture(0)
grabando = False
frames_tmp: list[dict] = []
todas_tomas: list[list[dict]] = []

print(f"\n🎬 Avatar animation recorder — seña: {etiqueta}")
print("   S  → iniciar/detener grabación de una toma")
print("   G  → guardar la mejor toma hasta ahora y salir")
print("   ESC → salir sin guardar\n")

while cam.isOpened():
    ret, frame = cam.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = holistic.process(rgb)

    # Dibujar cara, manos y pose
    if results.face_landmarks:
        mp_draw.draw_landmarks(
            frame, results.face_landmarks, mp_holistic.FACEMESH_CONTOURS,
            mp_draw.DrawingSpec(color=(200, 200, 200), thickness=1, circle_radius=1),
            mp_draw.DrawingSpec(color=(150, 150, 150), thickness=1),
        )
    if results.pose_landmarks:
        mp_draw.draw_landmarks(frame, results.pose_landmarks, mp_holistic.POSE_CONNECTIONS)
    if results.left_hand_landmarks:
        mp_draw.draw_landmarks(frame, results.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS)
    if results.right_hand_landmarks:
        mp_draw.draw_landmarks(frame, results.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS)

    if grabando:
        raw = extract_raw(results)
        frames_tmp.append(raw)

        cv2.putText(frame, f"REC {len(frames_tmp)}/{NUM_FRAMES}", (20, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

        if len(frames_tmp) >= NUM_FRAMES:
            todas_tomas.append(frames_tmp)
            print(f"✅ Toma {len(todas_tomas)} completada ({len(frames_tmp)} frames)")
            grabando = False
            frames_tmp = []
    else:
        n_tomas = len(todas_tomas)
        msg = f"LISTO [{n_tomas} toma(s)] | S=grabar G=guardar" if n_tomas else f"LISTO | S=grabar"
        cv2.putText(frame, msg, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 0), 2)

    cv2.imshow(f"Signara Animator — {etiqueta}", frame)

    key = cv2.waitKey(1) & 0xFF

    if key == ord("s"):
        if grabando:
            if frames_tmp:
                todas_tomas.append(frames_tmp)
                print(f"✅ Toma {len(todas_tomas)} detenida ({len(frames_tmp)} frames)")
            grabando = False
            frames_tmp = []
        else:
            grabando = True
            frames_tmp = []
            print("🔴 Grabando...")

    elif key == ord("g"):
        if not todas_tomas:
            print("⚠  No hay tomas grabadas todavía.")
        else:
            # Usar la toma más larga como referencia
            best = max(todas_tomas, key=lambda t: len(t))
            save_animation(etiqueta, best)
        break

    elif key == 27:  # ESC
        print("Saliendo sin guardar.")
        break

cam.release()
cv2.destroyAllWindows()
holistic.close()
