const fs = require('fs');
const path = require('path');

const dir = 'c:/KindTrack/public/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'login.html');

const scriptTag = '<script type="module" src="../js/sidebar-profile.js"></script>';

files.forEach(f => {
    const p = path.join(dir, f);
    let content = fs.readFileSync(p, 'utf8');

    // Check if script is already present
    if (!content.includes('sidebar-profile.js')) {
        // Insert right before </body> or before other scripts
        content = content.replace('</body>', `    ${scriptTag}\n</body>`);
        fs.writeFileSync(p, content, 'utf8');
        console.log('Added global profile script to ' + f);
    } else {
        console.log('Already present in ' + f);
    }
});
