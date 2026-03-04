const fs = require('fs');
const path = require('path');

const dir = 'c:/KindTrack/public/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const logoImgPattern = /<img src="\.\.\/assets\/icons\/logo-full-white\.png" alt="KindTrack" style="height: 24px;/g;
const largerLogoHtml = '<img src="../assets/icons/logo-full-white.png" alt="KindTrack" style="height: 35px;';

files.forEach(f => {
    const p = path.join(dir, f);
    let content = fs.readFileSync(p, 'utf8');

    if (content.match(logoImgPattern)) {
        const newContent = content.replace(logoImgPattern, largerLogoHtml);
        fs.writeFileSync(p, newContent, 'utf8');
        console.log('Enlarged logo in ' + f);
    }
});
