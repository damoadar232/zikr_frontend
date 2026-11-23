import { LocalizedText, useInterfaceText } from "../../app/providers/interfaceLanguage";
import { Link } from "react-router-dom";
import { SITE_CONTACT, getConfiguredEmail, getConfiguredValue, getConfiguredWebUrl, getConfiguredWhatsAppUrl } from "../../features/information/data/siteContact";
import { Icon, Logo, type IconName } from "../ui";

export function Footer({ go }: { go: (route: string) => void }) {
    const t = useInterfaceText();
    const address = getConfiguredValue(SITE_CONTACT.address);
    const phone = getConfiguredValue(SITE_CONTACT.phone);
    const phoneNumber = phone.replace(/[^\d+]/g, "");
    const email = getConfiguredEmail(SITE_CONTACT.email);
    const whatsappUrl = getConfiguredWhatsAppUrl(SITE_CONTACT.socialLinks.whatsapp || SITE_CONTACT.whatsappNumber);
    const whatsappDisplay = getConfiguredValue(SITE_CONTACT.whatsappNumber);

    const socialLinks: Array<{ label: string; icon: IconName; url: string }> = [
        { label: "Visit us on Facebook", icon: "facebook" as IconName, url: getConfiguredWebUrl(SITE_CONTACT.socialLinks.facebook) },
        { label: "Visit us on Instagram", icon: "instagram" as IconName, url: getConfiguredWebUrl(SITE_CONTACT.socialLinks.instagram) },
        { label: "Visit us on YouTube", icon: "youtube" as IconName, url: getConfiguredWebUrl(SITE_CONTACT.socialLinks.youtube) },
        { label: "Contact us on WhatsApp", icon: "whatsapp" as IconName, url: whatsappUrl },
    ].filter((link) => link.url);

    const contactRows = [
        address ? { label: "Address", icon: "pin" as IconName, text: address, href: "" } : null,
        phone && /\d/.test(phoneNumber) ? { label: "Phone", icon: "phone" as IconName, text: phone, href: `tel:${phoneNumber}` } : null,
        email ? { label: "Email", icon: "mail" as IconName, text: email, href: `mailto:${email}` } : null,
        whatsappUrl && whatsappDisplay ? { label: "WhatsApp", icon: "whatsapp" as IconName, text: whatsappDisplay, href: whatsappUrl } : null,
    ].filter((row): row is { label: string; icon: IconName; text: string; href: string } => row !== null);

    return <footer>
        <div className="container footer-grid">
            <div className="footer-brand-column">
                <Logo />
                <p><LocalizedText text={"A peaceful digital home for Islamic devotional content, reflection, and creative expression."} /></p>
                {socialLinks.length > 0 && <nav className="footer-socials" aria-label={t("Social media")}>
                    {socialLinks.map(({ label, icon, url }) => <a
                        key={label}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        title={label}
                    ><Icon name={icon} size={17} /></a>)}
                </nav>}
            </div>

            <div>
                <h3>{t("Explore")}</h3>
                {[["Lyrics", "lyrics"], ["Quran", "quran"], ["Audio", "audio"], ["E-Books", "ebooks"]].map(([x, r]) =>
                    <button onClick={() => go(r)} key={r}>{t(x)}</button>)}
            </div>

            <div>
                <h3>{t("Discover")}</h3>
                {[["Services", "services"], ["About Us", "about-us"], ["Contact Us", "contact-us"], ["Copyright Policy", "copyright-policy"], ["Admin", "admin"]].map(([x, r]) =>
                    <button onClick={() => go(r)} key={r}>{t(x)}</button>)}
            </div>

            <div className="footer-contact-column">
                <h3>{t("Contact Info")}</h3>
                {contactRows.length > 0 && <address>
                    {contactRows.map(({ label, icon, text, href }) => {
                        const content = <><span className="footer-contact-icon"><Icon name={icon} size={17} /></span><span><small>{t(label)}</small><span>{text}</span></span></>;
                        return href
                            ? <a className="footer-contact-row" href={href} key={label} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{content}</a>
                            : <div className="footer-contact-row" key={label}>{content}</div>;
                    })}
                </address>}
            </div>
        </div>
        <div className="container footer-bottom">
            <span><LocalizedText text={"© 2025 ZIKR-E-ILAHI."} trailing=" " />{t("All rights reserved")}</span>
            <nav className="footer-legal-links" aria-label={t("Legal")}>
                <Link to="/privacy-policy">{t("Privacy Policy")}</Link>
                <span aria-hidden="true">|</span>
                <Link to="/terms-and-conditions">{t("Terms & Conditions")}</Link>
            </nav>
        </div>
    </footer>;
}