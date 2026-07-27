// ============================================================
//  WEBSOCKET RELAY – Modern UI + Real‑time Dashboard
//  Deploy on Render as a Web Service
// ============================================================

const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients by deviceId
const clients = new Map();

// ============================================================
//  WEBSOCKET CONNECTION HANDLER
// ============================================================
wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const deviceId = url.searchParams.get('deviceId');

    if (!deviceId) {
        ws.close(1008, 'Missing deviceId');
        return;
    }

    console.log(`[Relay] ✅ Connected: ${deviceId}`);
    clients.set(deviceId, ws);

    ws.on('message', (msg) => {
        console.log(`[Relay] 📩 From ${deviceId}: ${msg}`);
        // Optionally handle messages from client
    });

    ws.on('close', () => {
        console.log(`[Relay] ❌ Disconnected: ${deviceId}`);
        clients.delete(deviceId);
    });

    ws.on('error', (err) => {
        console.error(`[Relay] ⚠️ Error from ${deviceId}: ${err.message}`);
    });
});

// ============================================================
//  HTTP ENDPOINT – For dashboard to send commands
// ============================================================
app.post('/send-command', (req, res) => {
    const { deviceId, command } = req.body;

    if (!deviceId || !command) {
        return res.status(400).json({
            success: false,
            error: 'Missing deviceId or command'
        });
    }

    const ws = clients.get(deviceId);

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return res.status(404).json({
            success: false,
            error: 'Device not connected or offline'
        });
    }

    try {
        ws.send(JSON.stringify({ command }));
        console.log(`[Relay] 📤 Command sent to ${deviceId}: ${command}`);
        res.json({ success: true, message: 'Command sent' });
    } catch (e) {
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

// ============================================================
//  HEALTH CHECK (JSON)
// ============================================================
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        clients: clients.size,
        uptime: process.uptime()
    });
});

