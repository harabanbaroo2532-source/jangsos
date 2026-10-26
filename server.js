/**
 * EDU-CRAFT AI & SMART SCHOOL ASSET HUB (ระบบช่วยสอนครูมัธยมศึกษา: วิชาศิลปะ & บริหารพัสดุโรงเรียน)
 * Features Real-Time WebSocket synchronization for Art Portfolio Pins, School Asset/Inventory Tracking,
 * AI Lesson Plan & Exam Generator, and Live Art Studio Teaching.
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

// Store active Art Student Submissions & School Assets in memory
const activeSubmissions = new Map();
const schoolAssets = new Map();
const activeStreams = new Map();

// Initial Sample Art Portfolios & Field Activities (ม.1 - ม.6)
const initialArtSubmissions = [
    {
        id: 'art-101',
        title: '🎨 ผลงานวาดภาพระบายสี: ทัศนธาตุและแสงเงาธรรมชาติ',
        studentName: 'ด.ช. นภัสกร ศิลปะเจริญ (ม.1/2 เลขที่ 8)',
        grade: 'ม.1',
        category: 'art-work',
        status: 'graded',
        score: '19/20 (ดีเยี่ยม)',
        lat: 13.7563,
        lng: 100.5018,
        locationName: 'อาคารศิลปะ ห้องปฏิบัติการทัศนศิลป์ 1',
        time: new Date(Date.now() - 3600000 * 2).toISOString(),
        description: 'ฝึกการใช้เส้นและน้ำหนักแสงเงา 7 ทัศนธาตุ วาดทิวทัศน์รอบบริเวณโรงเรียนด้วยสีน้ำ',
        mediaUrl: 'assets/art_color_value.jpg',
        mediaType: 'photo',
        viewers: 14
    },
    {
        id: 'art-102',
        title: '✏️ โครงงานเส้นสร้างสรรค์อารมณ์ (Line Element Art)',
        studentName: 'น.ส. พิมพ์ชนก รักศิลป์ (ม.4/1 เลขที่ 15)',
        grade: 'ม.4',
        category: 'field-project',
        status: 'pending',
        score: 'รอครูตรวจให้คะแนน',
        lat: 13.7545,
        lng: 100.4995,
        locationName: 'ลานกิจกรรมหน้าเสาธง / สวนหย่อมโรงเรียน',
        time: new Date(Date.now() - 1800000).toISOString(),
        description: 'สเก็ตช์ภาพโครงสร้างสถาปัตยกรรมและต้นไม้ใหญ่ด้วยเส้นตรงแนวตั้งและเส้นโค้งพริ้วไหว',
        mediaUrl: 'assets/art_point_line.jpg',
        mediaType: 'photo',
        viewers: 9
    },
    {
        id: 'asset-pin-103',
        title: '📦 จุดตรวจเช็คครุภัณฑ์: ขาตั้งวาดรูปไม้บีช & ชุดสีอะคริลิก',
        studentName: 'ครูผู้ดูแลพัสดุหมวดศิลปะ (ครูกิตติพงศ์)',
        grade: 'พัสดุหมวดศิลปะ',
        category: 'asset-check',
        status: 'verified',
        score: 'ครบถ้วน 25 ชุด',
        lat: 13.7580,
        lng: 100.5035,
        locationName: 'ห้องเก็บพัสดุกลุ่มสาระการเรียนรู้ศิลปะ ชั้น 2',
        time: new Date(Date.now() - 900000).toISOString(),
        description: 'ตรวจนับพัสดุประจำภาคเรียน: ขาตั้งวาดเฟรมผ้าใบ 25 ตัว สภาพสมบูรณ์พร้อมใช้งานสำหรับนักเรียน ม.ปลาย',
        mediaUrl: 'assets/art_workshop.jpg',
        mediaType: 'photo',
        viewers: 6
    }
];

initialArtSubmissions.forEach(item => activeSubmissions.set(item.id, item));

// Initial School Inventory & Art Department Assets (ระบบทะเบียนคุมพัสดุ-ครุภัณฑ์โรงเรียน)
const initialInventory = [
    {
        id: 'INV-ART-001',
        code: 'ครุภัณฑ์-ศป-69-001',
        name: 'ขาตั้งวาดภาพไม้บีชปรับระดับ (Studio Easel)',
        category: 'ครุภัณฑ์ศิลปะ',
        room: 'ห้องปฏิบัติการทัศนศิลป์ 1 (ชั้น 2)',
        totalQty: 30,
        availableQty: 26,
        borrowedQty: 4,
        unit: 'ตัว',
        pricePerUnit: 1450,
        status: 'พร้อมใช้งาน',
        borrower: 'นักเรียน ม.5/1 (ยืมจัดนิทรรศการ 4 ตัว)',
        lat: 13.7563,
        lng: 100.5018,
        lastChecked: new Date().toISOString()
    },
    {
        id: 'INV-ART-002',
        code: 'วัสดุ-ศป-69-014',
        name: 'ชุดสีน้ำและสีอะคริลิกเกรดสตูดิโอ (Acrylic & Watercolor Set)',
        category: 'วัสดุสิ้นเปลืองศิลปะ',
        room: 'ตู้เก็บวัสดุห้องศิลปะ 2',
        totalQty: 50,
        availableQty: 12,
        borrowedQty: 38,
        unit: 'กล่อง',
        pricePerUnit: 380,
        status: 'ใกล้หมด (ควรเบิกเพิ่ม)',
        borrower: 'ใช้ในคาบเรียน ม.1 - ม.3',
        lat: 13.7580,
        lng: 100.5035,
        lastChecked: new Date().toISOString()
    },
    {
        id: 'INV-SCH-003',
        code: 'ครุภัณฑ์-อด-69-008',
        name: 'เครื่องโปรเจคเตอร์เลเซอร์ความละเอียดสูง (Smart Classroom Projector)',
        category: 'ครุภัณฑ์โสตทัศนูปกรณ์',
        room: 'ห้องเรียนรวมมัธยมศึกษา (อาคาร 1)',
        totalQty: 10,
        availableQty: 9,
        borrowedQty: 1,
        unit: 'เครื่อง',
        pricePerUnit: 24500,
        status: 'พร้อมใช้งาน',
        borrower: 'ครูกลุ่มสาระศิลปะ (ห้อง 204)',
        lat: 13.7552,
        lng: 100.5008,
        lastChecked: new Date().toISOString()
    },
    {
        id: 'INV-ART-004',
        code: 'ครุภัณฑ์-ดน-69-005',
        name: 'ชุดเครื่องดนตรีไทย-สากล (ซอด้วง, ขิม, กีตาร์โปร่ง)',
        category: 'ครุภัณฑ์ดนตรี-นาฏศิลป์',
        room: 'ห้องปฏิบัติการดนตรี (อาคารศิลปะ ชั้น 1)',
        totalQty: 20,
        availableQty: 18,
        borrowedQty: 2,
        unit: 'ชิ้น',
        pricePerUnit: 4200,
        status: 'ซ่อมบำรุง 2 ชิ้น',
        borrower: 'ชมรมดนตรีโรงเรียน (ซ่อมสายซอ/กีตาร์)',
        lat: 13.7570,
        lng: 100.4988,
        lastChecked: new Date().toISOString()
    },
    {
        id: 'INV-ART-005',
        code: 'วัสดุ-ศป-69-022',
        name: 'กระดาษร้อยปอนด์ A2 / เฟรมผ้าใบแคนวาส (Canvas 40x60cm)',
        category: 'วัสดุสิ้นเปลืองศิลปะ',
        room: 'ห้องพัสดุหมวดศิลปะ',
        totalQty: 120,
        availableQty: 85,
        borrowedQty: 35,
        unit: 'แผ่น/เฟรม',
        pricePerUnit: 120,
        status: 'พร้อมใช้งาน',
        borrower: 'เบิกจ่ายโครงงานปลายภาค ม.6',
        lat: 13.7568,
        lng: 100.5025,
        lastChecked: new Date().toISOString()
    }
];

initialInventory.forEach(item => schoolAssets.set(item.id, item));

// Broadcast message to all connected WebSocket clients
function broadcast(data, exceptWs = null) {
    const payload = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client !== exceptWs && client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

// REST API Endpoints for Submissions / Map Pins
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

// Grade / Evaluate Student Submission
app.post('/api/alerts/:id/grade', (req, res) => {
    const { id } = req.params;
    const { score, feedback, status } = req.body;
    if (activeSubmissions.has(id)) {
        const item = activeSubmissions.get(id);
        item.score = score || '20/20 (ดีเยี่ยม)';
        item.feedback = feedback || 'ผลงานมีความคิดสร้างสรรค์และองค์ประกอบศิลป์ยอดเยี่ยมมาก';
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
    console.log('🎨 Teacher/Student connected to EduCraft Smart School Network');

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
                    const newPin = {
                        id: data.id || ('sub-' + Date.now()),
                        title: data.title || '🎨 ส่งผลงานศิลปะ / รายงานจุดตรวจพัสดุ',
                        studentName: data.studentName || data.reporter || 'นักเรียน/ครูผู้สอน',
                        grade: data.grade || 'ม.1',
                        category: data.category || 'art-work',
                        status: data.status || 'pending',
                        score: data.score || 'รอครูตรวจให้คะแนน',
                        lat: data.lat,
                        lng: data.lng,
                        locationName: data.locationName || data.address || 'พิกัดโรงเรียน/ภาคสนาม',
                        time: data.time || new Date().toISOString(),
                        description: data.description || 'ส่งงานพร้อมรูปภาพหรือวิดีโอไม่เกิน 1 นาที',
                        mediaUrl: data.mediaUrl || null,
                        mediaType: data.mediaType || 'none',
                        isLive: data.isLive || false,
                        viewers: 1
                    };
                    activeSubmissions.set(newPin.id, newPin);
                    broadcast({ type: 'NEW_ALERT', alert: newPin });
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
    console.log(`\n🎨 EDU-CRAFT AI & SMART INVENTORY Server running at: http://localhost:${PORT}`);
    console.log(`📚 Secondary School Art Teaching & Asset Management System is Active!\n`);
});
