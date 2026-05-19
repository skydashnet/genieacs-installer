#!/usr/bin/env node
const fs = require('fs');

// 1. Locate the genieacs-ui executable
const searchPaths = [
  '/usr/bin/genieacs-ui',
  '/usr/local/bin/genieacs-ui',
  '/opt/genieacs/bin/genieacs-ui'
];

let binaryPath = '';
for (const p of searchPaths) {
  if (fs.existsSync(p)) {
    binaryPath = p;
    break;
  }
}

if (!binaryPath) {
  console.error("Error: Could not locate 'genieacs-ui' executable.");
  process.exit(1);
}

console.log(`Found genieacs-ui at: ${binaryPath}`);

let content = fs.readFileSync(binaryPath, 'utf8');

// 2. Inject the backend API route for /api/logs
const statusIndex = content.indexOf('router.get("/status"');
if (statusIndex === -1) {
  console.error("Error: Could not locate Koa router in genieacs-ui.");
  process.exit(1);
}

// Check if we already injected the logs route to prevent double injection
if (content.includes('router.get("/api/logs"')) {
  console.log("Backend API route already patched. Skipping backend patch.");
} else {
  const backendRoute = `
router.get("/api/logs", async (ctx) => {
  const authorizer = ctx.state.authorizer;
  if (!authorizer.hasAccess("logs", 2) && !ctx.state.user) {
    return void (ctx.status = 403);
  }
  return new Promise((resolve) => {
    const { exec } = require("child_process");
    exec("journalctl -u genieacs-cwmp -u genieacs-nbi -u genieacs-fs -u genieacs-ui --no-pager -n 500 --no-hostname", (err, stdout, stderr) => {
      ctx.type = "application/json";
      if (err) {
        ctx.status = 500;
        ctx.body = { error: err.message, stderr };
      } else {
        ctx.body = { logs: stdout };
      }
      resolve();
    });
  });
});
`;
  content = content.slice(0, statusIndex) + backendRoute + content.slice(statusIndex);
  console.log("Successfully patched backend /api/logs API route!");
}

// 3. Inject the frontend script into the HTML body returned by '/'
const scriptIndex = content.indexOf('src="${APP_JS}"></script>');
if (scriptIndex === -1) {
  console.error("Error: Could not locate frontend entrypoint injection point in genieacs-ui.");
  process.exit(1);
}

