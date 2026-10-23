import { useEffect, useRef, useState } from "react";
import { audioLibrary, filterAudioLibrary } from "../../../audioData";
import { ebookLibrary } from "../../../bookData";
import { photos, heroVideo } from "../../../app/config/media";
import { useInterfaceLanguage, useInterfaceText, LocalizedText, interfaceAttributeText } from "../../../app/providers/interfaceLanguage";
import { SectionHead } from "../../../components/common/SectionHead";
import { Reveal, useReveal } from "../../../components/common/Reveal";
import { Btn, Icon, type IconName } from "../../../components/ui";
import { AudioCard } from "../../audio/components/AudioCard";
import { BookCard } from "../../ebooks/components/BookCard";
import { LyricsCard } from "../../lyrics/components/LyricsCard";
import { lyricsApi } from "../../lyrics/services/lyricsApiService.js";
import type { ApiPublicLyric } from "../../lyrics/services/lyricsApiService.js";

export function Home({ go, onPlayAudio, onDownloadAudio, activeAudioId }: { go: (route: string) => void; onPlayAudio: (track: (typeof audioLibrary)[number]) => void; onDownloadAudio: (track: (typeof audioLibrary)[number]) => void; activeAudioId: string | null }) {
    const t = useInterfaceText();
    const language = useInterfaceLanguage();
    const [latestLyrics, setLatestLyrics] = useState<ApiPublicLyric[]>([]);
    const [lyricsError, setLyricsError] = useState("");
    const [lyricsRetry, setLyricsRetry] = useState(0);
    const heroRef = useReveal<HTMLDivElement>();
    const servicePreviewRef = useRef<HTMLElement>(null);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    useEffect(() => {
        const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
        const updateMotionPreference = () => setPrefersReducedMotion(motionPreference.matches);
        motionPreference.addEventListener("change", updateMotionPreference);
        return () => motionPreference.removeEventListener("change", updateMotionPreference);
    }, []);
    useEffect(() => {
        let active = true;
        setLyricsError("");
        void lyricsApi.listPublicLyrics({ page: 0, size: 6 }).then((page) => {
            if (active) setLatestLyrics(page.items);
        }).catch(() => {
            if (active) setLyricsError("Latest lyrics could not be loaded.");
        });
        return () => { active = false; };
    }, [lyricsRetry]);
    useEffect(() => {
        const section = servicePreviewRef.current;
        if (!section || !("IntersectionObserver" in window)) return;
        section.classList.add("services-reveal-ready");
        try {
            const observer = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) {
                    section.classList.add("services-revealed");
                    observer.unobserve(section);
                }
            }, { threshold: 0.2 });
            observer.observe(section);
            return () => observer.disconnect();
        } catch {
            section.classList.add("services-revealed");
        }
    }, []);
    const features = [
        ["pen", "Lyrics", "Naats, Hamd, Manqabat & Sufi Kalam", "lyrics"],
        ["book", "The Holy Quran", "Read Surahs with trusted translations", "quran"],
        ["headphones", "Devotional Audio", "Listen, reflect, and find peace", "audio"],
        ["layers", "E-Books", "A thoughtful Islamic digital library", "ebooks"],
        ["grid", "Creative Services", "Production for devotional creators", "services"],
    ] as const;
    return <main>
        <section className="hero" lang={language} dir={language === "ur" ? "rtl" : "ltr"} style={{ backgroundImage: `url(${photos.hero})` }}>
            {!prefersReducedMotion && <video className="hero-background-video" autoPlay muted loop playsInline preload="metadata" poster={photos.hero} aria-hidden="true" tabIndex={-1}><source src={heroVideo} type="video/mp4" /></video>}
            <div className="hero-pattern" /><div ref={heroRef} className="container hero-content reveal"><span className="eyebrow">{t("A SANCTUARY FOR THE HEART")}</span><h1>{t("Find Peace in")}<br /><em>{t("Remembrance")}</em> {t("of Allah")}</h1><p>{t("Explore beautiful Naats, Quranic verses, devotional audio, and Islamic literature in one peaceful place.")}</p><div className="button-row"><Btn onClick={() => go("lyrics")} icon="arrow"><LocalizedText text={"Explore Devotional Content"} /></Btn><Btn onClick={() => go("quran")} variant="ghost"><LocalizedText text={"Read the Quran"} /></Btn></div><div className="hero-note"><span>ٱذْكُرُوا ٱللَّهَ</span><i />{t("Remember Allah often")}</div></div>
        </section>
        <section className="quick container"><div className="feature-grid">{features.map(([icon, title, text, path], i) => <Reveal className="card-reveal" delay={i * 80} key={title}><button className="feature-card" onClick={() => go(path)}><span className="feature-icon"><Icon name={icon as IconName} /></span><span><b>{t(title)}</b><small>{t(text)}</small></span><Icon name="arrow" size={18} /></button></Reveal>)}</div></section>
        <section className="section container"><SectionHead eyebrow="Newly Added" title={interfaceAttributeText("Latest Lyrics")} body="Words of devotion, carefully presented for reflection and recitation." action="View All Lyrics" onAction={() => go("lyrics")} />{lyricsError ? <div className="empty"><p><LocalizedText text={lyricsError} /></p><button className="btn btn-primary" onClick={() => setLyricsRetry((retry) => retry + 1)}><LocalizedText text={"Try again"} /></button></div> : <div className="lyrics-grid">{latestLyrics.map((item, index) => <LyricsCard item={item} key={item.id} index={index} go={go} onClick={() => go(`lyric-detail?id=${encodeURIComponent(item.id)}`)} />)}</div>}</section>
        <section className="quran-feature"><Reveal className="container quran-feature-inner"><div className="calligraphy"><span>القرآن</span><small>{t("THE HOLY QURAN")}</small></div><div><span className="eyebrow">{t("READ • REFLECT • UNDERSTAND")}</span><h2>{t("Reconnect Through")}<br />{t("the Holy Quran")}</h2><p>{t("Browse all Surahs and Paras with a serene reading experience and carefully presented translations.")}</p><div className="mini-links">{["Surah", "Para", "Quranic Topics", "Quranic Quotes"].map(item => <button onClick={() => go(item === "Para" ? "para" : item === "Surah" ? "surahs" : "quran-topics")} key={item}>{t(item)}<Icon name="chevron" size={14} /></button>)}</div><Btn onClick={() => go("quran")} icon="arrow"><LocalizedText text={"Explore Quran"} /></Btn></div></Reveal></section>
        <section className="section dark-section"><div className="container"><SectionHead eyebrow="Listen & Reflect" title={interfaceAttributeText("Latest Devotional Audio")} body="Soulful recitations and timeless words of devotion." action="View All Audio" onAction={() => go("audio")} /></div><div className="home-audio-marquee" aria-label="Devotional audio tracks"><div className="home-audio-marquee__track">{filterAudioLibrary(audioLibrary, { category: "All Audio" }).map((item, index) => <AudioCard key={item.id} item={item} index={index} onClick={() => go(`audio-detail?id=${item.id}`)} onPlay={onPlayAudio} onDownload={onDownloadAudio} activeAudioId={activeAudioId || ""} />)}<div className="marquee-clone" aria-hidden="true" inert>{filterAudioLibrary(audioLibrary, { category: "All Audio" }).map((item, index) => <AudioCard key={`clone-${item.id}`} item={item} index={index} onClick={() => { }} onPlay={() => { }} onDownload={() => { }} activeAudioId="" />)}</div></div></div></section>
        <section className="section container"><SectionHead eyebrow="Knowledge for the Soul" title={interfaceAttributeText("Featured E-Books")} body="Discover a curated library of Islamic literature." action="Explore E-Books" onAction={() => go("ebooks")} /><div className="home-ebooks-marquee" aria-label="E-Book library"><div className="home-ebooks-marquee__track">{ebookLibrary.map((item, index) => <BookCard item={item} key={item.id} index={index} onClick={() => go(`book-detail?id=${item.id}`)} />)}<div className="marquee-clone" aria-hidden="true" inert>{ebookLibrary.map((item, index) => <BookCard item={item} key={`clone-${item.id}`} index={index} onClick={() => { }} />)}</div></div></div></section>
        <section ref={servicePreviewRef} className="service-preview"><div className="container service-preview-grid"><div className="service-intro"><span className="eyebrow">{t("Creative Studio")}</span><h2>{t("Devotional content,")}<br /><em>{t("beautifully crafted.")}</em></h2><p>{t("From pristine audio to thoughtful visuals, we help creators share their message with clarity and care.")}</p><Btn onClick={() => go("services")} icon="arrow"><LocalizedText text={"View Our Services"} /></Btn></div><div className="service-list">{["Naat Mixing & Mastering", "Video Editing", "Thumbnails & Posters", "Audio Distribution", "YouTube Management"].map((item, index) => <button className="service-row" key={item} onClick={() => go("services")}><span>0{index + 1}</span><b>{t(item)}</b><Icon name="arrow" /></button>)}</div></div></section>
        <section className="closing"><div className="ornament">✦</div><span className="eyebrow">{t("BEGIN YOUR JOURNEY")}</span><h2>{t("Let every word bring")}<br />{t("your heart closer.")}</h2><p>{t("Explore a peaceful collection made for remembrance and reflection.")}</p><Btn onClick={() => go("lyrics")} icon="arrow"><LocalizedText text={"Discover Zikr-e-Ilahi"} /></Btn></section>
    </main>;
}