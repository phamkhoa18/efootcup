const fs = require('fs');

const tweakFile = (file) => {
    let content = fs.readFileSync(file, 'utf8');

    // Make UNIT_HEIGHT and GAP dynamic based on isDoubleElimination
    content = content.replace(/const UNIT_HEIGHT = 110;/g, 'const UNIT_HEIGHT = isDoubleElimination ? 76 : 110;');
    content = content.replace(/const GAP = 128;/g, 'const GAP = isDoubleElimination ? 48 : 128;');
    
    // In TournamentDetailClient, isDoubleElimination is already defined above renderPublicBracketSection
    // In manager view, isDoubleElimination might be available as `t?.format === 'double_elimination'`
    
    fs.writeFileSync(file, content);
};

tweakFile('app/(main)/giai-dau/[id]/TournamentDetailClient.tsx');
tweakFile('app/(manager)/manager/giai-dau/[id]/so-do/page.tsx');
console.log('Tweaked both files');
