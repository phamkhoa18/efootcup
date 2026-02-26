import { Metadata } from "next";
import TournamentsClient from "./TournamentsClient";

export const metadata: Metadata = {
    title: "Danh sách giải đấu",
    description: "Khám phá các giải đấu eFootball chuyên nghiệp, nghiệp dư và các sự kiện cộng đồng tại Việt Nam. Tham gia thi đấu để nhận giải thưởng và leo bảng xếp hạng.",
    openGraph: {
        title: "Danh sách giải đấu eFootCup VN",
        description: "Khám phá các giải đấu eFootball chuyên nghiệp và cộng đồng. Tham gia ngay để khẳng định bản thân!",
        images: ["/assets/efootball_bg.webp"],
    },
};

export default function GiaiDauPage() {
    return <TournamentsClient />;
}
