using System.Collections.Generic;
using UnityEngine;

namespace SnapOrbit.Nodes
{
    /// <summary>
    /// Marks a GameObject as a grabbable energy node. Attach to the OrbitNode prefab
    /// alongside a CircleCollider2D (isTrigger = true) on the "OrbitNode" layer.
    ///
    /// Actual grab detection is done by OrbitController via a Physics2D overlap query
    /// against that layer, not by this component. The static registry below exists only
    /// so editor gizmos (OrbitDebugGizmos) can draw every node's grab radius without an
    /// expensive FindObjectsOfType call.
    /// </summary>
    [DisallowMultipleComponent]
    public class OrbitNode : MonoBehaviour
    {
        [Header("Optional Override")]
        [Tooltip("If >= 0, overrides OrbitController's global grabRadius for this node only. Leave at -1 to use the global value. " +
                 "Must not exceed grabRadius + grabForgiveness, since that sum bounds the physics query that finds candidate nodes.")]
        [SerializeField] private float grabRadiusOverride = -1f;

        private static readonly List<OrbitNode> registeredNodes = new List<OrbitNode>(32);

        /// <summary>All currently enabled OrbitNodes. Editor/debug use only - do not use this for per-frame gameplay queries.</summary>
        public static IReadOnlyList<OrbitNode> RegisteredNodes => registeredNodes;

        public Vector2 Position => transform.position;
        public bool HasGrabRadiusOverride => grabRadiusOverride >= 0f;
        public float GrabRadiusOverride => grabRadiusOverride;

        private void OnEnable()
        {
            registeredNodes.Add(this);
        }

        private void OnDisable()
        {
            registeredNodes.Remove(this);
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.color = new Color(1f, 0.85f, 0.2f, 0.5f);
            Gizmos.DrawWireSphere(transform.position, HasGrabRadiusOverride ? grabRadiusOverride : 3f);
        }
    }
}
