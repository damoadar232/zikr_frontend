import { useState } from "react";
import { interfaceAttributeText, LocalizedText, useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { Btn, Icon } from "../../../components/ui";
import { PageHero } from "../../../components/common/PagePrimitives";

function ContactFormField({ label, name, type = "text", placeholder }: { label: string; name: string; type?: string; placeholder?: string }) {
    const t = useInterfaceText();
    return <label className="field"><span>{t(label)}</span><input name={name} type={type} placeholder={t(placeholder || `Enter your ${label.toLowerCase()}`)} /></label>;
}

export function ContactPage({ go }: { go: (route: string) => void }) {
    const [sent, setSent] = useState(false);
    const [errors, setErrors] = useState(false);

    return <main><PageHero eyebrow="GET IN TOUCH" title={interfaceAttributeText("We'd love to hear from you.")} text="Questions, requests, and creative enquiries are all welcome." />
        <section className="section container contact-grid"><div><h2><LocalizedText text={"Start a conversation"} /></h2><p><LocalizedText text={"Use the form and the team can respond through the eventual contact workflow. Verified email and social links will be added before launch."} /></p><div className="contact-note"><Icon name="mail" /><span><small><LocalizedText text={"EMAIL"} /></small><LocalizedText text={"Contact details coming soon"} /></span></div></div><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); if (!form.get("name") || !form.get("email") || !form.get("message")) { setErrors(true); return; } setSent(true); setErrors(false); }}>{sent ? <div className="success"><Icon name="check" size={28} /><h3><LocalizedText text={"Message received"} /></h3><p><LocalizedText text={"This prototype demonstrates the success state. Backend delivery will be connected later."} /></p><Btn variant="outline" onClick={() => setSent(false)}><LocalizedText text={"Send another"} /></Btn></div> : <><div className="two-fields"><ContactFormField label="Name" name="name" /><ContactFormField label="Email" name="email" type="email" /></div><ContactFormField label="Subject" name="subject" /><label className="field"><span><LocalizedText text={"Message"} /></span><textarea name="message" placeholder={interfaceAttributeText("How can we help?")} rows={6} /></label>{errors && <p className="error"><LocalizedText text={"Please complete your name, email, and message."} /></p>}<Btn type="submit" icon="arrow"><LocalizedText text={"Send Message"} /></Btn></>}</form></section></main>;
}
