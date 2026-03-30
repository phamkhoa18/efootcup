const fs = require('fs');

const file = 'd:/HK2_22-23/Thuc_tap_tot_nghiep/Efootball/efootcup/app/(main)/giai-dau/[id]/TournamentDetailClient.tsx';
let data = fs.readFileSync(file, 'utf8');

const regex = /const totalFiltered = scheduleMatches\.length;[\s\S]*?const roundMap: Record<string, any\[\]> = \{\};[\s\S]*?visibleMatches\.forEach\(\(m: any\) => \{[\s\S]*?\}\);[\s\S]*?const roundEntries = Object\.entries\(roundMap\)\.sort\(\(\[, a\], \[, b\]\) => \(a\[0\]\?\.round \?\? 0\) - \(b\[0\]\?\.round \?\? 0\)\);/m;

data = data.replace(regex, "const totalFiltered = scheduleMatches.length;");

fs.writeFileSync(file, data);
console.log("Fixed part 2");
