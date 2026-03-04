const fs = require('fs');

const p = 'c:/KindTrack/public/pages/profile.html';
let c = fs.readFileSync(p, 'utf8');

c = c.replace('<div class="form-group">\r\n                                <label for="profile-name">',
    `<h3 style="font-size: 1.1rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">Basic Info</h3>
                            
                            <div class="form-group">
                                <label for="profile-username"><i class="fas fa-at"></i> Username</label>
                                <input type="text" id="profile-username" class="form-control" placeholder="steve_jobs" required>
                                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem;">Unique handle for your community profile.</p>
                            </div>

                            <div class="form-group">
                                <label for="profile-name">`);

c = c.replace('<div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;">',
    `<h3 style="font-size: 1.1rem; margin-top: 1.5rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">Security</h3>

                            <div class="form-group">
                                <label for="profile-password"><i class="fas fa-lock"></i> Change Password</label>
                                <input type="password" id="profile-password" class="form-control" placeholder="Enter new password (optional)">
                                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem;">Leave blank to keep your current password.</p>
                            </div>
                            
                            <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;">`);

fs.writeFileSync(p, c, 'utf8');
console.log('done profile.html');
