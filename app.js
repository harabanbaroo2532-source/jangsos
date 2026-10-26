/**
 * EDU-CRAFT AI & SMART SCHOOL ASSET HUB (v19)
 * ระบบช่วยสอนครูมัธยมศึกษา (ม.1 - ม.6) เน้นกลุ่มสาระศิลปะ & ระบบบริหารพัสดุโรงเรียน
 * Features:
 * 1. AI Lesson Plan, Worksheet, Rubric & Quiz Generator (ม.1 - ม.6)
 * 2. School Inventory & Art Supplies Management (ทะเบียนคุมพัสดุ/ครุภัณฑ์ เบิก-ยืม-คืน + Export CSV)
 * 3. Student Art Portfolio & Field Project Map Pinning (Photo & Video <= 60s + Teacher Grading)
 * 4. Built-in HD Art Lesson Video Library + Interactive Whiteboard Canvas + Live Camera Studio
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Global State
    let currentPos = { lat: 13.7563, lng: 100.5018, accuracy: 8 };
    let activeSubmissions = [];
    let schoolAssets = [];
    let qrAttendanceList = [];
    let currentQrMode = 'attend'; // 'attend' | 'homework'
    let currentSessionPin = 'ART-2569';

    let ws = null;
    let mediaStream = null;
    let isBroadcasting = false;
    let facingMode = 'environment';
    let isTorchOn = false;
    let hudTimer = null;
    let selectedSubmissionForGrading = null;

    // 2. DOM Elements
    const gpsCoordsText = document.getElementById('gpsCoordsText');
    const incidentsList = document.getElementById('incidentsList');
    const activeAlertCount = document.getElementById('activeAlertCount');
    const tacAlertsCount = document.getElementById('tacAlertsCount');
    const tacAssetCount = document.getElementById('tacAssetCount');
    const tacBudgetVal = document.getElementById('tacBudgetVal');

    // Modals
    const aiGeneratorModal = document.getElementById('aiGeneratorModal');
    const inventoryModal = document.getElementById('inventoryModal');
    const videoLibraryModal = document.getElementById('videoLibraryModal');
    const whiteboardModal = document.getElementById('whiteboardModal');
    const broadcasterModal = document.getElementById('broadcasterModal');
    const streamViewerModal = document.getElementById('streamViewerModal');
    const citizenReportModal = document.getElementById('citizenReportModal');
    const verifyModal = document.getElementById('verifyModal');

    // 3. Initial Data Fallback (Works offline & online)
    const defaultSubmissions = [
        {
            id: 'art-101',
            title: '🎨 ผลงานวาดภาพระบายสี: ทัศนธาตุและแสงเงาธรรมชาติ',
            studentName: 'ด.ช. นภัสกร ศิลปะเจริญ (ม.1/2 เลขที่ 8)',
            grade: 'ม.1',
            category: 'art-work',
            status: 'graded',
            score: '19/20 (เกรด 4 ดีเยี่ยม)',
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
            lat: 13.7548,
            lng: 100.4998,
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
            grade: 'งานพัสดุ',
            category: 'asset-check',
            status: 'verified',
            score: 'พัสดุครบถ้วนสมบูรณ์ (26/30 ตัว)',
            lat: 13.7578,
            lng: 100.5032,
            locationName: 'ห้องเก็บพัสดุกลุ่มสาระการเรียนรู้ศิลปะ ชั้น 2',
            time: new Date(Date.now() - 900000).toISOString(),
            description: 'ตรวจนับพัสดุประจำภาคเรียน: ขาตั้งวาดเฟรมผ้าใบพร้อมใช้งานสำหรับนักเรียน ม.ปลาย',
            mediaUrl: 'assets/art_workshop.jpg',
            mediaType: 'photo',
            viewers: 6
        }
    ];

    const defaultInventory = [
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
            lat: 13.7566,
            lng: 100.5022
        },
        {
            id: 'INV-ART-002',
            code: 'วัสดุ-ศป-69-014',
            name: 'ชุดสีน้ำและสีอะคริลิกเกรดสตูดิโอ (Acrylic & Watercolor)',
            category: 'วัสดุสิ้นเปลืองศิลปะ',
            room: 'ตู้เก็บวัสดุห้องศิลปะ 2',
            totalQty: 50,
            availableQty: 18,
            borrowedQty: 32,
            unit: 'กล่อง',
            pricePerUnit: 380,
            status: 'พร้อมเบิกจ่าย',
            borrower: 'ใช้ในคาบเรียน ม.1 - ม.3',
            lat: 13.7580,
            lng: 100.5035
        },
        {
            id: 'INV-SCH-003',
            code: 'ครุภัณฑ์-อด-69-008',
            name: 'เครื่องโปรเจคเตอร์เลเซอร์ความละเอียดสูง (Smart Projector)',
            category: 'ครุภัณฑ์โสตทัศนูปกรณ์',
            room: 'ห้องเรียนรวมศิลปะ (อาคาร 1 ชั้น 2)',
            totalQty: 10,
            availableQty: 9,
            borrowedQty: 1,
            unit: 'เครื่อง',
            pricePerUnit: 24500,
            status: 'พร้อมใช้งาน',
            borrower: 'ครูกลุ่มสาระศิลปะ (ห้อง 204)',
            lat: 13.7552,
            lng: 100.5008
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
            borrower: 'ชมรมดนตรีโรงเรียน',
            lat: 13.7570,
            lng: 100.4988
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
            lng: 100.5025
        }
    ];

    const defaultQrRoster = [
        {
            studentId: '69101',
            name: 'ด.ช. นภัสกร ศิลปะเจริญ',
            classRoom: 'ม.1/1',
            scanTime: '08:32:15',
            status: 'มาเรียน',
            homeworkStatus: 'ส่งงานแล้ว (19/20)',
            submissionId: 'art-101'
        },
        {
            studentId: '69102',
            name: 'ด.ญ. กัญญาณัฐ วาดฝัน',
            classRoom: 'ม.1/1',
            scanTime: '08:33:04',
            status: 'มาเรียน',
            homeworkStatus: 'ส่งงานแล้ว (20/20)',
            submissionId: 'art-101'
        },
        {
            studentId: '69103',
            name: 'ด.ช. ธีรภัทร รักศิลป์',
            classRoom: 'ม.1/1',
            scanTime: '08:34:20',
            status: 'มาเรียน',
            homeworkStatus: 'ส่งงานแล้ว (18/20)',
            submissionId: 'art-102'
        },
        {
            studentId: '69104',
            name: 'ด.ญ. พิมพ์ชนก แสงสี',
            classRoom: 'ม.1/1',
            scanTime: '08:35:10',
            status: 'มาเรียน',
            homeworkStatus: 'ส่งงานแล้ว (รอตรวจ)',
            submissionId: 'art-102'
        },
        {
            studentId: '69105',
            name: 'ด.ช. ศุภกร ลายเส้น',
            classRoom: 'ม.1/1',
            scanTime: '08:36:45',
            status: 'มาสาย',
            homeworkStatus: 'กำลังทำใบงาน',
            submissionId: null
        },
        {
            studentId: '69106',
            name: 'ด.ญ. ชนิกานต์ ทัศนธาตุ',
            classRoom: 'ม.1/1',
            scanTime: '08:31:50',
            status: 'มาเรียน',
            homeworkStatus: 'ส่งงานแล้ว (20/20)',
            submissionId: 'art-101'
        }
    ];

    activeSubmissions = [...defaultSubmissions];
    schoolAssets = [...defaultInventory];
    qrAttendanceList = [...defaultQrRoster];

    // 4. Initialize Smart QR Code Classroom & Attendance Hub (Replaces Map)
    function initQrClassroomHub() {
        updateQrCodeDisplay();
        renderQrAttendanceTable();
        renderIncidents();

        // Check if student opened URL via QR Code scan (?action=checkin or ?action=homework)
        const params = new URLSearchParams(window.location.search);
        if (params.get('action') === 'homework') {
            setTimeout(() => openCitizenReportModal(), 500);
        } else if (params.get('action') === 'checkin') {
            setTimeout(() => simulateStudentQrScan(), 500);
        }
    }

    function updateQrCodeDisplay() {
        const classVal = document.getElementById('qrClassSelect')?.value || 'ม.1/1';
        const topicVal = document.getElementById('qrSessionTopicInput')?.value || 'ปฏิบัติการทัศนศิลป์';
        const qrImg = document.getElementById('qrCodeImage');
        const qrClassTitle = document.getElementById('qrDisplayClassTitle');
        const qrTopicTitle = document.getElementById('qrDisplayTopicTitle');
        const qrPinText = document.getElementById('qrPinCodeText');
        const qrModeBadge = document.getElementById('qrModeBadge');

        if (qrClassTitle) qrClassTitle.textContent = `ห้อง ${classVal} • วิชาทัศนศิลป์`;
        if (qrTopicTitle) qrTopicTitle.textContent = topicVal;
        if (qrPinText) qrPinText.textContent = currentSessionPin;
        if (gpsCoordsText) gpsCoordsText.textContent = `${currentSessionPin} (${classVal})`;

        if (qrModeBadge) {
            if (currentQrMode === 'attend') {
                qrModeBadge.textContent = '📲 สแกน QR เช็คชื่อเข้าเรียนสด';
                qrModeBadge.style.background = '#dbeafe';
                qrModeBadge.style.color = '#1d4ed8';
            } else {
                qrModeBadge.textContent = '🎨 สแกน QR ส่งผลงานศิลปะ/การบ้าน';
                qrModeBadge.style.background = '#fce7f3';
                qrModeBadge.style.color = '#be185d';
            }
        }

        const baseOrigin = window.location.origin.includes('localhost')
            ? 'https://jangsos.onrender.com'
            : window.location.origin;
        const actionType = currentQrMode === 'attend' ? 'checkin' : 'homework';
        const qrDataUrl = `${baseOrigin}/?action=${actionType}&pin=${encodeURIComponent(currentSessionPin)}&class=${encodeURIComponent(classVal)}`;

        if (qrImg) {
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrDataUrl)}`;
        }
    }

    function renderQrAttendanceTable() {
        const tbody = document.getElementById('qrAttendanceTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        let presentCount = 0;
        let submittedCount = 0;

        qrAttendanceList.forEach((st, index) => {
            if (st.status === 'มาเรียน' || st.status === 'มาสาย') presentCount++;
            if (st.homeworkStatus && st.homeworkStatus.includes('ส่งงานแล้ว')) submittedCount++;

            const statusBadge = st.status === 'มาเรียน'
                ? `<span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:12px; font-weight:700; font-size:11px;">✅ มาเรียน</span>`
                : st.status === 'มาสาย'
                ? `<span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:12px; font-weight:700; font-size:11px;">⏰ มาสาย</span>`
                : `<span style="background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:12px; font-weight:700; font-size:11px;">📝 ${st.status}</span>`;

            const hwColor = st.homeworkStatus.includes('ส่งงานแล้ว') ? '#be185d' : '#64748b';

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #e2e8f0';
            tr.innerHTML = `
                <td style="padding:8px 10px; font-family:monospace; font-weight:700; color:#1e40af;">${st.studentId}</td>
                <td style="padding:8px 10px; font-weight:700; color:#0f172a;">${st.name} <span style="font-size:10px; color:#64748b;">(${st.classRoom})</span></td>
                <td style="padding:8px 10px; font-family:monospace; color:#475569;">📲 ${st.scanTime}</td>
                <td style="padding:8px 10px;">${statusBadge}</td>
                <td style="padding:8px 10px; font-weight:700; color:${hwColor};">${st.homeworkStatus}</td>
                <td style="padding:8px 10px; text-align:center;">
                    <button type="button" class="btn-view-student-work" data-idx="${index}" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">
                        🎨 ดูงาน/ให้คะแนน
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        const presentEl = document.getElementById('qrPresentSummary');
        const submittedEl = document.getElementById('qrSubmittedSummary');
        const tacAttendEl = document.getElementById('tacAttendanceCount');

        if (presentEl) presentEl.textContent = `มาเรียน: ${presentCount} คน`;
        if (submittedEl) submittedEl.textContent = `ส่งงานแล้ว: ${submittedCount} คน`;
        if (tacAttendEl) tacAttendEl.textContent = `${presentCount} คน (100%)`;

        tbody.querySelectorAll('.btn-view-student-work').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.dataset.idx);
                const st = qrAttendanceList[idx];
                const foundWork = activeSubmissions.find(s => s.id === st.submissionId) || activeSubmissions[0];
                if (foundWork) {
                    openStreamViewer(foundWork);
                } else {
                    openCitizenReportModal();
                }
            });
        });
    }

    function simulateStudentQrScan() {
        const sampleNames = [
            'ด.ช. กิตติกวิน วาดศิลป์',
            'ด.ญ. ณัฐณิชา สีน้ำ',
            'ด.ช. ปัณณวิชญ์ เส้นสร้างสรรค์',
            'ด.ญ. วรัญญา ทัศนศิลป์',
            'นาย ธนภัทร ศิลปกรรม'
        ];
        const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
        const randomId = String(69100 + qrAttendanceList.length + 1);
        const classVal = document.getElementById('qrClassSelect')?.value || 'ม.1/1';
        const nowTime = new Date().toLocaleTimeString('th-TH');

        if (currentQrMode === 'homework') {
            const nameInput = document.getElementById('reportNameInput');
            const gradeInput = document.getElementById('reportGradeInput');
            if (nameInput) nameInput.value = `${randomName} (รหัส ${randomId})`;
            if (gradeInput) gradeInput.value = classVal;
            openCitizenReportModal();
            speakThaiText(`นักเรียน ${randomName} สแกนคิวอาร์โค้ดเพื่อส่งผลงานศิลปะค่ะ`);
        } else {
            qrAttendanceList.unshift({
                studentId: randomId,
                name: randomName,
                classRoom: classVal,
                scanTime: nowTime,
                status: 'มาเรียน',
                homeworkStatus: 'ส่งงานแล้ว (ผ่าน QR)',
                submissionId: 'art-101'
            });
            renderQrAttendanceTable();
            speakThaiText(`เช็คชื่อสำเร็จ ${randomName} รหัส ${randomId} เข้าเรียนเรียบร้อยแล้วค่ะ`);
        }
    }

    // 6. Render Student Art Submissions & Asset Pins (Left Feed + Map Markers)
    let currentFilter = 'all';

    function getCategoryMeta(cat) {
        switch (cat) {
            case 'art-work':
                return { emoji: '🎨', label: 'งานทัศนศิลป์', color: '#db2777', bg: '#fdf2f8' };
            case 'field-project':
                return { emoji: '🌳', label: 'ศิลปะภาคสนาม', color: '#059669', bg: '#ecfdf5' };
            case 'asset-check':
                return { emoji: '📦', label: 'ตรวจพัสดุโรงเรียน', color: '#d97706', bg: '#fffbeb' };
            default:
                return { emoji: '🎨', label: 'ผลงานนักเรียน', color: '#2563eb', bg: '#eff6ff' };
        }
    }

    function renderIncidents() {
        if (!incidentsList) return;
        incidentsList.innerHTML = '';

        const filtered = activeSubmissions.filter(item => {
            if (currentFilter === 'all') return true;
            return item.category === currentFilter;
        });

        if (activeAlertCount) activeAlertCount.textContent = `${filtered.length} รายการ`;
        if (tacAlertsCount) tacAlertsCount.textContent = activeSubmissions.length;

        filtered.forEach(item => {
            const meta = getCategoryMeta(item.category);
            const card = document.createElement('div');
            card.className = 'incident-card card-glass';
            card.style.cssText = `padding:12px; border-left:4px solid ${meta.color}; cursor:pointer; transition:all 0.2s ease; background:#ffffff; border-radius:10px; box-shadow:0 2px 8px rgba(15,23,42,0.04);`;

            const mediaBadge = item.mediaType === 'video'
                ? `<span style="background:#7c3aed; color:#fff; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700;">🎬 วิดีโอสั้น</span>`
                : `<span style="background:${meta.color}; color:#fff; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700;">${meta.emoji} ${meta.label}</span>`;

            const thumbHtml = item.mediaUrl && item.mediaType === 'photo'
                ? `<img src="${item.mediaUrl}" alt="thumb" style="width:58px; height:58px; object-fit:cover; border-radius:8px; border:1px solid #cbd5e1; flex-shrink:0;">`
                : `<div style="width:58px; height:58px; border-radius:8px; background:${meta.bg}; display:flex; align-items:center; justify-content:center; font-size:24px; flex-shrink:0;">${meta.emoji}</div>`;

            card.innerHTML = `
                <div style="display:flex; gap:10px; align-items:flex-start;">
                    ${thumbHtml}
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:4px; margin-bottom:4px;">
                            ${mediaBadge}
                            <span style="font-size:10px; font-weight:700; color:#059669; background:#ecfdf5; padding:2px 6px; border-radius:4px; border:1px solid #a7f3d0;">${item.score || 'รอตรวจ'}</span>
                        </div>
                        <h4 style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</h4>
                        <p style="font-size:11px; color:#475569; margin-bottom:4px;">👤 ${item.studentName || item.reporter || 'นักเรียน'} • <b>${item.grade || 'ม.1'}</b></p>
                        <div style="font-size:10px; color:#64748b; display:flex; justify-content:space-between;">
                            <span>📲 ส่งผ่าน QR: ${item.locationName || item.address || 'ห้องเรียนศิลปะ'}</span>
                            <span style="color:#2563eb; font-weight:700;">คลิกดูรูป/ให้คะแนน &rarr;</span>
                        </div>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                openStreamViewer(item);
            });

            incidentsList.appendChild(card);
        });
    }

    // Filter Buttons
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter || 'all';
            renderIncidents();
        });
    });

    // 7. Render School Inventory & Art Department Assets (Modal + Map Markers)
    function renderInventoryTable() {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        let totalAvail = 0;
        let totalBorrowed = 0;
        let totalValue = 0;

        schoolAssets.forEach((asset, idx) => {
            totalAvail += Number(asset.availableQty || 0);
            totalBorrowed += Number(asset.borrowedQty || 0);
            totalValue += Number(asset.totalQty || 0) * Number(asset.pricePerUnit || 0);

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #e2e8f0';
            const badgeColor = asset.availableQty <= 5 ? '#dc2626' : '#059669';

            tr.innerHTML = `
                <td style="padding:10px; font-family:monospace; font-weight:700; color:#1e40af;">${asset.code}</td>
                <td style="padding:10px;">
                    <div style="font-weight:700; color:#0f172a;">${asset.name}</div>
                    <div style="font-size:10px; color:#64748b;">หมวด: ${asset.category} • ราคา ฿${Number(asset.pricePerUnit).toLocaleString()}/${asset.unit || 'ชิ้น'}</div>
                </td>
                <td style="padding:10px; color:#334155;">📍 ${asset.room}</td>
                <td style="padding:10px; text-align:center;">
                    <span style="font-weight:800; font-size:14px; color:${badgeColor};">${asset.availableQty}</span> / ${asset.totalQty} ${asset.unit || 'ชิ้น'}
                </td>
                <td style="padding:10px;">
                    <span style="font-size:11px; color:#475569;">${asset.borrower || asset.status}</span>
                </td>
                <td style="padding:10px; text-align:center;">
                    <div style="display:flex; gap:4px; justify-content:center;">
                        <button type="button" class="btn-borrow-item" data-idx="${idx}" style="background:#d97706; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:700;">เบิก/ยืม (-1)</button>
                        <button type="button" class="btn-return-item" data-idx="${idx}" style="background:#059669; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:700;">รับคืน (+1)</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Update Summary Counters
        const invTotalItems = document.getElementById('invTotalItems');
        const invAvailableCount = document.getElementById('invAvailableCount');
        const invBorrowedCount = document.getElementById('invBorrowedCount');
        const invTotalValue = document.getElementById('invTotalValue');

        if (invTotalItems) invTotalItems.textContent = `${schoolAssets.length} รายการ`;
        if (invAvailableCount) invAvailableCount.textContent = `${totalAvail} ชิ้น`;
        if (invBorrowedCount) invBorrowedCount.textContent = `${totalBorrowed} ชิ้น`;
        if (invTotalValue) invTotalValue.textContent = `฿${totalValue.toLocaleString()}`;
        if (tacAssetCount) tacAssetCount.textContent = schoolAssets.length;
        if (tacBudgetVal) tacBudgetVal.textContent = `฿${Math.round(totalValue / 1000)}K`;

        // Bind Borrow / Return Click Events
        tbody.querySelectorAll('.btn-borrow-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = Number(btn.dataset.idx);
                if (schoolAssets[i].availableQty > 0) {
                    schoolAssets[i].availableQty -= 1;
                    schoolAssets[i].borrowedQty += 1;
                    schoolAssets[i].borrower = `เบิกใช้ล่าสุดเมื่อ ${new Date().toLocaleTimeString('th-TH')}`;
                    renderInventoryTable();
                    renderInventoryMapMarkers();
                } else {
                    alert('⚠️ พัสดุรายการนี้ถูกเบิกยืมเต็มจำนวนแล้ว!');
                }
            });
        });

        tbody.querySelectorAll('.btn-return-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = Number(btn.dataset.idx);
                if (schoolAssets[i].borrowedQty > 0) {
                    schoolAssets[i].availableQty += 1;
                    schoolAssets[i].borrowedQty -= 1;
                    schoolAssets[i].borrower = `รับคืนเข้าคลังเมื่อ ${new Date().toLocaleTimeString('th-TH')}`;
                    renderInventoryTable();
                    renderInventoryMapMarkers();
                }
            });
        });
    }

    function renderInventoryMapMarkers() {
        // Map removed; inventory is managed directly via the School Inventory & Asset Table
    }

    // Add New Asset Form Handler
    const addAssetForm = document.getElementById('addAssetForm');
    if (addAssetForm) {
        addAssetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const code = document.getElementById('assetCodeInput').value.trim();
            const name = document.getElementById('assetNameInput').value.trim();
            const category = document.getElementById('assetCatInput').value;
            const qty = Number(document.getElementById('assetQtyInput').value) || 10;
            const price = Number(document.getElementById('assetPriceInput').value) || 100;

            const newAsset = {
                id: 'INV-' + Date.now(),
                code,
                name,
                category,
                room: 'อาคารศิลปะ / ห้องพัสดุกลาง',
                totalQty: qty,
                availableQty: qty,
                borrowedQty: 0,
                unit: 'ชิ้น/ชุด',
                pricePerUnit: price,
                status: 'พร้อมใช้งาน',
                borrower: 'ลงทะเบียนเข้าคลังใหม่',
                lat: currentPos.lat + (Math.random() - 0.5) * 0.002,
                lng: currentPos.lng + (Math.random() - 0.5) * 0.002
            };

            schoolAssets.unshift(newAsset);
            renderInventoryTable();
            renderInventoryMapMarkers();
            addAssetForm.reset();
            speakThaiText(`ลงทะเบียนพัสดุ ${name} จำนวน ${qty} ชุด เรียบร้อยแล้วค่ะ`);
        });
    }

    // 8. AI Lesson Plan, Worksheet & Exam Generator Engine (ม.1 - ม.6)
    const btnGenerateAiContent = document.getElementById('btnGenerateAiContent');
    const aiOutputContainer = document.getElementById('aiOutputContainer');

    function generateTeacherAiContent() {
        const subjectEl = document.getElementById('aiSubjectSelect');
        const gradeEl = document.getElementById('aiGradeSelect');
        const docTypeEl = document.getElementById('aiDocTypeSelect');
        const topicEl = document.getElementById('aiTopicInput');

        const subjectName = subjectEl ? subjectEl.options[subjectEl.selectedIndex].text : '🎨 ทัศนศิลป์';
        const grade = gradeEl ? gradeEl.value : 'ม.1';
        const docType = docTypeEl ? docTypeEl.value : 'lesson-plan';
        const topic = (topicEl && topicEl.value.trim()) ? topicEl.value.trim() : 'ทัศนธาตุทั้ง 7 และการสร้างสรรค์งานศิลปะ';

        let html = '';

        if (docType === 'lesson-plan') {
            html = `
                <div style="border-bottom:2px solid #2563eb; padding-bottom:8px; margin-bottom:12px;">
                    <h3 style="color:#1e40af; margin:0;">📋 แผนการจัดการเรียนรู้แบบ Active Learning (5 ขั้นตอน GPAS 5 Steps)</h3>
                    <p style="margin:4px 0 0 0; font-size:12px; color:#475569;"><b>รายวิชา:</b> ${subjectName} | <b>ระดับชั้น:</b> ${grade} | <b>เรื่อง:</b> ${topic} | <b>เวลา:</b> 2 ชั่วโมง</p>
                </div>
                <p><b>1. มาตรฐานการเรียนรู้ / ตัวชี้วัด (หลักสูตรแกนกลาง สพฐ.):</b><br>
                • <b>ศ 1.1 ${grade}/1:</b> บรรยายความแตกต่างและความคล้ายคลึงกันของงานทัศนศิลป์และสิ่งแวดล้อมโดยใช้ความรู้เรื่องทัศนธาตุ<br>
                • <b>ศ 1.1 ${grade}/2:</b> ระบุและวาดภาพสื่อความหมายด้วยจุด เส้น รูปร่าง รูปทรง น้ำหนัก สี บริเวณว่าง และพื้นผิว</p>

                <p><b>2. จุดประสงค์การเรียนรู้ (K-P-A):</b><br>
                • <b>ด้านความรู้ (K):</b> นักเรียนอธิบายองค์ประกอบของ <i>${topic}</i> และหลักการใช้สี/เส้นสื่ออารมณ์ได้ถูกต้อง<br>
                • <b>ด้านทักษะกระบวนการ (P):</b> นักเรียนปฏิบัติการสร้างสรรค์ผลงานศิลปะเรื่อง <i>${topic}</i> และปักหมุดส่งงานผ่านระบบดิจิทัลได้<br>
                • <b>ด้านคุณลักษณะ (A):</b> มีวินัย รับผิดชอบในการเบิก-คืนวัสดุอุปกรณ์ศิลปะ และชื่นชมผลงานของผู้อื่น</p>

                <p><b>3. กิจกรรมการเรียนรู้ (Active Learning 5 ขั้นตอน):</b><br>
                • <b>ขั้นที่ 1 สังเกตและรวบรวมข้อมูล (Gathering):</b> ครูเปิดสื่อวิดีโอบทเรียนเรื่อง <i>"${topic}"</i> บนระบบ EDU-CRAFT AI และให้นักเรียนสำรวจสิ่งแวดล้อมรอบโรงเรียน<br>
                • <b>ขั้นที่ 2 คิดวิเคราะห์และสรุปความรู้ (Processing):</b> ครูสาธิตการลากเส้นและลงน้ำหนักสีบนกระดานไวท์บอร์ดออนไลน์ พร้อมตั้งคำถามกระตุ้นคิด<br>
                • <b>ขั้นที่ 3 ปฏิบัติและสรุปความรู้ (Applying 1):</b> นักเรียนเบิกวัสดุอุปกรณ์จากระบบพัสดุห้องศิลปะ และลงมือวาดภาพสร้างสรรค์ผลงาน<br>
                • <b>ขั้นที่ 4 สื่อสารและนำเสนอ (Applying 2):</b> นักเรียนถ่ายภาพผลงานหรืออัดคลิปไม่เกิน 1 นาที ปักหมุดลงบนแผนที่โรงเรียนเพื่อจัดนิทรรศการออนไลน์<br>
                • <b>ขั้นที่ 5 ประเมินเพื่อเพิ่มคุณค่า (Self-Regulating):</b> ครูและเพื่อนร่วมชั้นคลิกชมหมุดผลงาน ให้คะแนนตามเกณฑ์ Rubric และทำความสะอาดคืนพัสดุเข้าคลัง</p>

                <p><b>4. สื่อการสอนและรายการพัสดุที่ใช้ในคาบเรียน:</b><br>
                • วิดีโอบทเรียนทัศนธาตุ Full HD, กระดาษร้อยปอนด์ A3, ชุดสีน้ำ/สีอะคริลิก, ขาตั้งวาดภาพไม้บีช (เบิกจากทะเบียนพัสดุ ศป-69)</p>
            `;
        } else if (docType === 'quiz') {
            html = `
                <div style="border-bottom:2px solid #7c3aed; padding-bottom:8px; margin-bottom:12px;">
                    <h3 style="color:#6d28d9; margin:0;">✍️ ชุดข้อสอบมาตรฐานพร้อมเฉลยละเอียด: ${topic} (${grade})</h3>
                    <p style="margin:4px 0 0 0; font-size:12px; color:#475569;">รายวิชา ${subjectName} • แบบปรนัย 4 ตัวเลือก วัดความเข้าใจและการนำไปใช้</p>
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                        <b>ข้อที่ 1:</b> ข้อใดคือความหมายที่ถูกต้องที่สุดของ "ทัศนธาตุ (Visual Elements)" ในงานศิลปะ?<br>
                        ก. อุปกรณ์ราคาแพงที่ใช้ในการวาดภาพระบายสี<br>
                        ข. ส่วนประกอบพื้นฐานที่มองเห็นได้ในงานทัศนศิลป์ ได้แก่ จุด เส้น รูปร่าง รูปทรง น้ำหนัก สี บริเวณว่าง และพื้นผิว<br>
                        ค. การจัดแสดงผลงานศิลปะในพิพิธภัณฑ์แห่งชาติ<br>
                        ง. เทคนิคการผสมสีน้ำมันบนเฟรมผ้าใบแคนวาส<br>
                        <span style="color:#059669; font-weight:700;">✅ เฉลย: ข. (คำอธิบาย: ทัศนธาตุทั้ง 7 คือหัวใจพื้นฐานที่ประกอบกันเป็นผลงานทัศนศิลป์ทุกชิ้น)</span>
                    </div>
                    <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                        <b>ข้อที่ 2:</b> หากนักเรียนต้องการวาดภาพให้สื่อถึง "ความมั่นคง แข็งแรง และสูงเด่น" เช่น เสาหินหรือตึกสูง ควรเลือกใช้เส้นลักษณะใดเป็นหลัก?<br>
                        ก. เส้นตรงแนวตั้ง (Vertical Line)<br>
                        ข. เส้นโค้งคลื่น (Curved Line)<br>
                        ค. เส้นซิกแซกหรือเส้นฟันปลา (Zigzag Line)<br>
                        ง. เส้นขดก้นหอย (Spiral Line)<br>
                        <span style="color:#059669; font-weight:700;">✅ เฉลย: ก. เส้นตรงแนวตั้ง (ให้ความรู้สึกตั้งตรง มั่นคง แข็งแรง และสง่างาม)</span>
                    </div>
                    <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                        <b>ข้อที่ 3:</b> ข้อใดแสดงถึงความแตกต่างระหว่าง "รูปร่าง (Shape)" และ "รูปทรง (Form)" ได้ถูกต้อง?<br>
                        ก. รูปร่างมีเฉพาะสีโทนร้อน ส่วนรูปทรงมีเฉพาะสีโทนเย็น<br>
                        ข. รูปร่างมี 2 มิติ (กว้าง x ยาว) ส่วนรูปทรงมี 3 มิติ (กว้าง x ยาว x ลึก/หนา)<br>
                        ค. รูปร่างเกิดจากพู่กัน ส่วนรูปทรงเกิดจากดินสอเท่านั้น<br>
                        ง. ไม่มีความแตกต่างกัน สามารถใช้แทนกันได้ทุกกรณี<br>
                        <span style="color:#059669; font-weight:700;">✅ เฉลย: ข. รูปร่างมี 2 มิติ ส่วนรูปทรงมี 3 มิติที่มีปริมาตรและความลึก</span>
                    </div>
                    <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                        <b>ข้อที่ 4:</b> ในการเบิก-ยืมครุภัณฑ์ศิลปะ (เช่น ขาตั้งวาดภาพและชุดสีอะคริลิก) ข้อปฏิบัติใดถูกต้องตามระเบียบห้องปฏิบัติการศิลปะ?<br>
                        ก. นำกลับบ้านโดยไม่ต้องแจ้งครูผู้ดูแลพัสดุ<br>
                        ข. ลงชื่อเบิกยืมในระบบทะเบียนพัสดุ ล้างพู่กันและจานสีให้สะอาดหลังใช้งาน และส่งคืนตามจำนวนที่เบิก<br>
                        ค. ทิ้งคราบสีอะคริลิกไว้ให้แห้งติดพู่กันเพื่อให้ขนพู่กันแข็งแรง<br>
                        ง. เบิกวัสดุสิ้นเปลืองเกินจำนวนที่ใช้งานจริงไปเก็บไว้ส่วนตัว<br>
                        <span style="color:#059669; font-weight:700;">✅ เฉลย: ข. ช่วยยืดอายุการใช้งานครุภัณฑ์และรักษาวินัยการบริหารพัสดุของโรงเรียน</span>
                    </div>
                </div>
            `;
        } else if (docType === 'worksheet') {
            html = `
                <div style="border-bottom:2px solid #db2777; padding-bottom:8px; margin-bottom:12px;">
                    <h3 style="color:#be185d; margin:0;">🎨 ใบงานปฏิบัติการศิลปะ & เกณฑ์การให้คะแนน (Rubric Score)</h3>
                    <p style="margin:4px 0 0 0; font-size:12px; color:#475569;">หัวข้อใบงาน: <b>${topic}</b> | ระดับชั้น ${grade} (คะแนนเต็ม 20 คะแนน)</p>
                </div>
                <p><b>คำชี้แจงสำหรับนักเรียน:</b><br>
                1. ให้นักเรียนสร้างสรรค์ผลงานภาพวาดภายใต้หัวข้อ <i>"${topic}"</i> ลงบนกระดาษร้อยปอนด์ หรือสเก็ตช์ภาพจากสถานที่จริงในโรงเรียน<br>
                2. เมื่อวาดเสร็จแล้ว ให้ถ่ายภาพผลงาน หรืออัดคลิปวิดีโออธิบายแนวคิดสั้นๆ (ไม่เกิน 1 นาที) แล้วกดปุ่ม <b>"📌 ปักหมุดส่งงานศิลปะ"</b> บนแผนที่โรงเรียน</p>
                <table style="width:100%; border-collapse:collapse; margin-top:8px; font-size:12px;">
                    <tr style="background:#fdf2f8; color:#9d174d; font-weight:700;">
                        <th style="border:1px solid #fbcfe8; padding:6px;">เกณฑ์การประเมิน (Rubric)</th>
                        <th style="border:1px solid #fbcfe8; padding:6px;">ดีเยี่ยม (5 คะแนน)</th>
                        <th style="border:1px solid #fbcfe8; padding:6px;">ดี (3-4 คะแนน)</th>
                        <th style="border:1px solid #fbcfe8; padding:6px;">ควรปรับปรุง (1-2 คะแนน)</th>
                    </tr>
                    <tr>
                        <td style="border:1px solid #e2e8f0; padding:6px;"><b>1. การใช้ทัศนธาตุ (เส้น/สี/แสงเงา)</b></td>
                        <td style="border:1px solid #e2e8f0; padding:6px;">ใช้เส้น สี และน้ำหนักแสงเงาได้กลมกลืน สื่ออารมณ์ชัดเจน</td>
                        <td style="border:1px solid #e2e8f0; padding:6px;">ใช้ทัศนธาตุได้ถูกต้องตามโจทย์</td>
                        <td style="border:1px solid #e2e8f0; padding:6px;">ยังขาดความสมบูรณ์ของเส้นและแสงเงา</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #e2e8f0; padding:6px;"><b>2. ความคิดสร้างสรรค์และองค์ประกอบศิลป์</b></td>
                        <td style="border:1px solid #e2e8f0; padding:6px;">จัดวางจุดเด่นและบริเวณว่างได้สมดุล แปลกใหม่น่าสนใจ</td>
                        <td style="border:1px solid #e2e8f0; padding:6px;">จัดองค์ประกอบภาพได้ดีตามมาตรฐาน</td>
                        <td style="border:1px solid #e2e8f0; padding:6px;">ภาพเอียงหรือขาดจุดสนใจหลัก</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #e2e8f0; padding:6px;"><b>3. การดูแลรักษาพัสดุอุปกรณ์ & ส่งงานตรงเวลา</b></td>
                        <td style="border:1px solid #e2e8f0; padding:6px;">เบิก-คืนอุปกรณ์สะอาดครบถ้วน ปักหมุดส่งงานพร้อมคำอธิบายครบ</td>
                        <td style="border:1px solid #e2e8f0; padding:6px;">ส่งงานตรงเวลาและคืนอุปกรณ์ครบ</td>
                        <td style="border:1px solid #e2e8f0; padding:6px;">ส่งงานล่าช้าหรือไม่ทำความสะอาดอุปกรณ์</td>
                    </tr>
                </table>
            `;
        } else if (docType === 'procurement-law-quiz') {
            html = `
                <div style="border-bottom:2px solid #059669; padding-bottom:8px; margin-bottom:12px;">
                    <h3 style="color:#065f46; margin:0;">⚖️ ชุดข้อสอบและสรุปสาระสำคัญ พ.ร.บ. การจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560</h3>
                    <p style="margin:4px 0 0 0; font-size:12px; color:#475569;">สำหรับครูผู้รับผิดชอบงานพัสดุโรงเรียน และการสอบเลื่อนวิทยฐานะ/ความรู้ความสามารถทั่วไป</p>
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                        <b>ข้อที่ 1:</b> ตาม พ.ร.บ. การจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 มาตรา 55 การจัดซื้อจัดจ้างมีกี่วิธี อะไรบ้าง?<br>
                        ก. 2 วิธี ได้แก่ วิธีตกลงราคา และวิธีสอบราคา<br>
                        ข. 3 วิธี ได้แก่ 1) วิธีประกาศเชิญชวนทั่วไป 2) วิธีคัดเลือก และ 3) วิธีเฉพาะเจาะจง<br>
                        ค. 4 วิธี ได้แก่ วิธีตกลงราคา วิธีสอบราคา วิธีประกวดราคา และวิธีพิเศษ<br>
                        ง. 5 วิธี ตามที่ผู้อำนวยการโรงเรียนกำหนด<br>
                        <span style="color:#059669; font-weight:700;">✅ เฉลย: ข. 3 วิธี (ประกาศเชิญชวนทั่วไป, คัดเลือก, และเฉพาะเจาะจง ตามมาตรา 55)</span>
                    </div>
                    <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                        <b>ข้อที่ 2:</b> การจัดซื้อวัสดุหรือครุภัณฑ์ทางการศึกษาโดย "วิธีเฉพาะเจาะจง" ตามมาตรา 56 วรรคหนึ่ง (2)(ข) กำหนดวงเงินไว้ไม่เกินเท่าใด?<br>
                        ก. ไม่เกิน 100,000 บาท<br>
                        ข. ไม่เกิน 300,000 บาท<br>
                        ค. ไม่เกิน 500,000 บาท<br>
                        ง. ไม่เกิน 1,000,000 บาท<br>
                        <span style="color:#059669; font-weight:700;">✅ เฉลย: ค. ไม่เกิน 500,000 บาท (กฎกระทรวงกำหนดวงเงินการจัดซื้อจัดจ้างพัสดุโดยวิธีเฉพาะเจาะจง พ.ศ. 2560)</span>
                    </div>
                    <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                        <b>ข้อที่ 3:</b> ตามระเบียบกระทรวงการคลังฯ พ.ศ. 2560 ข้อ 162 กรณีผู้ขายส่งมอบ "ครุภัณฑ์หรือวัสดุการสอน" ล่าช้ากว่ากำหนด ต้องคิดค่าปรับเป็นรายวันในอัตราใด?<br>
                        ก. ร้อยละ 0.01 ต่อวัน<br>
                        ข. ร้อยละ 0.10 ต่อวัน<br>
                        ค. ร้อยละ 0.20 ต่อวัน ของราคาสิ่งของที่ยังไม่ได้รับมอบ<br>
                        ง. วันละ 500 บาทคงที่<br>
                        <span style="color:#059669; font-weight:700;">✅ เฉลย: ค. ร้อยละ 0.20 (0.2%) ต่อวัน ของราคาสิ่งของที่ยังไม่ได้รับมอบ (ส่วนงานจ้างทำของคิดร้อยละ 0.10 ต่อวัน แต่ไม่ต่ำกว่าวันละ 100 บาท)</span>
                    </div>
                    <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                        <b>ข้อที่ 4:</b> ตามระเบียบกระทรวงการคลังฯ ข้อ 213 การตรวจสอบพัสดุประจำปีของสถานศึกษา ต้องเริ่มดำเนินการเมื่อใดและให้แล้วเสร็จภายในกี่วันทำการ?<br>
                        ก. เริ่มวันทำการแรกของเดือนมกราคม ให้แล้วเสร็จภายใน 15 วันทำการ<br>
                        ข. เริ่มวันทำการแรกของเดือนตุลาคม ให้แล้วเสร็จภายใน 30 วันทำการ<br>
                        ค. เริ่มวันสุดท้ายของเดือนกันยายน ให้แล้วเสร็จภายใน 60 วันทำการ<br>
                        ง. ตรวจเมื่อใดก็ได้ตามที่ครูพัสดุสะดวก<br>
                        <span style="color:#059669; font-weight:700;">✅ เฉลย: ข. แต่งตั้งผู้รับผิดชอบก่อนสิ้นเดือนกันยายน และเริ่มตรวจนับตั้งแต่วันทำการแรกของเดือนตุลาคม ให้แล้วเสร็จภายใน 30 วันทำการ</span>
                    </div>
                </div>
            `;
        } else {
            html = `
                <div style="border-bottom:2px solid #d97706; padding-bottom:8px; margin-bottom:12px;">
                    <h3 style="color:#b45309; margin:0;">📦 ใบเบิกวัสดุ-ครุภัณฑ์ประกอบการสอนประจำคาบเรียน</h3>
                    <p style="margin:4px 0 0 0; font-size:12px; color:#475569;">หน่วยการเรียนรู้: <b>${topic}</b> | ระดับชั้น ${grade} (สำหรับนักเรียน 30 คน)</p>
                </div>
                <ul style="padding-left:18px; line-height:1.8;">
                    <li><b>ครุภัณฑ์-ศป-69-001:</b> ขาตั้งวาดภาพไม้บีชปรับระดับ — จำนวนเบิกยืม <b>15 - 30 ตัว</b> (คืนหลังจบคาบเรียน)</li>
                    <li><b>วัสดุ-ศป-69-014:</b> ชุดสีน้ำ / สีอะคริลิก และจานหลุมผสมสี — จำนวน <b>15 ชุด</b> (แบ่งกลุ่มละ 2 คน)</li>
                    <li><b>วัสดุ-ศป-69-022:</b> กระดาษร้อยปอนด์ 190 แกรม ขนาด A3 — จำนวนเบิกจ่าย <b>30 แผ่น</b> (วัสดุสิ้นเปลือง)</li>
                    <li><b>ครุภัณฑ์-อด-69-008:</b> เครื่องโปรเจคเตอร์เลเซอร์และลำโพงห้องเรียนศิลปะ — จำนวน <b>1 ชุด</b></li>
                </ul>
                <p style="background:#fffbeb; border:1px solid #fde68a; padding:8px; border-radius:6px; font-size:12px; color:#92400e;">
                    📌 <b>หมายเหตุสำหรับครูผู้ดูแลพัสดุ:</b> สามารถกดปุ่ม <i>"ทะเบียนพัสดุโรงเรียน"</i> ด้านบนเพื่อตัดยอดเบิก-ยืมและส่งออกไฟล์ CSV แนบรายงานพัสดุประจำเดือนได้ทันที
                </p>
            `;
        }

        if (aiOutputContainer) {
            aiOutputContainer.innerHTML = html;
        }
    }

    if (btnGenerateAiContent) {
        btnGenerateAiContent.addEventListener('click', () => {
            generateTeacherAiContent();
        });
    }

    // Generate initial content on load
    generateTeacherAiContent();

    // Copy & Download AI Document
    const btnCopyAiLesson = document.getElementById('btnCopyAiLesson');
    if (btnCopyAiLesson) {
        btnCopyAiLesson.addEventListener('click', () => {
            const text = aiOutputContainer ? aiOutputContainer.innerText : '';
            navigator.clipboard.writeText(text).then(() => {
                alert('📋 คัดลอกเนื้อหาแผนการสอน/ข้อสอบลงคลิปบอร์ดเรียบร้อยแล้ว!');
            });
        });
    }

    const btnDownloadAiDoc = document.getElementById('btnDownloadAiDoc');
    if (btnDownloadAiDoc) {
        btnDownloadAiDoc.addEventListener('click', () => {
            const text = aiOutputContainer ? aiOutputContainer.innerText : '';
            const blob = new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `แผนการสอนและใบงานศิลปะ_${new Date().toISOString().slice(0, 10)}.txt`;
            a.click();
        });
    }

    const btnReadAiLesson = document.getElementById('btnReadAiLesson');
    if (btnReadAiLesson) {
        btnReadAiLesson.addEventListener('click', () => {
            const topic = document.getElementById('aiTopicInput')?.value || 'ทัศนธาตุทั้ง 7';
            speakThaiText(`แผนการจัดการเรียนรู้วิชาทัศนศิลป์ เรื่อง ${topic} พร้อมจุดประสงค์การเรียนรู้และเกณฑ์การประเมินพร้อมใช้งานแล้วค่ะ`);
        });
    }

    // 9. Interactive Art Whiteboard Studio (กระดานวาดภาพสาธิตเรื่องเส้นและสี)
    const artCanvas = document.getElementById('artWhiteboardCanvas');
    let wbCtx = null;
    let isDrawingWb = false;

    if (artCanvas) {
        wbCtx = artCanvas.getContext('2d');
        wbCtx.fillStyle = '#ffffff';
        wbCtx.fillRect(0, 0, artCanvas.width, artCanvas.height);
        wbCtx.lineCap = 'round';
        wbCtx.lineJoin = 'round';

        const getCanvasPos = (e) => {
            const rect = artCanvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: (clientX - rect.left) * (artCanvas.width / rect.width),
                y: (clientY - rect.top) * (artCanvas.height / rect.height)
            };
        };

        const startDraw = (e) => {
            isDrawingWb = true;
            const pos = getCanvasPos(e);
            wbCtx.beginPath();
            wbCtx.moveTo(pos.x, pos.y);
        };

        const moveDraw = (e) => {
            if (!isDrawingWb) return;
            e.preventDefault();
            const pos = getCanvasPos(e);
            wbCtx.strokeStyle = document.getElementById('wbColorPicker')?.value || '#2563eb';
            wbCtx.lineWidth = Number(document.getElementById('wbBrushSize')?.value || 5);
            wbCtx.lineTo(pos.x, pos.y);
            wbCtx.stroke();
        };

        const endDraw = () => {
            isDrawingWb = false;
        };

        artCanvas.addEventListener('mousedown', startDraw);
        artCanvas.addEventListener('mousemove', moveDraw);
        window.addEventListener('mouseup', endDraw);
        artCanvas.addEventListener('touchstart', startDraw, { passive: false });
        artCanvas.addEventListener('touchmove', moveDraw, { passive: false });
        artCanvas.addEventListener('touchend', endDraw);

        // Perspective Grid Template
        document.getElementById('btnWbTemplateGrid')?.addEventListener('click', () => {
            wbCtx.strokeStyle = '#cbd5e1';
            wbCtx.lineWidth = 1;
            const vpX = artCanvas.width / 2;
            const vpY = artCanvas.height / 2;
            // Horizon line
            wbCtx.beginPath();
            wbCtx.moveTo(0, vpY);
            wbCtx.lineTo(artCanvas.width, vpY);
            wbCtx.stroke();
            // Perspective rays
            for (let x = 0; x <= artCanvas.width; x += 95) {
                wbCtx.beginPath();
                wbCtx.moveTo(vpX, vpY);
                wbCtx.lineTo(x, artCanvas.height);
                wbCtx.moveTo(vpX, vpY);
                wbCtx.lineTo(x, 0);
                wbCtx.stroke();
            }
        });

        // Color Wheel Demonstration
        document.getElementById('btnWbColorWheel')?.addEventListener('click', () => {
            const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
            const labels = ['แดง (แม่สี)', 'ส้ม', 'เหลือง (แม่สี)', 'เขียว', 'น้ำเงิน (แม่สี)', 'ม่วง'];
            const cx = artCanvas.width / 2;
            const cy = artCanvas.height / 2;
            const radius = 110;
            colors.forEach((col, i) => {
                const angle = (i * Math.PI * 2) / colors.length - Math.PI / 2;
                const x = cx + Math.cos(angle) * radius;
                const y = cy + Math.sin(angle) * radius;
                wbCtx.fillStyle = col;
                wbCtx.beginPath();
                wbCtx.arc(x, y, 34, 0, Math.PI * 2);
                wbCtx.fill();
                wbCtx.fillStyle = '#0f172a';
                wbCtx.font = 'bold 12px Sarabun, sans-serif';
                wbCtx.textAlign = 'center';
                wbCtx.fillText(labels[i], x, y + 50);
            });
        });

        // Clear Whiteboard
        document.getElementById('btnWbClear')?.addEventListener('click', () => {
            wbCtx.fillStyle = '#ffffff';
            wbCtx.fillRect(0, 0, artCanvas.width, artCanvas.height);
        });

        // Save Whiteboard Drawing as a Pin on the School Map
        document.getElementById('btnWbSavePin')?.addEventListener('click', () => {
            const dataUrl = artCanvas.toDataURL('image/png');
            const newArtPin = {
                id: 'wb-' + Date.now(),
                title: '🖌️ ภาพสาธิตจากกระดานไวท์บอร์ดครูผู้สอน',
                studentName: 'ครูผู้สอนวิชาทัศนศิลป์',
                grade: 'สื่อสาธิตสด',
                category: 'art-work',
                status: 'graded',
                score: 'สื่อต้นแบบครูผู้สอน',
                lat: currentPos.lat + (Math.random() - 0.5) * 0.0015,
                lng: currentPos.lng + (Math.random() - 0.5) * 0.0015,
                locationName: 'กระดานไวท์บอร์ดห้องเรียนศิลปะ',
                time: new Date().toISOString(),
                description: 'ภาพวาดสาธิตเรื่องเส้น ทฤษฎีสี และทัศนียภาพจากกระดานไวท์บอร์ดให้นักเรียนศึกษาทบทวน',
                mediaUrl: dataUrl,
                mediaType: 'photo',
                viewers: 1
            };
            activeSubmissions.unshift(newArtPin);
            renderIncidents();
            whiteboardModal.classList.add('hidden');
            alert('📌 บันทึกภาพวาดจากกระดานไวท์บอร์ดและปักหมุดลงบนแผนที่โรงเรียนเรียบร้อยแล้ว!');
        });
    }

    // 10. Built-in Video Library Tabs
    const eduLessonVideoPlayer = document.getElementById('eduLessonVideoPlayer');
    const currentVideoLessonTitle = document.getElementById('currentVideoLessonTitle');

    document.querySelectorAll('.video-lesson-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.video-lesson-tab').forEach(t => {
                t.style.border = '1px solid #cbd5e1';
                t.style.background = '#f8fafc';
            });
            tab.style.border = '2px solid #2563eb';
            tab.style.background = '#eff6ff';

            const videoFile = tab.dataset.video;
            const videoTitle = tab.dataset.title;
            if (eduLessonVideoPlayer) {
                eduLessonVideoPlayer.src = videoFile;
                eduLessonVideoPlayer.play().catch(() => {});
            }
            if (currentVideoLessonTitle) {
                currentVideoLessonTitle.textContent = `กำลังเล่น: ${videoTitle}`;
            }
        });
    });

    document.getElementById('btnGenerateQuizFromVideo')?.addEventListener('click', () => {
        if (eduLessonVideoPlayer) eduLessonVideoPlayer.pause();
        videoLibraryModal.classList.add('hidden');
        aiGeneratorModal.classList.remove('hidden');
        const docTypeSelect = document.getElementById('aiDocTypeSelect');
        if (docTypeSelect) docTypeSelect.value = 'quiz';
        generateTeacherAiContent();
    });

    // 11. Open Viewer & Teacher Grading Modal
    function openStreamViewer(item) {
        selectedSubmissionForGrading = item;
        streamViewerModal.classList.remove('hidden');

        document.getElementById('viewerStreamTitle').textContent = item.title;
        document.getElementById('viewerAddressText').textContent = `📍 ${item.locationName || item.address || 'อาคารศิลปะ'} (พิกัด: ${item.lat.toFixed(5)}, ${item.lng.toFixed(5)})`;
        document.getElementById('viewerCountBadge').textContent = `👁️ ${item.viewers || 1} เข้าชม`;
        const meta = getCategoryMeta(item.category);
        document.getElementById('viewerCategoryBadge').textContent = `${meta.emoji} ${meta.label}`;
        document.getElementById('btnNavGoogleMaps').href = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;

        const viewerDescText = document.getElementById('viewerDescText');
        if (viewerDescText) {
            viewerDescText.innerHTML = `
                <b>👤 ผู้ส่งงาน/ผู้ตรวจ:</b> ${item.studentName || item.reporter || 'นักเรียน'} (${item.grade || 'ม.1'})<br>
                <b>📝 รายละเอียด:</b> ${item.description || '-'}<br>
                <span style="color:#059669; font-weight:700;">🏆 ผลการประเมินปัจจุบัน: ${item.score || 'รอครูตรวจให้คะแนน'}</span>
            `;
        }

        const viewerImagePlayer = document.getElementById('viewerImagePlayer');
        const viewerVideoPlayer = document.getElementById('viewerVideoPlayer');

        if (item.mediaUrl && item.mediaType === 'video') {
            viewerImagePlayer.style.display = 'none';
            viewerVideoPlayer.style.display = 'block';
            viewerVideoPlayer.src = item.mediaUrl;
            viewerVideoPlayer.play().catch(() => {});
        } else {
            viewerVideoPlayer.pause();
            viewerVideoPlayer.style.display = 'none';
            viewerImagePlayer.style.display = 'block';
            viewerImagePlayer.src = item.mediaUrl || 'assets/art_elements.jpg';
        }
    }

    // Save Teacher Grade Button
    document.getElementById('btnSaveStudentGrade')?.addEventListener('click', () => {
        if (!selectedSubmissionForGrading) return;
        const gradeVal = document.getElementById('teacherGradeSelect')?.value || '20/20 (เกรด 4 ดีเยี่ยม)';
        selectedSubmissionForGrading.score = gradeVal;
        selectedSubmissionForGrading.status = 'graded';

        fetch(`/api/alerts/${selectedSubmissionForGrading.id}/grade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: gradeVal, status: 'graded' })
        }).catch(() => {});

        renderIncidents();
        openStreamViewer(selectedSubmissionForGrading);
        speakThaiText(`บันทึกผลการประเมิน ${gradeVal} เรียบร้อยแล้วค่ะ`);
    });

    // 12. Student Artwork / Asset Pin Submission Form (Supports Photo & Video <= 60s)
    const citizenReportForm = document.getElementById('citizenReportForm');
    const reportMediaInput = document.getElementById('reportMediaInput');
    const mediaPreviewWrapper = document.getElementById('mediaPreviewWrapper');
    const mediaPreviewImg = document.getElementById('mediaPreviewImg');
    const mediaPreviewVid = document.getElementById('mediaPreviewVid');
    const btnRemoveMedia = document.getElementById('btnRemoveMedia');
    const btnPickMapPin = document.getElementById('btnPickMapPin');
    const reportGpsText = document.getElementById('reportGpsText');

    let currentReportMedia = null;
    let selectedPinCoords = null;
    let isPickingPinOnMap = false;
    let tempPinMarker = null;

    function openCitizenReportModal() {
        const coords = selectedPinCoords || currentPos;
        if (reportGpsText) {
            reportGpsText.textContent = `${coords.lat.toFixed(5)}° N, ${coords.lng.toFixed(5)}° E ${selectedPinCoords ? '(จุดที่เลือกบนแผนผังโรงเรียน)' : '(พิกัด GPS ปัจจุบัน)'}`;
        }
        citizenReportModal.classList.remove('hidden');
    }

    if (btnPickMapPin) {
        btnPickMapPin.addEventListener('click', () => {
            isPickingPinOnMap = true;
            citizenReportModal.classList.add('hidden');
            alert('🎯 กรุณาคลิกเลือกจุดบนแผนผังโรงเรียน ณ ตำแหน่งห้องเรียนหรือจุดที่คุณต้องการปักหมุด');
        });
    }

    // Media upload & 60s video check
    if (reportMediaInput) {
        reportMediaInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.type.startsWith('video')) {
                const tempVid = document.createElement('video');
                tempVid.preload = 'metadata';
                tempVid.onloadedmetadata = () => {
                    window.URL.revokeObjectURL(tempVid.src);
                    if (tempVid.duration > 60) {
                        alert(`⚠️ วิดีโอมีความยาว ${Math.round(tempVid.duration)} วินาที เกินขีดจำกัด 60 วินาที (1 นาที) กรุณาเลือกคลิปสั้นไม่เกิน 1 นาที`);
                        reportMediaInput.value = '';
                        return;
                    }
                    readReportFile(file, 'video');
                };
                tempVid.src = URL.createObjectURL(file);
            } else {
                readReportFile(file, 'photo');
            }
        });
    }

    function readReportFile(file, type) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            currentReportMedia = { type, url: ev.target.result };
            if (type === 'photo') {
                mediaPreviewVid.style.display = 'none';
                mediaPreviewImg.src = ev.target.result;
                mediaPreviewImg.style.display = 'block';
            } else {
                mediaPreviewImg.style.display = 'none';
                mediaPreviewVid.src = ev.target.result;
                mediaPreviewVid.style.display = 'block';
            }
            mediaPreviewWrapper.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    if (btnRemoveMedia) {
        btnRemoveMedia.addEventListener('click', () => {
            currentReportMedia = null;
            reportMediaInput.value = '';
            mediaPreviewWrapper.style.display = 'none';
        });
    }

    function submitPinEntry(startLive = false) {
        const catEl = document.querySelector('input[name="reportCat"]:checked');
        const category = catEl ? catEl.value : 'art-work';
        const studentName = document.getElementById('reportNameInput')?.value.trim() || 'นักเรียนชั้นมัธยมศึกษา';
        const grade = document.getElementById('reportGradeInput')?.value || 'ม.1';
        const title = document.getElementById('reportTitleInput')?.value.trim() || '🎨 ส่งผลงานศิลปะ / รายงานพัสดุ';
        const description = document.getElementById('reportDescInput')?.value.trim() || 'ส่งผลงานผ่านระบบช่วยสอน EDU-CRAFT AI';
        const coords = selectedPinCoords || currentPos;

        const newEntry = {
            id: 'qr-work-' + Date.now(),
            title,
            studentName,
            grade,
            category,
            status: 'pending',
            score: category === 'asset-check' ? 'ตรวจเช็คพัสดุแล้ว' : 'รอครูตรวจให้คะแนน',
            lat: currentPos.lat,
            lng: currentPos.lng,
            locationName: `ส่งผ่าน QR รหัส ${currentSessionPin} (${grade})`,
            time: new Date().toISOString(),
            description,
            mediaUrl: currentReportMedia ? currentReportMedia.url : 'assets/art_elements.jpg',
            mediaType: currentReportMedia ? currentReportMedia.type : 'photo',
            isLive: startLive,
            viewers: 1
        };

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'SOS_ALERT', ...newEntry }));
        }

        activeSubmissions.unshift(newEntry);
        qrAttendanceList.unshift({
            studentId: String(69100 + qrAttendanceList.length + 1),
            name: studentName,
            classRoom: grade,
            scanTime: new Date().toLocaleTimeString('th-TH'),
            status: 'มาเรียน',
            homeworkStatus: 'ส่งงานแล้ว (รอตรวจ)',
            submissionId: newEntry.id
        });
        renderIncidents();
        renderQrAttendanceTable();
        citizenReportModal.classList.add('hidden');
        citizenReportForm.reset();
        mediaPreviewWrapper.style.display = 'none';
        currentReportMedia = null;

        if (startLive) {
            startCameraBroadcast();
        } else {
            speakThaiText(`บันทึกการส่งงาน ${title} ของ ${studentName} ผ่านระบบ QR Code เรียบร้อยแล้วค่ะ`);
        }
    }

    if (citizenReportForm) {
        citizenReportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitPinEntry(false);
        });
    }

    document.getElementById('btnSubmitAndLive')?.addEventListener('click', () => {
        submitPinEntry(true);
    });

    // 13. Export CSV Reports (ปพ.5 เช็คชื่อ QR Code + คะแนนผลงานศิลปะ + ทะเบียนคุมพัสดุโรงเรียน)
    function exportSchoolCsvReport() {
        let csv = '\uFEFF=== ส่วนที่ 1: รายงานการเช็คชื่อเข้าเรียนและการส่งงานผ่าน QR Code (ปพ.5) ===\n';
        csv += 'รหัสประจำตัว,ชื่อ-นามสกุลนักเรียน,ห้องเรียน,เวลาสแกน QR,สถานะการมาเรียน,สถานะการส่งงานศิลปะ\n';
        qrAttendanceList.forEach(st => {
            csv += `"${st.studentId}","${st.name}","${st.classRoom}","${st.scanTime}","${st.status}","${st.homeworkStatus}"\n`;
        });

        csv += '\n=== ส่วนที่ 2: รายงานคะแนนผลงานศิลปะและการส่งงานนักเรียน ===\n';
        csv += 'รหัสรายการ,ชื่อผลงาน/กิจกรรม,ชื่อนักเรียน/ผู้รับผิดชอบ,ระดับชั้น,หมวดหมู่,ผลการประเมิน/คะแนน\n';
        activeSubmissions.forEach(s => {
            csv += `"${s.id}","${s.title}","${s.studentName || ''}","${s.grade || ''}","${s.category}","${s.score || ''}"\n`;
        });

        csv += '\n=== ส่วนที่ 3: ทะเบียนคุมทรัพย์สิน พัสดุ และครุภัณฑ์โรงเรียน (หมวดศิลปะและอาคารเรียน) ===\n';
        csv += 'รหัสพัสดุ,ชื่อรายการวัสดุ/ครุภัณฑ์,หมวดหมู่,สถานที่จัดเก็บ,จำนวนทั้งหมด,คงเหลือพร้อมใช้,จำนวนถูกยืม,ราคาต่อหน่วย(บาท),มูลค่ารวม(บาท),สถานะล่าสุด\n';
        schoolAssets.forEach(a => {
            const totalVal = Number(a.totalQty) * Number(a.pricePerUnit);
            csv += `"${a.code}","${a.name}","${a.category}","${a.room}",${a.totalQty},${a.availableQty},${a.borrowedQty},${a.pricePerUnit},${totalVal},"${a.borrower || a.status}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `รายงานเช็คชื่อQR_ผลการเรียนศิลปะ_และพัสดุโรงเรียน_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    }

    document.getElementById('btnExportReport')?.addEventListener('click', exportSchoolCsvReport);
    document.getElementById('btnExportInventoryCsv')?.addEventListener('click', exportSchoolCsvReport);

    // 14. Live Camera Broadcast Studio (สาธิตการวาดภาพสด / ส่องตรวจพัสดุ)
    async function startCameraBroadcast() {
        broadcasterModal.classList.remove('hidden');
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode },
                audio: true
            });
            const localVideo = document.getElementById('localVideoPreview');
            if (localVideo) localVideo.srcObject = mediaStream;
            isBroadcasting = true;
            hudTimer = setInterval(() => {
                const hudClock = document.getElementById('hudClock');
                if (hudClock) hudClock.textContent = new Date().toLocaleTimeString('th-TH');
            }, 1000);
        } catch (err) {
            alert('🎥 เปิดโหมดสตูดิโอจำลองการสอนสด (อุปกรณ์ของคุณไม่ได้เชื่อมต่อกล้องเว็บแคม)');
        }
    }

    function stopCameraBroadcast() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(t => t.stop());
            mediaStream = null;
        }
        clearInterval(hudTimer);
        broadcasterModal.classList.add('hidden');
        isBroadcasting = false;
    }

    document.getElementById('btnStartBroadcasting')?.addEventListener('click', startCameraBroadcast);
    document.getElementById('btnCloseStudio')?.addEventListener('click', stopCameraBroadcast);
    document.getElementById('btnStopBroadcast')?.addEventListener('click', stopCameraBroadcast);

    document.getElementById('btnFlipCamera')?.addEventListener('click', () => {
        facingMode = facingMode === 'environment' ? 'user' : 'environment';
        if (isBroadcasting) {
            stopCameraBroadcast();
            startCameraBroadcast();
        }
    });

    // 15. Thai AI Speech Narration Helper
    function speakThaiText(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = 'th-TH';
            utter.rate = 1.0;
            window.speechSynthesis.speak(utter);
        }
    }

    document.getElementById('btnAiSpeech')?.addEventListener('click', () => {
        speakThaiText(`สวัสดีค่ะคุณครู ระบบช่วยสอนวิชาศิลปะและบริหารพัสดุโรงเรียนมัธยมศึกษา ขณะนี้มีผลงานนักเรียนส่งเข้ามา ${activeSubmissions.length} ชิ้น และมีรายการครุภัณฑ์ในทะเบียน ${schoolAssets.length} รายการ พร้อมสำหรับการเรียนการสอนค่ะ`);
    });

    // 16. Modal & Toolbar Button Bindings
    document.getElementById('btnOpenAiGenerator')?.addEventListener('click', () => aiGeneratorModal.classList.remove('hidden'));
    document.getElementById('btnSosTrigger')?.addEventListener('click', () => aiGeneratorModal.classList.remove('hidden'));
    document.getElementById('btnCloseAiGenerator')?.addEventListener('click', () => aiGeneratorModal.classList.add('hidden'));

    document.getElementById('btnOpenInventoryModal')?.addEventListener('click', () => {
        renderInventoryTable();
        inventoryModal.classList.remove('hidden');
    });
    document.getElementById('btnQuickBorrowAsset')?.addEventListener('click', () => {
        renderInventoryTable();
        inventoryModal.classList.remove('hidden');
    });
    document.getElementById('btnCloseInventoryModal')?.addEventListener('click', () => inventoryModal.classList.add('hidden'));

    document.getElementById('btnOpenVideoLibrary')?.addEventListener('click', () => videoLibraryModal.classList.remove('hidden'));
    document.getElementById('btnQuickArtVideo1')?.addEventListener('click', () => {
        videoLibraryModal.classList.remove('hidden');
        document.querySelectorAll('.video-lesson-tab')[0]?.click();
    });
    document.getElementById('btnQuickArtVideo2')?.addEventListener('click', () => {
        videoLibraryModal.classList.remove('hidden');
        document.querySelectorAll('.video-lesson-tab')[1]?.click();
    });
    document.getElementById('btnCloseVideoLibrary')?.addEventListener('click', () => {
        if (eduLessonVideoPlayer) eduLessonVideoPlayer.pause();
        videoLibraryModal.classList.add('hidden');
    });

    document.getElementById('btnOpenWhiteboardModal')?.addEventListener('click', () => whiteboardModal.classList.remove('hidden'));
    document.getElementById('btnQuickWhiteboard')?.addEventListener('click', () => whiteboardModal.classList.remove('hidden'));
    document.getElementById('btnCloseWhiteboard')?.addEventListener('click', () => whiteboardModal.classList.add('hidden'));

    document.getElementById('btnReportIncident')?.addEventListener('click', openCitizenReportModal);
    document.getElementById('btnCloseCitizenReport')?.addEventListener('click', () => citizenReportModal.classList.add('hidden'));
    document.getElementById('btnCloseViewer')?.addEventListener('click', () => {
        document.getElementById('viewerVideoPlayer')?.pause();
        streamViewerModal.classList.add('hidden');
    });

    document.getElementById('btnVerifyDataSources')?.addEventListener('click', () => verifyModal.classList.remove('hidden'));
    document.getElementById('btnCloseVerifyModal')?.addEventListener('click', () => verifyModal.classList.add('hidden'));
    document.getElementById('btnConfirmVerify')?.addEventListener('click', () => verifyModal.classList.add('hidden'));

    // ==============================================================
    // 16.5 SCHOOL PROCUREMENT & LEGAL COMPLIANCE ENGINE (e-GP & พ.ร.บ. 2560)
    // ==============================================================
    const procurementModal = document.getElementById('procurementModal');

    document.getElementById('btnOpenProcurementModal')?.addEventListener('click', () => {
        procurementModal?.classList.remove('hidden');
        runProcurementThresholdAnalysis();
        runLatePenaltyCalculation();
        generateOfficialGovProcurementDoc();
    });

    document.getElementById('btnQuickOpenProcurement')?.addEventListener('click', () => {
        procurementModal?.classList.remove('hidden');
        runProcurementThresholdAnalysis();
        runLatePenaltyCalculation();
        generateOfficialGovProcurementDoc();
    });

    document.getElementById('btnCloseProcurementModal')?.addEventListener('click', () => {
        procurementModal?.classList.add('hidden');
    });

    // Tab Switching inside Procurement Modal
    document.querySelectorAll('.proc-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.proc-tab-btn').forEach(b => {
                b.style.border = '1px solid #cbd5e1';
                b.style.background = '#f8fafc';
                b.style.color = '#334155';
            });
            btn.style.border = '2px solid #059669';
            btn.style.background = '#ecfdf5';
            btn.style.color = '#065f46';

            const targetId = btn.dataset.tab;
            document.querySelectorAll('.proc-tab-panel').forEach(p => {
                p.style.display = p.id === targetId ? 'block' : 'none';
            });
        });
    });

    // Law Search Filter
    const lawSearchInput = document.getElementById('lawSearchInput');
    if (lawSearchInput) {
        lawSearchInput.addEventListener('input', () => {
            const q = lawSearchInput.value.trim().toLowerCase();
            document.querySelectorAll('.law-item-card').forEach(card => {
                const text = card.innerText.toLowerCase();
                card.style.display = (!q || text.includes(q)) ? 'block' : 'none';
            });
        });
    }

    document.getElementById('btnSpeakLawSummary')?.addEventListener('click', () => {
        speakThaiText('สรุปหลักการจัดซื้อจัดจ้างในสถานศึกษา ตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 กรณีวงเงินไม่เกิน 500,000 บาท สามารถใช้วิธีเฉพาะเจาะจงได้ กรณีวงเงินไม่เกิน 100,000 บาท อนุโลมตามระเบียบข้อ 79 วรรคสอง ตั้งผู้ตรวจรับพัสดุ 1 คนได้ และกรณีวงเงินไม่เกิน 10,000 บาท ตามหนังสือเวียน ว 119 สามารถจัดซื้อและนำใบเสร็จรับเงินมาเบิกจ่ายได้ทันทีค่ะ');
    });

    // Procurement Threshold & Method Analyzer (มาตรา 55-56, ข้อ 79, ว119)
    function runProcurementThresholdAnalysis() {
        const budget = Number(document.getElementById('calcBudgetInput')?.value || 45000);
        const type = document.getElementById('calcTypeSelect')?.value || 'buy';
        const resBox = document.getElementById('calcMethodResult');
        if (!resBox) return;

        let methodTitle = '';
        let legalRef = '';
        let committeeRule = '';
        let contractRule = '';
        let taxRule = '';

        if (budget <= 10000) {
            methodTitle = '✅ วิธีเฉพาะเจาะจง (เข้าข่ายอนุโลมตามหนังสือเวียน ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว 119)';
            legalRef = 'พ.ร.บ. มาตรา 56 วรรคหนึ่ง (2)(ข) + ระเบียบฯ ข้อ 79 วรรคสอง + หนังสือเวียน ว119';
            committeeRule = '👤 แต่งตั้ง <b>ผู้ตรวจรับพัสดุ 1 คน</b> (หรือให้ผู้รับผิดชอบลงนามตรวจรับในหลักฐานการจ่าย)';
            contractRule = '📄 อนุโลมไม่ต้องทำข้อตกลงเป็นหนังสือไว้ต่อกัน ใช้ <b>ใบเสร็จรับเงิน/บิลเงินสดที่ถูกต้อง</b> ประกอบการเบิกจ่ายได้';
        } else if (budget <= 100000) {
            methodTitle = '✅ วิธีเฉพาะเจาะจง (วงเงินเล็กน้อยไม่เกิน 100,000 บาท ตามระเบียบฯ ข้อ 79 วรรคสอง)';
            legalRef = 'พ.ร.บ. มาตรา 56 วรรคหนึ่ง (2)(ข) + ระเบียบกระทรวงการคลังฯ ข้อ 22 และ ข้อ 79';
            committeeRule = '👤 แต่งตั้ง <b>ผู้ตรวจรับพัสดุ 1 คน</b> หรือ คณะกรรมการตรวจรับพัสดุ 3 คนก็ได้';
            contractRule = '📄 จัดทำรายงานขอซื้อขอจ้าง + <b>ใบสั่งซื้อ/ใบสั่งจ้าง</b> และลงระบบ e-GP ตามขั้นตอน';
        } else if (budget <= 500000) {
            methodTitle = '✅ วิธีเฉพาะเจาะจง (วงเงินเกิน 100,000 บาท แต่ไม่เกิน 500,000 บาท)';
            legalRef = 'พ.ร.บ. มาตรา 56 วรรคหนึ่ง (2)(ข) + ระเบียบกระทรวงการคลังฯ ข้อ 22, ข้อ 78 และ ข้อ 79 วรรคหนึ่ง';
            committeeRule = '👥 ต้องแต่งตั้ง <b>คณะกรรมการตรวจรับพัสดุ ไม่น้อยกว่า 3 คน</b> (ประธาน 1 คน และกรรมการอย่างน้อย 2 คน)';
            contractRule = '📄 ต้องจัดทำรายงานขอซื้อขอจ้าง, เชิญผู้ประกอบการยื่นเสนอราคา, จัดทำ <b>ใบสั่งซื้อ/ใบสั่งจ้าง หรือสัญญาซื้อขาย</b> ในระบบ e-GP';
        } else {
            methodTitle = '📢 วิธีประกาศเชิญชวนทั่วไป (e-Market / e-Bidding) หรือ วิธีคัดเลือก (วงเงินเกิน 500,000 บาท)';
            legalRef = 'พ.ร.บ. มาตรา 55 (1) หรือ (2) + ระเบียบกระทรวงการคลังฯ ข้อ 29 - 73';
            committeeRule = '👥 ต้องแต่งตั้ง <b>คณะกรรมการพิจารณาผลการประกวดราคาอิเล็กทรอนิกส์ (3 คน)</b> และ <b>คณะกรรมการตรวจรับพัสดุ (3 คน)</b>';
            contractRule = '📄 ต้องจัดทำร่างขอบเขตงาน (TOR), ประกาศราคากลางในระบบ e-GP, ทำสัญญาตามแบบ กวพ. และวางหลักประกันสัญญา 5% ของวงเงิน';
        }

        if (budget >= 500) {
            const wht = (budget * 0.01).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            taxRule = `💰 <b>การหักภาษี ณ ที่จ่าย 1%:</b> กรณีซื้อจากนิติบุคคล (บริษัท/ห้างหุ้นส่วน) ต้องหักภาษี ณ ที่จ่าย 1% (ประมาณ <b>${wht} บาท</b>) กรณีบุคคลธรรมดาหักเมื่อยอดตั้งแต่ 10,000 บาทขึ้นไป`;
        } else {
            taxRule = '💰 <b>การหักภาษี ณ ที่จ่าย:</b> วงเงินต่ำกว่า 500 บาท ได้รับยกเว้นไม่ต้องหักภาษี ณ ที่จ่าย';
        }

        const fineRateText = type === 'buy' ? 'ร้อยละ 0.20 ต่อวัน (ระเบียบฯ ข้อ 162)' : 'ร้อยละ 0.10 ต่อวัน แต่ไม่ต่ำกว่าวันละ 100 บาท';

        resBox.innerHTML = `
            <div style="font-weight:800; color:#047857; font-size:13px; margin-bottom:6px;">${methodTitle}</div>
            <div><b>📚 ข้อกฎหมายอ้างอิง:</b> ${legalRef}</div>
            <div><b>👥 การตั้งกรรมการตรวจรับ:</b> ${committeeRule}</div>
            <div><b>📑 รูปแบบสัญญา/หลักฐาน:</b> ${contractRule}</div>
            <div><b>⚖️ อัตราค่าปรับตามสัญญา:</b> ${fineRateText}</div>
            <div style="margin-top:4px; color:#1e40af;">${taxRule}</div>
        `;
    }

    document.getElementById('btnRunProcCalc')?.addEventListener('click', runProcurementThresholdAnalysis);

    // Late Delivery Penalty Calculator (ระเบียบกระทรวงการคลังฯ ข้อ 162)
    function runLatePenaltyCalculation() {
        const amount = Number(document.getElementById('fineAmountInput')?.value || 45000);
        const days = Number(document.getElementById('fineDaysInput')?.value || 5);
        const type = document.getElementById('calcTypeSelect')?.value || 'buy';
        const resBox = document.getElementById('calcFineResult');
        if (!resBox) return;

        let dailyFine = 0;
        let rateDesc = '';
        if (type === 'buy') {
            dailyFine = amount * 0.002; // 0.20% per day
            rateDesc = 'งานซื้อพัสดุ/ครุภัณฑ์ อัตราร้อยละ 0.20 (0.2%) ต่อวัน ของราคาสิ่งของที่ยังไม่ได้รับมอบ';
        } else {
            dailyFine = Math.max(100, amount * 0.001); // 0.10% per day, min 100 THB
            rateDesc = 'งานจ้างทำของ/ซ่อมแซม อัตราร้อยละ 0.10 (0.1%) ต่อวัน (แต่ไม่ต่ำกว่าวันละ 100 บาท)';
        }

        const totalFine = dailyFine * days;
        const maxTenPercent = amount * 0.10;
        const warningOver10 = totalFine > maxTenPercent
            ? `<div style="margin-top:6px; color:#dc2626; font-weight:700;">⚠️ แจ้งเตือนข้อกฎหมาย (มาตรา 103): ค่าปรับเกินร้อยละ 10 ของวงเงิน (${maxTenPercent.toLocaleString()} บาท) โรงเรียนมีสิทธิบอกเลิกสัญญาได้ เว้นแต่ผู้ขายยินยอมเสียค่าปรับโดยไม่มีเงื่อนไข</div>`
            : `<div style="margin-top:6px; color:#059669; font-weight:700;">✅ ค่าปรับยังไม่เกินร้อยละ 10 ของวงเงินสัญญา (เพดาน 10% คือ ${maxTenPercent.toLocaleString()} บาท)</div>`;

        resBox.innerHTML = `
            <div><b>📐 สูตรคำนวณตามระเบียบฯ ข้อ 162:</b> ${rateDesc}</div>
            <div style="margin-top:4px;">• <b>ค่าปรับต่อวัน:</b> <span style="color:#b45309; font-weight:800;">${dailyFine.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท/วัน</span></div>
            <div>• <b>จำนวนวันที่ส่งมอบล่าช้า:</b> ${days} วัน</div>
            <div style="font-size:14px; font-weight:900; color:#dc2626; margin-top:4px;">💵 รวมค่าปรับทั้งสิ้น: ${totalFine.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</div>
            ${warningOver10}
        `;
    }

    document.getElementById('btnRunFineCalc')?.addEventListener('click', runLatePenaltyCalculation);

    // Official Government Procurement Document Generator
    function generateOfficialGovProcurementDoc() {
        const formType = document.getElementById('govFormTypeSelect')?.value || 'memo-buy';
        const project = document.getElementById('govFormProjectInput')?.value || 'โครงการจัดซื้อวัสดุและครุภัณฑ์ฝึกปฏิบัติการทัศนศิลป์';
        const amount = Number(document.getElementById('govFormAmountInput')?.value || 38500);
        const box = document.getElementById('govDocPreviewBox');
        if (!box) return;

        const todayStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        const amountStr = amount.toLocaleString('th-TH', { minimumFractionDigits: 2 });
        const inspectRole = amount <= 100000 ? 'ผู้ตรวจรับพัสดุ จำนวน 1 ท่าน' : 'คณะกรรมการตรวจรับพัสดุ จำนวน 3 ท่าน';

        let docText = '';

        if (formType === 'memo-buy') {
            docText = `บันทึกข้อความ
ส่วนราชการ: กลุ่มสาระการเรียนรู้ศิลปะ และงานพัสดุ โรงเรียนมัธยมศึกษา
ที่ ศธ 04225/พส.${Math.floor(100 + Math.random() * 900)}          วันที่ ${todayStr}
เรื่อง รายงานขอซื้อพัสดุตาม ${project} โดยวิธีเฉพาะเจาะจง

เรียน ผู้อำนวยการโรงเรียน

1. เรื่องเดิม
ด้วยกลุ่มสาระการเรียนรู้ศิลปะ ได้รับอนุมัติแผนปฏิบัติการประจำปีการศึกษา เพื่อดำเนินการจัดหาพัสดุและสื่อการเรียนการสอนใน "${project}" สำหรับใช้จัดการเรียนการสอนนักเรียนระดับชั้นมัธยมศึกษาปีที่ 1 - 6 ตามมาตรฐานการเรียนรู้ ศ 1.1 และ ศ 1.2 นั้น

2. ข้อเท็จจริงและข้อกฎหมาย
งานพัสดุได้ตรวจสอบแล้ว การจัดซื้อครั้งนี้มีวงเงินงบประมาณรวมทั้งสิ้น ${amountStr} บาท ซึ่งไม่เกินวงเงิน 500,000 บาท จึงเห็นควรดำเนินการจัดซื้อโดย "วิธีเฉพาะเจาะจง" ตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 มาตรา 55 (3) และมาตรา 56 วรรคหนึ่ง (2) (ข) ประกอบระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 22 และข้อ 79 โดยมีรายละเอียดดังนี้:
  (1) เหตุผลความจำเป็น: เพื่อใช้เป็นสื่อและอุปกรณ์ฝึกปฏิบัติทักษะทัศนศิลป์ของนักเรียน
  (2) รายละเอียดของพัสดุ: ชุดสีอะคริลิก กระดาษร้อยปอนด์ พู่กัน และขาตั้งวาดภาพไม้บีช ตามคุณลักษณะเฉพาะที่แนบ
  (3) ราคากลางและวงเงินที่จะซื้อ: เป็นเงินทั้งสิ้น ${amountStr} บาท (รวมภาษีมูลค่าเพิ่มแล้ว)
  (4) กำหนดเวลาที่ต้องการใช้พัสดุ: ส่งมอบภายใน 7 วันทำการ นับถัดจากวันลงนามในใบสั่งซื้อ
  (5) ข้อเสนอในการแต่งตั้งผู้ตรวจรับพัสดุ: เห็นควรแต่งตั้ง ${inspectRole} ตามระเบียบฯ ข้อ 22 (7)

3. ข้อเสนอเพื่อพิจารณา
จึงเรียนมาเพื่อโปรดพิจารณา
  1) ให้ความเห็นชอบรายงานขอซื้อพัสดุตามระเบียบกระทรวงการคลังฯ ข้อ 22
  2) ลงนามในคำสั่งแต่งตั้ง ${inspectRole} เพื่อดำเนินการตรวจรับพัสดุตามระเบียบต่อไป

(ลงชื่อ)....................................................... เจ้าหน้าที่พัสดุ / ครูผู้รับผิดชอบโครงการ
(ลงชื่อ)....................................................... หัวหน้าเจ้าหน้าที่พัสดุ
[ ] เห็นชอบ / อนุมัติตามเสนอ
(ลงชื่อ)....................................................... ผู้อำนวยการโรงเรียน`;
        } else if (formType === 'appoint-comm') {
            docText = `คำสั่งโรงเรียนมัธยมศึกษา
ที่ พส.${Math.floor(100 + Math.random() * 900)}/2569
เรื่อง แต่งตั้งคณะกรรมการตรวจรับพัสดุ / ผู้ตรวจรับพัสดุ สำหรับการจัดซื้อโดยวิธีเฉพาะเจาะจง

อาศัยอำนาจตามความในระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 22 (7) และข้อ 175 จึงแต่งตั้งผู้มีรายนามต่อไปนี้เป็นผู้ตรวจรับพัสดุใน "${project}" วงเงิน ${amountStr} บาท ดังนี้:

1. หัวหน้ากลุ่มสาระการเรียนรู้ศิลปะ                ประธานกรรมการ / ผู้ตรวจรับพัสดุ
2. ครูผู้สอนวิชาทัศนศิลป์                          กรรมการตรวจรับพัสดุ
3. ครูผู้รับผิดชอบงานพัสดุหมวดศิลปะ              กรรมการและเลขานุการ

ให้ผู้ที่ได้รับการแต่งตั้งปฏิบัติหน้าที่ตรวจรับพัสดุให้เป็นไปตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 175 อย่างเคร่งครัด

สั่ง ณ วันที่ ${todayStr}

(ลงชื่อ).......................................................
ผู้อำนวยการโรงเรียน`;
        } else if (formType === 'inspect-cert') {
            docText = `ใบตรวจรับพัสดุ
ตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 175
เขียนที่ ห้องปฏิบัติการศิลปะ / งานพัสดุโรงเรียน
วันที่ ${todayStr}

ตามที่โรงเรียนได้ตกลงซื้อพัสดุใน "${project}" โดยวิธีเฉพาะเจาะจง เป็นจำนวนเงินทั้งสิ้น ${amountStr} บาท นั้น

บัดนี้ คณะกรรมการตรวจรับพัสดุ / ผู้ตรวจรับพัสดุ ได้ทำการตรวจรับพัสดุดังกล่าว ณ สถานที่ส่งมอบของโรงเรียนแล้ว ปรากฏว่า:
  [✓] ผู้ขายได้ส่งมอบพัสดุครบถ้วนถูกต้องตามรายการและคุณลักษณะเฉพาะทุกประการ
  [✓] ส่งมอบภายในกำหนดเวลาตามใบสั่งซื้อ (ไม่มีค่าปรับตามระเบียบฯ ข้อ 162)
  [✓] ได้ส่งมอบพัสดุให้แก่เจ้าหน้าที่พัสดุเพื่อลงบัญชีวัสดุ / ทะเบียนคุมทรัพย์สินเรียบร้อยแล้ว

จึงพร้อมกันลงลายมือชื่อไว้เป็นหลักฐานเพื่อประกอบการเบิกจ่ายเงินต่อไป

(ลงชื่อ)....................................................... ประธานกรรมการ / ผู้ตรวจรับพัสดุ
(ลงชื่อ)....................................................... กรรมการตรวจรับพัสดุ
(ลงชื่อ)....................................................... เจ้าหน้าที่พัสดุผู้รับมอบเข้าคลัง`;
        } else if (formType === 'borrow-form') {
            docText = `ใบยืมพัสดุใช้ในราชการโรงเรียน
(ตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 207 - 209)
วันที่ ${todayStr}

ข้าพเจ้า: ครูผู้สอนกลุ่มสาระการเรียนรู้ศิลปะ          ตำแหน่ง: ครูชำนาญการ
มีความประสงค์ขอยืมครุภัณฑ์ของโรงเรียนเพื่อใช้ในราชการ: กิจกรรมการเรียนการสอนและนิทรรศการ "${project}"
รายการครุภัณฑ์ที่ขอยืม:
  1. ขาตั้งวาดภาพไม้บีชปรับระดับ (รหัส ครุภัณฑ์-ศป-69-001) จำนวน 10 ตัว
  2. เครื่องโปรเจคเตอร์เลเซอร์ (รหัส ครุภัณฑ์-อด-69-008) จำนวน 1 เครื่อง

ทั้งนี้ ข้าพเจ้าจะดูแลรักษาพัสดุที่ยืมให้อยู่ในสภาพเรียบร้อย และจะนำส่งคืนงานพัสดุภายในวันที่.................................... หากเกิดการชำรุดเสียหายหรือสูญหายโดยมิใช่การใช้งานตามปกติ ข้าพเจ้ายินดีรับผิดชอบชดใช้ตามระเบียบกระทรวงการคลังฯ ข้อ 209 ทุกประการ

(ลงชื่อ)....................................................... ผู้ยืมพัสดุ
(ลงชื่อ)....................................................... หัวหน้างานพัสดุ / ผู้จ่ายพัสดุ
(ลงชื่อ)....................................................... ผู้อำนวยการโรงเรียน (ผู้อนุมัติการยืม)`;
        } else {
            docText = `บันทึกข้อความ
ส่วนราชการ: คณะกรรมการตรวจสอบพัสดุประจำปี โรงเรียนมัธยมศึกษา
วันที่ ${todayStr}
เรื่อง รายงานผลการตรวจสอบพัสดุประจำปีงบประมาณ (ตามระเบียบกระทรวงการคลังฯ ข้อ 213 - 214)

เรียน ผู้อำนวยการโรงเรียน

ตามคำสั่งโรงเรียน เรื่อง แต่งตั้งผู้รับผิดชอบตรวจสอบพัสดุประจำปี เพื่อให้ดำเนินการตรวจนับวัสดุคงเหลือและครุภัณฑ์ของโรงเรียน (รวมถึงครุภัณฑ์กลุ่มสาระการเรียนรู้ศิลปะ โสตทัศนูปกรณ์ และอาคารสถานที่) ตั้งแต่วันทำการแรกของเดือนตุลาคม ให้แล้วเสร็จภายใน 30 วันทำการ นั้น

บัดนี้ คณะกรรมการตรวจสอบพัสดุประจำปีได้ดำเนินการตรวจนับพัสดุจริงเทียบกับทะเบียนคุมทรัพย์สินเสร็จสิ้นแล้ว สรุปผลดังนี้:
  1. การตรวจนับวัสดุคงเหลือและครุภัณฑ์ทั้งหมดตรงตามทะเบียนคุมทรัพย์สินของโรงเรียน
  2. ครุภัณฑ์ที่มีสภาพสมบูรณ์พร้อมใช้งาน จำนวน 98% ของรายการทั้งหมด
  3. ครุภัณฑ์ที่ชำรุดเสื่อมสภาพตามอายุการใช้งาน จำนวน 2 รายการ (เห็นควรดำเนินการซ่อมบำรุง หรือตั้งกรรมการจำหน่ายพัสดุตามระเบียบฯ ข้อ 215 ต่อไป)

จึงเรียนมาเพื่อโปรดทราบและพิจารณาดำเนินการตามระเบียบต่อไป

(ลงชื่อ)....................................................... ประธานกรรมการตรวจสอบพัสดุประจำปี
(ลงชื่อ)....................................................... กรรมการตรวจสอบพัสดุประจำปี`;
        }

        box.textContent = docText;
    }

    document.getElementById('btnGenGovDocNow')?.addEventListener('click', generateOfficialGovProcurementDoc);
    document.getElementById('govFormTypeSelect')?.addEventListener('change', generateOfficialGovProcurementDoc);

    document.getElementById('btnCopyGovDoc')?.addEventListener('click', () => {
        const text = document.getElementById('govDocPreviewBox')?.textContent || '';
        navigator.clipboard.writeText(text).then(() => {
            alert('📋 คัดลอกร่างหนังสือราชการงานพัสดุลงคลิปบอร์ดเรียบร้อยแล้ว!');
        });
    });

    document.getElementById('btnDownloadGovDoc')?.addEventListener('click', () => {
        const text = document.getElementById('govDocPreviewBox')?.textContent || '';
        const blob = new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `หนังสือราชการงานพัสดุโรงเรียน_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
    });

    document.getElementById('btnQuickCheckAttendance')?.addEventListener('click', () => {
        simulateStudentQrScan();
    });

    // QR Code Hub Event Listeners
    const btnModeQrAttend = document.getElementById('btnModeQrAttend');
    const btnModeQrHomework = document.getElementById('btnModeQrHomework');

    if (btnModeQrAttend && btnModeQrHomework) {
        btnModeQrAttend.addEventListener('click', () => {
            currentQrMode = 'attend';
            btnModeQrAttend.style.background = '#2563eb';
            btnModeQrAttend.style.color = '#fff';
            btnModeQrHomework.style.background = 'transparent';
            btnModeQrHomework.style.color = '#db2777';
            updateQrCodeDisplay();
        });

        btnModeQrHomework.addEventListener('click', () => {
            currentQrMode = 'homework';
            btnModeQrHomework.style.background = '#db2777';
            btnModeQrHomework.style.color = '#fff';
            btnModeQrAttend.style.background = 'transparent';
            btnModeQrAttend.style.color = '#2563eb';
            btnModeQrAttend.style.border = '1px solid #2563eb';
            updateQrCodeDisplay();
        });
    }

    document.getElementById('qrClassSelect')?.addEventListener('change', updateQrCodeDisplay);
    document.getElementById('qrSessionTopicInput')?.addEventListener('input', updateQrCodeDisplay);

    document.getElementById('btnGenerateNewQr')?.addEventListener('click', () => {
        const randNum = Math.floor(1000 + Math.random() * 9000);
        currentSessionPin = `ART-${randNum}`;
        updateQrCodeDisplay();
        speakThaiText(`สร้างรหัส QR Code ใหม่ประจำคาบเรียน รหัส ${currentSessionPin} เรียบร้อยแล้วค่ะ`);
    });

    document.getElementById('btnSimulateStudentScan')?.addEventListener('click', () => {
        simulateStudentQrScan();
    });

    document.getElementById('btnOpenDirectSubmitModal')?.addEventListener('click', () => {
        openCitizenReportModal();
    });

    document.getElementById('btnFullscreenQr')?.addEventListener('click', () => {
        const qrImg = document.getElementById('qrCodeImage');
        if (qrImg && qrImg.requestFullscreen) {
            qrImg.requestFullscreen().catch(() => {});
        } else {
            window.open(qrImg?.src, '_blank');
        }
    });

    const manualCheckinForm = document.getElementById('manualCheckinForm');
    if (manualCheckinForm) {
        manualCheckinForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const stdId = document.getElementById('stdIdInput')?.value.trim() || '69199';
            const stdName = document.getElementById('stdNameInput')?.value.trim() || 'นักเรียน ม.1';
            const stdStatus = document.getElementById('stdStatusInput')?.value || 'มาเรียน';
            const classVal = document.getElementById('qrClassSelect')?.value || 'ม.1/1';

            qrAttendanceList.unshift({
                studentId: stdId,
                name: stdName,
                classRoom: classVal,
                scanTime: new Date().toLocaleTimeString('th-TH'),
                status: stdStatus,
                homeworkStatus: 'ส่งงานแล้ว (รอตรวจ)',
                submissionId: 'art-101'
            });
            renderQrAttendanceTable();
            manualCheckinForm.reset();
            speakThaiText(`บันทึกเช็คชื่อ ${stdName} สถานะ ${stdStatus} เรียบร้อยแล้วค่ะ`);
        });
    }

    // Chat Form inside Viewer Modal
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const msg = chatInput.value.trim();
            if (!msg) return;
            const div = document.createElement('div');
            div.className = 'chat-msg';
            div.innerHTML = `<b>ครูผู้สอน:</b> ${msg}`;
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            chatInput.value = '';
        });
    }

    // 17. WebSocket Real-Time Sync
    function setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}`);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'INIT_STATE') {
                    if (data.alerts && data.alerts.length > 0) {
                        activeSubmissions = data.alerts;
                        renderIncidents();
                    }
                    if (data.assets && data.assets.length > 0) {
                        schoolAssets = data.assets;
                        renderInventoryTable();
                    }
                } else if (data.type === 'NEW_ALERT' && data.alert) {
                    const exists = activeSubmissions.some(a => a.id === data.alert.id);
                    if (!exists) {
                        activeSubmissions.unshift(data.alert);
                        renderIncidents();
                    }
                } else if (data.type === 'ASSET_UPDATED' && data.asset) {
                    const idx = schoolAssets.findIndex(a => a.id === data.asset.id);
                    if (idx >= 0) schoolAssets[idx] = data.asset;
                    else schoolAssets.unshift(data.asset);
                    renderInventoryTable();
                }
            } catch (e) {}
        };
    }

    // Init Everything
    initQrClassroomHub();
    renderInventoryTable();
    setupWebSocket();

    // PWA Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        });
    }
});
