const fs = require('fs');

const fixFile = (file) => {
    let content = fs.readFileSync(file, 'utf8');

    // Update the activeRounds filter logic
    // Currently: matches: round.matches.filter((m: any) => m.status !== 'bye')
    // We want to also filter structural walkovers: m.status !== 'walkover' || (m.homeTeam && m.awayTeam)
    
    // So the full condition is:
    // m.status !== 'bye' && !(m.status === 'walkover' && (!m.homeTeam || !m.awayTeam))
    
    const oldFilter = /matches: round\.matches\.filter\(\(m: any\) => m\.status !== 'bye'\)/g;
    const newFilter = `matches: round.matches.filter((m: any) => m.status !== 'bye' && !(m.status === 'walkover' && (!m.homeTeam || !m.awayTeam)))`;
    
    if (content.match(oldFilter)) {
        content = content.replace(oldFilter, newFilter);
        fs.writeFileSync(file, content);
        console.log(`Replaced filter in ${file}`);
    } else {
        console.log(`Regex did not match in ${file}`);
    }
};

fixFile('app/(main)/giai-dau/[id]/TournamentDetailClient.tsx');
fixFile('app/(manager)/manager/giai-dau/[id]/so-do/page.tsx');
