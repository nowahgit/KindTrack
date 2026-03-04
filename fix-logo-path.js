const fs = require('fs');
const path = require('path');

const dir = 'c:/KindTrack/public/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

// Match any sidebar-logo link to replace it with the correct one
const logoAnchorPattern = /<a href="\.\.\/index\.html" class="sidebar-logo">[\s\S]*?<\/a>/g;
const correctLogoHtml = `<a href="../index.html" class="sidebar-logo">
                <img src="../assets/icons/logo-full-white.png" alt="KindTrack" style="height: 24px; width: auto; object-fit: contain;">
            </a>`;

files.forEach(f => {
    const p = path.join(dir, f);
    let content = fs.readFileSync(p, 'utf8');

    if (content.match(logoAnchorPattern)) {
        const newContent = content.replace(logoAnchorPattern, correctLogoHtml);
        if (newContent !== content) {
            fs.writeFileSync(p, newContent, 'utf8');
            console.log('Fixed logo path in ' + f);
        }
    }
});
