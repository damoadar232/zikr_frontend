import { usePageMetadata } from "../../../app/hooks/usePageMetadata";
import { interfaceAttributeText, LocalizedText } from "../../../app/providers/interfaceLanguage";
import { photos } from "../../../app/config/media";
import { Icon } from "../../../components/ui";

export function AboutPage({ go }: { go: (route: string) => void }) {
    usePageMetadata(
        "About Us | ZIKR-E-ILAHI",
        "Learn about ZIKR-E-ILAHI's purpose, the devotional resources it presents, and its approach to attribution and visitor care.",
    );

    return <main className="about-page">
        <section className="about-hero">
            <img src={photos.mosque} alt={interfaceAttributeText("Visitors walking beside a beautiful white mosque")} />
            <div>
                <span className="eyebrow"><LocalizedText text={"ABOUT ZIKR-E-ILAHI"} /></span>
                <h1><LocalizedText text={"A space for devotion, learning, and reflection."} /></h1>
                <p><LocalizedText text={"ZIKR-E-ILAHI brings devotional words, recitations, literature, and learning resources together in a calm digital space."} /></p>
            </div>
        </section>

        <section className="section container editorial about-purpose">
            <div>
                <span className="eyebrow"><LocalizedText text={"WHO WE ARE"} /></span>
                <h2><LocalizedText text={"A place to explore with care."} /></h2>
            </div>
            <div>
                <p><LocalizedText text={"ZIKR-E-ILAHI is a website for discovering Islamic devotional and learning resources. Its library brings together material from different creators and sources; each item's ownership and permissions remain specific to that material."} /></p>
                <div className="values">
                    <article><span>01</span><h3><LocalizedText text={"Our mission"} /></h3><p><LocalizedText text={"Make devotional content easier to discover and experience in a respectful, readable setting."} /></p></article>
                    <article><span>02</span><h3><LocalizedText text={"Our vision"} /></h3><p><LocalizedText text={"Offer a welcoming digital space that supports reflection, learning, and creative expression."} /></p></article>
                </div>
            </div>
        </section>

        <section className="section about-offerings">
            <div className="container">
                <span className="eyebrow"><LocalizedText text={"EXPLORE THE LIBRARY"} /></span>
                <h2><LocalizedText text={"Devotional resources in one place."} /></h2>
                <div className="about-offerings-grid">
                    <article><span>01</span><h3><LocalizedText text={"Lyrics and written works"} /></h3><p><LocalizedText text={"Browse naats, hamd, manqabat, and other devotional writing."} /></p></article>
                    <article><span>02</span><h3><LocalizedText text={"Audio and reciters"} /></h3><p><LocalizedText text={"Listen to available recordings and discover the people credited with them."} /></p></article>
                    <article><span>03</span><h3><LocalizedText text={"Books and ebooks"} /></h3><p><LocalizedText text={"Explore books and digital reading materials made available in the library."} /></p></article>
                    <article><span>04</span><h3><LocalizedText text={"Poets and subjects"} /></h3><p><LocalizedText text={"Find writers, reciters, and themes connected with the published collection."} /></p></article>
                    <article><span>05</span><h3><LocalizedText text={"Quran and learning"} /></h3><p><LocalizedText text={"Use the Quran reading features and supporting devotional resources."} /></p></article>
                </div>
            </div>
        </section>

        <section className="section container about-commitment">
            <div>
                <span className="eyebrow"><LocalizedText text={"OUR COMMITMENT"} /></span>
                <h2><LocalizedText text={"Presented with respect and clarity."} /></h2>
            </div>
            <div>
                <p><LocalizedText text={"We aim to make the collection clear and accessible, credit creators where information is available, and respond thoughtfully to correction and rights concerns. Not every item is created by this website, and publication does not imply ownership or unrestricted reuse."} /></p>
                <button className="text-link about-contact-link" onClick={() => go("contact-us")}><LocalizedText text={"Contact us with a question or correction"} /><Icon name="arrow" size={17} /></button>
            </div>
        </section>
    </main>;
}
