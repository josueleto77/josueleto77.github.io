using UnityEngine;
using SnapOrbit.Nodes;
using SnapOrbit.Player;

namespace SnapOrbit.DebugTools
{
    /// <summary>
    /// Editor-only visualization for tuning the orbit mechanic. OnDrawGizmos never executes
    /// in a built player, so this never ships or costs anything at runtime; the enableGizmos
    /// toggle just lets you quiet the scene view without removing the component.
    /// </summary>
    [RequireComponent(typeof(OrbitController))]
    public class OrbitDebugGizmos : MonoBehaviour
    {
#if UNITY_EDITOR
        [SerializeField] private bool enableGizmos = true;
        [SerializeField] private Color grabRadiusColor = new Color(0.2f, 0.8f, 1f, 0.35f);
        [SerializeField] private Color forgivenessColor = new Color(1f, 0.5f, 0.1f, 0.3f);
        [SerializeField] private Color orbitRadiusColor = new Color(0.6f, 1f, 0.4f, 0.6f);
        [SerializeField] private Color velocityColor = Color.green;
        [SerializeField] private Color launchTangentColor = Color.magenta;
        [SerializeField] private Color idealReleaseColor = Color.white;
        [SerializeField] private float vectorDisplayScale = 0.35f;

        private OrbitController controller;

        private void Awake()
        {
            controller = GetComponent<OrbitController>();
        }

        private void OnDrawGizmos()
        {
            if (!enableGizmos) return;
            if (controller == null) controller = GetComponent<OrbitController>();
            if (controller == null) return;

            Vector3 pos = transform.position;

            // Grab radius / forgiveness ring around the player.
            Gizmos.color = grabRadiusColor;
            Gizmos.DrawWireSphere(pos, controller.GrabRadius);
            Gizmos.color = forgivenessColor;
            Gizmos.DrawWireSphere(pos, controller.GrabRadius + controller.GrabForgiveness);

            // Every registered node's own grab radius, so you can see overlap before pressing Play.
            Gizmos.color = grabRadiusColor;
            foreach (OrbitNode node in OrbitNode.RegisteredNodes)
            {
                if (node == null) continue;
                float r = node.HasGrabRadiusOverride ? node.GrabRadiusOverride : controller.GrabRadius;
                Gizmos.DrawWireSphere(node.Position, r);
            }

            // Current velocity.
            Gizmos.color = velocityColor;
            Gizmos.DrawLine(pos, pos + (Vector3)(controller.CurrentVelocity * vectorDisplayScale));

            // Ideal release direction, always shown so you can eyeball "aim for this".
            Gizmos.color = idealReleaseColor;
            Gizmos.DrawLine(pos, pos + (Vector3)(controller.IdealReleaseDirection.normalized * (controller.OrbitRadius + 1f)));

            if (controller.IsAttached && controller.CurrentNode != null)
            {
                Vector3 nodePos = controller.CurrentNode.Position;

                // Selected node highlight + live orbit radius.
                Gizmos.color = Color.red;
                Gizmos.DrawWireSphere(nodePos, 0.15f);
                Gizmos.color = orbitRadiusColor;
                Gizmos.DrawWireSphere(nodePos, controller.OrbitRadius);

                // Launch tangent (what release would do right now).
                Gizmos.color = launchTangentColor;
                Gizmos.DrawLine(pos, pos + (Vector3)(controller.CurrentTangentVelocity * vectorDisplayScale));
            }
        }
#endif
    }
}
