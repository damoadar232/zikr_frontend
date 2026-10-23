export type PendingAction = {
    version: 1;
    action: string;
    contentType: string;
    contentId: string;
    returnTo: string;
};

export function safeReturnTo(value: unknown, actionType: string): string | null;
export function createPendingAction(intent: Partial<PendingAction>): PendingAction | null;
export function savePendingAction(intent: Partial<PendingAction> | null, storage?: Storage | null): boolean;
export function readPendingAction(storage?: Storage | null): PendingAction | null;
export function clearPendingAction(storage?: Storage | null): boolean;
export function getPendingActionStorageKey(): string;
