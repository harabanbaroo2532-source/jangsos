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
    let map = null;
    let userMarker = null;
    let currentPos = { lat: 13.7563, lng: 100.5018, accuracy: 8 };
    let activeSubmissions = [];
    let schoolAssets = [];
    let markersLayer = L.layerGroup();
    let assetsMapLayer = L.layerGroup();
    let isArtPinsVisible = true;
    let isAssetPinsVisible = true;
    let isSatelliteView = false;
    let streetTileLayer = null;
    let satelliteTileLayer = null;

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

    activeSubmissions = [...defaultSubmissions];
    schoolAssets = [...defaultInventory];

    // 4. Initialize Leaflet School Campus & Portfolio Map
    function initMap() {
        map = L.map('emergencyMap', {
            center: [currentPos.lat, currentPos.lng],
            zoom: 16,
            zoomControl: true
        });

        streetTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap & EDU-CRAFT Smart School Map',
            maxZoom: 20
        }).addTo(map);

        satelliteTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri World Imagery',
            maxZoom: 19
        });

        markersLayer.addTo(map);
        assetsMapLayer.addTo(map);

        // User / Teacher Marker
        const teacherIcon = L.divIcon({
            className: 'teacher-gps-icon',
            html: `<div style="background:#2563eb; color:#fff; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; border:3px solid #fff; box-shadow:0 4px 12px rgba(37,99,235,0.5);">👩‍🏫</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });

        userMarker = L.marker([currentPos.lat, currentPos.lng], { icon: teacherIcon })
            .addTo(map)
            .bindPopup('<b>👩‍🏫 ตำแหน่งครูผู้สอน / อาคารเรียนหลัก</b><br>พร้อมรับส่งงานศิลปะและตรวจเช็คพัสดุ');

        renderIncidents();
        renderInventoryMapMarkers();
    }

    // 5. GPS Tracking
    function startGpsTracking() {
        if ('geolocation' in navigator) {
            navigator.geolocation.watchPosition(
                (pos) => {
                    currentPos = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy || 5
                    };
                    if (gpsCoordsText) {
                        gpsCoordsText.textContent = `${currentPos.lat.toFixed(4)}°N, ${currentPos.lng.toFixed(4)}°E`;
                    }
                    if (userMarker) {
                        userMarker.setLatLng([currentPos.lat, currentPos.lng]);
                    }
                },
                () => {
                    if (gpsCoordsText) {
                        gpsCoordsText.textContent = `${currentPos.lat.toFixed(4)}°N, ${currentPos.lng.toFixed(4)}°E (พิกัดโรงเรียน)`;
                    }
                },
                { enableHighAccuracy: true, maximumAge: 10000 }
            );
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
        markersLayer.clearLayers();

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
                            <span>📍 ${item.locationName || item.address || 'อาคารศิลปะ'}</span>
                            <span style="color:#2563eb; font-weight:700;">คลิกดูรูป/ให้คะแนน &rarr;</span>
                        </div>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                map.flyTo([item.lat, item.lng], 17, { duration: 0.8 });
                openStreamViewer(item);
            });

            incidentsList.appendChild(card);

            // Add Marker to Map if enabled
            if (isArtPinsVisible) {
                const pinIcon = L.divIcon({
                    className: 'art-pin-marker',
                    html: `<div style="background:${meta.color}; color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:17px; border:2px solid #fff; box-shadow:0 3px 10px rgba(0,0,0,0.25);">${meta.emoji}</div>`,
                    iconSize: [34, 34],
                    iconAnchor: [17, 17]
                });

                const marker = L.marker([item.lat, item.lng], { icon: pinIcon });
                marker.on('click', () => openStreamViewer(item));
                markersLayer.addLayer(marker);
            }
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
        if (!assetsMapLayer) return;
        assetsMapLayer.clearLayers();
        if (!isAssetPinsVisible) return;

        schoolAssets.forEach(asset => {
            const lat = asset.lat || (currentPos.lat + (Math.random() - 0.5) * 0.003);
            const lng = asset.lng || (currentPos.lng + (Math.random() - 0.5) * 0.003);

            const assetIcon = L.divIcon({
                className: 'school-asset-marker',
                html: `<div style="background:#ffffff; color:#b45309; border:2px solid #d97706; border-radius:8px; padding:2px 6px; font-size:11px; font-weight:800; white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,0.18);">📦 ${asset.availableQty}/${asset.totalQty}</div>`,
                iconSize: [68, 24],
                iconAnchor: [34, 12]
            });

            const m = L.marker([lat, lng], { icon: assetIcon });
            m.bindPopup(`
                <div style="font-family:'Sarabun',sans-serif; min-width:210px;">
                    <div style="font-size:11px; font-weight:700; color:#d97706;">📦 ทะเบียนคุมพัสดุ: ${asset.code}</div>
                    <div style="font-size:13px; font-weight:800; color:#0f172a; margin:4px 0;">${asset.name}</div>
                    <div style="font-size:12px; color:#334155;">📍 ห้องเก็บ: ${asset.room}</div>
                    <div style="font-size:12px; color:#059669; font-weight:700; margin-top:4px;">คงเหลือพร้อมใช้: ${asset.availableQty} / ${asset.totalQty} ${asset.unit || 'ชิ้น'}</div>
                </div>
            `);
            assetsMapLayer.addLayer(m);
        });
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
            id: 'pin-' + Date.now(),
            title,
            studentName,
            grade,
            category,
            status: 'pending',
            score: category === 'asset-check' ? 'ตรวจเช็คพัสดุแล้ว' : 'รอครูตรวจให้คะแนน',
            lat: coords.lat,
            lng: coords.lng,
            locationName: `พิกัดโรงเรียน (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
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
        renderIncidents();
        citizenReportModal.classList.add('hidden');
        citizenReportForm.reset();
        mediaPreviewWrapper.style.display = 'none';
        currentReportMedia = null;

        if (startLive) {
            startCameraBroadcast();
        } else {
            speakThaiText(`บันทึกปักหมุด ${title} บนแผนที่เรียบร้อยแล้วค่ะ`);
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

    // 13. Export CSV Reports (ปพ.5 คะแนนผลงานศิลปะ + ทะเบียนคุมพัสดุโรงเรียน)
    function exportSchoolCsvReport() {
        let csv = '\uFEFF=== ส่วนที่ 1: รายงานคะแนนผลงานศิลปะและการส่งงานนักเรียน (ปพ.5) ===\n';
        csv += 'รหัสรายการ,ชื่อผลงาน/กิจกรรม,ชื่อนักเรียน/ผู้รับผิดชอบ,ระดับชั้น,หมวดหมู่,ผลการประเมิน/คะแนน,พิกัดละติจูด,พิกัดลองจิจูด\n';
        activeSubmissions.forEach(s => {
            csv += `"${s.id}","${s.title}","${s.studentName || ''}","${s.grade || ''}","${s.category}","${s.score || ''}",${s.lat},${s.lng}\n`;
        });

        csv += '\n=== ส่วนที่ 2: ทะเบียนคุมทรัพย์สิน พัสดุ และครุภัณฑ์โรงเรียน (หมวดศิลปะและอาคารเรียน) ===\n';
        csv += 'รหัสพัสดุ,ชื่อรายการวัสดุ/ครุภัณฑ์,หมวดหมู่,สถานที่จัดเก็บ,จำนวนทั้งหมด,คงเหลือพร้อมใช้,จำนวนถูกยืม,ราคาต่อหน่วย(บาท),มูลค่ารวม(บาท),สถานะล่าสุด\n';
        schoolAssets.forEach(a => {
            const totalVal = Number(a.totalQty) * Number(a.pricePerUnit);
            csv += `"${a.code}","${a.name}","${a.category}","${a.room}",${a.totalQty},${a.availableQty},${a.borrowedQty},${a.pricePerUnit},${totalVal},"${a.borrower || a.status}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `รายงานผลการเรียนศิลปะ_และทะเบียนพัสดุโรงเรียน_${new Date().toISOString().slice(0, 10)}.csv`;
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

    document.getElementById('btnQuickCheckAttendance')?.addEventListener('click', () => {
        const countEl = document.getElementById('tacAttendanceCount');
        if (countEl) countEl.textContent = '100%';
        speakThaiText('เช็คชื่อนักเรียนชั้นมัธยมศึกษาเข้าเรียนวิชาศิลปะครบ 100 เปอร์เซ็นต์เรียบร้อยแล้วค่ะ');
        alert('✅ เช็คชื่อนักเรียนเข้าเรียนวิชาศิลปะ และพร้อมเบิกอุปกรณ์การเรียนครบ 100% เรียบร้อยแล้ว!');
    });

    // Map Floating Controls
    document.getElementById('btnCenterUser')?.addEventListener('click', () => {
        map.flyTo([currentPos.lat, currentPos.lng], 17, { duration: 0.8 });
    });

    const btnToggleArtPins = document.getElementById('btnToggleArtPins');
    if (btnToggleArtPins) {
        btnToggleArtPins.addEventListener('click', () => {
            isArtPinsVisible = !isArtPinsVisible;
            btnToggleArtPins.textContent = isArtPinsVisible ? '🎨 หมุดผลงานศิลปะ (เปิด)' : '🎨 หมุดผลงานศิลปะ (ปิด)';
            btnToggleArtPins.classList.toggle('active-layer', isArtPinsVisible);
            renderIncidents();
        });
    }

    const btnToggleAssetPins = document.getElementById('btnToggleAssetPins');
    if (btnToggleAssetPins) {
        btnToggleAssetPins.addEventListener('click', () => {
            isAssetPinsVisible = !isAssetPinsVisible;
            btnToggleAssetPins.textContent = isAssetPinsVisible ? '📦 จุดตรวจพัสดุ/อาคารเรียน (เปิด)' : '📦 จุดตรวจพัสดุ/อาคารเรียน (ปิด)';
            btnToggleAssetPins.classList.toggle('active-layer', isAssetPinsVisible);
            renderInventoryMapMarkers();
        });
    }

    const btnToggleTraffic = document.getElementById('btnToggleTraffic');
    if (btnToggleTraffic) {
        btnToggleTraffic.addEventListener('click', () => {
            isSatelliteView = !isSatelliteView;
            if (isSatelliteView) {
                map.removeLayer(streetTileLayer);
                satelliteTileLayer.addTo(map);
                btnToggleTraffic.classList.add('active-layer');
            } else {
                map.removeLayer(satelliteTileLayer);
                streetTileLayer.addTo(map);
                btnToggleTraffic.classList.remove('active-layer');
            }
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

    // 17. WebSocket Real-Time Sync + Map Pin Picker
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
                        renderInventoryMapMarkers();
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
                    renderInventoryMapMarkers();
                }
            } catch (e) {}
        };
    }

    // Init Everything
    initMap();
    startGpsTracking();
    renderInventoryTable();
    setupWebSocket();

    // Map Click for Pin Picker
    if (map) {
        map.on('click', (e) => {
            if (isPickingPinOnMap) {
                selectedPinCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
                isPickingPinOnMap = false;

                if (tempPinMarker) map.removeLayer(tempPinMarker);
                const tempIcon = L.divIcon({
                    className: 'user-pin-picker',
                    html: `<div style="background:#db2777; color:#fff; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:18px; border:2px solid #fff; box-shadow:0 0 12px rgba(219,39,119,0.6);">📍</div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });
                tempPinMarker = L.marker([selectedPinCoords.lat, selectedPinCoords.lng], { icon: tempIcon }).addTo(map);
                openCitizenReportModal();
            }
        });
    }

    // PWA Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        });
    }
});
