import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, SearchX, Search, SlidersHorizontal, Database, Sparkles, Zap, Users } from "lucide-react";
import Player from "@/models/players/Player";
import { connectPlayerDb } from "@/lib/player-db";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedParams = await Promise.resolve(searchParams);
  const q = resolvedParams?.q as string;
  const position = resolvedParams?.position as string;
  const minOvr = parseInt((resolvedParams?.ovr as string) || "70");
  const page = parseInt((resolvedParams?.page as string) || "1", 10);
  const limit = 24;
  const skip = (page - 1) * limit;

  const query: any = {};
  
  if (q) {
      query.name = { $regex: q, $options: "i" };
  }
  if (position) {
      query.positions = position;
  }
  if (minOvr > 70) {
      query["overall.max"] = { $gte: minOvr };
  }
  
  // Đảm bảo connection đã hoàn tất vì bufferCommands = false
  await connectPlayerDb();

  const total = await Player.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  // Lấy data cầu thủ từ player DB
  const players = await Player.find(query)
      .sort({ "overall.max": -1 })
      .skip(skip)
      .limit(limit) 
      .lean();

  const buildPageUrl = (pageNum: number) => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (position) params.set('position', position);
      if (minOvr > 70) params.set('ovr', minOvr.toString());
      params.set('page', pageNum.toString());
      return `/players?${params.toString()}`;
  };

  const positions = [
    { value: "", label: "Tất cả" },
    { value: "CF", label: "CF" },
    { value: "SS", label: "SS" },
    { value: "LWF", label: "LWF" },
    { value: "RWF", label: "RWF" },
    { value: "AMF", label: "AMF" },
    { value: "LMF", label: "LMF" },
    { value: "RMF", label: "RMF" },
    { value: "CMF", label: "CMF" },
    { value: "DMF", label: "DMF" },
    { value: "CB", label: "CB" },
    { value: "LB", label: "LB" },
    { value: "RB", label: "RB" },
    { value: "GK", label: "GK" },
  ];

  const getOvrColor = (ovr: number) => {
    if (ovr >= 95) return "from-yellow-300 to-amber-500 text-amber-900";
    if (ovr >= 90) return "from-violet-400 to-purple-500 text-white";
    if (ovr >= 85) return "from-blue-400 to-indigo-500 text-white";
    return "from-slate-400 to-slate-500 text-white";
  };

  const getOvrTextColor = (ovr: number) => {
    if (ovr >= 95) return "text-efb-yellow";
    if (ovr >= 90) return "text-violet-400";
    if (ovr >= 85) return "text-blue-400";
    return "text-slate-400";
  };

  return (
    <>
      {/* Gaming Hero Banner */}
      <section className="relative pt-16 overflow-hidden">
        {/* Deep dark base */}
        <div className="absolute inset-0 bg-[#060A13]" />

        {/* Animated grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,255,255,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,255,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Diagonal geometric shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Top-right angular accent */}
          <div
            className="absolute -top-20 -right-20 w-[600px] h-[400px] bg-gradient-to-bl from-cyan-500/15 via-blue-600/8 to-transparent"
            style={{ clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0% 70%)' }}
          />
          {/* Bottom-left angular accent */}
          <div
            className="absolute -bottom-10 -left-10 w-[500px] h-[350px] bg-gradient-to-tr from-purple-600/12 via-fuchsia-500/6 to-transparent"
            style={{ clipPath: 'polygon(0 30%, 70% 100%, 0 100%)' }}
          />
          {/* Center neon line burst */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.04]"
            style={{
              background: 'conic-gradient(from 0deg, transparent, cyan, transparent, transparent, magenta, transparent, transparent, cyan, transparent)',
            }}
          />

          {/* Floating neon dots */}
          <div className="absolute top-[20%] right-[15%] w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_12px_4px_rgba(0,255,255,0.5)]" />
          <div className="absolute top-[60%] right-[25%] w-1 h-1 bg-fuchsia-400 rounded-full shadow-[0_0_10px_3px_rgba(255,0,255,0.4)]" />
          <div className="absolute top-[35%] left-[10%] w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_3px_rgba(0,255,255,0.3)]" />
          <div className="absolute bottom-[30%] right-[10%] w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-[0_0_12px_4px_rgba(255,255,0,0.4)]" />

          {/* Horizontal racing stripes */}
          <div className="absolute top-[30%] left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          <div className="absolute top-[70%] left-0 w-full h-px bg-gradient-to-r from-transparent via-fuchsia-500/15 to-transparent" />

          {/* Scanline overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 pt-16 pb-14">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              {/* Gaming badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 mb-6 border border-cyan-500/30 bg-cyan-500/[0.06] backdrop-blur-sm"
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
              >
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-bold text-cyan-300 tracking-[0.2em] uppercase">
                  Player Database
                </span>
              </div>

              {/* Title with gaming font style */}
              <h1 className="text-[40px] sm:text-[52px] lg:text-[64px] font-black leading-[0.95] tracking-tight text-white mb-4 uppercase">
                <span className="text-white/90">Khám phá</span>
                <br />
                <span className="relative">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-fuchsia-400 drop-shadow-[0_0_40px_rgba(0,255,255,0.4)]">
                    cầu thủ
                  </span>
                </span>
              </h1>

              <p className="text-[14px] text-white/40 font-light max-w-md leading-relaxed tracking-wide">
                Tìm kiếm, so sánh và phân tích thông số chi tiết của mọi cầu thủ trong eFootball.
              </p>
            </div>

            {/* Stats with neon borders */}
            <div className="flex items-center gap-0">
              <div className="text-center px-6 py-3 border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)' }}
              >
                <div className="text-2xl font-black text-cyan-400 tracking-tight font-mono">{total.toLocaleString()}</div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold mt-1">Players</div>
              </div>
              <div className="text-center px-6 py-3 border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm -ml-px"
                style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%)' }}
              >
                <div className="text-2xl font-black text-fuchsia-400 tracking-tight font-mono">{totalPages}</div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold mt-1">Pages</div>
              </div>
            </div>
          </div>
        </div>

        {/* Diagonal cut divider instead of wave */}
        <div className="relative z-10 h-12 bg-[#0A1628]" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 60%)' }} />
        <div className="absolute bottom-0 left-0 right-0 z-[9] h-12 bg-gradient-to-r from-cyan-500/20 via-transparent to-fuchsia-500/20" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 60%)' }} />
      </section>

      {/* Content Section */}
      <section className="relative -mt-1 pb-20">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          {/* Filter Bar */}
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.06] p-5 lg:p-6 mb-10 -mt-2" style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}>
            <form method="GET" action="/players" className="space-y-5 lg:space-y-0 lg:flex lg:items-end lg:gap-5">
              {/* Search */}
              <div className="flex-1">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-2 block">
                  Tên cầu thủ
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                  <input
                    name="q"
                    defaultValue={q}
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/30 transition-all font-sans outline-none"
                    placeholder="Tìm kiếm cầu thủ..."
                    type="text"
                  />
                </div>
              </div>

              {/* Position */}
              <div className="lg:w-40">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-2 block">
                  Vị trí
                </label>
                <select
                  name="position"
                  defaultValue={position}
                  className="w-full bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 px-4 py-2.5 rounded-lg focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/30 transition-all font-sans outline-none appearance-none cursor-pointer"
                >
                  {positions.map(pos => (
                    <option key={pos.value} value={pos.value} className="bg-[#0A1628] text-white">
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* OVR Range */}
              <div className="lg:w-56">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-2 block">
                  Chỉ số tổng (OVR)
                </label>
                <div className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-2">
                  <input
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    max="105"
                    min="70"
                    type="range"
                    name="ovr"
                    defaultValue={minOvr}
                  />
                  <div className="flex justify-between mt-1.5 text-[10px] font-medium text-white/30">
                    <span>70</span>
                    <span className="text-cyan-400 font-bold">{minOvr}+</span>
                    <span>105</span>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="lg:w-auto">
                <button
                  type="submit"
                  className="w-full lg:w-auto px-8 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs tracking-wider uppercase hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 active:scale-95 flex items-center justify-center gap-2"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Lọc
                </button>
              </div>
            </form>
          </div>

          {/* Results Info */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-cyan-400/20 rounded-full" />
              <div>
                <h2 className="text-lg font-semibold text-white">Kết quả</h2>
                <p className="text-xs text-white/40">
                  Trang {page}/{totalPages} · {total.toLocaleString()} cầu thủ
                  {q && <> · Tìm kiếm: <span className="text-cyan-400">&quot;{q}&quot;</span></>}
                  {position && <> · Vị trí: <span className="text-cyan-400">{position}</span></>}
                </p>
              </div>
            </div>
          </div>

          {/* Player Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 lg:gap-5">
            {players.map((player: any) => {
              const ovr = player.overall?.max || player.overall?.base || 0;
              const speed = player.stats?.maxLevel?.speed || player.stats?.level1?.speed || 0;
              const drill = player.stats?.maxLevel?.dribbling || player.stats?.maxLevel?.tightPossession || player.stats?.level1?.dribbling || 0;
              const pass = player.stats?.maxLevel?.lowPass || player.stats?.maxLevel?.loftedPass || player.stats?.level1?.lowPass || 0;
              const imageUrl = player.images?.portrait || player.images?.card || player.images?.thumbnail;
              return (
                <Link
                  href={`/players/${player.efhubId || player._id}`}
                  key={player._id.toString()}
                  className="group relative bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 cursor-pointer block overflow-hidden hover:bg-white/[0.06]"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
                >
                  {/* Player Image Area */}
                  <div className="relative w-full aspect-[4/5] bg-gradient-to-b from-[#0C1A30] to-[#060A13] flex items-center justify-center p-3 overflow-hidden">
                    {/* OVR Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getOvrColor(ovr)} flex items-center justify-center shadow-lg`}>
                        <span className="text-sm font-black leading-none">{ovr}</span>
                      </div>
                      <div className="text-[9px] font-bold text-white/60 uppercase mt-1 text-center tracking-wide">
                        {player.positions?.[0] || "N/A"}
                      </div>
                    </div>

                    {/* Card type badge */}
                    {player.cardType && player.cardType !== "Standard" && (
                      <div className="absolute top-2.5 right-2.5 z-10">
                        <span className="text-[8px] px-2 py-0.5 bg-cyan-500/15 text-cyan-400 font-bold uppercase tracking-wider border border-cyan-500/20">
                          {player.cardType}
                        </span>
                      </div>
                    )}

                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={player.name}
                        className="w-[80%] h-[80%] object-contain group-hover:scale-110 transition-transform duration-500 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-white/20">
                        <Users className="w-8 h-8 mb-1" />
                        <span className="text-[10px]">No Image</span>
                      </div>
                    )}

                    {/* Bottom glow on hover */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0A1628] to-transparent" />
                  </div>

                  {/* Player Info */}
                  <div className="p-3 relative">
                    <div className="truncate w-full font-bold text-sm text-white group-hover:text-cyan-400 transition-colors duration-200 uppercase tracking-wide">
                      {player.name}
                    </div>
                    <div className="text-[11px] text-white/35 truncate w-full mt-0.5">
                      {player.club || player.teamId || "Unknown"}
                    </div>

                    {/* Key Stats */}
                    <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-white/[0.06]">
                      <div className="flex-1 text-center">
                        <div className="text-[8px] text-white/25 uppercase font-bold tracking-wider">SPD</div>
                        <div className="text-xs font-bold text-white/70">{speed}</div>
                      </div>
                      <div className="w-px h-5 bg-white/[0.06]" />
                      <div className="flex-1 text-center">
                        <div className="text-[8px] text-white/25 uppercase font-bold tracking-wider">DRI</div>
                        <div className="text-xs font-bold text-white/70">{drill}</div>
                      </div>
                      <div className="w-px h-5 bg-white/[0.06]" />
                      <div className="flex-1 text-center">
                        <div className="text-[8px] text-white/25 uppercase font-bold tracking-wider">PAS</div>
                        <div className="text-xs font-bold text-white/70">{pass}</div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Empty State */}
          {players.length === 0 && (
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.08] mb-5">
                <SearchX className="w-7 h-7 text-white/20" />
              </div>
              <p className="text-lg font-medium text-white/60">Không tìm thấy cầu thủ nào</p>
              <p className="text-sm text-white/30 mt-2">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-16 flex items-center justify-center gap-2">
              {page > 1 ? (
                <Link
                  href={buildPageUrl(page - 1)}
                  className="w-10 h-10 flex items-center justify-center bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-white hover:border-cyan-500/40 hover:bg-white/[0.08] transition-all duration-200"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                >
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                </Link>
              ) : (
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/[0.04] text-white/15 cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                </div>
              )}

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = page;
                if (totalPages > 5) {
                  if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                } else {
                  p = i + 1;
                }

                return (
                  <Link
                    key={p}
                    href={buildPageUrl(p)}
                    className={`w-10 h-10 flex items-center justify-center font-bold text-sm transition-all duration-200 ${
                      page === p
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                        : "bg-white/[0.05] border border-white/[0.08] text-white/40 hover:border-cyan-500/30 hover:text-white hover:bg-white/[0.08]"
                    }`}
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  >
                    {p}
                  </Link>
                );
              })}

              {page < totalPages ? (
                <Link
                  href={buildPageUrl(page + 1)}
                  className="w-10 h-10 flex items-center justify-center bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-white hover:border-cyan-500/40 hover:bg-white/[0.08] transition-all duration-200"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                >
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </Link>
              ) : (
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/[0.04] text-white/15 cursor-not-allowed">
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
