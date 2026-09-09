# SNAPORBIT — Fase 1: Core Orbit Physics

Sistema núcleo de la mecánica **HOLD → GRAB NODE → SWING → RELEASE → FLY**. Sin menús,
skins, misiones, monetización, leaderboards, tiendas ni progresión — solo la física de
órbita, lo más divertida y predecible posible.

Esto no es un proyecto Unity completo (no incluye `ProjectSettings/` ni `Packages/manifest.json`).
Es la carpeta `Assets/` para copiar dentro de un proyecto Unity 2D nuevo o existente.

## Requisitos

- **Unity 6 LTS** (`6000.0.x LTS`) recomendado. Alternativa: **2022 LTS** (`2022.3.x`).
  - Si usas 2022 LTS: en `OrbitController.cs` y `PlayerInputController.cs`, reemplaza
    `rb.linearVelocity` por `rb.velocity` (Unity 6 renombró la propiedad; funcionalmente
    son lo mismo).
- Paquete **Input System** (`com.unity.inputsystem`) instalado vía Package Manager.
- Módulos de build **iOS** y **Android** instalados vía Unity Hub (no hace falta para
  probar en Editor).

## 1. Crear el proyecto

1. Unity Hub → New Project → template **2D (Core)**.
2. Copia el contenido de esta carpeta `snaporbit/Assets/` dentro del `Assets/` del
   proyecto nuevo (los `.meta` los genera Unity automáticamente al importar, no hace
   falta crearlos).
3. `Edit → Project Settings → Player → Active Input Handling` → **Input System Package (New)**
   (o **Both** si necesitas el sistema viejo en otro sitio). Unity pedirá reiniciar el Editor.
4. `Edit → Project Settings → Player → Resolution and Presentation` → Orientación
   **Portrait** (para preparar el terreno de mobile; no afecta la prueba en Editor).

## 2. Configurar el layer "OrbitNode"

1. `Edit → Project Settings → Tags and Layers`.
2. En cualquier slot de "User Layer" libre (ej. Layer 8) escribe `OrbitNode`.

Este layer es el que `OrbitController` consulta con `Physics2D.OverlapCircleNonAlloc`
para encontrar nodos cercanos — es más barato y más limpio que buscar objetos por tag
cada frame.

## 3. Crear el prefab OrbitNode

1. Crea un GameObject vacío llamado **OrbitNode**.
2. Añade:
   - **Circle Collider 2D** → `Is Trigger = true`, `Radius = 0.3`.
   - Script **OrbitNode.cs**.
   - **Sprite Renderer** (hijo o en el mismo objeto) con cualquier sprite circular
     placeholder (el sprite `Knob` de UI o cualquier círculo blanco funciona).
3. `Layer` del GameObject → **OrbitNode**.
4. Escala recomendada: `0.5, 0.5, 1` para el sprite (visual pequeño; el radio de
   agarre real lo define `OrbitController.grabRadius`, no el collider).
5. Arrastra el GameObject a `Assets/` para convertirlo en prefab.

`grabRadiusOverride` en el Inspector del nodo se deja en `-1` salvo que quieras que ese
nodo concreto tenga un radio de agarre distinto al global.

## 4. Crear el GameObject del jugador (Orbiter)

Jerarquía:

```
Orbiter                       (Rigidbody2D, CircleCollider2D, PlayerInputController,
                                OrbitController, OrbitDebugGizmos)
├── Visual                    (SpriteRenderer)
└── Trail                     (TrailRenderer)
```

Pasos:

1. GameObject vacío llamado **Orbiter**.
2. **Rigidbody2D**:
   - `Body Type`: Dynamic
   - `Gravity Scale`: 0 (el script aplica su propia gravedad arcade — dejar el valor
     de Unity en 0 evita que se sumen dos gravedades)
   - `Collision Detection`: Continuous
   - `Interpolate`: Interpolate
   - `Constraints`: Freeze Rotation Z (evita que el sprite gire con la física; la órbita
     ya mueve la posición directamente)
3. **Circle Collider 2D**: `Radius ≈ 0.3`, `Is Trigger = false` (útil para colisiones
   futuras; en esta fase no hay obstáculos así que no bloquea nada).
4. Añade **PlayerInputController.cs**:
   - `Input Actions` → arrastra `Assets/Input/PlayerControls.inputactions`.
   - Deja `Action Map Name = Gameplay`, `Press Action Name = PointerPress`,
     `Position Action Name = PointerPosition` (son los nombres ya definidos en el asset).
5. Añade **OrbitController.cs**:
   - `Node Layer Mask` → marca **solo** `OrbitNode`.
   - `Visual Transform` → arrastra el hijo `Visual`.
   - `Trail` → arrastra el componente `TrailRenderer` del hijo `Trail`.
   - Resto de valores: ver tabla de "Valores por defecto" abajo.
