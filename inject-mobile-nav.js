const fs = require('fs');
const path = require('path');

const dir = 'c:/KindTrack/public/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'login.html');

const mobileNavHtml = `
    <!-- Mobile Bottom Navigation -->
    <nav class="mobile-nav">
        <ul class="mobile-nav-list">
            <a href="dashboard.html" class="mobile-nav-item" id="mnav-dashboard">
                <i class="fas fa-house"></i>
                Home
            </a>
            <a href="activity.html" class="mobile-nav-item" id="mnav-activity">
                <i class="fas fa-list-check"></i>
                Acts
            </a>
            <a href="add-kindness.html" class="mobile-nav-item mobile-fab" id="mnav-add">
                <i class="fas fa-plus"></i>
            </a>
            <a href="community.html" class="mobile-nav-item" id="mnav-community">
                <i class="fas fa-users"></i>
                Feed
            </a>
            <a href="profile.html" class="mobile-nav-item" id="mnav-profile">
                <i class="fas fa-user-circle"></i>
                Profile
            </a>
        </ul>
    </nav>
`;

files.forEach(f => {
    const p = path.join(dir, f);
    let content = fs.readFileSync(p, 'utf8');

    if (!content.includes('class="mobile-nav"')) {
        content = content.replace('</body>', mobileNavHtml + '\n</body>');
        fs.writeFileSync(p, content, 'utf8');
        console.log('Injected mobile nav into ' + f);
    }
});
