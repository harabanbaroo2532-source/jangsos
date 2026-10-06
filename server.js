/**
 * GUARDIAN LIVE - Emergency Real-Time Alert & Live Stream Server
 * Features WebSocket broadcast for instant SOS alerts, live camera streams, and precise GPS tracking.
 */

const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Store active emergency alerts and live streams in memory
const activeAlerts = new Map();
const activeStreams = new Map();

// Default initial emergency demo incidents around Bangkok / Thailand for initial render
const demoIncidents = [
    {
        id: 'alert-demo-1',
        title: '🚨 อุบัติเหตุรถยนต์ชนกันหลายคัน มีผู้ได้รับบาดเจ็บ',
        category: 'accident',
        severity: 'critical',
        lat: 13.7563,
        lng: 100.5018,
        address: 'ถนนสุขุมวิท เขตวัฒนา กรุงเทพมหานคร',
        reporter: 'สมชาย ใจดี',
        time: new Date(Date.now() - 5 * 60000).toISOString(),
        isLive: true,
        viewers: 142,
        description: 'เกิดอุบัติเหตุรถยนต์ 3 คันชนซ้อนทับกัน ต้องการรถพยาบาลฉุกเฉินด่วน!'
    },
    {
        id: 'alert-demo-2',
        title: '🔥 เพลิงไหม้อาคารพาณิชย์ 3 ชั้น',
        category: 'fire',
        severity: 'critical',
        lat: 13.7469,
        lng: 100.5349,
        address: 'สยามสแควร์ ซอย 5 กรุงเทพมหานคร',
        reporter: 'วิภาวี สุขสันต์',
        time: new Date(Date.now() - 12 * 60000).toISOString(),
        isLive: true,
        viewers: 289,
        description: 'มีควันไฟพุ่งออกมาจากชั้น 2 ของอาคาร เจ้าหน้าที่กำลังเข้าควบคุมสถานการณ์'
    },
    {
        id: 'alert-demo-3',
        title: '🌊 น้ำท่วมขังสูง รถเล็กผ่านไม่ได้',
        category: 'disaster',
        severity: 'warning',
        lat: 13.8055,
        lng: 100.5539,
        address: 'ถนนวิภาวดีรังสิต แขวงจอมพล เขตจตุจักร',
        reporter: 'อนุชา สายลุย',
        time: new Date(Date.now() - 25 * 60000).toISOString(),
        isLive: false,
        viewers: 48,
        description: 'ระดับน้ำท่วมขังบนพื้นผิวจราจรสูงประมาณ 30 ซม.'
    }
];

demoIncidents.forEach(inc => activeAlerts.set(inc.id, inc));

// Broadcast message to all connected WebSocket clients
function broadcast(data, exceptWs = null) {
    const payload = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client !== exceptWs && client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

// REST API Endpoints
app.get('/api/alerts', (req, res) => {
    res.json(Array.from(activeAlerts.values()));
});

app.post('/api/alerts', (req, res) => {
    const alertData = {
        id: 'alert-' + Date.now(),
        time: new Date().toISOString(),
        viewers: 1,
        ...req.body
    };
    activeAlerts.set(alertData.id, alertData);
    broadcast({ type: 'NEW_ALERT', alert: alertData });
    res.status(201).json({ success: true, alert: alertData });
});

// WebSocket Real-Time Handler
wss.on('connection', (ws) => {
    console.log('📱 New client connected to Guardian Live Alert Network');

    // Send active alerts list upon connection
    ws.send(JSON.stringify({
        type: 'INIT_STATE',
        alerts: Array.from(activeAlerts.values()),
        streams: Array.from(activeStreams.values())
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'SOS_ALERT':
                    const newSos = {
                        id: 'sos-' + Date.now(),
                        title: data.title || '🚨 สัญญาณขอความช่วยเหลือฉุกเฉิน (SOS)',
                        category: data.category || 'accident',
                        severity: 'critical',
                        lat: data.lat,
                        lng: data.lng,
                        address: data.address || 'พิกัด GPS สดจากผู้ใช้งาน',
                        reporter: data.reporter || 'ผู้ใช้งานฉุกเฉิน',
                        time: new Date().toISOString(),
                        isLive: true,
                        viewers: 1,
                        description: data.description || 'กดปุ่มขอความช่วยเหลือฉุกเฉิน SOS สด!'
                    };
                    activeAlerts.set(newSos.id, newSos);
                    broadcast({ type: 'NEW_ALERT', alert: newSos });
                    break;

                case 'START_LIVE':
                    activeStreams.set(data.streamId, {
                        streamId: data.streamId,
                        lat: data.lat,
                        lng: data.lng,
                        title: data.title,
                        startTime: new Date().toISOString()
                    });
                    broadcast({ type: 'LIVE_STARTED', stream: data });
                    break;

                case 'STOP_LIVE':
                    activeStreams.delete(data.streamId);
                    broadcast({ type: 'LIVE_STOPPED', streamId: data.streamId });
                    break;

                case 'UPDATE_GPS':
                    if (activeAlerts.has(data.alertId)) {
                        const alert = activeAlerts.get(data.alertId);
                        alert.lat = data.lat;
                        alert.lng = data.lng;
                        activeAlerts.set(data.alertId, alert);
                    }
                    broadcast({ type: 'GPS_UPDATED', data }, ws);
                    break;

                case 'LIVE_FRAME':
                    // Relay live video camera frame to viewers
                    broadcast({ type: 'STREAM_FRAME', streamId: data.streamId, frame: data.frame }, ws);
                    break;

                case 'CHAT_MESSAGE':
                    broadcast({ type: 'NEW_CHAT', chat: data.chat });
                    break;
            }
        } catch (err) {
            console.error('WebSocket Error:', err.message);
        }
    });

    ws.on('close', () => {
        console.log('📱 Client disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 GUARDIAN LIVE Server running at: http://localhost:${PORT}`);
    console.log(`📡 Emergency Alert & Live Stream Network is Active!\n`);
});
