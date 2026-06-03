const fs = require('fs');

const tweakFile = (file) => {
    let content = fs.readFileSync(file, 'utf8');

    // Make UNIT_HEIGHT and GAP even tighter
    content = content.replace(/const UNIT_HEIGHT = isDoubleElimination \? 76 : 110;/g, 'const UNIT_HEIGHT = isDoubleElimination ? 68 : 110;');
    content = content.replace(/const GAP = isDoubleElimination \? 48 : 128;/g, 'const GAP = isDoubleElimination ? 32 : 128;');
    
    fs.writeFileSync(file, content);
};

tweakFile('app/(main)/giai-dau/[id]/TournamentDetailClient.tsx');
tweakFile('app/(manager)/manager/giai-dau/[id]/so-do/page.tsx');
console.log('Tweaked both files again');
