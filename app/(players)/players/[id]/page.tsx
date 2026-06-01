import { Suspense } from "react";
import PlayerDetailClient from "./components/PlayerDetailClient";

export default async function PlayerDetailPage(props: {
    params: Promise<{ id: string }> | { id: string }
}) {
    const resolvedParams = await Promise.resolve(props.params);
    const { id } = resolvedParams;

    return (
        <Suspense>
            <PlayerDetailClient id={id} />
        </Suspense>
    );
}
