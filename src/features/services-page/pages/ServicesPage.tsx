import { useState } from "react";
import { interfaceAttributeText, LocalizedText, useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { photos } from "../../../app/config/media";
import { Btn, Icon, type IconName } from "../../../components/ui";
import { Reveal } from "../../../components/common/Reveal";
import { SectionHead } from "../../../components/common/SectionHead";
import { Tabs } from "../../../components/common/PagePrimitives";

export function ServicesPage({ go }: { go: (route: string) => void }) {
    const t = useInterfaceText();
    const services = [
        ["headphones", "Naat Mixing & Mastering", "https://images.unsplash.com/photo-1761939997990-7e1635db43c5?auto=format&fit=crop&w=800&q=78"],
        ["play", "Video Editing", "https://images.unsplash.com/photo-1567712595315-545da0d341b2?auto=format&fit=crop&w=800&q=78"],
        ["grid", "Thumbnails & Posters", "https://images.unsplash.com/photo-1590273089302-ebbc53986b6e?auto=format&fit=crop&w=800&q=78"],
        ["layers", "Audio Distribution", "https://images.unsplash.com/photo-1537181534458-45dcee76ae90?auto=format&fit=crop&w=800&q=78"],
        ["user", "YouTube Channel Management", "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&w=800&q=78"],
    ] as [IconName, string, string][];
    const [filter, setFilter] = useState("All Work");

    return <main><section className="service-hero"><Reveal className="container"><span className="eyebrow"><LocalizedText text={"ZIKR CREATIVE STUDIO"} /></span><h1><LocalizedText text={"Creative Services for"} /><br /><em><LocalizedText text={"Devotional Content"} /></em></h1><p><LocalizedText text={"Thoughtful production and visual craft for voices that inspire."} /></p><Btn onClick={() => go("contact")} icon="arrow"><LocalizedText text={"Start a Conversation"} /></Btn></Reveal></section><section className="section container"><SectionHead eyebrow="What We Do" title={interfaceAttributeText("Made with care. Built to resonate.")} /><div className="services-grid">{services.map(([icon, title, image], i) => <Reveal className="service-reveal" delay={i * 80} key={title}><article><div className="service-image"><img src={image} alt="" loading="lazy" /><span>0{i + 1}</span></div><div className="service-card-body"><div className="service-icon"><Icon name={icon} /></div><h3>{t(title)}</h3><p><LocalizedText text={"Professional, respectful creative support tailored for Islamic devotional content and its audience."} /></p><Btn variant="outline" onClick={() => go("contact")}><LocalizedText text={"Get Service"} /></Btn></div></article></Reveal>)}</div></section><section className="portfolio"><div className="container"><SectionHead eyebrow="Selected Work" title={interfaceAttributeText("Our Portfolio")} body="A glimpse at devotional projects crafted with purpose." /><Tabs items={["All Work", "Audio", "Video", "Design"]} active={filter} setActive={setFilter} /><div className="portfolio-grid">{[photos.minaret, photos.mosque, photos.hero].map((img, i) => <Reveal delay={i * 90} key={img}><article><img src={img} alt={interfaceAttributeText("Mosque architecture project artwork")} loading="lazy" /><div><span>{t(["AUDIO PRODUCTION", "VIDEO EDIT", "COVER DESIGN"][i])}</span><h3>{["Echoes of Devotion", "Journey to Madina", "The Remembrance Series"][i]}</h3></div></article></Reveal>)}</div></div></section></main>;
}
