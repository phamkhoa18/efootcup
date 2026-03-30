const fs = require('fs');

const file = 'd:/HK2_22-23/Thuc_tap_tot_nghiep/Efootball/efootcup/app/(main)/giai-dau/[id]/TournamentDetailClient.tsx';
let data = fs.readFileSync(file, 'utf8');

// 1. Add states
data = data.replace(
    'const [visibleScheduleCount, setVisibleScheduleCount] = useState(30);',
    `const [schedulePage, setSchedulePage] = useState(1);
    const [scheduleMatches, setScheduleMatches] = useState<any[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleHasMore, setScheduleHasMore] = useState(true);
    const [scheduleStats, setScheduleStats] = useState({ completedCount: 0, liveCount: 0, totalCount: 0 });
    const scheduleSearchTimer = useRef<NodeJS.Timeout | null>(null);
    const scheduleObserverTarget = useRef<HTMLDivElement>(null);`
);

// 2. Add fetchScheduleMatches and Infinite Scroll above fetchPlayerTeams
const fetchScheduleMatchesCode = `
    const fetchScheduleMatches = useCallback(async (page: number, filters: { search: string, status: string }, append = false) => {
        setScheduleLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: "30" });
            if (filters.search.trim()) params.set("search", filters.search.trim());
            if (filters.status) params.set("status", filters.status);
            
            const res = await fetch(\`/api/tournaments/\${id}/matches?\${params}\`);
            const json = await res.json();
            if (json.success) {
                if (append) {
                    setScheduleMatches(prev => [...prev, ...json.data.matches]);
                } else {
                    setScheduleMatches(json.data.matches);
                }
                setScheduleStats(json.data.stats || { completedCount: 0, liveCount: 0, totalCount: 0 });
                setScheduleHasMore(json.data.pagination.page < json.data.pagination.totalPages);
            }
        } catch (e) {
            console.error("Failed to fetch matches:", e);
        } finally {
            setScheduleLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (activeTab === "schedule") {
            setSchedulePage(1);
            fetchScheduleMatches(1, { search: bracketSearch, status: scheduleFilter }, false);
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === "schedule") {
            if (scheduleSearchTimer.current) clearTimeout(scheduleSearchTimer.current);
            scheduleSearchTimer.current = setTimeout(() => {
                setSchedulePage(1);
                fetchScheduleMatches(1, { search: bracketSearch, status: scheduleFilter }, false);
            }, 300);
        }
    }, [bracketSearch, scheduleFilter]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && scheduleHasMore && !scheduleLoading) {
                    const nextPage = schedulePage + 1;
                    setSchedulePage(nextPage);
                    fetchScheduleMatches(nextPage, { search: bracketSearch, status: scheduleFilter }, true);
                }
            },
            { threshold: 0.1 }
        );

        if (scheduleObserverTarget.current) {
            observer.observe(scheduleObserverTarget.current);
        }

        return () => observer.disconnect();
    }, [scheduleHasMore, scheduleLoading, schedulePage, bracketSearch, scheduleFilter, fetchScheduleMatches, activeTab]);
`;
data = data.replace(
    '// Fetch paginated teams from server',
    fetchScheduleMatchesCode + '\n    // Fetch paginated teams from server'
);

// 3. Update activeTab bracket logic
data = data.replace(
    'if ((activeTab === "bracket" || activeTab === "schedule") && !brackets) loadBrackets();',
    'if (activeTab === "bracket" && !brackets) loadBrackets();'
);

// 4. Update schedule rendering logic
const oldScheduleRenderRegex = /\{activeTab === "schedule" && \(\(\) => \{[\s\S]*?const visibleMatches = filteredMatches\.slice\(0, visibleScheduleCount\);/m;

const newScheduleRender = `{activeTab === "schedule" && (() => {
                            const roundMap: Record<string, any[]> = {};
                            scheduleMatches.forEach((m: any) => {
                                const rn = m.roundName || \`Vòng \${m.round}\`;
                                if (!roundMap[rn]) roundMap[rn] = [];
                                roundMap[rn].push(m);
                            });
                            const roundEntries = Object.entries(roundMap).sort(([, a], [, b]) => (a[0]?.round ?? 0) - (b[0]?.round ?? 0));
                            
                            const completedCount = scheduleStats.completedCount || 0;
                            const liveCount = scheduleStats.liveCount || 0;
                            const totalCount = scheduleStats.totalCount || 0;
                            const totalFiltered = scheduleMatches.length;

`;
data = data.replace(oldScheduleRenderRegex, newScheduleRender);

// Update placeholders and setVisibleScheduleCount
data = data.replace(/setVisibleScheduleCount\(30\);/g, "/* reset handled by effect */");

// Update load more section
const regexLoadMore = /\{\/\* Load More Button \*\/\}[\s\S]*?\{\/\* No results \*\/\}/g;
const newLoadMore = `
                            {/* Infinite Scroll Trigger */}
                            {scheduleHasMore && (
                                <div ref={scheduleObserverTarget} className="mt-6 flex flex-col items-center justify-center pb-6 gap-2">
                                    <Loader2 className="w-6 h-6 text-efb-blue animate-spin" />
                                    <p className="text-sm text-gray-400">Đang tải thêm trận đấu...</p>
                                </div>
                            )}

                                            {/* No results */}`;
data = data.replace(regexLoadMore, newLoadMore);

fs.writeFileSync(file, data);
console.log("Updated successfully");
