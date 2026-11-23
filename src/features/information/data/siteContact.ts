export const SITE_CONTACT = {
    email: "Connect.zikreilahi@gmail.com",
    phone: "+91 9610035005",
    whatsappNumber: "+919610035005",
    address: "14, Raiko Ka Bas, Ranganiya Mohalla, Near Town Hall, Surajpole, Pali, Rajasthan - 306401, India",
    socialLinks: {
        facebook: "",
        instagram: "https://www.instagram.com/zikreilahiofficial/",
        youtube: "https://youtube.com/@zikreilahiofficial",
        whatsapp: "https://wa.me/919610035005",
    },
} as const;

export function getConfiguredValue(value: string) {
    const trimmed = value.trim();
    return trimmed && !/^\{\{[^{}]+\}\}$/.test(trimmed) ? trimmed : "";
}

export function getConfiguredEmail(value: string) {
    const configuredValue = getConfiguredValue(value);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredValue) ? configuredValue : "";
}

export function getConfiguredWebUrl(value: string) {
    const configuredValue = getConfiguredValue(value);
    if (!configuredValue) return "";

    try {
        const url = new URL(configuredValue);
        return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
    } catch {
        return "";
    }
}

export function getConfiguredWhatsAppUrl(value: string) {
    const configuredValue = getConfiguredValue(value);
    if (!configuredValue) return "";

    if (/^https?:\/\//i.test(configuredValue)) {
        try {
            const url = new URL(configuredValue);
            if (url.protocol === "https:" && url.hostname === "wa.me") return url.toString();
        } catch {
            return "";
        }
        return "";
    }

    const number = configuredValue.replace(/\D/g, "");
    return /^\d{7,15}$/.test(number) ? `https://wa.me/${number}` : "";
}
