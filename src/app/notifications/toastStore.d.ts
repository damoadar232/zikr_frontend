export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
    duration?: number;
}

export interface ToastItem {
    id: number;
    type: ToastType;
    message: string;
}

export const notify: Readonly<Record<ToastType, (message: string, options?: ToastOptions) => number | null>>;
export function subscribeToToasts(listener: () => void): () => void;
export function getToasts(): ToastItem[];
export function dismissToast(id: number): void;
export function getUserFacingError(error: unknown, fallback?: string): string;
