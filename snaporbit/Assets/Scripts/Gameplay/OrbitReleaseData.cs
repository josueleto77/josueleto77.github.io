using UnityEngine;

namespace SnapOrbit.Gameplay
{
    /// <summary>
    /// Accuracy bucket for how close a release was to the ideal release angle.
    /// Thresholds live on OrbitController (perfectReleaseWindow / greatReleaseWindow / goodReleaseWindow).
    /// </summary>
    public enum ReleaseAccuracy
    {
        Perfect,
        Great,
        Good,
        Miss
    }

    /// <summary>
    /// Immutable snapshot of a single orbit release, passed along with OrbitController.OnOrbitReleased.
    /// This is intentionally just data - no scoring/UI logic belongs here yet.
    /// </summary>
    public readonly struct OrbitReleaseData
    {
        public readonly Vector2 ReleasePosition;
        public readonly Vector2 ReleaseVelocity;
        public readonly float ReleaseAngle;
        public readonly float IdealAngle;
        public readonly float AngleDifference;
        public readonly ReleaseAccuracy Accuracy;
        public readonly Nodes.OrbitNode SourceNode;

        public OrbitReleaseData(
            Vector2 releasePosition,
            Vector2 releaseVelocity,
            float releaseAngle,
            float idealAngle,
            float angleDifference,
            ReleaseAccuracy accuracy,
            Nodes.OrbitNode sourceNode)
        {
            ReleasePosition = releasePosition;
            ReleaseVelocity = releaseVelocity;
            ReleaseAngle = releaseAngle;
            IdealAngle = idealAngle;
            AngleDifference = angleDifference;
            Accuracy = accuracy;
            SourceNode = sourceNode;
        }
    }
}
