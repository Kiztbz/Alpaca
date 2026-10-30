"use client";

import { useStore } from "@/store/store";
import { useLayoutEffect } from "react";

export function FillStore({
    user,
    users,
    sources,
    notes,
    quizzes,
    courses,
    relationships,
    groups,
    associates,
    notifications,
    webSocketURL,
}) {
    const fillInitialData = useStore((state) => state.fillInitialData);
    const setUser = useStore((state) => state.setUser);

    useLayoutEffect(() => {
        setUser(user);

        const data = {
            user,
            users,
            sources,
            notes,
            quizzes,
            courses,
            relationships,
            groups,
            associates,
            notifications,
        };

        fillInitialData(
            Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
        );

        if (!webSocketURL) return undefined;
        const ws = new WebSocket(webSocketURL);
        ws.onmessage = (message) => {
            const record = JSON.parse(message.data);
            if (!record.ns) return;
        };
        return () => ws.close();
    }, [
        user,
        sources,
        notes,
        quizzes,
        courses,
        relationships,
        groups,
        associates,
        notifications,
        webSocketURL,
        fillInitialData,
        setUser,
    ]);

    return null;
}
