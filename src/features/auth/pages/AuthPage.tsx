import { useState } from "react";
import { LocalizedText, useInterfaceLanguage, useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { photos } from "../../../app/config/media";
import { readPendingAction, safeReturnTo } from "../../../authActions.js";
import { adminAuth, AdminApiError } from "../services/adminAuth.js";
import { Btn, Icon, Logo } from "../../../components/ui";

function AuthFormField({ label, name, type = "text", placeholder }: { label: string; name: string; type?: string; placeholder?: string }) {
    const t = useInterfaceText();
    return <label className="field"><span>{t(label)}</span><input name={name} type={type} placeholder={t(placeholder || `Enter your ${label.toLowerCase()}`)} /></label>;
}

export function AuthPage({ mode, go }: { mode: "login" | "register"; go: (route: string) => void }) {
    const t = useInterfaceText();
    const language = useInterfaceLanguage();
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [show, setShow] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (mode !== "login") {
            // Registration is not backed by the Spring Boot API in this phase.
            setError("Account registration is not available. Contact your administrator.");
            return;
        }
        const form = event.currentTarget;
        const email = (form.elements.namedItem("email") as HTMLInputElement)?.value?.trim() ?? "";
        const password = (form.elements.namedItem("password") as HTMLInputElement)?.value ?? "";

        if (!email || !password) {
            setError("Email and password are required.");
            return;
        }

        setError("");
        setIsSubmitting(true);
        try {
            await adminAuth.login(email, password);
            // adminAuth.login() dispatches ADMIN_AUTH_EVENT on success,
            // which App.tsx listens to via syncAuth() and updates isLoggedIn.
            // Also clear any stale demo flag.
            try { window.localStorage.removeItem("zikr-authenticated"); } catch { /* ignore */ }

            const pendingAction = readPendingAction();
            const returnTo = pendingAction ? safeReturnTo(pendingAction.returnTo, pendingAction.action) : null;
            go((returnTo || "#admin").slice(1));
        } catch (err) {
            if (err instanceof AdminApiError) {
                // Never expose whether the account exists — use a generic message.
                setError("Sign-in failed. Check your email and password and try again.");
            } else if (err instanceof Error && err.message.includes("not authorized")) {
                setError("This account is not authorized to access the admin panel.");
            } else if (err instanceof Error && err.message.includes("not configured")) {
                setError("The API is not reachable. Ensure the backend is running on port 8080.");
            } else {
                setError("Sign-in failed. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return <main className="auth-page" lang={language} dir={language === "ur" ? "rtl" : "ltr"}><div className="auth-panel"><button onClick={() => go("home")} className="auth-logo"><Logo /></button><span className="eyebrow">{t(mode === "login" ? "WELCOME BACK" : "JOIN THE COMMUNITY")}</span><h1>{t(mode === "login" ? "Sign in to your account" : "Create your account")}</h1><p>{t(mode === "login" ? "A peaceful place to continue your journey." : "Begin your personal journey with Zikr-e-Ilahi.")}</p><form onSubmit={handleSubmit}>{mode === "register" && <AuthFormField label="Full Name" name="name" />}<AuthFormField label={mode === "login" ? "Email or Username" : "Email"} name="email" type="email" /><label className="field"><span>{t("Password")}</span><div className="password"><input name="password" type={show ? "text" : "password"} placeholder={t("Enter your password")} /><button type="button" onClick={() => setShow(!show)} aria-label={t(show ? "Hide password" : "Show password")}><Icon name="eye" /></button></div></label>{mode === "register" && <AuthFormField label="Confirm Password" name="confirm" type="password" />}<label className="checkbox"><input type="checkbox" /><span>{t(mode === "login" ? "Remember me" : "I accept the Terms and Privacy Policy")}</span></label>{error && <p className="error" role="alert">{t(error)}</p>}<Btn type="submit" disabled={isSubmitting}>{isSubmitting ? t("Loading") : mode === "login" ? "Sign In" : "Create Account"}</Btn></form><div className="auth-switch"><LocalizedText text={mode === "login" ? "New to Zikr-e-Ilahi?" : "Already have an account?"} /><button onClick={() => go(mode === "login" ? "register" : "login")}>{t(mode === "login" ? "Create account" : "Sign in")}</button></div></div><div className="auth-image" style={{ backgroundImage: `linear-gradient(rgba(15,15,14,.3),rgba(15,15,14,.78)),url(${photos.minaret})` }}><blockquote><LocalizedText text={"\u201cIn the remembrance of Allah do hearts find rest.\u201d"} /><small><LocalizedText text={"QURAN 13:28"} /></small></blockquote></div></main>;
}