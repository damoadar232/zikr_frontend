import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LocalizedText } from "../../../app/providers/interfaceLanguage";
import { usePageMetadata } from "../../../app/hooks/usePageMetadata";
import { Icon } from "../../../components/ui";
import { getConfiguredEmail, getConfiguredValue, getConfiguredWebUrl, SITE_CONTACT } from "../data/siteContact";

const LAST_UPDATED = "23 November 2026";

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
    return <section className="legal-section" id={id} aria-labelledby={`${id}-heading`}>
        <h2 id={`${id}-heading`}><LocalizedText text={title} /></h2>
        <div className="legal-section-content">{children}</div>
    </section>;
}

export function LegalPageLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    usePageMetadata(`${title} | ZIKR-E-ILAHI`, description);

    return <main className="legal-page">
        <section className="page-hero">
            <div className="container">
                <span className="eyebrow"><LocalizedText text={"INFORMATION & POLICIES"} /></span>
                <h1><LocalizedText text={title} /></h1>
                <p><LocalizedText text={description} /></p>
            </div>
        </section>
        <div className="container legal-content">
            <p className="legal-updated"><LocalizedText text={"Last updated"} />: {LAST_UPDATED}</p>
            {children}
        </div>
    </main>;
}

export function PrivacyPolicyPage() {
    const contactEmail = getConfiguredEmail(SITE_CONTACT.email);

    return <LegalPageLayout
        title="Privacy Policy"
        description="A clear explanation of the information ZIKR-E-ILAHI handles and how it is used."
    >
        <LegalSection id="privacy-introduction" title="1. Introduction">
            <p>ZIKR-E-ILAHI respects your privacy. This policy explains what information may be handled when you use the website and how we use it.</p>
        </LegalSection>
        <LegalSection id="privacy-information" title="2. Information We Collect">
            <p>We may receive information that you voluntarily provide, such as:</p>
            <ul>
                <li>An email address or other details when you contact us.</li>
                <li>Email and password details used for authorized administrator sign-in.</li>
            </ul>
            <p>The website may also receive limited technical information when you access its pages, such as browser, device, or server log information. This information depends on the website hosting and browser environment.</p>
        </LegalSection>
        <LegalSection id="privacy-use" title="3. How We Use Information">
            <ul>
                <li>To operate and maintain the website.</li>
                <li>To respond to enquiries and copyright concerns.</li>
                <li>To remember preferences and improve the user experience.</li>
                <li>To maintain website security and authorized account access.</li>
            </ul>
        </LegalSection>
        <LegalSection id="privacy-storage" title="4. Cookies and Browser Storage">
            <p>The website currently uses browser storage for preferences such as language, theme, font size, Quran bookmarks, and translator selections. Administrator session tokens are stored in session storage.</p>
            <p>No active analytics or advertising tracking was found in the current website source. Third-party media or embedded services may use their own cookies or storage under their own policies.</p>
        </LegalSection>
        <LegalSection id="privacy-third-parties" title="5. Third-Party Services">
            <p>ZIKR-E-ILAHI uses or links to services including Cloudinary for media delivery, YouTube for videos, Unsplash for hosted images, and MyMemory for word translations. These providers may receive technical request information or the content you choose to submit to a service.</p>
            <p>Each provider has its own privacy policy, which applies when you use their service.</p>
        </LegalSection>
        <LegalSection id="privacy-analytics" title="6. Analytics and advertising">
            <p>Analytics and advertising services are not currently active from the verified website source. Google AdSense or another advertising service may be enabled in the future, at which point this policy should be updated.</p>
        </LegalSection>
        <LegalSection id="privacy-security" title="7. Data Security">
            <p>We use reasonable technical and organizational measures intended to protect information. However, no website or internet service can guarantee absolute security.</p>
        </LegalSection>
        <LegalSection id="privacy-external-links" title="8. External Links">
            <p>The website may contain links to external websites or social platforms. ZIKR-E-ILAHI does not control those websites or their privacy practices.</p>
        </LegalSection>
        <LegalSection id="privacy-children" title="9. Children's Privacy">
            <p>Children should not knowingly submit personal information through the website without appropriate involvement from a parent or guardian, where required.</p>
        </LegalSection>
        <LegalSection id="privacy-changes" title="10. Changes to This Policy">
            <p>This policy may be updated when the website or its practices change. The last updated date above will be revised when needed.</p>
        </LegalSection>
        {contactEmail && <LegalSection id="privacy-contact" title="11. Contact Us">
            <p>For privacy questions, contact <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
        </LegalSection>}
    </LegalPageLayout>;
}

