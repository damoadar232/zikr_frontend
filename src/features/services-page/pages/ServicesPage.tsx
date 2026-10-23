import { useState } from "react";
import { interfaceAttributeText, LocalizedText, useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { photos } from "../../../app/config/media";
import { Btn, Icon, type IconName } from "../../../components/ui";
import { Reveal } from "../../../components/common/Reveal";
import { SectionHead } from "../../../components/common/SectionHead";
import { Tabs } from "../../../components/common/PagePrimitives";
import { SpotifyTrackGrid } from "../../audio/components/SpotifyTrackGrid";
import { spotifyTrackReferences } from "../../audio/data/spotifyTracks.js";
import { relatedVideoReferences } from "../../lyrics/data/relatedVideoReferences";
import { PortfolioVideoGrid } from "../components/PortfolioVideoGrid";

const portfolioDesignImages = [photos.minaret, photos.mosque, photos.hero];
const portfolioDesignTitles = ["Echoes of Devotion", "Journey to Madina", "The Remembrance Series"];
const portfolioDesignCategories = ["AUDIO PRODUCTION", "VIDEO EDIT", "COVER DESIGN"];

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
    const portfolioVideos = relatedVideoReferences;
    const showDesign = filter === "All Work" || filter === "Design";

    const renderAudio = () => <><SpotifyTrackGrid tracks={spotifyTrackReferences} /><p className="portfolio-media-note">This portfolio audio section uses only the Spotify links supplied in the project. Browse the dedicated Audio section for the full audio library.</p></>;
    const renderDesign = () => <div className="portfolio-grid">{portfolioDesignImages.map((image, index) => <Reveal delay={index * 90} key={image}><article><img src={image} alt={interfaceAttributeText("Mosque architecture project artwork")} loading="lazy" /><div><span>{t(portfolioDesignCategories[index])}</span><h3>{t(portfolioDesignTitles[index])}</h3></div></article></Reveal>)}</div>;

    return <main>
        <section className="service-hero"><Reveal className="container"><span className="eyebrow"><LocalizedText text={"ZIKR CREATIVE STUDIO"} /></span><h1><LocalizedText text={"Creative Services for"} /><br /><em><LocalizedText text={"Devotional Content"} /></em></h1><p><LocalizedText text={"Thoughtful production and visual craft for voices that inspire."} /></p><Btn onClick={() => go("contact")} icon="arrow"><LocalizedText text={"Start a Conversation"} /></Btn></Reveal></section>
        <section className="section container"><SectionHead eyebrow="What We Do" title={interfaceAttributeText("Made with care. Built to resonate.")} /><div className="services-grid">{services.map(([icon, title, image], index) => <Reveal className="service-reveal" delay={index * 80} key={title}><article><div className="service-image"><img src={image} alt="" loading="lazy" /><span>0{index + 1}</span></div><div className="service-card-body"><div className="service-icon"><Icon name={icon} /></div><h3>{t(title)}</h3><p><LocalizedText text={"Professional, respectful creative support tailored for Islamic devotional content and its audience."} /></p><Btn variant="outline" onClick={() => go("contact")}><LocalizedText text={"Get Service"} /></Btn></div></article></Reveal>)}</div></section>
        <section className="portfolio"><div className="container">
            <SectionHead eyebrow="Selected Work" title={interfaceAttributeText("Our Portfolio")} body="A glimpse at devotional projects crafted with purpose." />
            <Tabs items={["All Work", "Audio", "Videos", "Design"]} active={filter} setActive={setFilter} />
            {filter === "All Work" && <>
                <SectionHead eyebrow="Owner-provided Spotify links" title="Audio" />
                {renderAudio()}
                <SectionHead eyebrow="YouTube" title="Videos" />
                <PortfolioVideoGrid videos={portfolioVideos} />
                <p className="portfolio-media-note">Video titles and artwork are temporary references; replace them with approved portfolio metadata when available.</p>
            </>}
            {filter === "Audio" && <><SectionHead eyebrow={`${spotifyTrackReferences.length} Spotify links`} title="Audio" />{renderAudio()}</>}
            {filter === "Videos" && <><SectionHead eyebrow={`${portfolioVideos.length} videos`} title="Videos" /><PortfolioVideoGrid videos={portfolioVideos} /><p className="portfolio-media-note">Video titles and artwork are temporary references; replace them with approved portfolio metadata when available.</p></>}
            {showDesign && <><SectionHead eyebrow="Design" title="Visual Projects" />{renderDesign()}</>}
        </div></section>
    </main>;
}
