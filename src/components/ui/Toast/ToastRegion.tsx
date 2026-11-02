import { resolveValue, toast, Toaster } from "react-hot-toast";

import { Toast } from "./Toast";

/**
 * Where toasts appear, above the footer at the bottom center. Mount it once,
 * near the root; `toastError` and `toastNotice` from `@/lib/ui/toast` show them.
 */
export function ToastRegion() {
  return (
    <Toaster
      position="bottom-center"
      // Above the sticky footer (h-26) and its dice.
      containerStyle={{ bottom: 112 }}
      toastOptions={{ duration: 5000 }}
    >
      {(shown) => (
        <Toast
          tone={shown.type === "error" ? "error" : "notice"}
          visible={shown.visible}
          onDismiss={() => toast.dismiss(shown.id)}
          {...shown.ariaProps}
        >
          {resolveValue(shown.message, shown)}
        </Toast>
      )}
    </Toaster>
  );
}