export function TermsConditionsPage() {
    const contactEmail = getConfiguredEmail(SITE_CONTACT.email);

    return <LegalPageLayout
        title="Terms & Conditions"
        description="Plain-language terms for using ZIKR-E-ILAHI and its content."
    >
        <LegalSection id="terms-introduction" title="1. Introduction">
            <p>By using ZIKR-E-ILAHI, you agree to these terms. If you do not agree, please stop using the website.</p>
        </LegalSection>
        <LegalSection id="terms-content" title="2. Website Content">
            <p>ZIKR-E-ILAHI provides Islamic lyrics, Quran-related resources, audio, ebooks, and other informational content. Some features or items may change, become unavailable, or be removed over time.</p>
        </LegalSection>
        <LegalSection id="terms-permitted-use" title="3. Permitted Use">
            <ul>
                <li>You may use the website for personal and lawful purposes.</li>
                <li>You must respect copyright, licensing, and other applicable restrictions.</li>
                <li>You must not copy or redistribute protected material unless you have permission.</li>
            </ul>
        </LegalSection>
        <LegalSection id="terms-intellectual-property" title="4. Intellectual Property">
            <p>Lyrics, recordings, ebooks, images, and other material may belong to their respective authors, creators, publishers, artists, or rights holders. ZIKR-E-ILAHI does not own every item published on the website.</p>
            <p>Protected material must not be reproduced or redistributed without appropriate authorization.</p>
        </LegalSection>
        <LegalSection id="terms-responsibilities" title="5. User Responsibilities">
            <p>You must not misuse the website, attempt unauthorized access, interfere with its operation, or use it to infringe another person's rights.</p>
        </LegalSection>
        <LegalSection id="terms-links" title="6. Third-Party Links">
            <p>External websites and services are controlled by their respective owners. ZIKR-E-ILAHI is not responsible for their content or availability.</p>
        </LegalSection>
        <LegalSection id="terms-accuracy" title="7. Content Accuracy and Availability">
            <p>Content is provided for general informational and devotional use. ZIKR-E-ILAHI may update, correct, restrict, or remove content without prior notice.</p>
        </LegalSection>
        <LegalSection id="terms-copyright" title="8. Copyright Concerns">
            <p>If you believe material is used without appropriate authorization, you may contact us. Please include the details needed to identify the work and the affected page.</p>
            <p>For the reporting process, visit our <Link to="/copyright-policy">Copyright Policy</Link>.</p>
        </LegalSection>
        <LegalSection id="terms-changes" title="9. Changes to These Terms">
            <p>These terms may be updated when necessary. The most recent update date will be shown on this page.</p>
        </LegalSection>
        {contactEmail && <LegalSection id="terms-contact" title="10. Contact Information">
            <p>For questions about these terms, contact <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
        </LegalSection>}
        <LegalSection id="terms-law" title="11. Governing Law">
            <p>Applicable governing law will depend on the location of the website operator and is not currently confirmed on this website.</p>
        </LegalSection>
    </LegalPageLayout>;
}

