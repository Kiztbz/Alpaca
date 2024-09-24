"use client";

import { usePathname, useRouter } from "next/navigation";
import { Avatar, Dialog, Form, Input, Spinner } from "@client";
import { useAlerts, useStore } from "@/store/store";
import { protectedPaths } from "@/app/data/paths";
import styles from "./Profile.module.css";
import { useState } from "react";
import {
    PopoverTrigger,
    PopoverContent,
    Popover,
} from "../Layers/Popover/Popover";
import {
    DialogDescription,
    DialogButtons,
    DialogContent,
    DialogHeading,
} from "../Layers/Dialog/Dialog";

const basePath = process.env.NEXT_PUBLIC_BASEPATH ?? "";

export function Profile({ user, size = 44 }) {
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);

    const [reportTitle, setReportTitle] = useState("");
    const [reportDescription, setReportDescription] = useState("");
    const [reportUrl, setReportUrl] = useState(
        typeof window !== "undefined" ? window.location.href : "",
    );

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const notifications = useStore((state) => state.notifications);
    const addAlert = useAlerts((state) => state.addAlert);
    const readAll = useStore((state) => state.readAll);

    const router = useRouter();
    const path = usePathname();

    function reset() {
        setReportOpen(false);
        setReportTitle("");
        setReportDescription("");
        setReportUrl("");
        setErrors({});
    }

    async function handleReportSubmit(e) {
        e.preventDefault();
        if (loading) return;

        const newErrors = {};

        if (reportTitle && reportTitle.length > 128) {
            newErrors.title = "Title must be less than 128 characters";
        }

        if (!reportDescription) {
            newErrors.description = "Please enter a description";
        }

        if (!reportDescription || reportDescription.length > 4096) {
            newErrors.description =
                "Description must be less than 4096 characters";
        }

        if (!reportUrl) {
            newErrors.url = "Please enter a URL";
        }

        if (!reportUrl || reportUrl.length > 256) {
            newErrors.url = "URL must be less than 256 characters";
        }

        if (Object.keys(newErrors).length > 0) {
            return setErrors(newErrors);
        }

        try {
            setLoading(true);

            const response = await fetch(`${basePath}/api/error`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: reportTitle,
                    stack: reportDescription,
                    url: reportUrl,
                    userInfo: {
                        userAgent: navigator.userAgent,
                        language: navigator.language,
                        cookieEnabled: navigator.cookieEnabled,
                        doNotTrack: navigator.doNotTrack,
                        hardwareConcurrency: navigator.hardwareConcurrency,
                        maxTouchPoints: navigator.maxTouchPoints,
                        isOnline: navigator.onLine,
                    },
                    isClient: true,
                    report: true,
                }),
            });

            let data = null;
            try {
                data = await response.json();
            } catch (error) {}

            if (!response.ok) {
                setErrors(data?.errors ?? {});
            } else {
                reset();
            }

            addAlert({
                success: response.ok,
                message: data?.message ?? "Something went wrong",
            });
        } catch (error) {
            console.error(error);
            addAlert({
                success: false,
                message: "An error occurred while submitting the report",
            });
        } finally {
            setLoading(false);
        }
    }

    const notificationItems = [
        {
            name: "See all notifications",
            onClick: () => {
                localStorage.setItem("currentTab", 0);
                if (path != "/me/dashboard") {
                    router.push("/me/dashboard");
                }
            },
        },
        {
            name: "hr",
        },
        {
            name: "Mark all as read",
            onClick: async () => {
                const response = await fetch(`${basePath}/api/notifications`, {
                    method: "PATCH",
                }).then((res) => res.json());

                addAlert({
                    success: response.success,
                    message: response.message,
                });

                if (response.success) {
                    readAll();
                }
            },
        },
    ];

    const logout = async () => {
        await fetch(
            `${process.env.NEXT_PUBLIC_BASEPATH ?? ""}/api/auth/logout`,
            {
                method: "POST",
            },
        );

        if (protectedPaths.includes(path)) {
            router.push("/login");
        }

        router.refresh();
    };

    const menuItems = [
        {
            name: "Dashboard",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="m23.9 11.437a12 12 0 0 0 -23.9 1.563 11.878 11.878 0 0 0 3.759 8.712 4.84 4.84 0 0 0 3.354 1.288h9.767a4.994 4.994 0 0 0 3.509-1.429 11.944 11.944 0 0 0 3.511-10.134zm-16.428 8.224a1 1 0 0 1 -1.412.09 8.993 8.993 0 0 1 5.94-15.751 9.1 9.1 0 0 1 2.249.283 1 1 0 1 1 -.5 1.938 6.994 6.994 0 0 0 -6.367 12.028 1 1 0 0 1 .09 1.412zm4.528-4.661a2 2 0 1 1 .512-3.926l3.781-3.781a1 1 0 1 1 1.414 1.414l-3.781 3.781a1.976 1.976 0 0 1 -1.926 2.512zm5.94 4.751a1 1 0 0 1 -1.322-1.5 6.992 6.992 0 0 0 2.161-7 1 1 0 1 1 1.938-.5 9.094 9.094 0 0 1 .283 2.249 9 9 0 0 1 -3.06 6.751z" />
                </svg>
            ),
            onClick: () => router.push("/me/dashboard"),
        },
        {
            name: "Settings",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 512 512"
                    x="0px"
                    y="0px"
                >
                    <g>
                        <path d="M34.283,384c17.646,30.626,56.779,41.148,87.405,23.502c0.021-0.012,0.041-0.024,0.062-0.036l9.493-5.483   c17.92,15.332,38.518,27.222,60.757,35.072V448c0,35.346,28.654,64,64,64s64-28.654,64-64v-10.944   c22.242-7.863,42.841-19.767,60.757-35.115l9.536,5.504c30.633,17.673,69.794,7.167,87.467-23.467   c17.673-30.633,7.167-69.794-23.467-87.467l0,0l-9.472-5.461c4.264-23.201,4.264-46.985,0-70.187l9.472-5.461   c30.633-17.673,41.14-56.833,23.467-87.467c-17.673-30.633-56.833-41.14-87.467-23.467l-9.493,5.483   C362.862,94.638,342.25,82.77,320,74.944V64c0-35.346-28.654-64-64-64s-64,28.654-64,64v10.944   c-22.242,7.863-42.841,19.767-60.757,35.115l-9.536-5.525C91.073,86.86,51.913,97.367,34.24,128s-7.167,69.794,23.467,87.467l0,0   l9.472,5.461c-4.264,23.201-4.264,46.985,0,70.187l-9.472,5.461C27.158,314.296,16.686,353.38,34.283,384z M256,170.667   c47.128,0,85.333,38.205,85.333,85.333S303.128,341.333,256,341.333S170.667,303.128,170.667,256S208.872,170.667,256,170.667z" />
                    </g>
                </svg>
            ),
            onClick: () => router.push("/me/settings"),
        },
        {
            name: "hr",
        },
        {
            name: "Report a bug",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M0,19v4a1,1,0,0,0,2,0V19H4.93a8.248,8.248,0,0,0,14.14,0H22v4a1,1,0,0,0,2,0V19a2,2,0,0,0-2-2H19.947a8.2,8.2,0,0,0,.325-2.273A8.37,8.37,0,0,0,20.2,13.7l-.175-.7H23a1,1,0,0,0,0-2H19.522L18.513,7H22a2,2,0,0,0,2-2V1a1,1,0,0,0-2,0V5H18c-.018,0-.032.009-.05.01a6.411,6.411,0,0,0-11.89,0C6.039,5.011,6.021,5,6,5H2V1A1,1,0,0,0,0,1V5A2,2,0,0,0,2,7H5.485L4.472,11H1a1,1,0,0,0,0,2H3.965l-.145.573L3.8,13.7a8.37,8.37,0,0,0-.07,1.032A8.2,8.2,0,0,0,4.053,17H2A2,2,0,0,0,0,19Z" />
                </svg>
            ),
            onClick: () => {
                setReportOpen(true);
            },
        },
        {
            name: "hr",
        },
        {
            name: "Logout",
            danger: true,
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="m23.473,16.247l-2.862,2.863-1.414-1.414,1.696-1.696h-6.892v-2h6.956l-1.76-1.761,1.414-1.414,2.862,2.862c.706.706.706,1.854,0,2.56Zm-9.473,1.753h2v5.999H0V4.199C0,2.775,1.014,1.538,2.411,1.258L8.412.057c.886-.174,1.793.051,2.491.622.428.351.728.812.908,1.319h1.19c1.654,0,3,1.346,3,3v7.001h-2v-7.001c0-.552-.449-1-1-1h-1v18h2v-3.999Zm-4.999-5.501c0-.829-.672-1.501-1.501-1.501s-1.501.672-1.501,1.501.672,1.501,1.501,1.501,1.501-.672,1.501-1.501Z" />
                </svg>
            ),
            onClick: logout,
        },
    ];

    return (
        <div className={styles.container}>
            <Popover>
                <PopoverTrigger>
                    <div tabIndex={0}>
                        <Avatar
                            size={size}
                            src={user.avatar}
                            username={user.username}
                        />
                    </div>
                </PopoverTrigger>

                <PopoverContent isMenu items={menuItems} />
            </Popover>

            <Popover>
                {notifications.length > 0 && (
                    <PopoverTrigger>
                        <sub tabIndex={0} className={styles.notification}>
                            {notifications.length}
                        </sub>
                    </PopoverTrigger>
                )}

                <PopoverContent isMenu items={notificationItems} />
            </Popover>

            <Dialog
                open={reportOpen}
                onOpenChange={() => setReportOpen((prev) => !prev)}
            >
                <DialogContent>
                    <DialogHeading>Report a bug</DialogHeading>

                    <DialogDescription>
                        Please describe the bug you encountered below. If you
                        can, please include steps to reproduce the bug.
                    </DialogDescription>

                    <Form onSubmit={handleReportSubmit} singleColumn>
                        <Input
                            label="Title"
                            maxLength={128}
                            value={reportTitle}
                            error={errors.title}
                            placeholder="Clicking on the button crashes the app"
                            onChange={(e) => {
                                setReportTitle(e.target.value);
                                setErrors((prev) => ({ ...prev, title: "" }));
                            }}
                        />

                        <Input
                            required
                            type="textarea"
                            maxLength={4096}
                            label="Description"
                            value={reportDescription}
                            error={errors.description}
                            placeholder="When I click on the button, the app crashes. This only happens when I'm logged in."
                            onChange={(e) => {
                                setReportDescription(e.target.value);
                                setErrors((prev) => ({
                                    ...prev,
                                    description: "",
                                }));
                            }}
                        />

                        <Input
                            required
                            label="URL"
                            maxLength={256}
                            value={reportUrl}
                            error={errors.url}
                            placeholder="https://example.com"
                            onChange={(e) => {
                                setReportUrl(e.target.value);
                                setErrors((prev) => ({ ...prev, url: "" }));
                            }}
                        />
                    </Form>

                    <DialogButtons>
                        <button
                            className="button transparent"
                            onClick={() => setReportOpen(false)}
                        >
                            Cancel
                        </button>

                        <button
                            className="button primary"
                            onClick={handleReportSubmit}
                        >
                            Send {loading && <Spinner primary />}
                        </button>
                    </DialogButtons>
                </DialogContent>
            </Dialog>
        </div>
    );
}
