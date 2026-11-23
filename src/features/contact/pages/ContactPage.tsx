import { usePageMetadata } from "../../../app/hooks/usePageMetadata";
import { LocalizedText } from "../../../app/providers/interfaceLanguage";
import { PageHero } from "../../../components/common/PagePrimitives";
import { ContactDetails } from "../../information/pages/LegalPages";

const enquiryTopics = [
    ["General enquiries", "Questions about the website and its available resources."],
    ["Content corrections", "Updates to attribution, text, titles, or other published details."],
    ["Copyright and ownership", "Concerns about rights, permission, or a specific item."],
    ["Technical support", "Problems accessing a page, audio item, or ebook feature."],
    ["Collaboration", "Ideas and partnership enquiries related to devotional resources."],
];

export function ContactPage() {
    usePageMetadata(
        "Contact Us | ZIKR-E-ILAHI",
        "Find the right topic for a general enquiry, content correction, copyright concern, technical issue, or collaboration request.",
    );

    return <main className="contact-page">
        <PageHero eyebrow="GET IN TOUCH" title="Contact ZIKR-E-ILAHI" text="For questions, corrections, rights concerns, technical support, or collaboration enquiries, choose the topic that best describes your message." />
        <section className="section container contact-topics">
            <div className="contact-topics-intro">
                <span className="eyebrow"><LocalizedText text={"HOW WE CAN HELP"} /></span>
                <h2><LocalizedText text={"What would you like to discuss?"} /></h2>
                <p><LocalizedText text={"Choose a topic to help direct your enquiry to the right place."} /></p>
            </div>
            <div className="contact-topics-grid">
                {enquiryTopics.map(([title, description], index) => <article key={title}>
                    <span className="contact-topic-number">0{index + 1}</span>
                    <h3><LocalizedText text={title} /></h3>
                    <p><LocalizedText text={description} /></p>
                </article>)}
            </div>
        </section>
        <ContactDetails />
    </main>;
}
