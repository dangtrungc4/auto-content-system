document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    const btnToggleEngine = document.getElementById('btnToggleEngine');
    const btnRunNow = document.getElementById('btnRunNow');
    const btnRefreshLogs = document.getElementById('btnRefreshLogs');
    const btnSaveConfig = document.getElementById('btnSaveConfig');
    const btnFetchPages = document.getElementById('btnFetchPages');
    
    // Status Elements
    const systemStatusWrapper = document.getElementById('systemStatus');
    const statusDot = systemStatusWrapper.querySelector('.dot');
    const statusText = systemStatusWrapper.querySelector('.status-text');
    
    // Stats Elements
    const statPending = document.getElementById('statPending');
    const statPosted = document.getElementById('statPosted');
    const statFailed = document.getElementById('statFailed');
    const logsViewer = document.getElementById('logsViewer');
    
    // Config Form
    const configForm = document.getElementById('configForm');
    
    let isRunning = false;

    // Navigation Logic
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            sections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(`section-${targetId}`).classList.add('active');
        });
    });

    // Toast Utility
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Refresh Data Function
    async function fetchData() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            
            updateEngineState(data.isRunning);
            
            // Validate stats
            if(data.stats) {
                statPending.innerText = data.stats.pending || 0;
                statPosted.innerText = data.stats.posted || 0;
                statFailed.innerText = data.stats.failed || 0;
            }

            // Render logs
            if(data.logs) renderLogs(data.logs);
        } catch (err) {
            console.error('Failed to fetch stats', err);
        }
    }

    function renderLogs(logsList) {
        logsViewer.innerHTML = '';
        if (logsList.length === 0) {
            logsViewer.innerHTML = '<div class="log-entry info"><span class="time">[' + new Date().toLocaleTimeString() + ']</span> System initialized. No logs yet.</div>';
            return;
        }

        logsList.forEach(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            const logHTML = `<div class="log-entry ${log.type}">
                <span class="time">[${time}]</span> ${log.message}
            </div>`;
            logsViewer.insertAdjacentHTML('beforeend', logHTML);
        });
        
        // Auto scroll to latest if we want, but since unshift adds to beginning, new items are at top.
    }

    function updateEngineState(running) {
        isRunning = running;
        if (running) {
            statusDot.classList.replace('stopped', 'running');
            statusText.innerText = 'System Running (Auto)';
            
            btnToggleEngine.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Engine';
            btnToggleEngine.className = 'btn btn-primary danger';
        } else {
            statusDot.classList.replace('running', 'stopped');
            statusText.innerText = 'System Stopped';
            
            btnToggleEngine.innerHTML = '<i class="fa-solid fa-play"></i> Start Engine';
            btnToggleEngine.className = 'btn btn-primary';
        }
    }

    // Toggle Engine
    btnToggleEngine.addEventListener('click', async () => {
        try {
            btnToggleEngine.disabled = true;
            const endpoint = isRunning ? '/api/scheduler/stop' : '/api/scheduler/start';
            const res = await fetch(endpoint, { method: 'POST' });
            const data = await res.json();
            
            if (data.success) {
                updateEngineState(data.isRunning);
                showToast(`System ${data.isRunning ? 'started' : 'stopped'} successfully`, 'success');
            }
        } catch(err) {
            showToast('Failed to toggle engine state', 'error');
        } finally {
            btnToggleEngine.disabled = false;
        }
    });

    // Run Now
    btnRunNow.addEventListener('click', async () => {
        try {
            const icon = btnRunNow.querySelector('i');
            icon.className = 'fa-solid fa-spinner fa-spin';
            btnRunNow.disabled = true;
            
            showToast('Triggered run manually...', 'info');
            const res = await fetch('/api/run-now', { method: 'POST' });
            const data = await res.json();
            
            if(data.success) {
                showToast('Manual run completed', 'success');
            } else {
                showToast(data.error || 'Failed to trigger run', 'error');
            }
            
            await fetchData();
        } catch(err) {
            showToast('Error executing script', 'error');
        } finally {
            btnRunNow.querySelector('i').className = 'fa-solid fa-bolt';
            btnRunNow.disabled = false;
        }
    });

    btnRefreshLogs.addEventListener('click', fetchData);

    // Fetch Facebook Pages using User Token
    btnFetchPages.addEventListener('click', async () => {
        const userToken = document.getElementById('fbUserToken').value.trim();
        if (!userToken) { showToast('Vui lòng nhập User Access Token trước', 'error'); return; }

        const icon = btnFetchPages.querySelector('i');
        icon.className = 'fa-solid fa-spinner fa-spin';
        btnFetchPages.disabled = true;

        try {
            const res = await fetch(`/api/facebook/pages?userToken=${encodeURIComponent(userToken)}`);
            const data = await res.json();

            if (!data.success || !data.pages.length) {
                showToast(data.error || 'Không tìm thấy Page nào', 'error');
                return;
            }

            const select = document.getElementById('fbPageSelect');
            select.innerHTML = '<option value="">-- Chọn Fanpage --</option>';
            data.pages.forEach(p => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ id: p.id, token: p.access_token });
                opt.textContent = `${p.name} (${p.category})`;
                select.appendChild(opt);
            });

            document.getElementById('pageSelectGroup').style.display = 'block';
            showToast(`Tìm thấy ${data.pages.length} Fanpage`, 'success');
        } catch(err) {
            showToast('Lỗi kết nối đến Facebook API', 'error');
        } finally {
            icon.className = 'fa-solid fa-cloud-arrow-down';
            btnFetchPages.disabled = false;
        }
    });

    // Auto-fill Page ID and Page Token when a page is selected from dropdown
    document.getElementById('fbPageSelect').addEventListener('change', (e) => {
        if (!e.target.value) return;
        const { id, token } = JSON.parse(e.target.value);
        document.getElementById('fbPageId').value = id;
        document.getElementById('fbPageToken').value = token;
        showToast('Đã điền Page ID và Page Token tự động', 'success');
    });

    // Initial config load
    async function loadConfig() {
        console.log('loadConfig');
        try {
            const res = await fetch('/api/config');
            const data = await res.json();
            console.log(data);

            document.getElementById('cronSchedule').value = data.cronSchedule || '';
            document.getElementById('sheetId').value = data.sheetId || '';
            document.getElementById('googleClientEmail').value = data.googleClientEmail || '';
            document.getElementById('googlePrivateKey').value = data.googlePrivateKey || '';
            document.getElementById('fbAppId').value = data.fbAppId || '';
            document.getElementById('fbUserToken').value = data.fbUserToken || '';
            document.getElementById('fbPageId').value = data.fbPageId || '';
            document.getElementById('fbPageToken').value = data.fbPageToken || '';
            document.getElementById('unsplashKey').value = data.unsplashKey || '';
        } catch(err) {
            showToast('Error loading configuration', 'error');
        }
    }

    // Save Config
    configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        btnSaveConfig.textContent = 'Saving...';
        btnSaveConfig.disabled = true;

        const payload = {
            cronSchedule: document.getElementById('cronSchedule').value,
            sheetId: document.getElementById('sheetId').value,
            googleClientEmail: document.getElementById('googleClientEmail').value,
            googlePrivateKey: document.getElementById('googlePrivateKey').value,
            fbAppId: document.getElementById('fbAppId').value,
            fbUserToken: document.getElementById('fbUserToken').value,
            fbPageId: document.getElementById('fbPageId').value,
            fbPageToken: document.getElementById('fbPageToken').value,
            unsplashKey: document.getElementById('unsplashKey').value
        };

        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if(data.success) {
                showToast('Configuration saved successfully', 'success');
                // Auto restart if running
                if (isRunning) {
                     await fetch('/api/scheduler/stop', { method: 'POST' });
                     const startRes = await fetch('/api/scheduler/start', { method: 'POST' });
                     const startData = await startRes.json();
                     updateEngineState(startData.isRunning);
                }
            } else {
                showToast('Save failed: ' + data.error, 'error');
            }
        } catch(err) {
            showToast('Network error while saving', 'error');
        } finally {
            btnSaveConfig.textContent = 'Save Configuration';
            btnSaveConfig.disabled = false;
        }
    });

    // Init App
    fetchData();
    loadConfig();
    
    // Auto-refresh interval (every 10 seconds)
    setInterval(fetchData, 10000);
});
