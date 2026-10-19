import { Icon } from "../ui";
import { useInterfaceText } from "../../app/providers/interfaceLanguage";
import { useReveal } from "./Reveal";

export function SectionHead({ eyebrow, title, body, action, onAction }: { eyebrow?: string; title: string; body?: string; action?: string; onAction?: () => void }) {
    const ref = useReveal<HTMLDivElement>();
    const t = useInterfaceText();
    return <div ref={ref} className="section-head reveal"><div>{eyebrow && <span className="eyebrow">{t(eyebrow)}</span>}<h2>{t(title)}</h2>{body && <p>{t(body)}</p>}</div>{action && <button className="text-link" onClick={onAction}>{t(action)}<Icon name="arrow" size={17} /></button>}</div>;
}