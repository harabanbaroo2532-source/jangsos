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

    // 3. Initial State (Zero Sample Data - Clean Minimal Start)
    const defaultSubmissions = [];
    const defaultInventory = [];
    const defaultQrRoster = [];

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
            setTimeout(() => openCitizenReportModal(), 300);
        } else if (params.get('action') === 'checkin') {
            setTimeout(() => {
                document.getElementById('stdIdInput')?.focus();
            }, 300);
        }
    }

    function updateQrCodeDisplay() {
        const classVal = document.getElementById('qrClassSelect')?.value.trim() || 'ยังไม่ระบุห้อง';
        const subjVal = document.getElementById('qrSubjectCustomInput')?.value.trim() || 'ยังไม่ระบุวิชา';
        const topicVal = document.getElementById('qrSessionTopicInput')?.value.trim() || 'ครูสามารถพิมพ์หัวข้อคาบเรียนหรือรายละเอียดงานที่ช่องด้านบน';
        const customPinEl = document.getElementById('qrPinCustomInput');
        if (customPinEl && customPinEl.value.trim()) {
            currentSessionPin = customPinEl.value.trim();
        }

        const qrImg = document.getElementById('qrCodeImage');
        const qrClassTitle = document.getElementById('qrDisplayClassTitle');
        const qrTopicTitle = document.getElementById('qrDisplayTopicTitle');
        const qrModeBadge = document.getElementById('qrModeBadge');

        if (qrClassTitle) qrClassTitle.textContent = `${classVal} • ${subjVal}`;
        if (qrTopicTitle) qrTopicTitle.textContent = topicVal;
        if (gpsCoordsText) gpsCoordsText.textContent = `${currentSessionPin} (${classVal})`;

        if (qrModeBadge) {
            if (currentQrMode === 'attend') {
                qrModeBadge.textContent = 'สแกนเช็คชื่อเข้าเรียน';
                qrModeBadge.style.background = '#f1f5f9';
                qrModeBadge.style.color = '#334155';
            } else {
                qrModeBadge.textContent = 'สแกนส่งงาน / การบ้าน';
                qrModeBadge.style.background = '#f1f5f9';
                qrModeBadge.style.color = '#0f172a';
            }
        }

        const baseOrigin = window.location.origin.includes('localhost')
            ? 'https://jangsos.onrender.com'
            : window.location.origin;
        const actionType = currentQrMode === 'attend' ? 'checkin' : 'homework';
        const qrDataUrl = `${baseOrigin}/?action=${actionType}&pin=${encodeURIComponent(currentSessionPin)}&class=${encodeURIComponent(classVal)}`;

        if (qrImg) {
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDataUrl)}`;
        }
    }

    function renderQrAttendanceTable() {
        const tbody = document.getElementById('qrAttendanceTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        let presentCount = 0;
        let submittedCount = 0;

        if (qrAttendanceList.length === 0) {
            const emptyTr = document.createElement('tr');
            emptyTr.innerHTML = `<td colspan="6" style="padding:36px 16px; text-align:center; color:#94a3b8; font-size:12.5px;">ยังไม่มีรายชื่อนักเรียนเช็คชื่อในคาบเรียนนี้</td>`;
            tbody.appendChild(emptyTr);
        }

        qrAttendanceList.forEach((st, index) => {
            if (st.status === 'มาเรียน' || st.status === 'มาสาย') presentCount++;
            if (st.homeworkStatus && st.homeworkStatus.includes('ส่งงานแล้ว')) submittedCount++;

            const statusBadge = st.status === 'มาเรียน'
                ? `<span style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:2px 8px; border-radius:4px; font-weight:500; font-size:11px;">มาเรียน</span>`
                : st.status === 'มาสาย'
                ? `<span style="background:#fffbeb; color:#b45309; border:1px solid #fde68a; padding:2px 8px; border-radius:4px; font-weight:500; font-size:11px;">มาสาย</span>`
                : `<span style="background:#f8fafc; color:#475569; border:1px solid #e2e8f0; padding:2px 8px; border-radius:4px; font-weight:500; font-size:11px;">${st.status}</span>`;

            const hwColor = st.homeworkStatus.includes('ส่งงานแล้ว') ? '#0f172a' : '#64748b';

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f1f5f9';
            tr.innerHTML = `
                <td style="padding:8px 10px; font-family:monospace; font-weight:600; color:#334155;">${st.studentId}</td>
                <td style="padding:8px 10px; font-weight:500; color:#0f172a;">${st.name} <span style="font-size:11px; color:#64748b;">(${st.classRoom})</span></td>
                <td style="padding:8px 10px; font-family:monospace; color:#64748b;">${st.scanTime}</td>
                <td style="padding:8px 10px;">${statusBadge}</td>
                <td style="padding:8px 10px; font-weight:500; color:${hwColor};">${st.homeworkStatus}</td>
                <td style="padding:8px 10px; text-align:center;">
                    <button type="button" class="btn-view-student-work" data-idx="${index}" style="background:#ffffff; color:#334155; border:1px solid #cbd5e1; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:500; cursor:pointer;">
                        ดูข้อมูล
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
        if (tacAttendEl) tacAttendEl.textContent = `${presentCount} คน`;

        tbody.querySelectorAll('.btn-view-student-work').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.dataset.idx);
                const st = qrAttendanceList[idx];
                const foundWork = activeSubmissions.find(s => s.id === st.submissionId);
                if (foundWork) {
                    openStreamViewer(foundWork);
                } else {
                    openCitizenReportModal();
                }
            });
        });
    }

    // 6. Render Student Art Submissions & Asset Records
    let currentFilter = 'all';

    function getCategoryMeta(cat) {
        switch (cat) {
            case 'art-work':
                return { label: 'งานทัศนศิลป์', color: '#334155', bg: '#f8fafc' };
            case 'field-project':
                return { label: 'โครงงานศิลปะ', color: '#475569', bg: '#f8fafc' };
            case 'asset-check':
                return { label: 'ตรวจพัสดุ', color: '#64748b', bg: '#f8fafc' };
            default:
                return { label: 'ผลงานนักเรียน', color: '#334155', bg: '#f8fafc' };
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

        if (filtered.length === 0) {
            incidentsList.innerHTML = `<div style="padding:36px 16px; text-align:center; color:#94a3b8; font-size:12.5px; border:1px dashed #e2e8f0; border-radius:8px;">ยังไม่มีรายการส่งงาน</div>`;
            return;
        }

        filtered.forEach(item => {
            const meta = getCategoryMeta(item.category);
            const card = document.createElement('div');
            card.className = 'incident-card card-glass';
            card.style.cssText = `padding:10px 12px; border:1px solid #e2e8f0; cursor:pointer; background:#ffffff; border-radius:8px;`;

            const mediaBadge = item.mediaType === 'video'
                ? `<span style="background:#f1f5f9; color:#334155; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600;">วิดีโอ</span>`
                : `<span style="background:#f1f5f9; color:#334155; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600;">${meta.label}</span>`;

            const thumbHtml = item.mediaUrl && item.mediaType === 'photo'
                ? `<img src="${item.mediaUrl}" alt="thumb" style="width:48px; height:48px; object-fit:cover; border-radius:6px; border:1px solid #e2e8f0; flex-shrink:0;">`
                : `<div style="width:48px; height:48px; border-radius:6px; background:#f8fafc; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; color:#64748b; flex-shrink:0;">รูปงาน</div>`;

            card.innerHTML = `
                <div style="display:flex; gap:10px; align-items:flex-start;">
                    ${thumbHtml}
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:4px; margin-bottom:3px;">
                            ${mediaBadge}
                            <span style="font-size:10px; font-weight:500; color:#475569; background:#f8fafc; padding:1px 6px; border-radius:4px; border:1px solid #e2e8f0;">${item.score || 'รอตรวจ'}</span>
                        </div>
                        <h4 style="font-size:12.5px; font-weight:600; color:#0f172a; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</h4>
                        <p style="font-size:11px; color:#64748b; margin-bottom:2px;">${item.studentName || item.reporter || 'นักเรียน'} • ${item.grade || 'ม.1'}</p>
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

    // 7. Render School Inventory & Art Department Assets
    function renderInventoryTable() {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        let totalAvail = 0;
        let totalBorrowed = 0;
        let totalValue = 0;

        if (schoolAssets.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="6" style="padding:32px 16px; text-align:center; color:#94a3b8; font-size:12.5px;">ยังไม่มีรายการพัสดุในทะเบียน (สามารถเพิ่มรายการใหม่ได้จากฟอร์มด้านบน)</td>`;
            tbody.appendChild(emptyRow);
        }

        schoolAssets.forEach((asset, idx) => {
            totalAvail += Number(asset.availableQty || 0);
            totalBorrowed += Number(asset.borrowedQty || 0);
            totalValue += Number(asset.totalQty || 0) * Number(asset.pricePerUnit || 0);

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f1f5f9';
            const badgeColor = asset.availableQty <= 5 ? '#dc2626' : '#0f172a';

            tr.innerHTML = `
                <td style="padding:10px; font-family:monospace; font-weight:600; color:#334155;">${asset.code}</td>
                <td style="padding:10px;">
                    <div style="font-weight:600; color:#0f172a;">${asset.name}</div>
                    <div style="font-size:11px; color:#64748b;">หมวด: ${asset.category} • ฿${Number(asset.pricePerUnit).toLocaleString()}/${asset.unit || 'ชิ้น'}</div>
                </td>
                <td style="padding:10px; color:#475569;">${asset.room}</td>
                <td style="padding:10px; text-align:center;">
                    <span style="font-weight:600; font-size:13px; color:${badgeColor};">${asset.availableQty}</span> / ${asset.totalQty} ${asset.unit || 'ชิ้น'}
                </td>
                <td style="padding:10px;">
                    <span style="font-size:11px; color:#64748b;">${asset.borrower || asset.status}</span>
                </td>
                <td style="padding:10px; text-align:center;">
                    <div style="display:flex; gap:4px; justify-content:center;">
                        <button type="button" class="btn-borrow-item" data-idx="${idx}" style="background:#ffffff; color:#334155; border:1px solid #cbd5e1; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:500;">เบิก (-1)</button>
                        <button type="button" class="btn-return-item" data-idx="${idx}" style="background:#0f172a; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:500;">คืน (+1)</button>
                        <button type="button" class="btn-delete-item" data-idx="${idx}" style="background:#ffffff; color:#dc2626; border:1px solid #fecaca; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:500;">ลบ</button>
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
        if (tacBudgetVal) tacBudgetVal.textContent = `฿${totalValue.toLocaleString()}`;

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
                }
            });
        });

        tbody.querySelectorAll('.btn-delete-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = Number(btn.dataset.idx);
                schoolAssets.splice(i, 1);
                renderInventoryTable();
            });
        });
    }

    function renderInventoryMapMarkers() {
        // Map removed; inventory is managed directly via the School Inventory & Asset Table
    }

    // Add New Asset Form Handler (Teacher Custom Fields)
    const addAssetForm = document.getElementById('addAssetForm');
    if (addAssetForm) {
        addAssetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const code = document.getElementById('assetCodeInput').value.trim();
            const name = document.getElementById('assetNameInput').value.trim();
            const category = document.getElementById('assetCatInput').value.trim() || 'ทั่วไป';
            const room = document.getElementById('assetRoomInput')?.value.trim() || 'ห้องพัสดุโรงเรียน';
            const qty = Number(document.getElementById('assetQtyInput').value) || 1;
            const unit = document.getElementById('assetUnitInput')?.value.trim() || 'ชิ้น';
            const price = Number(document.getElementById('assetPriceInput').value) || 0;

            const newAsset = {
                id: 'INV-' + Date.now(),
                code,
                name,
                category,
                room,
                totalQty: qty,
                availableQty: qty,
                borrowedQty: 0,
                unit,
                pricePerUnit: price,
                status: 'พร้อมใช้งาน',
                borrower: 'ครูบันทึกเข้าระบบ',
                lat: currentPos.lat,
                lng: currentPos.lng
            };

            schoolAssets.unshift(newAsset);
            renderInventoryTable();
            addAssetForm.reset();
        });
    }

    // 8. Teacher Custom Document & Lesson Plan Editor (ม.1 - ม.6)
    const btnGenerateAiContent = document.getElementById('btnGenerateAiContent');
    const btnClearAiDoc = document.getElementById('btnClearAiDoc');
    const aiOutputContainer = document.getElementById('aiOutputContainer');

    function generateTeacherAiContent() {
        const subjectEl = document.getElementById('aiSubjectSelect');
        const gradeEl = document.getElementById('aiGradeSelect');
        const docTypeEl = document.getElementById('aiDocTypeSelect');
        const topicEl = document.getElementById('aiTopicInput');

        const subjectName = (subjectEl && subjectEl.value.trim()) ? subjectEl.value.trim() : '[ระบุชื่อรายวิชา]';
        const grade = (gradeEl && gradeEl.value.trim()) ? gradeEl.value.trim() : '[ระบุระดับชั้น]';
        const docType = docTypeEl ? docTypeEl.value : 'custom-blank';
        const topic = (topicEl && topicEl.value.trim()) ? topicEl.value.trim() : '[ระบุหัวข้อเรื่อง / ชิ้นงาน]';

        let html = '';

        if (docType === 'custom-blank') {
            html = `
                <div style="border-bottom:1px solid #cbd5e1; padding-bottom:8px; margin-bottom:12px;">
                    <h3 style="color:#0f172a; margin:0; font-size:15px;">เอกสารการเรียนการสอน / ใบสั่งงาน</h3>
                    <p style="margin:4px 0 0 0; font-size:12px; color:#475569;"><b>รายวิชา:</b> ${subjectName} | <b>ระดับชั้น:</b> ${grade} | <b>เรื่อง:</b> ${topic}</p>
                </div>
                <p><b>1. จุดประสงค์ / เป้าหมายของงาน:</b><br>
                - (คลิกพิมพ์รายละเอียดที่ครูต้องการ...)</p>
                <p><b>2. คำชี้แจงและรายละเอียดงานที่ให้นักเรียนปฏิบัติ:</b><br>
                - (คลิกพิมพ์ขั้นตอนการทำชิ้นงาน หรือโจทย์ที่ครูมอบหมาย...)</p>
                <p><b>3. กำหนดการส่งงานและเกณฑ์การให้คะแนน:</b><br>
                - คะแนนเต็ม: ...... คะแนน | กำหนดส่ง: ....................</p>
            `;
        } else if (docType === 'lesson-plan') {
            html = `
                <div style="border-bottom:1px solid #cbd5e1; padding-bottom:8px; margin-bottom:12px;">
                    <h3 style="color:#0f172a; margin:0; font-size:15px;">แผนการจัดการเรียนรู้</h3>
                    <p style="margin:4px 0 0 0; font-size:12px; color:#475569;"><b>รายวิชา:</b> ${subjectName} | <b>ระดับชั้น:</b> ${grade} | <b>หน่วยการเรียนรู้/เรื่อง:</b> ${topic} | <b>เวลา:</b> .... ชั่วโมง</p>
                </div>
                <p><b>1. มาตรฐานการเรียนรู้ / ตัวชี้วัด:</b><br>
                • (ระบุรหัสตัวชี้วัดและรายละเอียด...)</p>

                <p><b>2. จุดประสงค์การเรียนรู้ (K-P-A):</b><br>
                • <b>ด้านความรู้ (K):</b> อธิบายหลักการของ ${topic} ได้<br>
                • <b>ด้านทักษะกระบวนการ (P):</b> ปฏิบัติงานสร้างสรรค์เรื่อง ${topic} ได้ตามเกณฑ์<br>
                • <b>ด้านคุณลักษณะ (A):</b> มีวินัย รับผิดชอบ และส่งงานตรงเวลา</p>

                <p><b>3. กิจกรรมการเรียนรู้:</b><br>
                • <b>ขั้นนำเข้าสู่บทเรียน:</b> (ระบุกิจกรรมนำเข้าสู่บทเรียน...)<br>
                • <b>ขั้นสอนและฝึกปฏิบัติ:</b> (ระบุขั้นตอนการสอนและการมอบหมายงาน...)<br>
                • <b>ขั้นสรุปและประเมินผล:</b> (ระบุการตรวจผลงานและสรุปบทเรียน...)</p>

                <p><b>4. สื่อการเรียนการสอน / วัสดุอุปกรณ์:</b><br>
                • (ระบุสื่อและอุปกรณ์ที่ใช้ในคาบเรียน...)</p>
            `;
        } else if (docType === 'quiz') {
            html = `
                <div style="border-bottom:1px solid #cbd5e1; padding-bottom:8px; margin-bottom:12px;">
                    <h3 style="color:#0f172a; margin:0; font-size:15px;">แบบทดสอบรายวิชา ${subjectName} (${grade})</h3>
                    <p style="margin:4px 0 0 0; font-size:12px; color:#475569;">เรื่อง: ${topic}</p>
                </div>
                <p><b>ข้อที่ 1:</b> (พิมพ์โจทย์คำถามข้อที่ 1...)<br>
                ก. ตัวเลือกที่ 1<br>
                ข. ตัวเลือกที่ 2<br>
                ค. ตัวเลือกที่ 3<br>
                ง. ตัวเลือกที่ 4<br>
                <b>เฉลย:</b> ...</p>
                <p><b>ข้อที่ 2:</b> (พิมพ์โจทย์คำถามข้อที่ 2...)<br>
                ก. ตัวเลือกที่ 1<br>
                ข. ตัวเลือกที่ 2<br>
                ค. ตัวเลือกที่ 3<br>
                ง. ตัวเลือกที่ 4<br>
                <b>เฉลย:</b> ...</p>
            `;
        } else if (docType === 'worksheet') {
            html = `
                <div style="border-bottom:1px solid #cbd5e1; padding-bottom:8px; margin-bottom:12px;">
                    <h3 style="color:#0f172a; margin:0; font-size:15px;">ใบงานและเกณฑ์การประเมินผลงาน (Rubric)</h3>
                    <p style="margin:4px 0 0 0; font-size:12px; color:#475569;"><b>รายวิชา:</b> ${subjectName} | <b>ระดับชั้น:</b> ${grade} | <b>เรื่อง:</b> ${topic}</p>
                </div>
                <p><b>คำชี้แจงสำหรับนักเรียน:</b><br>
                1. ให้นักเรียนปฏิบัติงานในหัวข้อ "${topic}" ตามรายละเอียดที่ครูกำหนด<br>
                2. เมื่อเสร็จแล้วให้สแกน QR Code เพื่อส่งภาพถ่ายผลงานพร้อมระบุชื่อและรหัสประจำตัว</p>
                <p><b>เกณฑ์การให้คะแนน (ปรับแก้คะแนนได้เอง):</b><br>
                - ความถูกต้องตามหัวข้อและเทคนิค: ..... คะแนน<br>
                - ความคิดสร้างสรรค์และความประณีต: ..... คะแนน<br>
                - ความรับผิดชอบและการส่งงานตรงเวลา: ..... คะแนน<br>
                <b>รวมคะแนนเต็ม:</b> ..... คะแนน</p>
            `;
        } else {
            html = `
                <div style="border-bottom:1px solid #cbd5e1; padding-bottom:8px; margin-bottom:12px;">
                    <h3 style="color:#0f172a; margin:0; font-size:15px;">ใบเบิกวัสดุ-ครุภัณฑ์ประกอบการสอน</h3>
                    <p style="margin:4px 0 0 0; font-size:12px; color:#475569;"><b>รายวิชา:</b> ${subjectName} | <b>ระดับชั้น:</b> ${grade} | <b>เรื่อง:</b> ${topic}</p>
                </div>
                <p><b>รายการวัสดุและครุภัณฑ์ที่ต้องการเบิกใช้ (คลิกแก้ไขรายการได้):</b><br>
                1. รหัสพัสดุ ............... รายการ ........................................... จำนวน ........ หน่วย<br>
                2. รหัสพัสดุ ............... รายการ ........................................... จำนวน ........ หน่วย<br>
                3. รหัสพัสดุ ............... รายการ ........................................... จำนวน ........ หน่วย</p>
                <p>ลงชื่อ ................................................. ครูผู้ขอเบิก</p>
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

    if (btnClearAiDoc && aiOutputContainer) {
        btnClearAiDoc.addEventListener('click', () => {
            aiOutputContainer.innerHTML = '<p>พิมพ์รายละเอียดเอกสารของครูที่นี่...</p>';
            aiOutputContainer.focus();
        });
    }

    // Set initial editable blank template on load
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

    // 11. Open Viewer & Teacher Grading / Editing Modal
    function openStreamViewer(item) {
        selectedSubmissionForGrading = item;
        streamViewerModal.classList.remove('hidden');

        document.getElementById('viewerStreamTitle').textContent = item.title;
        document.getElementById('viewerAddressText').textContent = `${item.locationName || item.address || 'ห้องเรียนศิลปะ'}`;
        document.getElementById('viewerCountBadge').textContent = `เข้าชม ${item.viewers || 1} ครั้ง`;
        const meta = getCategoryMeta(item.category);
        document.getElementById('viewerCategoryBadge').textContent = meta.label;

        const editTitleEl = document.getElementById('viewerEditTitleInput');
        const editDescEl = document.getElementById('viewerEditDescInput');
        const gradeSelectEl = document.getElementById('teacherGradeSelect');

        if (editTitleEl) editTitleEl.value = item.title || '';
        if (editDescEl) editDescEl.value = item.description || '';
        if (gradeSelectEl) gradeSelectEl.value = item.score || '';

        const viewerDescText = document.getElementById('viewerDescText');
        if (viewerDescText) {
            viewerDescText.innerHTML = `
                <b>ผู้ส่งงาน / ผู้รับผิดชอบ:</b> ${item.studentName || item.reporter || 'นักเรียน'} (${item.grade || '-'})<br>
                <b>รายละเอียด:</b> ${item.description || '-'}<br>
                <span style="color:#0f172a; font-weight:600;">ผลการประเมิน / สถานะ: ${item.score || 'รอตรวจให้คะแนน'}</span>
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

    // Save Teacher Custom Details & Grade Button
    document.getElementById('btnSaveStudentGrade')?.addEventListener('click', () => {
        if (!selectedSubmissionForGrading) return;
        const newTitle = document.getElementById('viewerEditTitleInput')?.value.trim();
        const newDesc = document.getElementById('viewerEditDescInput')?.value.trim();
        const gradeVal = document.getElementById('teacherGradeSelect')?.value.trim() || 'ตรวจแล้ว';

        if (newTitle) selectedSubmissionForGrading.title = newTitle;
        if (newDesc !== undefined) selectedSubmissionForGrading.description = newDesc;
        selectedSubmissionForGrading.score = gradeVal;
        selectedSubmissionForGrading.status = 'graded';

        fetch(`/api/alerts/${selectedSubmissionForGrading.id}/grade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: gradeVal, status: 'graded' })
        }).catch(() => {});

        renderIncidents();
        renderQrAttendanceTable();
        openStreamViewer(selectedSubmissionForGrading);
    });

    // Delete Submission Button
    document.getElementById('btnDeleteSubmission')?.addEventListener('click', () => {
        if (!selectedSubmissionForGrading) return;
        activeSubmissions = activeSubmissions.filter(s => s.id !== selectedSubmissionForGrading.id);
        streamViewerModal.classList.add('hidden');
        renderIncidents();
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
            btn.style.border = '1px solid #0f172a';
            btn.style.background = '#0f172a';
            btn.style.color = '#ffffff';

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

    // Official Government Procurement Document Generator (Editable by Teacher)
    function generateOfficialGovProcurementDoc() {
        const formType = document.getElementById('govFormTypeSelect')?.value || 'memo-buy';
        const project = document.getElementById('govFormProjectInput')?.value.trim() || '[ระบุชื่อโครงการ / รายการพัสดุ]';
        const amount = Number(document.getElementById('govFormAmountInput')?.value || 0);
        const box = document.getElementById('govDocPreviewBox');
        if (!box) return;

        const todayStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        const amountStr = amount > 0 ? amount.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '....................';
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
    document.getElementById('btnClearGovDoc')?.addEventListener('click', () => {
        const box = document.getElementById('govDocPreviewBox');
        if (box) {
            box.textContent = 'คลิกพิมพ์รายละเอียดหนังสือราชการของครูที่นี่...';
            box.focus();
        }
    });

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

    // QR Code Hub Event Listeners
    const btnModeQrAttend = document.getElementById('btnModeQrAttend');
    const btnModeQrHomework = document.getElementById('btnModeQrHomework');

    if (btnModeQrAttend && btnModeQrHomework) {
        btnModeQrAttend.addEventListener('click', () => {
            currentQrMode = 'attend';
            btnModeQrAttend.className = 'btn btn-primary btn-sm';
            btnModeQrHomework.className = 'btn btn-secondary btn-sm';
            updateQrCodeDisplay();
        });

        btnModeQrHomework.addEventListener('click', () => {
            currentQrMode = 'homework';
            btnModeQrHomework.className = 'btn btn-primary btn-sm';
            btnModeQrAttend.className = 'btn btn-secondary btn-sm';
            updateQrCodeDisplay();
        });
    }

    document.getElementById('qrClassSelect')?.addEventListener('input', updateQrCodeDisplay);
    document.getElementById('qrSubjectCustomInput')?.addEventListener('input', updateQrCodeDisplay);
    document.getElementById('qrSessionTopicInput')?.addEventListener('input', updateQrCodeDisplay);
    document.getElementById('qrPinCustomInput')?.addEventListener('input', updateQrCodeDisplay);

    document.getElementById('btnGenerateNewQr')?.addEventListener('click', () => {
        const randNum = Math.floor(1000 + Math.random() * 9000);
        currentSessionPin = `ART-${randNum}`;
        updateQrCodeDisplay();
    });

    document.getElementById('btnClearRoster')?.addEventListener('click', () => {
        qrAttendanceList = [];
        renderQrAttendanceTable();
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
            const stdId = document.getElementById('stdIdInput')?.value.trim() || '-';
            const stdName = document.getElementById('stdNameInput')?.value.trim() || '-';
            const stdStatus = document.getElementById('stdStatusInput')?.value || 'มาเรียน';
            const classVal = document.getElementById('qrClassSelect')?.value || 'ม.1/1';

            qrAttendanceList.unshift({
                studentId: stdId,
                name: stdName,
                classRoom: classVal,
                scanTime: new Date().toLocaleTimeString('th-TH'),
                status: stdStatus,
                homeworkStatus: 'ยังไม่ส่งงาน',
                submissionId: null
            });
            renderQrAttendanceTable();
            manualCheckinForm.reset();
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
