using System;
using UnityEngine;
using UnityEngine.InputSystem;

namespace SnapOrbit.Input
{
    /// <summary>
    /// Thin wrapper around the Unity Input System for the single interaction this game needs:
    /// press-and-hold anywhere on screen, release anywhere. Works identically for mouse
    /// (Editor testing) and touch (device) because both bind through the generic &lt;Pointer&gt;
    /// control, so no per-platform branching is required.
    ///
    /// Raises events immediately in Update's input processing (no polling delay) so the
    /// grab/release feel is as responsive as possible.
    /// </summary>
    public class PlayerInputController : MonoBehaviour
    {
        [Header("Input Actions")]
        [Tooltip("Assign Assets/Input/PlayerControls.inputactions here.")]
        [SerializeField] private InputActionAsset inputActions;
        [SerializeField] private string actionMapName = "Gameplay";
        [SerializeField] private string pressActionName = "PointerPress";
        [SerializeField] private string positionActionName = "PointerPosition";

        /// <summary>Fired the instant the pointer/touch goes down.</summary>
        public event Action OnPressStarted;

        /// <summary>Fired the instant the pointer/touch is lifted.</summary>
        public event Action OnPressReleased;

        private InputAction pressAction;
        private InputAction positionAction;

        /// <summary>Current pointer position in screen space. Safe to read every frame (no allocation).</summary>
        public Vector2 PointerScreenPosition => positionAction != null ? positionAction.ReadValue<Vector2>() : Vector2.zero;

        /// <summary>True while the pointer/touch is currently held down.</summary>
        public bool IsPressed { get; private set; }

        private void Awake()
        {
            if (inputActions == null)
            {
                Debug.LogError($"{nameof(PlayerInputController)} on '{name}' has no InputActionAsset assigned. Input will not work.", this);
                return;
            }

            InputActionMap map = inputActions.FindActionMap(actionMapName, throwIfNotFound: false);
            if (map == null)
            {
                Debug.LogError($"{nameof(PlayerInputController)}: action map '{actionMapName}' not found in '{inputActions.name}'.", this);
                return;
            }

            pressAction = map.FindAction(pressActionName, throwIfNotFound: false);
            positionAction = map.FindAction(positionActionName, throwIfNotFound: false);

            if (pressAction == null)
            {
                Debug.LogError($"{nameof(PlayerInputController)}: action '{pressActionName}' not found in map '{actionMapName}'.", this);
            }
            if (positionAction == null)
            {
                Debug.LogError($"{nameof(PlayerInputController)}: action '{positionActionName}' not found in map '{actionMapName}'.", this);
            }
        }

        private void OnEnable()
        {
            if (pressAction == null) return;

            pressAction.started += HandlePressStarted;
            pressAction.canceled += HandlePressReleased;
            pressAction.Enable();
            positionAction?.Enable();
        }

        private void OnDisable()
        {
            if (pressAction == null) return;

            pressAction.started -= HandlePressStarted;
            pressAction.canceled -= HandlePressReleased;
            pressAction.Disable();
            positionAction?.Disable();
        }

        private void HandlePressStarted(InputAction.CallbackContext ctx)
        {
            IsPressed = true;
            OnPressStarted?.Invoke();
        }

        private void HandlePressReleased(InputAction.CallbackContext ctx)
        {
            IsPressed = false;
            OnPressReleased?.Invoke();
        }
    }
}
