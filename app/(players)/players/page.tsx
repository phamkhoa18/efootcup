import { Suspense } from "react";
import { Metadata } from "next";
import PlayersListClient from "./components/PlayersListClient";

export const metadata: Metadata = {
    title: "Cầu thủ - eFootball Database",
    description: "Khám phá, so sánh và phân tích thông số chi tiết của mọi cầu thủ trong eFootball.",
};

export default function PlayersPage() {
    return (
        <Suspense>
            <PlayersListClient />
        </Suspense>
    );
}
