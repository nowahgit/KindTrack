const fs = require('fs');
const path = require('path');

const dir = 'c:/KindTrack/public/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const oldLogoPattern = /<a href="\.\.\/index\.html" class="sidebar-logo">[\s\S]*?<\/a>/g;
const newLogoHtml = `<a href="../index.html" class="sidebar-logo">
                <img src="../assets/icon/logo-full-white.png" alt="KindTrack" style="height: 24px; width: auto; object-fit: contain;">
            </a>`;

files.forEach(f => {
    const p = path.join(dir, f);
    let content = fs.readFileSync(p, 'utf8');

    if (content.match(oldLogoPattern)) {
        content = content.replace(oldLogoPattern, newLogoHtml);
        fs.writeFileSync(p, content, 'utf8');
        console.log('Updated logo in ' + f);
    }
});
