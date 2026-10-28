import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { dismissToast, getToasts, subscribeToToasts, type ToastType } from "../../app/notifications/toastStore.js";
import { Icon } from "../ui";

const toastLabels: Record<ToastType, string> = {
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Information",
};

export function ToastContainer() {
    const toasts = useSyncExternalStore(subscribeToToasts, getToasts, getToasts);
    if (!toasts.length || typeof document === "undefined") return null;

    return createPortal(
        <div className="toast-container" aria-label="Notifications">
            {toasts.map((toast) => (
                <section
                    className={`app-toast app-toast-${toast.type}`}
                    key={toast.id}
                    role={toast.type === "error" ? "alert" : "status"}
                    aria-live={toast.type === "error" ? "assertive" : "polite"}
                >
                    <span className="app-toast-kind">{toastLabels[toast.type]}</span>
                    <p>{toast.message}</p>
                    <button type="button" aria-label={`Dismiss ${toastLabels[toast.type].toLowerCase()} notification`} onClick={() => dismissToast(toast.id)}>
                        <Icon name="x" size={16} />
                    </button>
                </section>
            ))}
        </div>,
        document.body,
    );
}
