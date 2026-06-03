const fs = require('fs');

const fixFile = (file) => {
    let content = fs.readFileSync(file, 'utf8');

    // Remove the global definitions
    content = content.replace(/const UNIT_HEIGHT = (isDoubleElimination \? 76 : 110|110);\n?/g, '');
    content = content.replace(/const GAP = (isDoubleElimination \? 48 : 128|128);\n?/g, '');
    
    // Add them inside renderPublicBracketSection / renderBracketSection
    if (file.includes('TournamentDetailClient')) {
        content = content.replace(/const renderPublicBracketSection = \(sectionRounds: typeof bracketRounds, sectionKey: string\) => \{/g, `const renderPublicBracketSection = (sectionRounds: typeof bracketRounds, sectionKey: string) => {\n        const UNIT_HEIGHT = isDoubleElimination ? 76 : 110;\n        const GAP = isDoubleElimination ? 48 : 128;`);
    } else {
        content = content.replace(/const renderBracketSection = \(sectionRounds: typeof bracketRounds, sectionKey: string\) => \{/g, `const renderBracketSection = (sectionRounds: typeof bracketRounds, sectionKey: string) => {\n        const UNIT_HEIGHT = isDoubleElimination ? 76 : 110;\n        const GAP = isDoubleElimination ? 48 : 128;`);
    }
    
    fs.writeFileSync(file, content);
};

fixFile('app/(main)/giai-dau/[id]/TournamentDetailClient.tsx');
fixFile('app/(manager)/manager/giai-dau/[id]/so-do/page.tsx');
console.log('Fixed constants');
