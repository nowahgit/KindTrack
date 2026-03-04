const fs = require('fs');
const path = require('path');

const dir = 'c:/KindTrack/public/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'profile.html');

const newStr = `<a href="profile.html" style="text-decoration:none; color:inherit;">
                    <div class="sidebar-user" style="display:flex; align-items:center; gap:0.75rem; cursor:pointer; padding:0.5rem; margin:-0.5rem; margin-bottom:0.5rem; border-radius:12px; transition:background 0.2s;" onmouseover="this.style.background='var(--bg-2)'" onmouseout="this.style.background='transparent'">
                        <div class="sidebar-avatar" id="sidebar-avatar">U</div>
                        <div class="sidebar-user-info">
                            <div class="sidebar-user-name" id="sidebar-user-name">Loading...</div>
                            <div class="sidebar-user-role" style="color:var(--primary); font-weight:600; font-size:0.75rem;">Edit Profile <i class="fas fa-angle-right"></i></div>
                        </div>
                    </div>
                </a>`;

files.forEach(f => {
    const p = path.join(dir, f);
    let content = fs.readFileSync(p, 'utf8');

    const regex = /<div class="sidebar-user">\s*<div class="sidebar-avatar" id="sidebar-avatar">U<\/div>\s*<div class="sidebar-user-info">\s*<div class="sidebar-user-name" id="sidebar-user-name">Loading\.\.\.<\/div>\s*<div class="sidebar-user-role">Kind Human<\/div>\s*<\/div>\s*<\/div>/;

    if (regex.test(content)) {
        content = content.replace(regex, newStr);
        fs.writeFileSync(p, content, 'utf8');
        console.log('Updated ' + f);
    } else {
        console.log('Not matched: ' + f);
    }
});
