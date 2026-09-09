using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Events;
using SnapOrbit.Gameplay;
using SnapOrbit.Input;
using SnapOrbit.Nodes;

namespace SnapOrbit.Player
{
    /// <summary>
    /// Core SNAPORBIT mechanic: HOLD -> GRAB NODE -> SWING -> RELEASE -> FLY.
    ///
    /// Arcade, not realistic: while attached the Orbiter's position is driven directly
    /// (kinematic circular motion) rather than through Rigidbody2D forces, which is what
    /// makes the orbit radius/speed fully predictable and tunable. Free flight uses a
    /// simple hand-rolled gravity so it stays just as predictable (Rigidbody2D.gravityScale
    /// is kept at 0 - see Player Setup instructions).
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D))]
    [RequireComponent(typeof(PlayerInputController))]
    public class OrbitController : MonoBehaviour
    {
        private enum State { Flying, Attached }
        private enum RotationMode { Auto, Clockwise, CounterClockwise }

        [Header("Orbit Settings")]
        [Tooltip("Distance maintained from the node while orbiting, in Unity units.")]
        [SerializeField] private float orbitRadius = 2f;
        [Tooltip("Angular speed while orbiting, in degrees/second. 360 = one full orbit per second.")]
        [SerializeField] private float orbitSpeed = 360f;
        [Tooltip("Auto derives spin direction from incoming velocity; Clockwise/CounterClockwise force it.")]
        [SerializeField] private RotationMode rotationDirection = RotationMode.Auto;

        [Header("Grab Settings")]
        [Tooltip("Nodes within this distance of the player are grabbable outright.")]
        [SerializeField] private float grabRadius = 3f;
        [Tooltip("Extra magnetic radius beyond grabRadius that still counts as a valid (forgiven) grab.")]
        [SerializeField] private float grabForgiveness = 0.75f;
        [Tooltip("How long (seconds) the smooth radius correction takes when a forgiven grab pulls the player onto orbitRadius. Also smooths a plain in-range grab, so attachment never pops.")]
        [SerializeField] private float radiusCorrectionTime = 0.12f;
        [Tooltip("Layer(s) OrbitNode colliders live on.")]
        [SerializeField] private LayerMask nodeLayerMask;
        [Tooltip("Weight given to raw proximity when several nodes are in range.")]
        [SerializeField] private float nodeSelectionDistanceWeight = 1f;
        [Tooltip("Weight given to how well a node lines up with current velocity ('in front of the player').")]
        [SerializeField] private float nodeSelectionAlignmentWeight = 2.5f;
        [Tooltip("Max nodes considered per grab attempt. Raise only if you expect dense node clusters.")]
        [SerializeField] private int maxNodesDetected = 8;

        [Header("Release Settings")]
        [Tooltip("Multiplier applied to the tangential orbit speed at release.")]
        [SerializeField] private float launchMultiplier = 1.1f;
        [Tooltip("Fraction (0-1) of the velocity the player had right before grabbing that carries into the launch.")]
        [SerializeField, Range(0f, 1f)] private float velocityRetention = 0.35f;
        [Tooltip("Hard clamp on any velocity the Orbiter can have, attached or free.")]
        [SerializeField] private float maximumVelocity = 16f;
        [Tooltip("Releases never leave the player slower than this - prevents dead, near-zero-speed exits.")]
        [SerializeField] private float minimumLaunchVelocity = 6f;

        [Header("Free Flight")]
        [Tooltip("Downward acceleration applied while not attached to a node (arcade gravity, not Physics2D gravity).")]
        [SerializeField] private float gravity = 3f;

        [Header("Perfect Release")]
        [Tooltip("World-space direction a release is judged against.")]
        [SerializeField] private Vector2 idealReleaseDirection = Vector2.up;
        [Tooltip("Release counts as Perfect within this many degrees of the ideal direction.")]
        [SerializeField] private float perfectReleaseWindow = 10f;
        [Tooltip("Release counts as Great within this many degrees.")]
        [SerializeField] private float greatReleaseWindow = 20f;
        [Tooltip("Release counts as Good within this many degrees. Anything wider is a Miss.")]
        [SerializeField] private float goodReleaseWindow = 35f;

        [Header("Game Feel (self-contained test effects)")]
        [SerializeField] private Transform visualTransform;
        [SerializeField] private TrailRenderer trail;
        [SerializeField] private float grabPulseScale = 1.15f;
        [SerializeField] private float grabPulseDuration = 0.08f;
        [SerializeField] private float releaseTrailWidthMultiplier = 1.6f;
        [SerializeField] private float releaseTrailBoostDuration = 0.15f;
        [SerializeField] private float perfectHitPauseTimeScale = 0.05f;
        [SerializeField] private float perfectHitPauseDuration = 0.05f;

        [Header("Game Feel Hooks (wire haptics/particles/sound/camera here)")]
        [SerializeField] private UnityEvent onGrabFeel;
        [SerializeField] private UnityEvent onReleaseFeel;
        [SerializeField] private UnityEvent onPerfectReleaseFeel;

        /// <summary>Fires with full release data every time the player detaches from a node.</summary>
        public event Action<OrbitReleaseData> OnOrbitReleased;
        /// <summary>Fires with the node that was just grabbed.</summary>
        public event Action<OrbitNode> OnNodeGrabbed;
        /// <summary>Fires (in addition to OnOrbitReleased) specifically for Perfect releases.</summary>
        public event Action<OrbitReleaseData> OnPerfectRelease;

        private Rigidbody2D rb;
        private PlayerInputController inputController;
        private Collider2D[] nodeBuffer;

        private State state = State.Flying;
        private OrbitNode currentNode;
        private float orbitAngleDeg;
        private float currentRadius;
        private float radiusVelocitySmooth;
        private int rotationSign = 1;
        private Vector2 preGrabVelocity;
        private Vector2 currentTangentVelocity;
        private Coroutine grabPulseCoroutine;
        private Vector3 visualBaseScale = Vector3.one;

        // --- Read-only accessors for OrbitDebugGizmos ---
        public bool IsAttached => state == State.Attached;
        public OrbitNode CurrentNode => currentNode;
        public float GrabRadius => grabRadius;
        public float GrabForgiveness => grabForgiveness;
        public float OrbitRadius => orbitRadius;
        public Vector2 CurrentVelocity => rb != null ? rb.linearVelocity : Vector2.zero;
        public Vector2 CurrentTangentVelocity => currentTangentVelocity;
        public Vector2 IdealReleaseDirection => idealReleaseDirection;

        private void Awake()
        {
            rb = GetComponent<Rigidbody2D>();
            inputController = GetComponent<PlayerInputController>();
            nodeBuffer = new Collider2D[Mathf.Max(1, maxNodesDetected)];

            rb.gravityScale = 0f;

            if (visualTransform != null) visualBaseScale = visualTransform.localScale;
        }

        private void OnEnable()
        {
            if (inputController == null) return;
            inputController.OnPressStarted += HandlePressStarted;
            inputController.OnPressReleased += HandlePressReleased;
        }

        private void OnDisable()
        {
            if (inputController == null) return;
            inputController.OnPressStarted -= HandlePressStarted;
            inputController.OnPressReleased -= HandlePressReleased;
        }

        private void HandlePressStarted() => TryGrabNearestValidNode();
        private void HandlePressReleased() => ReleaseFromOrbit();

        private void FixedUpdate()
        {
            float dt = Time.fixedDeltaTime;

            if (state == State.Flying)
            {
                Vector2 v = rb.linearVelocity;
                v += Vector2.down * gravity * dt;
                if (v.sqrMagnitude > maximumVelocity * maximumVelocity)
                {
                    v = v.normalized * maximumVelocity;
                }
                rb.linearVelocity = v;
            }
            else
            {
                StepOrbit(dt);
            }
        }

        // --- Grab ---

        private void TryGrabNearestValidNode()
        {
            if (state == State.Attached || nodeLayerMask == 0) return;

            Vector2 origin = rb.position;
            float queryRadius = grabRadius + grabForgiveness;
            int count = Physics2D.OverlapCircleNonAlloc(origin, queryRadius, nodeBuffer, nodeLayerMask);
            if (count == 0) return;

            Vector2 velocity = rb.linearVelocity;
            bool hasVelocity = velocity.sqrMagnitude > 0.0025f; // ~0.05 units/s
            Vector2 velocityDir = hasVelocity ? velocity.normalized : Vector2.zero;

            OrbitNode bestNode = null;
            float bestDistance = 0f;
            float bestScore = float.NegativeInfinity;

            for (int i = 0; i < count; i++)
            {
                OrbitNode node = nodeBuffer[i].GetComponent<OrbitNode>();
                if (node == null) continue;

                float effectiveRadius = node.HasGrabRadiusOverride ? node.GrabRadiusOverride : grabRadius;
                Vector2 toNode = node.Position - origin;
                float distance = toNode.magnitude;
                if (distance > effectiveRadius + grabForgiveness) continue;

                float normalizedDistance = distance / queryRadius; // 0..1
                float distanceScore = -normalizedDistance;

                float alignmentScore = 0f;
                if (hasVelocity && distance > 0.0001f)
                {
                    alignmentScore = Vector2.Dot(velocityDir, toNode / distance); // -1..1, "in front" > 0
                }

                float score = distanceScore * nodeSelectionDistanceWeight + alignmentScore * nodeSelectionAlignmentWeight;

                if (score > bestScore)
                {
                    bestScore = score;
                    bestNode = node;
                    bestDistance = distance;
                }
            }

            if (bestNode != null)
            {
                AttachTo(bestNode, bestDistance);
            }
        }

        private void AttachTo(OrbitNode node, float initialDistance)
        {
            state = State.Attached;
            currentNode = node;
            preGrabVelocity = rb.linearVelocity;

            Vector2 r = rb.position - node.Position;
            if (r.sqrMagnitude < 0.0001f)
            {
                r = Vector2.up * Mathf.Max(initialDistance, 0.01f); // degenerate case: grabbed exactly on the node
            }

            orbitAngleDeg = Mathf.Atan2(r.y, r.x) * Mathf.Rad2Deg;
            currentRadius = Mathf.Max(initialDistance, 0.01f);
            radiusVelocitySmooth = 0f;

            rotationSign = ResolveRotationSign(r);

            rb.linearVelocity = Vector2.zero;

            OnNodeGrabbed?.Invoke(node);
            onGrabFeel?.Invoke();
            if (isActiveAndEnabled)
            {
                if (grabPulseCoroutine != null) StopCoroutine(grabPulseCoroutine);
                grabPulseCoroutine = StartCoroutine(GrabPulseRoutine());
            }
        }

        private int ResolveRotationSign(Vector2 r)
        {
            switch (rotationDirection)
            {
                case RotationMode.Clockwise: return -1;
                case RotationMode.CounterClockwise: return 1;
                default:
                    Vector2 tangentCcw = new Vector2(-r.y, r.x).normalized;
                    float d = Vector2.Dot(preGrabVelocity, tangentCcw);
                    return d >= 0f ? 1 : -1;
            }
        }

        // --- Orbit ---

        private void StepOrbit(float dt)
        {
            orbitAngleDeg += rotationSign * orbitSpeed * dt;

            currentRadius = Mathf.SmoothDamp(currentRadius, orbitRadius, ref radiusVelocitySmooth, radiusCorrectionTime);

            float rad = orbitAngleDeg * Mathf.Deg2Rad;
            Vector2 radialDir = new Vector2(Mathf.Cos(rad), Mathf.Sin(rad));
            Vector2 targetPosition = currentNode.Position + radialDir * currentRadius;

            rb.MovePosition(targetPosition);

            Vector2 tangentDir = new Vector2(-radialDir.y, radialDir.x) * rotationSign;
            float angularSpeedRad = orbitSpeed * Mathf.Deg2Rad;
            currentTangentVelocity = tangentDir * (angularSpeedRad * currentRadius);
        }

        // --- Release ---

        private void ReleaseFromOrbit()
        {
            if (state != State.Attached) return;

            Vector2 launchDir = currentTangentVelocity.sqrMagnitude > 0.0001f
                ? currentTangentVelocity.normalized
                : (Vector2)(rb.position - currentNode.Position).normalized;

            float baseSpeed = currentTangentVelocity.magnitude * launchMultiplier;
            Vector2 momentumCarry = preGrabVelocity * velocityRetention;
            Vector2 finalVelocity = launchDir * baseSpeed + momentumCarry;

            float mag = finalVelocity.magnitude;
            if (mag > maximumVelocity)
            {
                finalVelocity = finalVelocity.normalized * maximumVelocity;
            }
            else if (mag < minimumLaunchVelocity)
            {
                Vector2 dir = mag > 0.0001f ? finalVelocity.normalized : launchDir;
                finalVelocity = dir * minimumLaunchVelocity;
            }

            rb.linearVelocity = finalVelocity;

            float releaseAngle = Mathf.Atan2(launchDir.y, launchDir.x) * Mathf.Rad2Deg;
            float idealAngle = Mathf.Atan2(idealReleaseDirection.y, idealReleaseDirection.x) * Mathf.Rad2Deg;
            float angleDifference = Mathf.Abs(Mathf.DeltaAngle(releaseAngle, idealAngle));

            ReleaseAccuracy accuracy;
            if (angleDifference <= perfectReleaseWindow) accuracy = ReleaseAccuracy.Perfect;
            else if (angleDifference <= greatReleaseWindow) accuracy = ReleaseAccuracy.Great;
            else if (angleDifference <= goodReleaseWindow) accuracy = ReleaseAccuracy.Good;
            else accuracy = ReleaseAccuracy.Miss;

            var data = new OrbitReleaseData(rb.position, finalVelocity, releaseAngle, idealAngle, angleDifference, accuracy, currentNode);

            state = State.Flying;
            currentNode = null;
            currentTangentVelocity = Vector2.zero;

            OnOrbitReleased?.Invoke(data);
            onReleaseFeel?.Invoke();
            if (isActiveAndEnabled) StartCoroutine(ReleaseTrailBoostRoutine());

            if (accuracy == ReleaseAccuracy.Perfect)
            {
                OnPerfectRelease?.Invoke(data);
                onPerfectReleaseFeel?.Invoke();
                if (isActiveAndEnabled) StartCoroutine(PerfectHitPauseRoutine());
            }
        }

        // --- Game feel (temporary test effects, not final VFX) ---

        private IEnumerator GrabPulseRoutine()
        {
            if (visualTransform == null) yield break;

            Vector3 peakScale = visualBaseScale * grabPulseScale;
            float half = Mathf.Max(0.01f, grabPulseDuration * 0.5f);

            float t = 0f;
            while (t < half)
            {
                t += Time.deltaTime;
                visualTransform.localScale = Vector3.Lerp(visualBaseScale, peakScale, t / half);
                yield return null;
            }
            t = 0f;
            while (t < half)
            {
                t += Time.deltaTime;
                visualTransform.localScale = Vector3.Lerp(peakScale, visualBaseScale, t / half);
                yield return null;
            }
            visualTransform.localScale = visualBaseScale;
        }

        private IEnumerator ReleaseTrailBoostRoutine()
        {
            if (trail == null) yield break;

            float baseWidth = trail.widthMultiplier;
            trail.widthMultiplier = baseWidth * releaseTrailWidthMultiplier;
            yield return new WaitForSeconds(releaseTrailBoostDuration);
            trail.widthMultiplier = baseWidth;
        }

        private IEnumerator PerfectHitPauseRoutine()
        {
            float previousScale = Time.timeScale;
            Time.timeScale = perfectHitPauseTimeScale;
            yield return new WaitForSecondsRealtime(perfectHitPauseDuration);
            Time.timeScale = previousScale;
        }
    }
}
