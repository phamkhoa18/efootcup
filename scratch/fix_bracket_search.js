const fs = require('fs');

const file = 'app/(manager)/manager/giai-dau/[id]/so-do/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /const matchesSearch = bracketSearch\.trim\(\) === "" \|\| \[[\s\S]*?\]\.some\(v => v && v\.toLowerCase\(\)\.includes\(bracketSearch\.toLowerCase\(\)\)\);/g;

content = content.replace(regex, 'const matchesSearch = true;');
fs.writeFileSync(file, content);
console.log('Fixed bracketSearch in manager view');
