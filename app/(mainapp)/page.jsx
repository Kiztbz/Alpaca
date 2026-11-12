import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import { absoluteUrl, siteConfig } from "@/lib/metadatas";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const learningSteps = [
    { icon: "📚", tone: "blue", title: "Choose a path", text: "Start with a focused course instead of a pile of disconnected resources." },
    { icon: "🦙", tone: "purple", title: "Learn in small steps", text: "Move through friendly notes that keep one clear idea in focus at a time." },
    { icon: "⚡", tone: "yellow", title: "Train your memory", text: "Use Daily Train to bring important ideas back before they fade." },
    { icon: "🔥", tone: "orange", title: "Build momentum", text: "Keep your streak alive and see exactly where to continue next." },
];

const practiceTypes = ["Quick recall", "Multiple choice", "Fill the blank", "Ordered answers"];

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
        <main className={styles.landingV2}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
            <section className={styles.landingHero}>
                <div className={styles.heroCopy}>
                    <span className={styles.eyebrow}><b>NEW</b> A friendlier way to learn</span>
                    <h1>Learn it.<br />Practice it.<br /><em>Keep it.</em></h1>
                    <p>Alpaca turns useful ideas into a clear daily path—so you always know what to learn, what to practice, and where to continue.</p>
                    <div className={styles.heroActions}>
                        <Link href="/register" className={styles.startButton}>Start learning — it&apos;s free</Link>
                        <Link href="/marketplace" className={styles.outlineButton}>Explore courses</Link>
                    </div>
                    <small>No clutter. No pressure. Just steady progress.</small>
                </div>

                <div className={styles.heroScene} aria-label="Alpaca learning path illustration">
                    <span className={styles.cloudOne} /><span className={styles.cloudTwo} />
                    <div className={styles.speech}>Ready for a quick win?</div>
                    <div className={styles.heroHalo} />
                    <Image src="/assets/images/llama-mascot-white-v2.png" alt="Friendly white Alpaca mascot" width={1064} height={1478} priority />
                    <div className={styles.pathDots}><i /><i /><i /><i /></div>
                    <span className={styles.streakChip}>🔥 4 day streak</span>
                    <span className={styles.lessonChip}>✓ Lesson complete</span>
                </div>
            </section>

            <section className={styles.loopSection} id="how-it-works">
                <header><span>HOW ALPACA WORKS</span><h2>A simple loop that makes learning stick</h2><p>Each part has one job. Together, they turn a good intention into a habit.</p></header>
                <div className={styles.loopGrid}>
                    {learningSteps.map((step, index) => <article key={step.title} data-tone={step.tone}>
                        <div className={styles.stepIcon}>{step.icon}</div><b>STEP {index + 1}</b><h3>{step.title}</h3><p>{step.text}</p>
                    </article>)}
                </div>
            </section>

            <section className={styles.productStory}>
                <div className={styles.storyCopy}>
                    <span className={styles.sectionKicker}>YOUR DAILY PATH</span>
                    <h2>Small lessons.<br />Visible progress.</h2>
                    <p>Open Alpaca and your next step is already waiting. Finish one useful idea, take a quick practice round, and leave with momentum.</p>
                    <ul><li><span>✓</span> A clear place to continue</li><li><span>✓</span> Notes and practice stay connected</li><li><span>✓</span> Progress without noisy dashboards</li></ul>
                    <Link href="/marketplace" className={styles.textAction}>See available courses <span>→</span></Link>
                </div>
                <div className={styles.pathPreview}>
                    <div className={styles.previewTop}><span>STARTUP STRATEGY</span><b>3 / 6</b></div>
                    <div className={styles.previewTrail}>
                        <div className={styles.previewNode} data-state="done"><span>✓</span><div><b>Choose your beachhead</b><small>Lesson complete</small></div></div>
                        <div className={styles.previewNode} data-state="current"><span>🦙</span><div><b>Test market timing</b><small>Continue here</small></div></div>
                        <div className={styles.previewNode}><span>3</span><div><b>Find your position</b><small>Up next</small></div></div>
                    </div>
                </div>
            </section>

            <section className={styles.practiceSection}>
                <div className={styles.practiceDemo}>
                    <div className={styles.demoProgress}><span /></div>
                    <span className={styles.demoLabel}>FILL IN THE BLANK</span>
                    <h3>A focused course begins with a clear <u>______</u>.</h3>
                    <div className={styles.answerRow}><span>market</span><span>logo</span><span>office</span></div>
                    <div className={styles.demoFooter}><span>⚡ 5 left</span><b>CHECK</b></div>
                </div>
                <div className={styles.storyCopy}>
                    <span className={styles.sectionKicker}>DAILY TRAIN</span>
                    <h2>Practice that feels quick—and useful.</h2>
                    <p>Alpaca brings back the right questions in a focused training session. Answer, learn from feedback, and keep moving.</p>
                    <div className={styles.practicePills}>{practiceTypes.map((type) => <span key={type}>{type}</span>)}</div>
                </div>
            </section>

            <section className={styles.landingCta}>
                <Image src="/assets/images/llama-face-v2.png" alt="Alpaca" width={1254} height={1254} />
                <div><span>YOUR NEXT LESSON IS WAITING</span><h2>Ready to make learning a habit?</h2><p>Pick a course and take the first small step today.</p></div>
                <Link href="/register" className={styles.startButton}>Create a free account</Link>
            </section>

            <footer className={styles.landingFooter}><Link href="/">Alpaca</Link><span>Learn it for good.</span><nav><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/help">Help</Link></nav></footer>
        </main>
    );
}
