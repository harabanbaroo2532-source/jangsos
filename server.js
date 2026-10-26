/**
 * ระบบบริหารการสอนและพัสดุโรงเรียนมัธยมศึกษา (Minimal Clean Edition)
 * Features Real-Time WebSocket synchronization for Student Submissions, Attendance, and School Inventory.
 */

const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Store active Student Submissions & School Assets in memory (Initialized empty - zero sample data)
const activeSubmissions = new Map();
const schoolAssets = new Map();
const activeStreams = new Map();

// Broadcast message to all connected WebSocket clients
function broadcast(data, exceptWs = null) {
    const payload = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client !== exceptWs && client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

// REST API Endpoints for Student Submissions
app.get('/api/alerts', (req, res) => {
    res.json(Array.from(activeSubmissions.values()));
});

app.post('/api/alerts', (req, res) => {
    const subData = {
        id: 'sub-' + Date.now(),
        time: new Date().toISOString(),
        viewers: 1,
        ...req.body
    };
    activeSubmissions.set(subData.id, subData);
    broadcast({ type: 'NEW_ALERT', alert: subData });
    res.status(201).json({ success: true, alert: subData });
});

app.delete('/api/alerts', (req, res) => {
    activeSubmissions.clear();
    broadcast({ type: 'CLEAR_ALL_ALERTS' });
    res.json({ success: true });
});

// Grade / Evaluate Student Submission
app.post('/api/alerts/:id/grade', (req, res) => {
    const { id } = req.params;
    const { score, feedback, status } = req.body;
    if (activeSubmissions.has(id)) {
        const item = activeSubmissions.get(id);
        item.score = score || '20/20';
        item.feedback = feedback || '';
        item.status = status || 'graded';
        activeSubmissions.set(id, item);
        broadcast({ type: 'SUBMISSION_GRADED', alert: item });
        res.json({ success: true, alert: item });
    } else {
        res.status(404).json({ error: 'Submission not found' });
    }
});

// REST API Endpoints for School Assets & Inventory
app.get('/api/assets', (req, res) => {
    res.json(Array.from(schoolAssets.values()));
});

app.post('/api/assets', (req, res) => {
    const assetData = {
        id: 'INV-' + Date.now(),
        lastChecked: new Date().toISOString(),
        ...req.body
    };
    schoolAssets.set(assetData.id, assetData);
    broadcast({ type: 'ASSET_UPDATED', asset: assetData });
    res.status(201).json({ success: true, asset: assetData });
});

app.post('/api/assets/:id/update', (req, res) => {
    const { id } = req.params;
    if (schoolAssets.has(id)) {
        const current = schoolAssets.get(id);
        const updated = { ...current, ...req.body, lastChecked: new Date().toISOString() };
        schoolAssets.set(id, updated);
        broadcast({ type: 'ASSET_UPDATED', asset: updated });
        res.json({ success: true, asset: updated });
    } else {
        res.status(404).json({ error: 'Asset not found' });
    }
});

// WebSocket Real-Time Handler
wss.on('connection', (ws) => {
    ws.send(JSON.stringify({
        type: 'INIT_STATE',
        alerts: Array.from(activeSubmissions.values()),
        assets: Array.from(schoolAssets.values()),
        streams: Array.from(activeStreams.values())
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'SOS_ALERT':
                    const newSub = {
                        id: data.id || ('sub-' + Date.now()),
                        title: data.title || 'ส่งผลงานนักเรียน',
                        studentName: data.studentName || data.reporter || 'นักเรียน',
                        grade: data.grade || 'ม.1',
                        category: data.category || 'art-work',
                        status: data.status || 'pending',
                        score: data.score || 'รอตรวจ',
                        locationName: data.locationName || 'ส่งผ่าน QR Code',
                        time: data.time || new Date().toISOString(),
                        description: data.description || '',
                        mediaUrl: data.mediaUrl || null,
                        mediaType: data.mediaType || 'none',
                        isLive: data.isLive || false,
                        viewers: 1
                    };
                    activeSubmissions.set(newSub.id, newSub);
                    broadcast({ type: 'NEW_ALERT', alert: newSub });
                    break;

                case 'START_LIVE':
                    activeStreams.set(data.streamId, {
                        streamId: data.streamId,
                        title: data.title,
                        startTime: new Date().toISOString()
                    });
                    broadcast({ type: 'LIVE_STARTED', stream: data });
                    break;

                case 'STOP_LIVE':
                    activeStreams.delete(data.streamId);
                    broadcast({ type: 'LIVE_STOPPED', streamId: data.streamId });
                    break;

                case 'CHAT_MESSAGE':
                    broadcast({ type: 'NEW_CHAT', chat: data.chat });
                    break;
            }
        } catch (err) {
            console.error('WebSocket Error:', err.message);
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n📚 School Classroom & Asset Server running at: http://localhost:${PORT}\n`);
});