export function CopyrightPolicyPage() {
    const copyrightEmail = getConfiguredEmail(SITE_CONTACT.email);

    return <LegalPageLayout
        title="Copyright Policy"
        description="How ZIKR-E-ILAHI distinguishes original work from third-party material, and what information to include in a copyright concern."
    >
        <LegalSection id="copyright-introduction" title="1. Copyright policy">
            <p>ZIKR-E-ILAHI presents devotional writing, audio, ebooks, images, and other resources. Some material may be original; other material may be shared with permission, attribution, or under an applicable license. The website does not claim ownership of every item it publishes.</p>
        </LegalSection>
        <LegalSection id="copyright-ownership" title="2. Original and third-party material">
            <p>Rights in original website content belong to its respective creator or rights holder. Third-party lyrics, recordings, books, translations, images, and other media remain subject to their own ownership, permissions, and licenses. Attribution does not by itself establish ownership or grant broader permission.</p>
            <p>Permission to display or share an item does not necessarily authorize commercial redistribution, advertising use, or onward licensing. Confirm those rights with the relevant rights holder.</p>
        </LegalSection>
        <LegalSection id="copyright-content-types" title="3. Lyrics, audio, ebooks, and media">
            <p>Lyrics and written materials may be authored by different writers or rights holders. Audio recordings can involve separate rights in the composition, performance, and recording. Ebook and PDF availability does not mean the underlying publication is public domain or freely redistributable. Images and other media may have separate creator and license terms.</p>
            <p>Where attribution or usage details are available, review them on the relevant item. If the rights or permission are unclear, do not assume that downloading or sharing is authorized.</p>
        </LegalSection>
        <LegalSection id="copyright-report" title="4. Submitting a copyright concern">
            <p>To help the operator review a report, include all of the following:</p>
            <ul>
                <li>Your name and a contact email address.</li>
                <li>Identification of the copyrighted work you believe is affected.</li>
                <li>The URL of the material on this website that is the subject of your concern.</li>
                <li>An explanation of your ownership or authorization to act for the rights holder.</li>
                <li>A statement that you have a good-faith belief that the disputed use is not authorized by the rights holder, its agent, or law.</li>
            </ul>
            <p>Do not include passwords, payment information, or unrelated sensitive personal information in a report.</p>
            {copyrightEmail && <p>Email: <a href={`mailto:${copyrightEmail}`}>{copyrightEmail}</a></p>}
        </LegalSection>
        <LegalSection id="copyright-review" title="5. Review and response">
            <p>The site operator should review a complete report, assess the information and any applicable permission, and take an appropriate response where warranted. The operator may request additional information and may restrict or remove material while reviewing a concern. This page does not represent that a formal statutory takedown procedure or dedicated reporting system is currently implemented.</p>
        </LegalSection>
        <LegalSection id="copyright-misreport" title="6. Accuracy of reports">
            <p>Please provide accurate information and report only material you are authorized to raise. A report should identify the specific work and location clearly so it can be reviewed.</p>
        </LegalSection>
        {copyrightEmail && <LegalSection id="copyright-contact" title="7. Contact">
            <p>For a copyright concern, email <a href={`mailto:${copyrightEmail}`}>{copyrightEmail}</a>.</p>
        </LegalSection>}
    </LegalPageLayout>;
}

export function ContactDetails() {
    const email = getConfiguredEmail(SITE_CONTACT.email);
    const phone = getConfiguredValue(SITE_CONTACT.phone);
    const phoneNumber = phone.replace(/[^\d+]/g, "");
    const hasPhoneNumber = /\d/.test(phoneNumber);
    const whatsapp = getConfiguredValue(SITE_CONTACT.whatsappNumber);
    const rawWhatsappNumber = whatsapp.replace(/\D/g, "");
    const whatsappNumber = /^\d{7,15}$/.test(rawWhatsappNumber) ? rawWhatsappNumber : "";
    const address = getConfiguredValue(SITE_CONTACT.address);
    const socialProfiles = [
        { label: "Facebook", value: SITE_CONTACT.socialLinks.facebook },
        { label: "Instagram", value: SITE_CONTACT.socialLinks.instagram },
        { label: "YouTube", value: SITE_CONTACT.socialLinks.youtube },
    ].flatMap(({ label, value }) => {
        const url = getConfiguredWebUrl(value);
        return url ? [{ label, url }] : [];
    });

    if (!email && !hasPhoneNumber && !whatsappNumber && !address && socialProfiles.length === 0) return null;

    return <section className="section contact-details-section">
        <div className="container">
            <div className="section-head">
                <div><span className="eyebrow"><LocalizedText text={"CONTACT INFORMATION"} /></span><h2><LocalizedText text={"Reach the ZIKR-E-ILAHI team"} /></h2></div>
            </div>
            <div className="contact-details-grid">
                {email && <a className="contact-detail" href={`mailto:${email}`}><Icon name="mail" /><span><small>Email</small>{email}</span></a>}
                {phone && hasPhoneNumber && <a className="contact-detail" href={`tel:${phoneNumber}`}><Icon name="user" /><span><small>Phone</small>{phone}</span></a>}
                {whatsappNumber && <a className="contact-detail" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer"><Icon name="user" /><span><small>WhatsApp</small>{whatsapp}</span></a>}
                {address && <div className="contact-detail"><Icon name="mail" /><span><small>Address</small>{address}</span></div>}
            </div>
            {socialProfiles.length > 0 && <nav className="contact-social-links" aria-label="Social media">
                {socialProfiles.map(({ label, url }) => <a href={url} key={label} target="_blank" rel="noreferrer">{label}<span aria-hidden="true">↗</span></a>)}
            </nav>}
        </div>
    </section>;
}
