import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import { absoluteUrl, siteConfig } from "@/lib/metadatas";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const steps = [
    ["↗", "Bring your sources", "Keep books, articles, videos, and websites together so every idea has context."],
    ["✦", "Make knowledge yours", "Turn what matters into connected notes that are easy to revisit and build on."],
    ["✓", "Practice until it sticks", "Create flexible quizzes and use active recall to strengthen what you remember."],
];

const quizTypes = ["Flashcards", "Multiple choice", "Fill in the blank", "Ordered lists", "Verbatim recall"];

export default async function HomePage() {
    const user = await getSessionUser((await cookies()).get("token")?.value);
    if (user) redirect("/learn");
    const structuredData = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": `${absoluteUrl("/")}#website`,
                url: absoluteUrl("/"),
                name: siteConfig.name,
                description: siteConfig.description,
                inLanguage: "en",
            },
            {
                "@type": "SoftwareApplication",
                name: "Alpaca Learning",
                applicationCategory: "EducationalApplication",
                operatingSystem: "Web",
                url: absoluteUrl("/"),
                description: siteConfig.description,
                offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            },
            {
                "@type": "Organization",
                name: siteConfig.legalName,
                url: absoluteUrl("/"),
                logo: absoluteUrl("/assets/images/logo.png"),
            },
        ],
    };

    return (
        <main className={styles.landing}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1>Turn what you learn into what you <em>remember.</em></h1>
                    <p>Alpaca connects your sources, notes, and quizzes in one calm place—so studying feels less scattered and progress feels natural.</p>
                    <div className={styles.actions}>
                        <Link href="/login" className={styles.primary}>Log in <span>→</span></Link>
                        <Link href="/marketplace" className={styles.secondary}>Explore courses</Link>
                    </div>
                    <div className={styles.proof}>
                        <span className={styles.proofLine} />
                        <p>Built for curious people who want learning to last.</p>
                    </div>
                </div>

                <div className={styles.heroMascot} aria-label="Alpaca mascot"><span className={styles.logoWord}>ALPACA</span><Image src="/assets/images/llama-mascot-white-v2.png" alt="Friendly white Alpaca mascot" width={1064} height={1478} priority /></div>
            </section>

            <section className={styles.method}>
                <div className={styles.intro}><span className={styles.tag}>A better learning loop</span><h2>Everything connects. Nothing gets lost.</h2><p>Alpaca gives each part of your learning a clear role, then links it into one system you can return to every day.</p></div>
                <div className={styles.stepGrid}>
                    {steps.map(([icon, title, text], index) => <article key={title}><div><span>{icon}</span><b>0{index + 1}</b></div><h3>{title}</h3><p>{text}</p></article>)}
                </div>
            </section>

            <section className={styles.practice}>
                <div className={styles.mascotWrap}>
                    <div className={styles.orbit} />
                    <Image className={styles.mascotImage} src="/assets/images/llama-mascot-white-v2.png" alt="Friendly white Alpaca mascot standing on two legs" width={1064} height={1478} priority={false} />
                    <i className={styles.xp}>Level 4</i><i className={styles.nice}>On track</i>
                </div>
                <div className={styles.practiceCopy}>
                    <span className={styles.tag}>Practice your way</span>
                    <h2>Recall that feels rewarding, not repetitive.</h2>
                    <p>Choose the question style that fits the idea. Mix quick checks with deeper recall, and keep every answer grounded in your own sources and notes.</p>
                    <div className={styles.pills}>{quizTypes.map((type) => <span key={type}>{type}</span>)}</div>
                    <Link href="/marketplace" className={styles.textLink}>Explore the marketplace <span>→</span></Link>
                </div>
            </section>

            <section className={styles.community}>
                <div><span className={styles.tag}>Learn together</span><h2>Your knowledge can be personal. Learning doesn&apos;t have to be lonely.</h2></div>
                <p>Organize courses, share useful resources, and learn alongside a group while keeping control over what stays private.</p>
                <div className={styles.people}><span>AM</span><span>SK</span><span>JP</span><span>RL</span></div>
            </section>

            <section className={styles.finalCta}>
                <span className={styles.alpaca}>A</span>
                <div><span className={styles.tag}>Ready when you are</span><h2>Build a learning habit that actually sticks.</h2><p>Start with one source. Turn it into knowledge you can use.</p></div>
                <Link href="/register" className={styles.primary}>Create your account <span>→</span></Link>
            </section>
        </main>
    );
}