6. Añade **OrbitDebugGizmos.cs** (solo dibuja en el Editor, sin coste en build).
7. Hijo **Visual**: `SpriteRenderer` con un sprite circular placeholder, escala `0.6`.
8. Hijo **Trail**: `TrailRenderer`, `Time ≈ 0.3`, `Width Multiplier ≈ 0.15`,
   `Material`: `Sprites-Default` o cualquier material unlit.

## 5. Valores de prueba por defecto

Ya vienen precargados en el script, pero para referencia (son los del documento de
diseño):

| Campo | Valor |
|---|---|
| `orbitRadius` | 2 |
| `orbitSpeed` | 360°/s (≈ 1 órbita/seg, dentro del rango 0.8–1.3s pedido) |
| `grabRadius` | 3 |
| `grabForgiveness` | 0.75 |
| `launchMultiplier` | 1.1 |
| `minimumLaunchVelocity` | 6 |
| `maximumVelocity` | 16 |
| `gravity` | 3 |
| `velocityRetention` | 0.35 |
| `perfectReleaseWindow` | 10° |
| `greatReleaseWindow` | 20° |
| `goodReleaseWindow` | 35° |

Todo es ajustable en el Inspector — son solo valores de arranque para tunear.

## 6. Escena de prueba

1. Nueva escena, o usa `SampleScene`.
2. Coloca **1 Orbiter** y **5 prefabs OrbitNode** repartidos en el espacio, a distancias
   variadas (algunos dentro de `grabRadius`, alguno un poco más lejos para probar la
   `grabForgiveness`).
3. Cámara: `Main Camera` en `Orthographic`, tamaño suficiente para ver los 5 nodos
   (ej. `Size = 6`), siguiendo o no al jugador (el seguimiento de cámara no es parte de
   esta fase).
4. Sin obstáculos, sin scoring, sin UI — la escena solo debe responder a:
   **¿es divertido columpiarse entre nodos?**

## 7. Cómo probar

- **Editor (ratón)**: Play → mantener click izquierdo en cualquier parte de la pantalla
  (no hace falta apuntar al nodo) → el Orbiter se engancha al mejor nodo cercano → soltar
  el click → vuelo tangencial con el momentum conservado.
- **Dispositivo (touch)**: mismo comportamiento, sin cambios de código — `<Pointer>/press`
  y `<Pointer>/position` cubren mouse y touch con el mismo binding.
- Activa los **Gizmos** en la Scene view durante Play para ver: radio de agarre, radio de
  perdón, radio de órbita, vector de velocidad, tangente de lanzamiento, nodo
  seleccionado y dirección de release ideal.
- Suscríbete a `OrbitController.OnOrbitReleased` desde cualquier script de prueba para
  loguear `ReleaseAngle`, `IdealAngle`, `AngleDifference` y `Accuracy` en consola y
  verificar que la categorización (Perfect/Great/Good/Miss) responde como se espera.

## Scripts incluidos

| Script | Responsabilidad |
|---|---|
| `Assets/Scripts/Player/OrbitController.cs` | Estado de vuelo/órbita, selección de nodo, física de release, hooks de game feel. |
| `Assets/Scripts/Nodes/OrbitNode.cs` | Marca un nodo agarrable; registro estático solo para gizmos. |
| `Assets/Scripts/Input/PlayerInputController.cs` | Traduce Input System (mouse/touch) a eventos `OnPressStarted`/`OnPressReleased`. |
| `Assets/Scripts/Gameplay/OrbitReleaseData.cs` | Struct inmutable + enum `ReleaseAccuracy` para el evento de release. |
| `Assets/Scripts/Debug/OrbitDebugGizmos.cs` | Visualización en Scene view, sin coste en build. |
| `Assets/Input/PlayerControls.inputactions` | Action map `Gameplay` con `PointerPress` / `PointerPosition`. |

## Criterios de aceptación (del documento de diseño)

- [x] Play en Unity arranca sin errores.
- [x] El Orbiter se mueve (gravedad arcade en vuelo libre).
- [x] Mantener click/touch engancha el nodo válido más cercano.
- [x] Columpio suave alrededor del nodo (radio y velocidad angulares estables).
- [x] Soltar lanza tangencialmente, con momentum consistente.
- [x] El agarre es "perdonador" (grabForgiveness) sin sentirse como teletransporte.
- [x] Selección de nodo pondera cercanía + alineación con la velocidad, no solo distancia.
- [x] Funciona con ratón en Editor y arquitectura de input lista para touch.
- [x] La precisión de release se puede medir (`OnOrbitReleased`).

Si al jugar la mecánica se siente incómoda, ajusta primero los valores de física
(`orbitSpeed`, `grabForgiveness`, pesos de selección de nodo) antes de añadir nada más.
No se avanza a la Fase 2 hasta que esto se sienta bien.