if (content.includes('id="genieacs-logs-patch"')) {
  console.log("Frontend UI patch already injected. Skipping frontend patch.");
} else {
  const frontendPatch = `
      <script id="genieacs-logs-patch">
        (function() {
          // 1. Sidebar Injection
          function injectLogsTab() {
            const sideMenu = document.querySelector('nav#side-menu ul');
            if (sideMenu && !document.querySelector('.logs-tab-item')) {
              const li = document.createElement('li');
              li.className = 'logs-tab-item';
              const currentHash = window.location.hash;
              if (currentHash === '#!/admin/logs' || currentHash === '#/admin/logs') {
                li.className += ' active';
              }
              li.innerHTML = '<a href="#!/admin/logs">Logs</a>';
              sideMenu.appendChild(li);
            }
          }
          
          // Monitor DOM to auto-inject the sidebar tab whenever it gets redrawn
          const observer = new MutationObserver(() => {
            injectLogsTab();
            handleRouting();
          });
          observer.observe(document.body, { childList: true, subtree: true });

          // 2. Custom Terminal View Render
          let logPollingInterval = null;
          let isFetchingLogs = false;
          let autoRefresh = true;

          function handleRouting() {
            const hash = window.location.hash;
            if (hash === '#!/admin/logs' || hash === '#/admin/logs') {
              // Highlight sidebar active tab
              document.querySelectorAll('nav#side-menu ul li').forEach(item => {
                item.classList.remove('active');
              });
              const tabItem = document.querySelector('.logs-tab-item');
              if (tabItem) tabItem.classList.add('active');

              // If terminal container doesn't exist yet, render it
              if (!document.getElementById('logs-terminal-container')) {
                const contentDiv = document.getElementById('content');
                if (!contentDiv) return;

                contentDiv.innerHTML = \`
                  <h1 style="margin-bottom: 20px; font-weight: 500;">System Logs</h1>
                  <div class="all-parameters" id="logs-terminal-container">
                    <div class="actions-bar" style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                      <input type="text" id="logs-search-input" placeholder="Filter logs..." style="flex-grow: 1; padding: 8px; border: 1px solid #333; background: #1a1a1a; color: #eee; border-radius: 0;">
                      <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; user-select: none; color: #ccc; font-size: 13px;">
                        <input type="checkbox" id="logs-autorefresh-checkbox" checked style="margin: 0; width: auto;"> Auto-refresh (3s)
                      </label>
                      <button id="logs-refresh-btn" class="primary" style="margin: 0;">Refresh Now</button>
                    </div>
                    <div id="logs-error-container" style="display: none;"></div>
                    <pre id="logs-terminal-pre" style="background-color: #1a1a1a; color: #38bdf8; padding: 15px; border-radius: 0; font-family: 'JetBrains Mono', monospace; font-size: 12px; height: 550px; overflow-y: scroll; white-space: pre-wrap; word-break: break-all; border: 1px solid #333; line-height: 1.6; box-shadow: inset 0 5px 20px rgba(0,0,0,0.5); margin: 0; text-align: left;"></pre>
                  </div>
                \`;

                // Set up event listeners
                const searchInput = document.getElementById('logs-search-input');
                searchInput.addEventListener('input', renderFilteredLogs);

                const autorefreshCheckbox = document.getElementById('logs-autorefresh-checkbox');
                autorefreshCheckbox.addEventListener('change', (e) => {
                  autoRefresh = e.target.checked;
                });

                const refreshBtn = document.getElementById('logs-refresh-btn');
                refreshBtn.addEventListener('click', fetchSystemLogs);

                // Initial fetch
                fetchSystemLogs();

                // Setup Polling
                if (logPollingInterval) clearInterval(logPollingInterval);
                logPollingInterval = setInterval(() => {
                  if (autoRefresh && window.location.hash.includes('/admin/logs')) {
                    fetchSystemLogs();
                  }
                }, 3000);
              }
            } else {
              // Stand down and clear interval if we left the page
              if (logPollingInterval) {
                clearInterval(logPollingInterval);
                logPollingInterval = null;
              }
            }
          }

          let fullLogsCache = '';
          function fetchSystemLogs() {
            if (isFetchingLogs) return;
            isFetchingLogs = true;
            const refreshBtn = document.getElementById('logs-refresh-btn');
            if (refreshBtn) refreshBtn.innerText = 'Fetching...';

            fetch('/api/logs')
              .then(res => {
                if (!res.ok) throw new Error('Status ' + res.status);
                return res.json();
              })
              .then(data => {
                fullLogsCache = data.logs || '';
                renderFilteredLogs();
                document.getElementById('logs-error-container').style.display = 'none';
              })
              .catch(err => {
                const errDiv = document.getElementById('logs-error-container');
                if (errDiv) {
                  errDiv.style.display = 'block';
                  errDiv.innerHTML = \`
                    <div style="background-color: #4d0000; border-left: 5px solid #ff5252; color: #ffbcbc; padding: 15px; margin-bottom: 20px; font-family: monospace; font-size: 13px; line-height: 1.5; text-align: left;">
                      <strong>Permissions or execution error: </strong> \${err.message}<br><br>
                      To fix this, make sure the system user running GenieACS (usually 'genieacs') has read access to systemd-journal logs:<br>
                      <pre style="background-color: #222; padding: 10px; margin-top: 10px; color: #fff; border: 1px solid #444; overflow-x: auto;">sudo usermod -aG systemd-journal genieacs\\nsudo systemctl restart genieacs-ui</pre>
                    </div>
                  \`;
                }
              })
              .finally(() => {
                isFetchingLogs = false;
                const refreshBtn = document.getElementById('logs-refresh-btn');
                if (refreshBtn) refreshBtn.innerText = 'Refresh Now';
              });
          }

          function renderFilteredLogs() {
            const pre = document.getElementById('logs-terminal-pre');
            if (!pre) return;

            const searchVal = (document.getElementById('logs-search-input')?.value || '').toLowerCase();
            const lines = fullLogsCache.split('\\n');
            const filteredLines = lines.filter(line => line.toLowerCase().includes(searchVal));

            const wasAtBottom = (pre.scrollHeight - pre.clientHeight - pre.scrollTop) < 40;
            pre.innerText = filteredLines.join('\\n') || 'No logs found matching your filter criteria.';
            
            // Auto-scroll to bottom if they were already reading at the bottom
            if (wasAtBottom) {
              pre.scrollTop = pre.scrollHeight;
            }
          }

          // Listen to direct manual url entry / back button navigation
          window.addEventListener('hashchange', handleRouting);
          window.addEventListener('load', handleRouting);
        })();
      </script>
  `;
  content = content.replace('src="${APP_JS}"></script>', 'src="${APP_JS}"></script>' + frontendPatch);
  console.log("Successfully patched frontend UI Logs view wrapper!");
}

// 4. Save the modified executable back
fs.writeFileSync(binaryPath, content, 'utf8');
console.log("Patched genieacs-ui saved successfully.");
