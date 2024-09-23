"use client";

import QuizDisplay from "@/app/components/Quiz/QuizDisplay";
import {
    Avatar,
    CourseDisplay,
    MasoneryList,
    Notifications,
    UserCard,
} from "@client";
import { useAlerts, useStore } from "@/store/store";
import { useState, useEffect } from "react";
import styles from "./Dash.module.css";
import Link from "next/link";

const basePath = process.env.NEXT_PUBLIC_BASEPATH ?? "";

export function Dashboard({ more = false }) {
    const associates = useStore((state) => state.associates);
    const sources = useStore((state) => state.sources);
    const quizzes = useStore((state) => state.quizzes);
    const courses = useStore((state) => state.courses);
    const groups = useStore((state) => state.groups);
    const notes = useStore((state) => state.notes);
    const user = useStore((state) => state.user);

    const addAssociate = useStore((state) => state.addAssociate);
    const addAlert = useAlerts((state) => state.addAlert);

    const myGroups = groups.filter((g) => g.createdBy === user.id);
    const otherGroups = groups.filter((g) => g.createdBy !== user.id);

    const [associate, setAssociate] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [currentTab, setCurrentTab] = useState(0);

    useEffect(() => {
        if (typeof window !== undefined) {
            setCurrentTab(
                parseInt(
                    localStorage ? localStorage.getItem("currentTab") || 0 : 0,
                ),
            );
        }
    }, []);

    const tabs = [
        {
            name: "Home",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M22,5.724V2c0-.552-.447-1-1-1s-1,.448-1,1v2.366L14.797,.855c-1.699-1.146-3.895-1.146-5.594,0L2.203,5.579c-1.379,.931-2.203,2.48-2.203,4.145v9.276c0,2.757,2.243,5,5,5h2c.553,0,1-.448,1-1V14c0-.551,.448-1,1-1h6c.552,0,1,.449,1,1v9c0,.552,.447,1,1,1h2c2.757,0,5-2.243,5-5V9.724c0-1.581-.744-3.058-2-4Z" />
                </svg>
            ),
            summaries: [
                {
                    name: "Sources",
                    data: sources.length,
                },
                {
                    name: "Quizzes",
                    data: quizzes.length,
                },
                {
                    name: "Notes",
                    data: notes.length,
                },
                {
                    name: "Associates",
                    data: associates.length,
                },
                {
                    name: "Groups",
                    data: groups.length,
                },
            ],
        },
        {
            name: "Courses",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="m13,18l.038,5.348c0,.623-.791.89-1.169.395l-1.331-1.743-1.331,1.743c-.378.495-1.169.228-1.169-.395l-.038-5.348h5Zm-8-2h1V.1C3.672.575,2,2.624,2,5v12.025c.699-.527,1.525-.86,2.395-.964.199-.041.402-.061.605-.061Zm1,2h-1c-1.657,0-3,1.343-3,3s1.343,3,3,3h1v-6ZM17,0h-9v16h14V5c0-2.761-2.239-5-5-5Zm-2,24h2c2.761,0,5-2.239,5-5v-1h-7v6Z" />
                </svg>
            ),
            summaries: [
                {
                    name: "Enrolled",
                    data: courses.length,
                },
                {
                    name: "Completed",
                    data: "N/A",
                },
            ],
        },
        {
            name: "Groups",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M3,3c0-1.105,.895-2,2-2s2,.895,2,2-.895,2-2,2-2-.895-2-2Zm9,2c1.381,0,2.5-1.119,2.5-2.5s-1.119-2.5-2.5-2.5-2.5,1.119-2.5,2.5,1.119,2.5,2.5,2.5Zm7,0c1.105,0,2-.895,2-2s-.895-2-2-2-2,.895-2,2,.895,2,2,2Zm-6.999,19s0,0,0,0c0,0,0,0,0,0,0,0,0,0,0,0s0,0,0,0c0,0,0,0,0,0,0,0,0,0,0,0-6.252,0-11.389-4.691-11.95-10.91-.049-.55,.356-1.036,.906-1.086,.563-.048,1.037,.356,1.086,.906,.065,.725,.213,1.422,.419,2.09h3.44c-.159-.616-.283-1.249-.347-1.903-.054-.55,.349-1.039,.898-1.092,.553-.05,1.039,.349,1.092,.898,.07,.722,.227,1.422,.434,2.097h8.044c.207-.675,.364-1.375,.434-2.097,.053-.55,.54-.949,1.092-.898,.55,.053,.952,.542,.898,1.092-.063,.654-.188,1.287-.347,1.903h3.44c.207-.668,.354-1.365,.419-2.09,.05-.55,.526-.956,1.086-.906,.55,.05,.956,.536,.906,1.086-.561,6.219-5.698,10.909-11.95,10.91Zm-3.223-7c1.023,2.079,2.409,3.723,3.221,4.586,.813-.863,2.198-2.507,3.221-4.586h-6.443Zm.627,4.657c-.944-1.169-2.037-2.769-2.829-4.657H3.332c1.308,2.283,3.48,3.972,6.073,4.657Zm11.263-4.657h-3.244c-.792,1.889-1.885,3.488-2.829,4.657,2.593-.685,4.765-2.374,6.073-4.657Zm-11.668-7h6c.677,.019,1.191-.724,.937-1.351-.594-1.585-2.176-2.649-3.937-2.649s-3.343,1.064-3.937,2.649c-.255,.626,.26,1.37,.937,1.351Zm-7,0H6.179c-.233-.657-.239-1.383,.011-2.052,.198-.528,.477-1.01,.807-1.451-.602-.314-1.282-.497-1.997-.497-1.761,0-3.343,1.064-3.937,2.649-.255,.626,.26,1.37,.937,1.351Zm15.003-3.503c.329,.441,.609,.923,.807,1.451,.25,.669,.244,1.394,.011,2.052h4.18c.677,.019,1.191-.724,.937-1.351-.594-1.585-2.176-2.649-3.937-2.649-.715,0-1.396,.183-1.997,.497Z" />
                </svg>
            ),
            summaries: [
                {
                    name: "Created",
                    data: groups.filter((g) => g.createdBy === user.id).length,
                },
                {
                    name: "Joined",
                    data: groups.filter((g) => g.createdBy !== user.id).length,
                },
            ],
        },
        {
            name: "Associates",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="m14,4c0-.552.447-1,1-1h2c2.206,0,4,1.794,4,4v2c0,.552-.447,1-1,1s-1-.448-1-1v-2c0-1.103-.897-2-2-2h-2c-.553,0-1-.448-1-1Zm-5,15h-2c-1.103,0-2-.897-2-2v-2c0-.552-.447-1-1-1s-1,.448-1,1v2c0,2.206,1.794,4,4,4h2c.553,0,1-.448,1-1s-.447-1-1-1Zm3-13c0,3.309-2.691,6-6,6S0,9.309,0,6,2.691,0,6,0s6,2.691,6,6Zm-8-2c0,1.105.895,2,2,2s2-.895,2-2-.895-2-2-2-2,.895-2,2Zm4.776,4.87c-.445-1.095-1.514-1.87-2.768-1.87h-.016c-1.254,0-2.325.774-2.769,1.868.72.698,1.698,1.132,2.778,1.132s2.055-.433,2.776-1.13Zm15.224,9.13c0,3.309-2.691,6-6,6s-6-2.691-6-6,2.691-6,6-6,6,2.691,6,6Zm-8-2c0,1.105.895,2,2,2s2-.895,2-2-.895-2-2-2-2,.895-2,2Zm4.776,4.87c-.445-1.095-1.514-1.87-2.768-1.87h-.016c-1.254,0-2.325.774-2.769,1.868.72.698,1.698,1.132,2.778,1.132s2.055-.433,2.776-1.13Z" />
                </svg>
            ),
            summaries: [
                {
                    name: "Associates",
                    data: associates.length,
                },
            ],
        },
    ];

    async function requestAssociate() {
        if (isLoading || associate.length === 0) return;
        setIsLoading(true);

        const response = await fetch(`${basePath}/api/me/associates`, {
            method: "POST",
            body: JSON.stringify(
                isNaN(associate)
                    ? { username: associate }
                    : { userId: associate },
            ),
        });

        let data = null;
        try {
            data = await response.json();
        } catch (e) {}

        if (response.ok) {
            setAssociate("");

            if (data?.content?.associate) {
                addAssociate(data.content.associate);
            }
        }

        addAlert({
            success: response.ok,
            message: data?.message || "Something went wrong",
        });

        setIsLoading(false);
    }

    if (!user) return null;

    return (
        <main className={styles.main}>
            <section>
                <nav>
                    <ul className={styles.tabList}>
                        {tabs.map((tab, index) => (
                            <li
                                key={tab.name}
                                className={
                                    currentTab === index ? styles.active : ""
                                }
                            >
                                <div
                                    tabIndex={0}
                                    onClick={() => {
                                        setCurrentTab(index);
                                        localStorage.setItem(
                                            "currentTab",
                                            index,
                                        );
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            setCurrentTab(index);
                                            localStorage.setItem(
                                                "currentTab",
                                                index,
                                            );
                                        }
                                    }}
                                >
                                    {tab.icon}
                                </div>

                                <span>{tab.name}</span>
                            </li>
                        ))}
                    </ul>
                </nav>
            </section>

            <section className={styles.content}>
                <header className={styles.tabHeader}>
                    <h1>
                        {currentTab === 0 && (
                            <Avatar
                                src={user.avatar}
                                username={user.username}
                                size={42}
                            />
                        )}

                        {currentTab === 0
                            ? user.username
                            : tabs[currentTab].name}

                        {currentTab === 0 && (
                            <span>XP {user.xp ? user.xp : 0}</span>
                        )}

                        {currentTab !== 0 && (
                            <Link
                                className={styles.browseLink}
                                title={`Browse ${tabs[currentTab].name}`}
                                href={`/${tabs[currentTab].name.toLowerCase()}`}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M18,18.5c0,3.03-2.47,5.5-5.5,5.5H5.5C2.47,24,0,21.53,0,18.5v-7C0,8.47,2.47,6,5.5,6c.83,0,1.5,.67,1.5,1.5s-.67,1.5-1.5,1.5c-1.38,0-2.5,1.12-2.5,2.5v7c0,1.38,1.12,2.5,2.5,2.5h7c1.38,0,2.5-1.12,2.5-2.5,0-.83,.67-1.5,1.5-1.5s1.5,.67,1.5,1.5Zm5-13.45L18.58,.46c-.58-.6-1.52-.62-2.12-.04-.6,.58-.62,1.52-.04,2.12l3.33,3.46h-6.25c-3.03,0-5.5,2.47-5.5,5.5v5c0,.83,.67,1.5,1.5,1.5s1.5-.67,1.5-1.5v-5c0-1.38,1.12-2.5,2.5-2.5h6.25l-3.33,3.46c-.57,.6-.56,1.55,.04,2.12,.29,.28,.67,.42,1.04,.42,.39,0,.79-.15,1.08-.46l4.39-4.56c1.37-1.36,1.37-3.59,.02-4.93Z" />
                                </svg>
                            </Link>
                        )}
                    </h1>

                    <div className={styles.summaries}>
                        {tabs[currentTab].summaries.map((sum) => (
                            <div key={sum.name}>
                                <p>{sum.name}</p>
                                <p>{sum.data}</p>
                            </div>
                        ))}
                    </div>
                </header>

                <main className="scrollbar">
                    <header>
                        <h1>
                            {currentTab === 0 && (
                                <Avatar
                                    src={user.avatar}
                                    username={user.username}
                                    size={42}
                                />
                            )}

                            {currentTab === 0
                                ? user.username
                                : tabs[currentTab].name}

                            {currentTab === 0 && (
                                <span>XP {user.xp ? user.xp : 0}</span>
                            )}

                            {currentTab !== 0 && (
                                <Link
                                    className={styles.browseLink}
                                    title={`Browse ${tabs[currentTab].name}`}
                                    href={`/${tabs[
                                        currentTab
                                    ].name.toLowerCase()}`}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="20"
                                        height="20"
                                    >
                                        <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
                                        <path d="M11 13l9 -9" />
                                        <path d="M15 4h5v5" />
                                    </svg>
                                </Link>
                            )}
                        </h1>

                        <div className={styles.summaries}>
                            {tabs[currentTab].summaries.map((sum) => (
                                <div key={sum.name}>
                                    <p>{sum.name}</p>
                                    <p>{sum.data}</p>
                                </div>
                            ))}
                        </div>
                    </header>

                    {currentTab === 0 && <Notifications />}

                    {currentTab === 0 &&
                        (courses.length || quizzes.length ? (
                            <div className={styles.userContent}>
                                {courses.length > 0 && (
                                    <div>
                                        <h3>Pick up where you left off</h3>

                                        <MasoneryList>
                                            {courses.map((course) => (
                                                <CourseDisplay
                                                    lighter
                                                    key={course.id}
                                                    course={course}
                                                />
                                            ))}
                                        </MasoneryList>
                                    </div>
                                )}

                                {quizzes.length > 0 && (
                                    <div>
                                        <h3>Attempt quizzes to earn XP</h3>

                                        {quizzes.length === 0 && (
                                            <p>
                                                No quizzes available at the
                                                moment.
                                            </p>
                                        )}

                                        <MasoneryList>
                                            {quizzes.map((quiz) => (
                                                <QuizDisplay
                                                    key={quiz.id}
                                                    quiz={quiz}
                                                />
                                            ))}
                                        </MasoneryList>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={styles.empty}>
                                <p>
                                    Hey, we couldn't find any courses or quizzes
                                    for you. But that doesn't mean you can't
                                    explore more.
                                </p>

                                <div>
                                    <Link
                                        href="/courses"
                                        className="button round primary"
                                    >
                                        Explore Courses
                                    </Link>

                                    <Link
                                        href="/quizzes"
                                        className="button round primary"
                                    >
                                        Explore Quizzes
                                    </Link>
                                </div>
                            </div>
                        ))}

                    {currentTab === 1 &&
                        (!courses.length ? (
                            <div className={styles.empty}>
                                <p>You haven't enrolled in any courses yet.</p>

                                <Link
                                    href="/courses"
                                    className="button round primary"
                                >
                                    Explore Courses
                                </Link>
                            </div>
                        ) : (
                            <div className={styles.userContent}>
                                <div>
                                    <h3>Courses you are enrolled in</h3>

                                    <MasoneryList>
                                        {courses.map((course) => (
                                            <CourseDisplay
                                                lighter
                                                key={course.id}
                                                course={course}
                                            />
                                        ))}
                                    </MasoneryList>
                                </div>
                            </div>
                        ))}

                    {currentTab === 2 &&
                        (!groups.length ? (
                            <div className={styles.empty}>
                                <p>You haven't created any groups yet.</p>

                                <Link
                                    href="/groups"
                                    className="button round primary"
                                >
                                    Explore Groups
                                </Link>
                            </div>
                        ) : (
                            <div className={styles.userContent}>
                                {myGroups.length > 0 && (
                                    <div>
                                        <h3>
                                            Groups you created
                                            <span className={styles.chip}>
                                                {myGroups.length}
                                            </span>
                                        </h3>

                                        <ul className={styles.gridList}>
                                            {myGroups.map((group) => (
                                                <Link
                                                    key={group.id}
                                                    className={styles.card}
                                                    href={`/groups/${group.publicId}`}
                                                >
                                                    <h3>{group.name}</h3>

                                                    <p>
                                                        {group.description ||
                                                            "No description provided."}
                                                    </p>
                                                </Link>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {otherGroups.length > 0 && (
                                    <div>
                                        <h3>
                                            Groups you joined
                                            <span className={styles.chip}>
                                                {otherGroups.length}
                                            </span>
                                        </h3>

                                        <ul className={styles.gridList}>
                                            {otherGroups.map((group) => (
                                                <Link
                                                    key={group.id}
                                                    className={styles.card}
                                                    href={`/groups/${group.id}`}
                                                >
                                                    <h3>{group.name}</h3>

                                                    <p>
                                                        {group.description ||
                                                            "No description provided."}
                                                    </p>
                                                </Link>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}

                    {currentTab === 3 &&
                        (!associates.length ? (
                            <div className={styles.empty}>
                                <p>You haven't added any associates yet.</p>

                                <div className={styles.input}>
                                    <label htmlFor="addAssociate">
                                        Add Associate by Username or ID
                                    </label>

                                    <div>
                                        <input
                                            id="addAssociate"
                                            type="text"
                                            placeholder="Username or ID"
                                            value={associate}
                                            onChange={(e) =>
                                                setAssociate(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (
                                                    e.key === "Enter" &&
                                                    !isLoading
                                                ) {
                                                    requestAssociate();
                                                }
                                            }}
                                        />

                                        <button
                                            onClick={() => requestAssociate()}
                                            disabled={isLoading}
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={styles.input}>
                                    <label htmlFor="addAssociate">
                                        Add Associate by Username or ID
                                    </label>

                                    <div>
                                        <input
                                            id="addAssociate"
                                            type="text"
                                            placeholder="Username or ID"
                                            value={associate}
                                            onChange={(e) =>
                                                setAssociate(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (
                                                    e.key === "Enter" &&
                                                    !isLoading
                                                ) {
                                                    requestAssociate();
                                                }
                                            }}
                                        />

                                        <button
                                            onClick={() => requestAssociate()}
                                            disabled={isLoading}
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>

                                <ul className={styles.gridList}>
                                    {(associates || []).map((user) => (
                                        <li key={user.id}>
                                            <UserCard user={user} />
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ))}

                    {more && (
                        <div>
                            <button className={styles.dashButton}>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M19.95 11a8 8 0 1 0 -.5 4m.5 5v-5h-5" />
                                </svg>

                                <span>Load More</span>
                            </button>
                        </div>
                    )}
                </main>
            </section>
        </main>
    );
}