// ============================================================
//  ROOT – MODERN UI DASHBOARD
// ============================================================
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebSocket Relay</title>
    <style>
        /* ============================================================
           MODERN GLASSMORPHISM THEME
           ============================================================ */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: #0a0a12;
            color: #e0e0e0;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            background-image: radial-gradient(ellipse at 50% 0%, #1a1a2e 0%, #0a0a12 70%);
        }

        .container {
            width: 100%;
            max-width: 900px;
            animation: fadeUp 0.6s ease;
        }

        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 28px;
            padding: 16px 24px;
            background: rgba(20, 20, 31, 0.5);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            border: 1px solid rgba(42, 42, 68, 0.3);
        }

        .header h1 {
            font-size: 24px;
            font-weight: 700;
            background: linear-gradient(135deg, #f7971e, #ffd200);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .header h1 span {
            font-size: 28px;
            -webkit-text-fill-color: initial;
            color: #ff3b3b;
        }

        .header .badge {
            padding: 4px 16px;
            border-radius: 60px;
            font-size: 12px;
            font-weight: 600;
            background: rgba(26, 42, 26, 0.6);
            color: #6fcf97;
            border: 1px solid rgba(42, 74, 42, 0.4);
            backdrop-filter: blur(10px);
        }

        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 28px;
        }

        .stat-card {
            background: rgba(20, 20, 31, 0.4);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 18px 20px;
            border: 1px solid rgba(42, 42, 68, 0.3);
            text-align: center;
            transition: all 0.3s ease;
        }

        .stat-card:hover {
            border-color: rgba(247, 151, 30, 0.2);
            transform: translateY(-2px);
        }

        .stat-card .label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #4a6a7a;
            margin-bottom: 4px;
        }

        .stat-card .value {
            font-size: 28px;
            font-weight: 700;
            color: #f7971e;
        }

        .stat-card .sub {
            font-size: 12px;
            color: #4a6a7a;
            margin-top: 4px;
        }

        /* Endpoints Section */
        .endpoints {
            background: rgba(20, 20, 31, 0.4);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 20px 24px;
            border: 1px solid rgba(42, 42, 68, 0.3);
            margin-bottom: 28px;
        }

        .endpoints h3 {
            font-size: 14px;
            font-weight: 600;
            color: #88ccff;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .endpoint-item {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px 16px;
            padding: 8px 0;
            border-bottom: 1px solid rgba(42, 42, 68, 0.2);
            font-size: 13px;
            font-family: 'Courier New', monospace;
        }

        .endpoint-item:last-child {
            border-bottom: none;
        }

        .endpoint-item .method {
            font-weight: 600;
            color: #6fcf97;
            min-width: 60px;
        }

        .endpoint-item .method.post {
            color: #ffaa44;
        }

        .endpoint-item .path {
            color: #88ccff;
            word-break: break-all;
        }

        .endpoint-item .desc {
            color: #4a6a7a;
            font-family: 'Segoe UI', sans-serif;
            font-size: 12px;
            margin-left: auto;
        }

        /* WebSocket Tester */
        .tester {
            background: rgba(20, 20, 31, 0.4);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 20px 24px;
            border: 1px solid rgba(42, 42, 68, 0.3);
        }

        .tester h3 {
            font-size: 14px;
            font-weight: 600;
            color: #88ccff;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .tester .row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 8px;
        }

        .tester input {
            flex: 1;
            padding: 10px 16px;
            border-radius: 30px;
            border: 1px solid rgba(42, 42, 68, 0.4);
            background: rgba(11, 11, 20, 0.6);
            color: #e0e0e0;
            font-size: 13px;
            outline: none;
            min-width: 150px;
        }

        .tester input:focus {
            border-color: #f7971e;
        }

        .tester button {
            padding: 10px 24px;
            border-radius: 30px;
            border: none;
            background: linear-gradient(135deg, #f7971e, #ffd200);
            color: #0a0a12;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .tester button:hover {
            transform: scale(1.02);
        }

        .tester button:active {
            transform: scale(0.96);
        }

        .tester .log {
            margin-top: 12px;
            background: rgba(11, 11, 20, 0.5);
            border-radius: 12px;
            padding: 10px 14px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #88ccff;
            max-height: 120px;
            overflow-y: auto;
            border: 1px solid rgba(42, 42, 68, 0.2);
            white-space: pre-wrap;
            word-break: break-all;
        }

        .tester .log .ok { color: #6fcf97; }
        .tester .log .err { color: #ff5e5e; }
        .tester .log .info { color: #88ccff; }

        /* Responsive */
        @media (max-width: 600px) {
            .stats-grid { grid-template-columns: 1fr 1fr; }
            .endpoint-item { flex-direction: column; align-items: flex-start; }
            .endpoint-item .desc { margin-left: 0; }
        }
    </style>
</head>
<body>
<div class="container">

    <!-- HEADER -->
    <div class="header">
        <h1><span>☠️</span> WebSocket Relay</h1>
        <span class="badge">🟢 Operational</span>
    </div>

    <!-- STATS -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="label">Connected Clients</div>
            <div class="value" id="clientCount">0</div>
            <div class="sub">Active WebSocket connections</div>
        </div>
        <div class="stat-card">
            <div class="label">Uptime</div>
            <div class="value" id="uptime">0s</div>
            <div class="sub">Since last restart</div>
        </div>
        <div class="stat-card">
            <div class="label">Status</div>
            <div class="value" style="font-size:20px;color:#6fcf97;">✅ Online</div>
            <div class="sub">All systems ready</div>
        </div>
    </div>

    <!-- ENDPOINTS -->
    <div class="endpoints">
        <h3>📡 Available Endpoints</h3>
        <div class="endpoint-item">
            <span class="method">GET</span>
            <span class="path">/</span>
            <span class="desc">This dashboard</span>
        </div>
        <div class="endpoint-item">
            <span class="method">GET</span>
            <span class="path">/health</span>
            <span class="desc">Health check (JSON)</span>
        </div>
        <div class="endpoint-item">
            <span class="method post">POST</span>
            <span class="path">/send-command</span>
            <span class="desc">Send command to a device (JSON)</span>
        </div>
        <div class="endpoint-item">
            <span class="method">WS</span>
            <span class="path">/?deviceId=YOUR_ID</span>
            <span class="desc">WebSocket endpoint</span>
        </div>
    </div>

    <!-- WEBSOCKET TESTER -->
    <div class="tester">
        <h3>🔧 WebSocket Tester</h3>
        <div class="row">
            <input type="text" id="wsDeviceId" placeholder="Device ID (e.g. test123)" value="test123" />
            <input type="text" id="wsMessage" placeholder="Message to send" value="Hello from relay!" />
            <button id="wsSendBtn">📤 Send</button>
            <button id="wsConnectBtn">🔗 Connect</button>
            <button id="wsDisconnectBtn">🔌 Disconnect</button>
        </div>
        <div class="log" id="wsLog">[System] Ready. Click "Connect" to open WebSocket.</div>
    </div>

    <script>
        // ============================================================
        //  DASHBOARD UPDATES
        // ============================================================
        async function fetchStats() {
            try {
                const resp = await fetch('/health');
                const data = await resp.json();
                document.getElementById('clientCount').textContent = data.clients;
                const uptime = Math.floor(data.uptime);
                const hours = Math.floor(uptime / 3600);
                const minutes = Math.floor((uptime % 3600) / 60);
                const seconds = uptime % 60;
                document.getElementById('uptime').textContent =
                    (hours > 0 ? hours + 'h ' : '') +
                    (minutes > 0 ? minutes + 'm ' : '') +
                    seconds + 's';
            } catch (e) {
                console.error('Stats error:', e);
            }
        }

        fetchStats();
        setInterval(fetchStats, 3000);

        // ============================================================
        //  WEBSOCKET TESTER
        // ============================================================
        let ws = null;
        const log = document.getElementById('wsLog');
        const deviceIdInput = document.getElementById('wsDeviceId');
        const msgInput = document.getElementById('wsMessage');
        const connectBtn = document.getElementById('wsConnectBtn');
        const disconnectBtn = document.getElementById('wsDisconnectBtn');
        const sendBtn = document.getElementById('wsSendBtn');

        function addLog(msg, type = 'info') {
            const time = new Date().toLocaleTimeString();
            const entry = document.createElement('div');
            entry.innerHTML = `<span style="color:#4a6a7a;">[${time}]</span> <span class="${type}">${msg}</span>`;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        }

        function connectWS() {
            const deviceId = deviceIdInput.value.trim();
            if (!deviceId) {
                addLog('❌ Please enter a Device ID.', 'err');
                return;
            }
            if (ws && ws.readyState === WebSocket.OPEN) {
                addLog('⚠️ Already connected. Disconnect first.', 'warn');
                return;
            }
            const wsUrl = \`wss://\${window.location.host}?deviceId=\${encodeURIComponent(deviceId)}\`;
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                addLog('✅ WebSocket connected (Device: ' + deviceId + ')', 'ok');
                connectBtn.disabled = true;
                disconnectBtn.disabled = false;
                sendBtn.disabled = false;
            };

            ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    addLog('📩 Received: ' + JSON.stringify(data), 'info');
                } catch {
                    addLog('📩 Received: ' + e.data, 'info');
                }
            };

            ws.onclose = () => {
                addLog('🔌 WebSocket disconnected', 'warn');
                connectBtn.disabled = false;
                disconnectBtn.disabled = true;
                sendBtn.disabled = true;
                ws = null;
            };

            ws.onerror = (err) => {
                addLog('⚠️ Error: ' + err.message, 'err');
            };
        }

        function disconnectWS() {
            if (ws) {
                ws.close();
            } else {
                addLog('⚠️ No active connection.', 'warn');
            }
        }

        function sendWSMessage() {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                addLog('❌ WebSocket is not connected.', 'err');
                return;
            }
            const msg = msgInput.value.trim();
            if (!msg) {
                addLog('⚠️ Please enter a message.', 'warn');
                return;
            }
            try {
                ws.send(msg);
                addLog('📤 Sent: ' + msg, 'ok');
            } catch (e) {
                addLog('❌ Send error: ' + e.message, 'err');
            }
        }

        connectBtn.addEventListener('click', connectWS);
        disconnectBtn.addEventListener('click', disconnectWS);
        sendBtn.addEventListener('click', sendWSMessage);

        // Enter key on message input sends
        msgInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendWSMessage();
        });

        // Initial state
        disconnectBtn.disabled = true;
        sendBtn.disabled = true;

        // Also allow connecting via deviceId input with Enter
        deviceIdInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') connectWS();
        });

        addLog('💡 Type a Device ID and click "Connect" to test.', 'info');
    </script>
</div>
</body>
</html>
    `);
});

// ============================================================
//  START SERVER
// ============================================================
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`[Relay] 🚀 Server running on port ${PORT}`);
    console.log(`[Relay] 🔗 WebSocket endpoint: ws://localhost:${PORT}?deviceId=xxx`);
    console.log(`[Relay] 📡 HTTP endpoint: http://localhost:${PORT}/send-command`);
});
