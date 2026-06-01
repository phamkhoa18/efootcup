import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function run() {
    const res = await fetch("http://localhost:3000/api/tournaments/6a1d19a6eecd25def4349f13/brackets");
    const json = await res.json();
    const lr2 = json.data?.matches?.filter((m: any) => m.round === 102);
    console.log("API returned LR2 count:", lr2?.length);
    const lr2m2 = lr2?.find((m: any) => m.matchNumber === 641);
    console.log("LR2 M2 exists in API:", !!lr2m2);
}

run();
