const fs = require('fs');

const fixMatchCard = (file) => {
    let content = fs.readFileSync(file, 'utf8');

    // Remove the bottom part of isWalkover
    const regex = /<div className="h-px bg-\[#E2E8F0\] w-full" \/>\n\n\s*\{\/\* Empty opponent row \*\/\}\n\s*<div className="p-1\.5 flex flex-col opacity-40">\n\s*<span className="text-\[8px\] text-gray-300 font-bold text-center mb-0\.5 italic">— Không có đối thủ —<\/span>\n\s*<div className="flex justify-between items-center px-1">\n\s*<span className="text-\[11px\] text-gray-300 italic font-medium">Tự do<\/span>\n\s*<\/div>\n\s*<\/div>/;

    if (!content.match(regex)) {
        console.log(`Regex did not match in ${file}`);
    } else {
        content = content.replace(regex, '');
        fs.writeFileSync(file, content);
        console.log(`Replaced in ${file}`);
    }
};

fixMatchCard('app/(main)/giai-dau/[id]/TournamentDetailClient.tsx');
fixMatchCard('app/(manager)/manager/giai-dau/[id]/so-do/page.tsx');
