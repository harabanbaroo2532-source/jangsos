/**
 * GUARDIAN LIVE - Core Application Engine
 * Handles Leaflet Maps, Geolocation Tracking, Camera Live Stream HUD, Web Audio Siren Synthesizer & WebSocket Realtime Broadcasts.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. App State & DOM Variables
    let map = null;
    let userMarker = null;
    let userAccuracyCircle = null;
    let currentPos = { lat: 13.7563, lng: 100.5018, accuracy: 10, speed: 0 }; // Default Bangkok center
    let activeAlerts = [];
    let alertMarkers = new Map();
    let selectedCategory = 'all';

    // Camera & Media Streams State
    let mediaStream = null;
    let mediaRecorder = null;
    let isBroadcasting = false;
    let facingMode = 'environment'; // 'user' or 'environment'
    let isTorchOn = false;
    let isMicMuted = false;
    let hudTimer = null;

    // Flood & Sea Level Stations Dataset
    let waterLayerGroup = null;
    let isWaterLayerVisible = true;

    const waterStationsData = [
        {
            id: 'water-st-1',
            name: '🌊 สถานีปากน้ำ แม่น้ำเจ้าพระยา (สมุทรปราการ)',
            type: 'sea',
            levelVal: '1.85m MSL',
            trendText: '⬆️ น้ำหนุนสูงสุด',
            status: 'danger', // danger, warning, normal
            lat: 13.5992,
            lng: 100.5967,
            detail: 'ระดับน้ำทะเลหนุนสูง 1.85 เมตร จากระดับน้ำทะเลปานกลาง เฝ้าระวังน้ำทะลักคันกั้นน้ำ'
        },
        {
            id: 'water-st-2',
            name: '🌊 จุดวัดระดับน้ำ คลองแสนแสบ (วิทยุ)',
            type: 'canal',
            levelVal: '45 cm',
            trendText: '⬆️ เพิ่มขึ้น 5cm',
            status: 'warning',
            lat: 13.7478,
            lng: 100.5482,
            detail: 'ระดับน้ำในคลองขยับสูงขึ้นเนื่องจากฝนตกหนัก ระดับการสูบน้ำเปิดเต็มกำลัง 100%'
        },
        {
            id: 'water-st-3',
            name: '🌊 พื้นที่ท่วมขัง ถนนวิภาวดี (หลักสี่)',
            type: 'flood',
            levelVal: '35 cm',
            trendText: '🚗 รถเล็กผ่านไม่ได้',
            status: 'danger',
            lat: 13.8862,
            lng: 100.5812,
            detail: 'น้ำท่วมขังสูงบนพื้นผิวจราจร 35 ซม. แนะนำให้หลีกเลี่ยงเส้นทางและใช้ทางด่วน'
        },
        {
            id: 'water-st-4',
            name: '🌊 สถานีชายฝั่ง บางปู (อ่าวไทย)',
            type: 'sea',
            levelVal: '1.42m MSL',
            trendText: '⬇️ กำลังลง',
            status: 'normal',
            lat: 13.5042,
            lng: 100.6489,
            detail: 'ระดับน้ำทะเลอ่าวไทยกำลังลดลงตามเวลาน้ำขึ้นน้ำลงปกติ'
        }
    ];

    // WebSocket Connection
    let ws = null;

    // UI Element Selectors
    const gpsCoordsText = document.getElementById('gpsCoordsText');
    const btnSosTrigger = document.getElementById('btnSosTrigger');
    const btnToggleSiren = document.getElementById('btnToggleSiren');
    const btnStartBroadcasting = document.getElementById('btnStartBroadcasting');
    const btnStopBroadcasting = document.getElementById('btnStopBroadcasting');
    const btnRecenterGps = document.getElementById('btnRecenterGps');
    const btnReportIncident = document.getElementById('btnReportIncident');
    const incidentsFeed = document.getElementById('incidentsFeed');
    const alertCountLabel = document.getElementById('alertCountLabel');

    // Modals
    const broadcasterModal = document.getElementById('broadcasterModal');
    const btnCloseStudio = document.getElementById('btnCloseStudio');
    const liveCameraVideo = document.getElementById('liveCameraVideo');
    const btnFlipCamera = document.getElementById('btnFlipCamera');
    const btnToggleFlashlight = document.getElementById('btnToggleFlashlight');
    const btnToggleMic = document.getElementById('btnToggleMic');

    const streamViewerModal = document.getElementById('streamViewerModal');
    const btnCloseViewer = document.getElementById('btnCloseViewer');
    const viewerVideoPlayer = document.getElementById('viewerVideoPlayer');
    const viewerStreamTitle = document.getElementById('viewerStreamTitle');
    const viewerAddressText = document.getElementById('viewerAddressText');
    const viewerCountBadge = document.getElementById('viewerCountBadge');
    const viewerCategoryBadge = document.getElementById('viewerCategoryBadge');
    const btnNavGoogleMaps = document.getElementById('btnNavGoogleMaps');

    const HUD_COORDS = document.getElementById('hudCoords');
    const HUD_ACCURACY = document.getElementById('hudAccuracy');
    const HUD_SPEED = document.getElementById('hudSpeed');
    const HUD_TIME = document.getElementById('hudTimestamp');

    // 2. Initialize Leaflet Map Engine
    function initMap() {
        console.log('📍 Initializing Guardian Live Leaflet Map Engine...');
        map = L.map('map', {
            zoomControl: false,
            attributionControl: false
        }).setView([currentPos.lat, currentPos.lng], 14);

        // Add OpenStreetMap Tile Layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(map);

        L.control.zoom({ position: 'topright' }).addTo(map);

        // Create User Location Marker
        const userIcon = L.divIcon({
            className: 'user-gps-pin',
            html: `<div class="user-pin-beacon"><div class="user-pin-dot"></div></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        userMarker = L.marker([currentPos.lat, currentPos.lng], { icon: userIcon }).addTo(map);
        userMarker.bindPopup(`<b>📍 พิกัดปัจจุบันของคุณ</b><br>Lat: ${currentPos.lat.toFixed(5)}<br>Lng: ${currentPos.lng.toFixed(5)}`);

        userAccuracyCircle = L.circle([currentPos.lat, currentPos.lng], {
            radius: currentPos.accuracy,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.15
        }).addTo(map);

        // Layer group for water level markers
        waterLayerGroup = L.layerGroup().addTo(map);
        renderWaterStations();
    }

    // Render Flood & Sea Level Water Stations
    function renderWaterStations() {
        const listContainer = document.getElementById('waterStationsList');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        if (waterLayerGroup) waterLayerGroup.clearLayers();

        waterStationsData.forEach(st => {
            const statusColor = st.status === 'danger' ? '#ef4444' : (st.status === 'warning' ? '#f59e0b' : '#3b82f6');

            // 1. Sidebar Card Item
            const item = document.createElement('div');
            item.className = 'water-station-card';
            item.innerHTML = `
                <div class="water-station-info">
                    <span class="name">${st.name}</span>
                    <span class="sub">${st.detail}</span>
                </div>
                <div class="water-station-val">
                    <span class="level" style="color:${statusColor}">${st.levelVal}</span>
                    <span class="trend" style="background:${statusColor}22; color:${statusColor}">${st.trendText}</span>
                </div>
            `;

            item.addEventListener('click', () => {
                map.flyTo([st.lat, st.lng], 15, { animate: true });
            });

            listContainer.appendChild(item);

            // 2. Leaflet Map Pin
            if (waterLayerGroup && isWaterLayerVisible) {
                const icon = L.divIcon({
                    className: 'water-map-pin',
                    html: `<div class="water-pin-marker" style="background:${statusColor}">🌊</div>`,
                    iconSize: [34, 34],
                    iconAnchor: [17, 17]
                });

                const marker = L.marker([st.lat, st.lng], { icon: icon }).addTo(waterLayerGroup);
                marker.bindPopup(`
                    <div class="map-popup-card">
                        <h4 style="color:${statusColor}">${st.name}</h4>
                        <p style="font-size:14px; font-weight:bold; margin:6px 0; color:${statusColor}">🌊 ระดับน้ำ: ${st.levelVal} (${st.trendText})</p>
                        <p style="font-size:11px; color:#94a3b8;">${st.detail}</p>
                    </div>
                `);
            }
        });
    }

    // 3. Realtime Browser Geolocation Tracking
    function startGpsTracking() {
        if ('geolocation' in navigator) {
            navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude, accuracy, speed } = pos.coords;
                    currentPos = {
                        lat: latitude,
                        lng: longitude,
                        accuracy: accuracy || 5,
                        speed: speed ? (speed * 3.6).toFixed(1) : 0 // Convert to km/h
                    };

                    // Update UI text
                    gpsCoordsText.textContent = `${currentPos.lat.toFixed(5)}° N, ${currentPos.lng.toFixed(5)}° E (±${Math.round(currentPos.accuracy)}m)`;

                    // Update map marker
                    if (userMarker && map) {
                        userMarker.setLatLng([currentPos.lat, currentPos.lng]);
                        userAccuracyCircle.setLatLng([currentPos.lat, currentPos.lng]);
                        userAccuracyCircle.setRadius(currentPos.accuracy);
                    }

                    // Update HUD overlay if camera active
                    updateCameraHud();
                },
                (err) => {
                    console.warn('GPS Warning:', err.message);
                    gpsCoordsText.textContent = `13.7563° N, 100.5018° E (พิกัดจำลองกรุงเทพฯ)`;
                },
                { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
            );
        }
    }

    // 4. Calculate Distance Between Coordinates in Meters/KM
    function calcDistanceKm(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    function formatDistanceStr(distKm) {
        if (distKm < 1) {
            return `${Math.round(distKm * 1000)} เมตร`;
        }
        return `${distKm.toFixed(1)} กม.`;
    }

    // 5. Render Incident Cards Feed & Map Markers
    function renderIncidents() {
        if (!incidentsFeed) return;

        // Filter alerts
        const filtered = activeAlerts.filter(a => selectedCategory === 'all' || a.category === selectedCategory);
        alertCountLabel.textContent = filtered.length;
        incidentsFeed.innerHTML = '';

        // Clear existing markers
        alertMarkers.forEach(m => map.removeLayer(m));
        alertMarkers.clear();

        filtered.forEach(alert => {
            const distKm = calcDistanceKm(currentPos.lat, currentPos.lng, alert.lat, alert.lng);
            const distStr = formatDistanceStr(distKm);

            // Create Leaflet Marker
            const markerColor = alert.severity === 'critical' ? '#ef4444' : '#f59e0b';
            const alertIcon = L.divIcon({
                className: 'incident-map-pin',
                html: `<div class="pulse-alert-marker" style="background:${markerColor}"><span>${getCategoryEmoji(alert.category)}</span></div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            const marker = L.marker([alert.lat, alert.lng], { icon: alertIcon }).addTo(map);
            const googleNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${alert.lat},${alert.lng}`;

            marker.bindPopup(`
                <div class="map-popup-card">
                    <h4>${alert.title}</h4>
                    <p style="font-size:11px; color:#94a3b8; margin:4px 0;">📍 ${alert.address}</p>
                    <p style="font-size:11px; color:#60a5fa;">📏 ระยะห่างจากคุณ: ${distStr}</p>
                    <a href="${googleNavUrl}" target="_blank" class="btn btn-primary btn-sm w-100" style="margin-top:6px; display:inline-block; text-align:center; text-decoration:none;">🗺️ นำทางด้วย Google Maps</a>
                </div>
            `);

            alertMarkers.set(alert.id, marker);

            // Render Incident Feed Card
            const card = document.createElement('div');
            card.className = `incident-card ${alert.severity}`;
            card.innerHTML = `
                <div class="incident-header">
                    <span class="incident-title">${getCategoryEmoji(alert.category)} ${alert.title}</span>
                    <span class="incident-time">${formatTimeAgo(alert.time)}</span>
                </div>
                <div class="incident-location">
                    📍 ${alert.address} • <span>ห่างจากคุณ ${distStr}</span>
                </div>
                <p style="font-size:12px; color:#cbd5e1; margin-bottom:8px;">${alert.description || ''}</p>
                <div class="incident-footer">
                    <span>👁️ ${alert.viewers || 1} ผู้ชมสด</span>
                    <button class="btn-watch-live" data-id="${alert.id}">🔴 ดูไลฟ์สด & นำทาง</button>
                </div>
            `;

            card.addEventListener('click', () => {
                map.flyTo([alert.lat, alert.lng], 16, { animate: true });
                marker.openPopup();
            });

            card.querySelector('.btn-watch-live').addEventListener('click', (e) => {
                e.stopPropagation();
                openStreamViewer(alert);
            });

            incidentsFeed.appendChild(card);
        });
    }

    function getCategoryEmoji(cat) {
        switch (cat) {
            case 'accident': return '🚗';
            case 'fire': return '🔥';
            case 'crime': return '🚨';
            case 'disaster': return '🌊';
            case 'medical': return '🚑';
            default: return '📢';
        }
    }

    function formatTimeAgo(isoString) {
        const diffMs = Date.now() - new Date(isoString).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'เมื่อสักครู่';
        if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
        return `${Math.floor(diffMins / 60)} ชม. ที่แล้ว`;
    }

    // 6. Camera Live Stream Broadcaster Studio
    async function startCameraBroadcast() {
        try {
            console.log('🎥 Requesting Camera media stream access...');
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: !isMicMuted
            };

            mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            liveCameraVideo.srcObject = mediaStream;
            broadcasterModal.classList.remove('hidden');
            isBroadcasting = true;

            // Start HUD real-time clock
            hudTimer = setInterval(updateCameraHud, 1000);
            updateCameraHud();

            // Notify WebSocket server
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'START_LIVE',
                    streamId: 'stream-' + Date.now(),
                    lat: currentPos.lat,
                    lng: currentPos.lng,
                    title: '🔴 ไลฟ์สดรายงานเหตุการณ์ฉุกเฉิน'
                }));
            }
        } catch (err) {
            alert('⚠️ ไม่สามารถเข้าถึงกล้องวีดีโอหรือไมโครโฟนได้: ' + err.message);
        }
    }

    function stopCameraBroadcast() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
        clearInterval(hudTimer);
        broadcasterModal.classList.add('hidden');
        isBroadcasting = false;
        alert('⏹️ ยุติการถ่ายทอดสดเรียบร้อยแล้ว');
    }

    function updateCameraHud() {
        if (!isBroadcasting) return;
        HUD_TIME.textContent = new Date().toLocaleTimeString('th-TH');
        HUD_COORDS.textContent = `${currentPos.lat.toFixed(5)}° N, ${currentPos.lng.toFixed(5)}° E`;
        HUD_ACCURACY.textContent = `±${Math.round(currentPos.accuracy)}m`;
        HUD_SPEED.textContent = `${currentPos.speed || 0} km/h`;
    }

    // Flip Front/Back Camera
    btnFlipCamera.addEventListener('click', () => {
        facingMode = facingMode === 'environment' ? 'user' : 'environment';
        if (isBroadcasting) {
            stopCameraBroadcast();
            startCameraBroadcast();
        }
    });

    // Toggle Camera Flashlight Torch
    btnToggleFlashlight.addEventListener('click', async () => {
        if (mediaStream) {
            const track = mediaStream.getVideoTracks()[0];
            if (track) {
                try {
                    isTorchOn = !isTorchOn;
                    await track.applyConstraints({ advanced: [{ torch: isTorchOn }] });
                    btnToggleFlashlight.textContent = isTorchOn ? '💡 เปิดไฟฉายอยู่' : '💡 ไฟฉายฉุกเฉิน';
                } catch (e) {
                    alert('แฟลชกล้องไม่รองรับบนอุปกรณ์นี้');
                }
            }
        }
    });

    // Toggle Mic Mute
    btnToggleMic.addEventListener('click', () => {
        if (mediaStream) {
            const audioTrack = mediaStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                btnToggleMic.textContent = audioTrack.enabled ? '🎙️ ไมโครโฟน: เปิด' : '🎙️ ไมโครโฟน: ปิด';
            }
        }
    });

    // 7. Web Audio Synthesizer Siren Warning Engine
    function toggleEmergencySiren() {
        if (isSirenActive) {
            stopSiren();
        } else {
            startSiren();
        }
    }

    function startSiren() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        sirenOscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        sirenOscillator.type = 'sawtooth';
        sirenOscillator.frequency.setValueAtTime(600, audioCtx.currentTime);

        // Siren Pitch Modulation Oscillation
        let high = false;
        const sirenInterval = setInterval(() => {
            if (!isSirenActive) {
                clearInterval(sirenInterval);
                return;
            }
            if (sirenOscillator && sirenOscillator.frequency) {
                sirenOscillator.frequency.exponentialRampToValueAtTime(high ? 600 : 950, audioCtx.currentTime + 0.4);
                high = !high;
            }
        }, 500);

        sirenOscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        sirenOscillator.start();

        isSirenActive = true;
        btnToggleSiren.textContent = '🔊 ปิดเสียงไซเรนเตือนภัย';
        btnToggleSiren.classList.add('btn-danger');
    }

    function stopSiren() {
        if (sirenOscillator) {
            sirenOscillator.stop();
            sirenOscillator.disconnect();
            sirenOscillator = null;
        }
        isSirenActive = false;
        btnToggleSiren.textContent = '🔊 เปิดไซเรนเตือนภัย';
        btnToggleSiren.classList.remove('btn-danger');
    }

    // 8. One-Touch SOS Emergency Trigger
    let sosHoldTimer = null;
    btnSosTrigger.addEventListener('mousedown', startSosCount);
    btnSosTrigger.addEventListener('touchstart', startSosCount);
    btnSosTrigger.addEventListener('mouseup', cancelSosCount);
    btnSosTrigger.addEventListener('mouseleave', cancelSosCount);
    btnSosTrigger.addEventListener('touchend', cancelSosCount);

    function startSosCount() {
        btnSosTrigger.style.transform = 'scale(0.95)';
        sosHoldTimer = setTimeout(() => {
            triggerEmergencySos();
        }, 1200); // 1.2s hold
    }

    function cancelSosCount() {
        btnSosTrigger.style.transform = 'scale(1)';
        clearTimeout(sosHoldTimer);
    }

    function triggerEmergencySos() {
        startSiren();
        startCameraBroadcast();

        const sosData = {
            title: '🚨 ขอความช่วยเหลือฉุกเฉิน (SOS)',
            category: 'accident',
            severity: 'critical',
            lat: currentPos.lat,
            lng: currentPos.lng,
            address: `พิกัด GPS: ${currentPos.lat.toFixed(5)}, ${currentPos.lng.toFixed(5)}`,
            reporter: 'ผู้ใช้งานฉุกเฉิน',
            description: 'กระจายสัญญาณเตือนภัยฉุกเฉินเรียลไทม์!'
        };

        // Send via HTTP and WebSocket
        fetch('/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sosData)
        }).then(res => res.json()).then(data => {
            activeAlerts.unshift(data.alert);
            renderIncidents();
            alert('🚨 กระจายสัญญาณขอความช่วยเหลือฉุกเฉิน (SOS) พร้อมพิกัด GPS แล้ว!');
        });
    }

    // 9. Open Viewer Stream Modal
    function openStreamViewer(alertData) {
        viewerStreamTitle.textContent = `🔴 ${alertData.title}`;
        viewerAddressText.textContent = `${alertData.address} (GPS: ${alertData.lat.toFixed(5)}, ${alertData.lng.toFixed(5)})`;
        viewerCountBadge.textContent = `👁️ ${alertData.viewers || 1} ผู้ชมสด`;
        viewerCategoryBadge.textContent = `${getCategoryEmoji(alertData.category)} ${alertData.category}`;
        btnNavGoogleMaps.href = `https://www.google.com/maps/dir/?api=1&destination=${alertData.lat},${alertData.lng}`;

        // Connect simulated video preview feed
        viewerVideoPlayer.src = 'assets/scene1.jpg'; // static preview fallback
        streamViewerModal.classList.remove('hidden');
    }

    // 10. WebSocket Setup & Listeners
    function setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}`);

        ws.onopen = () => console.log('📡 Connected to Guardian Live Realtime Alert Network');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'INIT_STATE') {
                activeAlerts = data.alerts;
                renderIncidents();
            } else if (data.type === 'NEW_ALERT') {
                activeAlerts.unshift(data.alert);
                renderIncidents();
            }
        };
    }

    // Category Filter Buttons Event Binding
    document.querySelectorAll('.pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            selectedCategory = btn.getAttribute('data-cat');
            renderIncidents();
        });
    });

    // Control Buttons Bindings
    btnToggleSiren.addEventListener('click', toggleEmergencySiren);
    btnStartBroadcasting.addEventListener('click', startCameraBroadcast);
    btnStopBroadcasting.addEventListener('click', stopCameraBroadcast);
    btnCloseStudio.addEventListener('click', stopCameraBroadcast);
    btnCloseViewer.addEventListener('click', () => streamViewerModal.classList.add('hidden'));

    // Water Layer Toggle Button Binding
    const btnToggleWaterLayer = document.getElementById('btnToggleWaterLayer');
    if (btnToggleWaterLayer) {
        btnToggleWaterLayer.addEventListener('click', () => {
            isWaterLayerVisible = !isWaterLayerVisible;
            if (isWaterLayerVisible) {
                btnToggleWaterLayer.classList.add('active-layer');
            } else {
                btnToggleWaterLayer.classList.remove('active-layer');
            }
            renderWaterStations();
        });
    }

    // Citizen Incident Reporting Modal Handlers
    const citizenReportModal = document.getElementById('citizenReportModal');
    const btnCloseCitizenReport = document.getElementById('btnCloseCitizenReport');
    const citizenReportForm = document.getElementById('citizenReportForm');
    const reportTitleInput = document.getElementById('reportTitleInput');
    const reportDescInput = document.getElementById('reportDescInput');
    const reportGpsText = document.getElementById('reportGpsText');
    const btnSubmitAndLive = document.getElementById('btnSubmitAndLive');

    function openCitizenReportModal() {
        if (reportGpsText) {
            reportGpsText.textContent = `${currentPos.lat.toFixed(5)}° N, ${currentPos.lng.toFixed(5)}° E (ความแม่นยำ ±${Math.round(currentPos.accuracy)}m)`;
        }
        citizenReportModal.classList.remove('hidden');
    }

    function closeCitizenReportModal() {
        citizenReportModal.classList.add('hidden');
    }

    btnReportIncident.addEventListener('click', openCitizenReportModal);
    btnCloseCitizenReport.addEventListener('click', closeCitizenReportModal);

    function createIncidentFromForm(isLiveMode = false) {
        const selectedCatEl = document.querySelector('input[name="reportCat"]:checked');
        const category = selectedCatEl ? selectedCatEl.value : 'accident';
        const title = reportTitleInput.value.trim() || '📢 รายงานเหตุการณ์ฉุกเฉินโดยประชาชน';
        const description = reportDescInput.value.trim() || 'ผู้ใช้งานแจ้งเหตุการณ์สดผ่านระบบ Guardian Live';

        const alertData = {
            title: title,
            category: category,
            severity: category === 'fire' || category === 'crime' ? 'critical' : 'warning',
            lat: currentPos.lat,
            lng: currentPos.lng,
            address: `พิกัดสด: ${currentPos.lat.toFixed(5)}, ${currentPos.lng.toFixed(5)}`,
            reporter: 'ประชาชนในพื้นที่',
            description: description,
            isLive: isLiveMode
        };

        // Post incident report to server
        fetch('/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertData)
        }).then(res => res.json()).then(data => {
            activeAlerts.unshift(data.alert);
            renderIncidents();
            closeCitizenReportModal();

            if (isLiveMode) {
                startCameraBroadcast();
                alert(`📢 ส่งรายงานแจ้งเหตุสำเร็จ! กำลังเริ่มถ่ายทอดสดไลฟ์สตรีม: "${title}"`);
            } else {
                alert(`📌 ปักหมุดแจ้งเหตุฉุกเฉินสำเร็จ! สัญญาณถูกกระจายไปยังผู้ใช้งานเรียลไทม์`);
            }
        });
    }

    citizenReportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        createIncidentFromForm(false);
    });

    btnSubmitAndLive.addEventListener('click', () => {
        if (!reportTitleInput.value.trim()) {
            alert('กรุณากรอกหัวข้อเหตุการณ์ฉุกเฉินก่อนเริ่มไลฟ์สด');
            reportTitleInput.focus();
            return;
        }
        createIncidentFromForm(true);
    });

    // PWA Service Worker Registration (100% Free Cross-Device App)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('⚡ GUARDIAN LIVE PWA Service Worker registered:', reg.scope))
                .catch(err => console.warn('PWA SW Registration error:', err));
        });
    }

    // Startup Execution
    initMap();
    startGpsTracking();
    setupWebSocket();

    // Fetch initial alerts via API
    fetch('/api/alerts')
        .then(res => res.json())
        .then(data => {
            activeAlerts = data;
            renderIncidents();
        });
});
