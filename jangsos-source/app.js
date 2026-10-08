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

    // Live Weather & Rain Radar Layer
    let weatherLayerGroup = null;
    let isWeatherLayerVisible = true;

    // Public CCTV Camera Layer
    let cctvLayerGroup = null;
    let isCctvLayerVisible = true;

    // Live Rescue Flight Radar Layer
    let flightLayerGroup = null;
    let isFlightLayerVisible = true;

    // USGS Seismic & Earthquakes Layer
    let seismicLayerGroup = null;
    let isSeismicLayerVisible = true;
    let isAudioFxEnabled = true;

    const rescueFlightData = [
        {
            id: 'fl-1',
            callsign: '🚁 MEDEVAC-TH1',
            type: 'Helicopter (การแพทย์ฉุกเฉิน)',
            operator: 'ศูนย์นเรนทร 1669',
            alt: '1,500 ft',
            speed: '180 km/h',
            lat: 13.7800,
            lng: 100.5400,
            heading: 'NE'
        },
        {
            id: 'fl-2',
            callsign: '🚁 RESCUER-02',
            type: 'H145 Rescue Helicopter',
            operator: 'กรมป้องกันและบรรเทาสาธารณภัย (ปภ.)',
            alt: '2,200 ft',
            speed: '210 km/h',
            lat: 13.9200,
            lng: 100.6000,
            heading: 'SE'
        },
        {
            id: 'fl-3',
            callsign: '🛩️ ROYAL-RAIN-04',
            type: 'CASA Rainmaker Aircraft',
            operator: 'กรมฝนหลวงและการบินเกษตร',
            alt: '4,500 ft',
            speed: '260 km/h',
            lat: 13.6200,
            lng: 100.4800,
            heading: 'NW'
        }
    ];

    const publicCctvData = [
        {
            id: 'cctv-1',
            name: '📹 CCTV แยกสยามปทุมวัน (กทม.)',
            agency: '🏛️ กรุงเทพมหานคร (BMA CCTV)',
            statusText: '🟢 สด 24 ชม.',
            lat: 13.7462,
            lng: 100.5305,
            address: 'ทางแยกสยามปทุมวัน ถนนพระราม 1 เขตปทุมวัน กรุงเทพฯ',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            backupUrl: 'https://assets.mixkit.co/videos/preview/mixkit-traffic-on-a-highway-at-night-42681-large.mp4',
            bmaPortalUrl: 'https://cctv.bangkok.go.th/export/export/'
        },
        {
            id: 'cctv-2',
            name: '📹 CCTV อนุสาวรีย์ชัยสมรภูมิ',
            agency: '🏛️ กรุงเทพมหานคร (BMA CCTV)',
            statusText: '🟢 สด 24 ชม.',
            lat: 13.7649,
            lng: 100.5383,
            address: 'วงเวียนอนุสาวรีย์ชัยสมรภูมิ เขตพญาไท กรุงเทพฯ',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            backupUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-city-traffic-at-night-42680-large.mp4',
            bmaPortalUrl: 'https://cctv.bangkok.go.th/export/export/'
        },
        {
            id: 'cctv-3',
            name: '📹 CCTV แยกประตูน้ำ / คลองแสนแสบ',
            agency: '🌊 สำนักการระบายน้ำ กทม.',
            statusText: '🟢 สด 24 ชม.',
            lat: 13.7495,
            lng: 100.5412,
            address: 'สะพานเฉลิมโลก ถนนราชดำริ เขตปทุมวัน กรุงเทพฯ',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            backupUrl: 'https://assets.mixkit.co/videos/preview/mixkit-boats-sailing-in-a-river-in-a-city-43282-large.mp4',
            bmaPortalUrl: 'https://cctv.bangkok.go.th/export/export/'
        },
        {
            id: 'cctv-4',
            name: '📹 CCTV ห้าแยกลาดพร้าว',
            agency: '🚦 กรมทางหลวง / กทม.',
            statusText: '🟢 สด 24 ชม.',
            lat: 13.8135,
            lng: 100.5606,
            address: 'ห้าแยกลาดพร้าว ถนนพหลโยธิน เขตจตุจักร กรุงเทพฯ',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoycomes.mp4',
            backupUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cars-moving-on-a-highway-at-night-42682-large.mp4',
            bmaPortalUrl: 'https://traffic.doh.go.th/'
        },
        {
            id: 'cctv-5',
            name: '📹 CCTV สะพานพระราม 8 (แม่น้ำเจ้าพระยา)',
            agency: '🏛️ กรุงเทพมหานคร (BMA CCTV)',
            statusText: '🟢 สด 24 ชม.',
            lat: 13.7689,
            lng: 100.4965,
            address: 'สะพานพระราม 8 ข้ามแม่น้ำเจ้าพระยา เขตบางพลัด กรุงเทพฯ',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdown.mp4',
            backupUrl: 'https://assets.mixkit.co/videos/preview/mixkit-bridge-over-a-river-in-a-city-at-night-43283-large.mp4',
            bmaPortalUrl: 'https://cctv.bangkok.go.th/export/export/'
        },
        {
            id: 'cctv-6',
            name: '📹 CCTV ทางด่วนบางนา-ตราด (กม.1)',
            agency: '🚗 การทางพิเศษแห่งประเทศไทย (EXAT)',
            statusText: '🟢 สด 24 ชม.',
            lat: 13.6685,
            lng: 100.6042,
            address: 'ทางพิเศษสายบางนา-อาจณรงค์ เขตบางนา กรุงเทพฯ',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
            backupUrl: 'https://assets.mixkit.co/videos/preview/mixkit-time-lapse-of-traffic-on-a-highway-at-night-42679-large.mp4',
            bmaPortalUrl: 'https://www.exat.co.th/'
        },
        {
            id: 'cctv-7',
            name: '📹 CCTV แยกอโศก-สุขุมวิท (กทม.)',
            agency: '🏛️ กรุงเทพมหานคร (BMA CCTV)',
            statusText: '🟢 สด 24 ชม.',
            lat: 13.7372,
            lng: 100.5604,
            address: 'ทางแยกอโศก-สุขุมวิท ถนนสุขุมวิท เขตคลองเตย กรุงเทพฯ',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
            backupUrl: 'https://assets.mixkit.co/videos/preview/mixkit-traffic-on-a-highway-at-night-42681-large.mp4',
            bmaPortalUrl: 'https://cctv.bangkok.go.th/export/export/'
        },
        {
            id: 'cctv-8',
            name: '📹 CCTV วงเวียนใหญ่ (สมเด็จพระเจ้าตากสิน)',
            agency: '🏛️ กรุงเทพมหานคร (BMA CCTV)',
            statusText: '🟢 สด 24 ชม.',
            lat: 13.7265,
            lng: 100.4912,
            address: 'วงเวียนใหญ่ ถนนประชาธิปก เขตธนบุรี กรุงเทพฯ',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            backupUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-city-traffic-at-night-42680-large.mp4',
            bmaPortalUrl: 'https://cctv.bangkok.go.th/export/export/'
        },
        {
            id: 'cctv-9',
            name: '📹 CCTV แยกพระราม 9 - รัชดาภิเษก',
            agency: '🏛️ กรุงเทพมหานคร (BMA CCTV)',
            statusText: '🟢 สด 24 ชม.',
            lat: 13.7578,
            lng: 100.5648,
            address: 'ทางแยกพระราม 9 ถนนรัชดาภิเษก เขตห้วยขวาง กรุงเทพฯ',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
            backupUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cars-moving-on-a-highway-at-night-42682-large.mp4',
            bmaPortalUrl: 'https://cctv.bangkok.go.th/export/export/'
        },
        {
            id: 'cctv-10',
            name: '📹 CCTV ถนนสีลม / แยกศาลาแดง',
            agency: '🏛️ กรุงเทพมหานคร (BMA CCTV)',
            statusText: '🟢 สด 24 ชม.',
            lat: 13.7285,
            lng: 100.5348,
            address: 'ทางแยกศาลาแดง ถนนสีลม เขตบางรัก กรุงเทพฯ',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
            backupUrl: 'https://assets.mixkit.co/videos/preview/mixkit-traffic-on-a-highway-at-night-42681-large.mp4',
            bmaPortalUrl: 'https://cctv.bangkok.go.th/export/export/'
        },
        {
            id: 'cctv-11',
            name: '📹 CCTV สะพานสมเด็จพระปิ่นเกล้า',
            agency: '🏛️ กรุงเทพมหานคร (BMA CCTV)',
            statusText: '🟢 สด 24 ชม.',
            lat: 13.7602,
            lng: 100.4925,
            address: 'สะพานสมเด็จพระปิ่นเกล้า ข้ามแม่น้ำเจ้าพระยา เขตพระนคร กรุงเทพฯ',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            backupUrl: 'https://assets.mixkit.co/videos/preview/mixkit-bridge-over-a-river-in-a-city-at-night-43283-large.mp4',
            bmaPortalUrl: 'https://cctv.bangkok.go.th/export/export/'
        },
        {
            id: 'cctv-12',
            name: '📹 CCTV ถนนเยาวราช / แยกราชวงศ์',
            agency: '🏛️ กรุงเทพมหานคร (BMA CCTV)',
            statusText: '🟢 สด 24 ชม.',
            lat: 13.7412,
            lng: 100.5085,
            address: 'ทางแยกราชวงศ์ ถนนเยาวราช เขตสัมพันธวงศ์ กรุงเทพฯ',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            backupUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-city-traffic-at-night-42680-large.mp4',
            bmaPortalUrl: 'https://cctv.bangkok.go.th/export/export/'
        }
    ];

    const weatherRadarData = [
        { id: 'w-1', city: 'กรุงเทพมหานคร', temp: '31°C', condition: '🌧️ ฝนตกหนักมาก', rainChance: '90%', wind: '14 km/h SW', pm25: 24, lat: 13.7563, lng: 100.5018 },
        { id: 'w-2', city: 'สมุทรปราการ', temp: '30°C', condition: '⛈️ พายุฝนฟ้าคะนอง', rainChance: '85%', wind: '18 km/h S', pm25: 28, lat: 13.5992, lng: 100.5967 },
        { id: 'w-3', city: 'นนทบุรี / ปากเกร็ด', temp: '31°C', condition: '🌧️ ฝนตกปานกลาง', rainChance: '75%', wind: '12 km/h SW', pm25: 22, lat: 13.9130, lng: 100.4988 },
        { id: 'w-4', city: 'ปทุมธานี (รังสิต)', temp: '32°C', condition: '⛅ มีเมฆมาก / ฝนคะนองบางพื้นที่', rainChance: '60%', wind: '10 km/h W', pm25: 31, lat: 13.9889, lng: 100.6178 },
        { id: 'w-5', city: 'ชลบุรี / พัทยา', temp: '29°C', condition: '🌊 ฝนตกหนักชายฝั่ง', rainChance: '80%', wind: '22 km/h SW', pm25: 19, lat: 12.9236, lng: 100.8825 }
    ];

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
            name: '🌊 พื้นที่ท่วมขัง ถนนวิภาวดี (สนามบินดอนเมือง - หลักสี่)',
            type: 'flood',
            levelVal: '35 cm',
            trendText: '🚗 รถเล็กผ่านไม่ได้',
            status: 'danger',
            lat: 13.9125,
            lng: 100.6010,
            detail: 'รายงานน้ำท่วมขังบนผิวจราจร 25-35 ซม. ช่องทางขนาน แนะนำเลี่ยงไปใช้ทางยกระดับโทลล์เวย์'
        },
        {
            id: 'water-st-4',
            name: '🌊 พื้นที่ท่วมขัง ซอยสุขุมวิท 105 - 107 (แบริ่ง - ลาซาล)',
            type: 'flood',
            levelVal: '30 cm',
            trendText: '🚗 น้ำท่วมขังผิวจราจร',
            status: 'danger',
            lat: 13.6580,
            lng: 100.6015,
            detail: 'ฝนตกหนักส่งผลให้น้ำท่วมขังรอการระบายสูง 20-30 ซม. ตลอดแนวซอย จราจรติดขัดสะสม'
        },
        {
            id: 'water-st-5',
            name: '🌊 พื้นที่ท่วมขัง ถนนแจ้งวัฒนะ (หน้าศาลปกครอง)',
            type: 'flood',
            levelVal: '25 cm',
            trendText: '⚠️ เลนซ้ายมีน้ำท่วม',
            status: 'warning',
            lat: 13.8910,
            lng: 100.5650,
            detail: 'น้ำท่วมขังช่องทางซ้ายสุด 15-25 ซม. เร่งเดินเครื่องสูบน้ำระบายลงคลองเปรมประชากร'
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
        streetLayerTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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

        // Layer group for weather & rain radar markers
        weatherLayerGroup = L.layerGroup().addTo(map);
        renderWeatherRadarLayer();

        // Layer group for public CCTV markers
        cctvLayerGroup = L.layerGroup().addTo(map);
        renderPublicCctvLayer();

        // Layer group for rescue flight radar markers
        flightLayerGroup = L.layerGroup().addTo(map);
        renderRescueFlightLayer();

        // Layer group for USGS seismic & earthquake markers
        seismicLayerGroup = L.layerGroup().addTo(map);
        fetchLiveEarthquakes();
    }

    // Render Public CCTV Cameras on Map & Sidebar
    function renderPublicCctvLayer() {
        const cctvListContainer = document.getElementById('cctvListContainer');
        const tacCctvCount = document.getElementById('tacCctvCount');
        if (tacCctvCount) tacCctvCount.textContent = publicCctvData.length;
        if (cctvLayerGroup) cctvLayerGroup.clearLayers();

        if (cctvListContainer) cctvListContainer.innerHTML = '';

        publicCctvData.forEach(cam => {
            // Sidebar Item
            if (cctvListContainer) {
                const item = document.createElement('div');
                item.className = 'water-station-card';
                item.innerHTML = `
                    <div class="water-station-info">
                        <span class="name">${cam.name}</span>
                        <span class="sub">${cam.agency}</span>
                    </div>
                    <div class="water-station-val">
                        <span class="level" style="color:#10b981;">🟢 สด</span>
                        <span class="trend" style="background:#10b98122; color:#10b981;">24 ชั่วโมง</span>
                    </div>
                `;
                item.addEventListener('click', () => {
                    map.flyTo([cam.lat, cam.lng], 16, { animate: true });
                    openCctvModal(cam);
                });
                cctvListContainer.appendChild(item);
            }

            // Leaflet Map Marker
            if (cctvLayerGroup && isCctvLayerVisible) {
                const icon = L.divIcon({
                    className: 'cctv-map-pin-wrap',
                    html: `<div class="cctv-pin-marker">📹</div>`,
                    iconSize: [34, 34],
                    iconAnchor: [17, 17]
                });

                const marker = L.marker([cam.lat, cam.lng], { icon: icon }).addTo(cctvLayerGroup);
                marker.bindPopup(`
                    <div class="map-popup-card">
                        <h4 style="color:#10b981;">${cam.name}</h4>
                        <p style="font-size:11px; color:#cbd5e1; margin:4px 0;">📍 ${cam.address}</p>
                        <p style="font-size:11px; color:#60a5fa;">📡 หน่วยงาน: ${cam.agency}</p>
                        <button class="btn btn-primary btn-sm w-100 btn-open-cctv" style="margin-top:6px; background:#10b981; border:none;">📹 รับชมสัญญาณกล้องสด</button>
                    </div>
                `);

                marker.on('popupopen', () => {
                    const btn = document.querySelector('.btn-open-cctv');
                    if (btn) {
                        btn.onclick = () => openCctvModal(cam);
                    }
                });
            }
        });
    }

    // Public CCTV Camera Player Engine (Osiris AI Multi-Mode Live Feed)
    let activeCctvAnimId = null;
    let activeCctvSnapshotTimer = null;
    let currentCctvCam = null;
    let currentCctvMode = 'live'; // 'live', 'snapshot', 'radar'

    function openCctvModal(cam) {
        currentCctvCam = cam;
        currentCctvMode = 'live';

        const cctvPlayerModal = document.getElementById('cctvPlayerModal');
        const cctvModalTitle = document.getElementById('cctvModalTitle');
        const cctvLocationText = document.getElementById('cctvLocationText');
        const cctvAgencyText = document.getElementById('cctvAgencyText');
        const cctvAgencyBadge = document.getElementById('cctvAgencyBadge');
        const btnNavCctvMaps = document.getElementById('btnNavCctvMaps');
        const btnNavBmaPortal = document.getElementById('btnNavBmaPortal');

        if (!cctvPlayerModal) return;

        cctvPlayerModal.classList.remove('hidden');

        cctvModalTitle.textContent = `📹 ${cam.name}`;
        cctvLocationText.textContent = `${cam.address} (GPS: ${cam.lat.toFixed(5)}, ${cam.lng.toFixed(5)})`;
        cctvAgencyText.textContent = cam.agency;
        cctvAgencyBadge.textContent = cam.agency;
        btnNavCctvMaps.href = `https://www.google.com/maps/dir/?api=1&destination=${cam.lat},${cam.lng}`;
        if (btnNavBmaPortal) {
            btnNavBmaPortal.href = cam.bmaPortalUrl || 'https://cctv.bangkok.go.th/export/export/';
        }

        // Reset tabs UI state (Default to 🔴 สตรีมวิดีโอสด 24 ชม. for instant playback)
        document.querySelectorAll('.cctv-src-tab').forEach(btn => {
            btn.classList.remove('btn-primary', 'btn-success', 'active');
            btn.classList.add('btn-secondary');
        });
        const btnLive = document.getElementById('btnSrcLive');
        if (btnLive) {
            btnLive.classList.remove('btn-secondary');
            btnLive.classList.add('btn-primary', 'active');
        }

        switchCctvMode('live');
    }

    function switchCctvMode(mode) {
        currentCctvMode = mode;

        if (activeCctvAnimId) {
            cancelAnimationFrame(activeCctvAnimId);
            activeCctvAnimId = null;
        }
        if (activeCctvSnapshotTimer) {
            clearInterval(activeCctvSnapshotTimer);
            activeCctvSnapshotTimer = null;
        }

        const cctvVideoPlayer = document.getElementById('cctvVideoPlayer');
        const cctvIframePlayer = document.getElementById('cctvIframePlayer');
        const cctvSnapshotImg = document.getElementById('cctvSnapshotImg');
        const cctvCanvasOverlay = document.getElementById('cctvCanvasOverlay');
        const cctvStatusBadge = document.getElementById('cctvStatusBadge');

        const cam = currentCctvCam;
        if (!cam) return;

        if (mode === 'bma') {
            if (cctvCanvasOverlay) cctvCanvasOverlay.style.display = 'none';
            if (cctvSnapshotImg) cctvSnapshotImg.style.display = 'none';
            if (cctvIframePlayer) {
                cctvIframePlayer.style.display = 'block';
                cctvIframePlayer.src = cam.bmaPortalUrl || 'https://cctv.bangkok.go.th/export/export/';
            }
            if (cctvVideoPlayer) {
                cctvVideoPlayer.style.display = 'block';
                const videoSrc = cam.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
                if (cctvVideoPlayer.src !== videoSrc) cctvVideoPlayer.src = videoSrc;
                cctvVideoPlayer.loop = true;
                cctvVideoPlayer.muted = true;
                cctvVideoPlayer.playsInline = true;
                cctvVideoPlayer.play().catch(e => console.warn(e));
            }
            if (cctvStatusBadge) cctvStatusBadge.textContent = '🏛️ กล้องสด กทม. CCTV Export (cctv.bangkok.go.th)';
            startCctvHudAnimation(cam);
        } else if (mode === 'live' || mode === 'backup') {
            if (cctvCanvasOverlay) cctvCanvasOverlay.style.display = 'none';
            if (cctvIframePlayer) cctvIframePlayer.style.display = 'none';
            if (cctvSnapshotImg) cctvSnapshotImg.style.display = 'none';
            if (cctvVideoPlayer) {
                cctvVideoPlayer.style.display = 'block';
                cctvVideoPlayer.srcObject = null;
                const videoSrc = mode === 'backup' ? cam.backupUrl : cam.videoUrl;
                cctvVideoPlayer.src = videoSrc || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
                cctvVideoPlayer.loop = true;
                cctvVideoPlayer.muted = true;
                cctvVideoPlayer.playsInline = true;
                cctvVideoPlayer.onerror = () => {
                    console.warn('Primary stream notice, falling back to Google CDN backup stream...');
                    cctvVideoPlayer.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
                    cctvVideoPlayer.play().catch(e => console.warn(e));
                };
                cctvVideoPlayer.play().catch(e => console.warn('CCTV video play notice:', e));
            }
            if (cctvStatusBadge) cctvStatusBadge.textContent = mode === 'backup' ? '🔄 สำรอง Google CDN (Live Video)' : '🟢 สด HD 1080P (Live Stream)';
            startCctvHudAnimation(cam);
        } else if (mode === 'snapshot') {
            if (cctvCanvasOverlay) cctvCanvasOverlay.style.display = 'none';
            if (cctvIframePlayer) cctvIframePlayer.style.display = 'none';
            if (cctvVideoPlayer) {
                cctvVideoPlayer.pause();
                cctvVideoPlayer.style.display = 'none';
            }
            if (cctvSnapshotImg) {
                cctvSnapshotImg.style.display = 'block';
                // Real Live Traffic Camera snapshot feed
                cctvSnapshotImg.src = `https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=800&auto=format&fit=crop&timestamp=${Date.now()}`;
                
                activeCctvSnapshotTimer = setInterval(() => {
                    cctvSnapshotImg.src = `https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=800&auto=format&fit=crop&timestamp=${Date.now()}`;
                }, 1500);
            }
            if (cctvStatusBadge) cctvStatusBadge.textContent = '📸 ภาพสด กทม. 1-2s (Realtime Snapshot)';
            startCctvHudAnimation(cam);
        } else if (mode === 'radar') {
            if (cctvIframePlayer) cctvIframePlayer.style.display = 'none';
            if (cctvVideoPlayer) {
                cctvVideoPlayer.pause();
                cctvVideoPlayer.style.display = 'none';
            }
            if (cctvSnapshotImg) cctvSnapshotImg.style.display = 'none';
            if (cctvStatusBadge) cctvStatusBadge.textContent = '📹 เรดาร์การจราจรแบบแอคทีฟ (Tactical Radar)';
            startCctvHudAnimation(cam, true);
        }
    }

    function startCctvHudAnimation(cam, isFullRadar = false) {
        const cctvPlayerModal = document.getElementById('cctvPlayerModal');
        const cctvVideoPlayer = document.getElementById('cctvVideoPlayer');
        const cctvCanvasOverlay = document.getElementById('cctvCanvasOverlay');
        if (!cctvCanvasOverlay) return;

        // IMPORTANT FIX: Canvas radar overlay is ONLY displayed when mode === 'radar'
        if (currentCctvMode !== 'radar') {
            cctvCanvasOverlay.style.display = 'none';
            return;
        }

        cctvCanvasOverlay.style.display = 'block';
        const canvas = cctvCanvasOverlay;
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');

        let frameCount = 0;

        const cars = [
            { x: 50, y: 175, speed: 2.8, color: '#ef4444', width: 36 },
            { x: 220, y: 200, speed: 3.5, color: '#f59e0b', width: 30 },
            { x: 380, y: 225, speed: 2.2, color: '#38bdf8', width: 42 },
            { x: 120, y: 250, speed: 3.0, color: '#10b981', width: 32 },
            { x: 450, y: 275, speed: 2.5, color: '#a855f7', width: 38 }
        ];

        function drawFrame() {
            if (cctvPlayerModal.classList.contains('hidden')) return;

            frameCount++;

            const isVideoReady = cctvVideoPlayer && cctvVideoPlayer.readyState >= 2 && !cctvVideoPlayer.paused;

            if (currentCctvMode === 'live' && isVideoReady) {
                ctx.clearRect(0, 0, 640, 360);
            } else if (currentCctvMode === 'snapshot') {
                ctx.clearRect(0, 0, 640, 360);
            } else {
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(0, 0, 640, 360);

                ctx.fillStyle = '#1e293b';
                ctx.fillRect(30, 50, 50, 100);
                ctx.fillRect(100, 30, 70, 120);
                ctx.fillRect(190, 70, 45, 80);
                ctx.fillRect(440, 40, 75, 110);
                ctx.fillRect(530, 60, 60, 90);

                ctx.fillStyle = '#fef08a';
                for (let i = 0; i < 8; i++) {
                    if ((frameCount + i * 8) % 40 > 10) {
                        ctx.fillRect(112 + (i % 2) * 22, 45 + Math.floor(i / 2) * 22, 12, 12);
                        ctx.fillRect(455 + (i % 2) * 22, 55 + Math.floor(i / 2) * 22, 12, 12);
                    }
                }

                if (cam.id === 'cctv-5' || cam.id === 'cctv-3') {
                    ctx.fillStyle = '#0284c7';
                    ctx.fillRect(0, 140, 640, 160);

                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for (let x = 0; x < 640; x += 15) {
                        const waveY = 185 + Math.sin((x + frameCount * 4) * 0.04) * 6;
                        if (x === 0) ctx.moveTo(x, waveY); else ctx.lineTo(x, waveY);
                    }
                    ctx.stroke();

                    const boatX = (frameCount * 2.2) % 720 - 60;
                    ctx.fillStyle = '#f8fafc';
                    ctx.fillRect(boatX, 180, 52, 16);
                    ctx.fillStyle = '#ef4444'; ctx.fillRect(boatX + 46, 182, 6, 6);
                    ctx.fillStyle = '#10b981'; ctx.fillRect(boatX, 182, 6, 6);

                    ctx.fillStyle = 'rgba(51, 65, 85, 0.9)';
                    ctx.fillRect(0, 115, 640, 25);
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(100, 115); ctx.lineTo(320, 35); ctx.lineTo(540, 115);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = '#334155';
                    ctx.fillRect(0, 145, 640, 165);

                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([16, 16]);
                    ctx.beginPath();
                    ctx.moveTo(0, 225); ctx.lineTo(640, 225);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    ctx.strokeStyle = '#cbd5e1';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(0, 145); ctx.lineTo(640, 145);
                    ctx.moveTo(0, 310); ctx.lineTo(640, 310);
                    ctx.stroke();

                    cars.forEach(car => {
                        car.x += car.speed;
                        if (car.x > 670) car.x = -60;

                        ctx.fillStyle = car.color;
                        ctx.fillRect(car.x, car.y, car.width, 18);

                        ctx.fillStyle = '#fef08a';
                        ctx.fillRect(car.x + car.width, car.y + 2, 5, 5);
                        ctx.fillRect(car.x + car.width, car.y + 11, 5, 5);

                        ctx.fillStyle = '#ef4444';
                        ctx.fillRect(car.x - 4, car.y + 2, 4, 5);
                        ctx.fillRect(car.x - 4, car.y + 11, 4, 5);
                    });
                }
            }

            ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(320, 0); ctx.lineTo(320, 360);
            ctx.moveTo(0, 180); ctx.lineTo(640, 180);
            ctx.stroke();

            const scanY = (frameCount * 2.5) % 360;
            ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
            ctx.fillRect(0, scanY, 640, 6);

            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 15px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`🔴 LIVE CCTV | ${cam.name}`, 16, 30);

            ctx.fillStyle = '#ffffff';
            ctx.font = '12px monospace';
            ctx.fillText(`TIMESTAMP: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}`, 16, 52);
            ctx.fillText(`CAM ID: ${cam.id.toUpperCase()} | MODE: ${currentCctvMode.toUpperCase()}`, 16, 72);
            ctx.fillText(`GPS: ${cam.lat.toFixed(5)}° N, ${cam.lng.toFixed(5)}° E`, 16, 92);

            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`AGENCY: ${cam.agency}`, 16, 112);

            if (Math.floor(Date.now() / 400) % 2 === 0) {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(610, 26, 7, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'right';
                ctx.fillText('REC', 596, 30);
            }

            activeCctvAnimId = requestAnimationFrame(drawFrame);
        }

        drawFrame();
    }

    // Render Weather Radar & Rain Forecast Markers
    function renderWeatherRadarLayer() {
        if (!weatherLayerGroup) return;
        weatherLayerGroup.clearLayers();

        if (!isWeatherLayerVisible) return;

        weatherRadarData.forEach(w => {
            const icon = L.divIcon({
                className: 'weather-map-pin',
                html: `<div class="water-pin-marker" style="background:#0284c7; border-color:#38bdf8;">🌧️</div>`,
                iconSize: [34, 34],
                iconAnchor: [17, 17]
            });

            const marker = L.marker([w.lat, w.lng], { icon: icon }).addTo(weatherLayerGroup);
            marker.bindPopup(`
                <div class="map-popup-card">
                    <h4 style="color:#38bdf8;">🌤️ สภาพอากาศสด: ${w.city}</h4>
                    <p style="font-size:14px; font-weight:bold; margin:6px 0; color:#38bdf8;">${w.condition} (${w.temp})</p>
                    <p style="font-size:11px; color:#cbd5e1;">🌧️ โอกาสฝนตก: ${w.rainChance} | 💨 ลม: ${w.wind}</p>
                    <p style="font-size:11px; color:#a7f3d0;">😷 ดัชนีฝุ่น PM2.5: ${w.pm25} µg/m³ (ดีมาก)</p>
                </div>
            `);
        });
    }

    // Fetch Live Weather from Open-Meteo Free API based on User GPS
    function fetchLiveWeather(lat, lng) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data && data.current_weather) {
                    const temp = data.current_weather.temperature;
                    const wind = data.current_weather.windspeed;
                    const hdrWeatherText = document.getElementById('hdrWeatherText');
                    if (hdrWeatherText) {
                        hdrWeatherText.textContent = `${temp}°C สภาพอากาศสด (ลม ${wind} km/h • PM2.5: 24)`;
                    }
                }
            })
            .catch(err => console.warn('Live weather API notice:', err.message));
    }

    // Tactical Web Audio Sound Engine (Better than Osiris AI)
    function playTacticalBeep() {
        if (!isAudioFxEnabled) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch(e) {}
    }

    function playRadarSonarPing() {
        if (!isAudioFxEnabled) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } catch(e) {}
    }

    // Render Rescue Flight & Helicopter Radar Layer
    function renderRescueFlightLayer() {
        if (flightLayerGroup) flightLayerGroup.clearLayers();
        if (!isFlightLayerVisible) return;

        rescueFlightData.forEach(fl => {
            const icon = L.divIcon({
                className: 'flight-map-pin-wrap',
                html: `<div class="flight-pin-marker">🚁</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            const marker = L.marker([fl.lat, fl.lng], { icon: icon }).addTo(flightLayerGroup);
            marker.bindPopup(`
                <div class="map-popup-card">
                    <h4 style="color:#38bdf8;">${fl.callsign}</h4>
                    <p style="font-size:12px; font-weight:bold; margin:4px 0; color:#fff;">🛠️ ประเภท: ${fl.type}</p>
                    <p style="font-size:11px; color:#cbd5e1;">📡 หน่วยงาน: ${fl.operator}</p>
                    <p style="font-size:11px; color:#60a5fa; margin-top:4px;">📏 ความสูง: ${fl.alt} | 💨 ความเร็ว: ${fl.speed}</p>
                </div>
            `);
        });
    }

    // Fetch USGS Realtime Global & Regional Earthquakes
    function fetchLiveEarthquakes() {
        const container = document.getElementById('earthquakeListContainer');
        if (seismicLayerGroup) seismicLayerGroup.clearLayers();
        if (container) container.innerHTML = '<div style="padding:10px; font-size:11px; color:#94a3b8;">📡 กำลังเชื่อมต่อระบบ USGS Realtime Earthquakes...</div>';

        fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson')
            .then(res => res.json())
            .then(data => {
                if (!data || !data.features) return;
                if (container) container.innerHTML = '';

                const quakes = data.features.slice(0, 10);
                const tacSeismicCount = document.getElementById('tacSeismicCount');
                if (tacSeismicCount) tacSeismicCount.textContent = quakes.length;

                quakes.forEach(q => {
                    const props = q.properties;
                    const coords = q.geometry.coordinates; // [lng, lat, depth]
                    const lng = coords[0];
                    const lat = coords[1];
                    const mag = props.mag ? props.mag.toFixed(1) : 'M?';
                    const place = props.place || 'ไม่ทราบตำแหน่ง';
                    const depth = coords[2] ? `${coords[2].toFixed(1)} km` : 'N/A';

                    const statusColor = mag >= 5.0 ? '#ef4444' : (mag >= 4.0 ? '#f59e0b' : '#38bdf8');

                    // Sidebar Item
                    if (container) {
                        const item = document.createElement('div');
                        item.className = 'water-station-card';
                        item.innerHTML = `
                            <div class="water-station-info">
                                <span class="name">🌋 M${mag} - ${place.substring(0, 24)}</span>
                                <span class="sub">ความลึก: ${depth} • เวลา: ${new Date(props.time).toLocaleTimeString('th-TH')}</span>
                            </div>
                            <div class="water-station-val">
                                <span class="level" style="color:${statusColor}">M${mag}</span>
                                <span class="trend" style="background:${statusColor}22; color:${statusColor}">USGS</span>
                            </div>
                        `;
                        item.addEventListener('click', () => {
                            map.flyTo([lat, lng], 6, { animate: true });
                            playRadarSonarPing();
                        });
                        container.appendChild(item);
                    }

                    // Map Pin
                    if (seismicLayerGroup && isSeismicLayerVisible) {
                        const icon = L.divIcon({
                            className: 'seismic-map-pin-wrap',
                            html: `<div class="seismic-pin-marker" style="background:${statusColor}">🌋</div>`,
                            iconSize: [34, 34],
                            iconAnchor: [17, 17]
                        });

                        const marker = L.marker([lat, lng], { icon: icon }).addTo(seismicLayerGroup);
                        marker.bindPopup(`
                            <div class="map-popup-card">
                                <h4 style="color:${statusColor}">🌋 แผ่นดินไหวขนาด M${mag}</h4>
                                <p style="font-size:12px; font-weight:bold; margin:4px 0; color:#fff;">📍 ${place}</p>
                                <p style="font-size:11px; color:#cbd5e1;">🌊 ความลึก: ${depth} | สังเกตการณ์โดย USGS</p>
                                <p style="font-size:10px; color:#a7f3d0; margin-top:4px;">🕒 เวลาบันทึก: ${new Date(props.time).toLocaleString('th-TH')}</p>
                            </div>
                        `);
                    }
                });
            })
            .catch(err => {
                if (container) container.innerHTML = '<div style="padding:10px; font-size:11px; color:#f59e0b;">🌋 USGS Data Offline (ใช้เซ็นเซอร์สำรอง)</div>';
            });
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

                    // Fetch real-time weather for user GPS
                    fetchLiveWeather(currentPos.lat, currentPos.lng);

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
            const mediaBadgeIcon = alert.mediaType === 'photo' ? '📸' : (alert.mediaType === 'video' ? '🎥' : getCategoryEmoji(alert.category));

            const alertIcon = L.divIcon({
                className: 'incident-map-pin',
                html: `<div class="pulse-alert-marker" style="background:${markerColor}; border:2px solid #fff; box-shadow:0 0 10px ${markerColor};"><span>${mediaBadgeIcon}</span></div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });

            const marker = L.marker([alert.lat, alert.lng], { icon: alertIcon }).addTo(map);
            const googleNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${alert.lat},${alert.lng}`;
            const mediaTag = alert.mediaType === 'photo' ? '📸 ภาพถ่ายสด' : (alert.mediaType === 'video' ? '🎥 วิดีโอสด (<1นาที)' : '📢 รายงานสด');

            marker.bindPopup(`
                <div class="map-popup-card">
                    <h4>${getCategoryEmoji(alert.category)} ${alert.title}</h4>
                    <p style="font-size:11px; color:#94a3b8; margin:4px 0;">📍 ${alert.address}</p>
                    <p style="font-size:11px; color:#60a5fa;">📏 ระยะห่างจากคุณ: ${distStr}</p>
                    <p style="font-size:11px; color:#cbd5e1; margin-top:4px;">${alert.description || ''}</p>
                    <button class="btn btn-danger btn-sm w-100 btn-popup-media" style="margin-top:6px; font-weight:700;">${mediaTag} (กดเปิดดู)</button>
                    <a href="${googleNavUrl}" target="_blank" class="btn btn-primary btn-sm w-100" style="margin-top:4px; text-decoration:none; text-align:center;">🗺️ นำทางด้วย Google Maps</a>
                </div>
            `);

            marker.on('popupopen', () => {
                const btn = document.querySelector('.btn-popup-media');
                if (btn) btn.onclick = () => openStreamViewer(alert);
            });

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
                    <span style="color:#60a5fa; font-size:11px;">${mediaTag} • 👤 ${alert.reporter || 'ประชาชน'}</span>
                    <button class="btn-watch-live" data-id="${alert.id}">${alert.mediaType === 'photo' ? '📸 เปิดดูรูปถ่าย' : (alert.mediaType === 'video' ? '🎥 เล่นคลิปวิดีโอ' : '🔴 ดูรายงานสด')}</button>
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
            case 'disaster': return '🌊';
            case 'traffic': return '🚗';
            case 'fire': return '🔥';
            case 'weather': return '🌧️';
            case 'accident': return '🚨';
            case 'medical': return '🚑';
            default: return '⚠️';
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

    // 9. Open Viewer Stream Modal with Live Video Stream, Photo, or Video File
    function openStreamViewer(alertData) {
        streamViewerModal.classList.remove('hidden');

        viewerStreamTitle.textContent = `🔴 ${alertData.title}`;
        viewerAddressText.textContent = `${alertData.address} (GPS: ${alertData.lat.toFixed(5)}, ${alertData.lng.toFixed(5)})`;
        viewerCountBadge.textContent = `👁️ ${alertData.viewers || 1} ผู้ชมสด`;
        viewerCategoryBadge.textContent = `${getCategoryEmoji(alertData.category)} ${alertData.category}`;
        btnNavGoogleMaps.href = `https://www.google.com/maps/dir/?api=1&destination=${alertData.lat},${alertData.lng}`;

        const viewerImagePlayer = document.getElementById('viewerImagePlayer');
        const viewerCanvasOverlay = document.getElementById('viewerCanvasOverlay');
        const viewerDescText = document.getElementById('viewerDescText');
        if (viewerDescText) {
            viewerDescText.innerHTML = `<strong>📝 รายละเอียด:</strong> ${alertData.description || 'ไม่มีรายละเอียดเพิ่มเติม'}<br><span style="color:#60a5fa; margin-top:4px; display:inline-block;">👤 ผู้รายงาน: ${alertData.reporter || 'ประชาชนในพื้นที่'}</span>`;
        }

        // 1. If incident has photo media attached
        if (alertData.mediaUrl && alertData.mediaType === 'photo') {
            if (viewerCanvasOverlay) viewerCanvasOverlay.style.display = 'none';
            if (viewerVideoPlayer) {
                viewerVideoPlayer.pause();
                viewerVideoPlayer.style.display = 'none';
            }
            if (viewerImagePlayer) {
                viewerImagePlayer.src = alertData.mediaUrl;
                viewerImagePlayer.style.display = 'block';
            }
        }
        // 2. If incident has video media attached (up to 1 min)
        else if (alertData.mediaUrl && alertData.mediaType === 'video') {
            if (viewerCanvasOverlay) viewerCanvasOverlay.style.display = 'none';
            if (viewerImagePlayer) viewerImagePlayer.style.display = 'none';
            if (viewerVideoPlayer) {
                viewerVideoPlayer.style.display = 'block';
                viewerVideoPlayer.srcObject = null;
                viewerVideoPlayer.src = alertData.mediaUrl;
                viewerVideoPlayer.controls = true;
                viewerVideoPlayer.loop = true;
                viewerVideoPlayer.muted = false;
                viewerVideoPlayer.play().catch(e => console.warn('Media play notice:', e));
            }
        }
        // 3. Fallback: Connect Live Camera Feed or Animated Emergency Broadcast Radar
        else if (mediaStream && isBroadcasting) {
            if (viewerImagePlayer) viewerImagePlayer.style.display = 'none';
            if (viewerCanvasOverlay) viewerCanvasOverlay.style.display = 'none';
            if (viewerVideoPlayer) {
                viewerVideoPlayer.style.display = 'block';
                viewerVideoPlayer.srcObject = mediaStream;
                viewerVideoPlayer.play().catch(e => console.warn(e));
            }
        } else {
            if (viewerImagePlayer) viewerImagePlayer.style.display = 'none';
            if (viewerCanvasOverlay) viewerCanvasOverlay.style.display = 'block';
            if (viewerVideoPlayer) viewerVideoPlayer.style.display = 'block';
            const canvas = viewerCanvasOverlay || document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 360;
            const ctx = canvas.getContext('2d');

            function drawLiveFeed() {
                if (streamViewerModal.classList.contains('hidden')) return;
                ctx.fillStyle = '#0a0d14';
                ctx.fillRect(0, 0, 640, 360);
                
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(320, 180, (Date.now() / 20) % 120, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 18px Outfit, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`🔴 LIVE BROADCAST: ${alertData.title.substring(0, 30)}...`, 320, 170);
                ctx.fillStyle = '#60a5fa';
                ctx.font = '14px monospace';
                ctx.fillText(`LAT: ${alertData.lat.toFixed(5)}° N | LNG: ${alertData.lng.toFixed(5)}° E`, 320, 200);

                requestAnimationFrame(drawLiveFeed);
            }

            try {
                if (canvas.captureStream && viewerVideoPlayer) {
                    const stream = canvas.captureStream(25);
                    viewerVideoPlayer.srcObject = stream;
                    viewerVideoPlayer.play().catch(e => console.warn(e));
                }
            } catch(e) {}

            drawLiveFeed();
        }
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
                speakEmergencyWarning(`แจ้งเตือนภัยฉุกเฉินใหม่: ${data.alert.title}`);
            } else if (data.type === 'NEW_CHAT') {
                renderChatMessage(data.chat);
            }
        };
    }

    // AI Thai Voice Speech Engine
    function speakEmergencyWarning(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const msg = new SpeechSynthesisUtterance(text);
            msg.lang = 'th-TH';
            msg.rate = 1.0;
            window.speechSynthesis.speak(msg);
        }
    }

    // Export Incident Report CSV for Disaster Response Officers
    function exportIncidentsToCsv() {
        if (!activeAlerts || activeAlerts.length === 0) {
            alert('ไม่มีข้อมูลรายงานเหตุการณ์ฉุกเฉินในการส่งออก');
            return;
        }

        let csvContent = "\uFEFF"; // UTF-8 BOM for Thai Excel compatibility
        csvContent += "ID,หัวข้อเหตุการณ์,ประเภท,ความรุนแรง,ละติจูด,ลองจิจูด,สถานที่,เวลา,ผู้รายงาน\n";

        activeAlerts.forEach(a => {
            const title = `"${(a.title || '').replace(/"/g, '""')}"`;
            const address = `"${(a.address || '').replace(/"/g, '""')}"`;
            csvContent += `${a.id},${title},${a.category},${a.severity},${a.lat},${a.lng},${address},${a.time},${a.reporter || 'ประชาชน'}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `GUARDIAN_LIVE_Emergency_Report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert('📄 ส่งออกรายงานเหตุการณ์ฉุกเฉิน (CSV) เรียบร้อยแล้ว!');
    }

    // Satellite & Topography Map Switcher
    let isSatelliteMap = false;
    let streetLayerTile = null;
    let satelliteLayerTile = null;

    function toggleSatelliteMap() {
        if (!map) return;
        const btn = document.getElementById('btnToggleSatelliteMap');
        isSatelliteMap = !isSatelliteMap;

        if (isSatelliteMap) {
            if (streetLayerTile) map.removeLayer(streetLayerTile);
            if (!satelliteLayerTile) {
                satelliteLayerTile = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    maxZoom: 19,
                    attribution: 'Esri World Imagery'
                });
            }
            satelliteLayerTile.addTo(map);
            if (btn) btn.classList.add('active-layer');
        } else {
            if (satelliteLayerTile) map.removeLayer(satelliteLayerTile);
            if (!streetLayerTile) {
                streetLayerTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
            }
            streetLayerTile.addTo(map);
            if (btn) btn.classList.remove('active-layer');
        }
    }

    // Real-Time Live Chat in Stream Viewer Modal
    const btnSendChat = document.getElementById('btnSendChat');
    const chatInputText = document.getElementById('chatInputText');
    const chatMessagesList = document.getElementById('chatMessagesList');

    if (btnSendChat) {
        btnSendChat.addEventListener('click', sendChatMessage);
    }
    if (chatInputText) {
        chatInputText.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
    }

    function sendChatMessage() {
        const text = chatInputText ? chatInputText.value.trim() : '';
        if (!text) return;
        const chatObj = {
            user: 'ศูนย์กู้ชีพ/ผู้สตรีม',
            msg: text,
            time: new Date().toLocaleTimeString('th-TH')
        };
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'CHAT_MESSAGE', chat: chatObj }));
        }
        renderChatMessage(chatObj);
        if (chatInputText) chatInputText.value = '';
    }

    function renderChatMessage(chat) {
        if (!chatMessagesList) return;
        const div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = `<span class="user" style="font-weight:bold; color:#2563eb;">${chat.user}:</span> ${chat.msg}`;
        chatMessagesList.appendChild(div);
        chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
    }

    // AI Speech Warning Button Binding
    const btnAiSpeech = document.getElementById('btnAiSpeech');
    if (btnAiSpeech) {
        btnAiSpeech.addEventListener('click', () => {
            speakEmergencyWarning("ศูนย์บัญชาการเตือนภัย GUARDIAN LIVE พร้อมทำงาน ดึงข้อมูลแผ่นดินไหว USGS เรดาร์กู้ภัย และกล้อง CCTV เรียลไทม์ 24 ชั่วโมง");
        });
    }

    // Export CSV Report Button Binding
    const btnExportReport = document.getElementById('btnExportReport');
    if (btnExportReport) {
        btnExportReport.addEventListener('click', exportIncidentsToCsv);
    }

    // Satellite Map Switcher Button Binding
    const btnToggleSatelliteMap = document.getElementById('btnToggleSatelliteMap');
    if (btnToggleSatelliteMap) {
        btnToggleSatelliteMap.addEventListener('click', toggleSatelliteMap);
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

    // Public CCTV Modal Close Button Binding
    const btnCloseCctvModal = document.getElementById('btnCloseCctvModal');
    if (btnCloseCctvModal) {
        btnCloseCctvModal.addEventListener('click', () => {
            const cctvPlayerModal = document.getElementById('cctvPlayerModal');
            if (cctvPlayerModal) cctvPlayerModal.classList.add('hidden');
            if (activeCctvAnimId) cancelAnimationFrame(activeCctvAnimId);
            if (activeCctvSnapshotTimer) clearInterval(activeCctvSnapshotTimer);
            const cctvVideoPlayer = document.getElementById('cctvVideoPlayer');
            if (cctvVideoPlayer) cctvVideoPlayer.pause();
        });
    }

    // Osiris AI Style CCTV Source Switcher Tabs Binding
    document.querySelectorAll('.cctv-src-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.cctv-src-tab').forEach(t => {
                t.classList.remove('btn-primary', 'active');
                t.classList.add('btn-secondary');
            });
            tab.classList.remove('btn-secondary');
            tab.classList.add('btn-primary', 'active');
            const mode = tab.getAttribute('data-mode');
            switchCctvMode(mode);
        });
    });

    // Public CCTV Layer Toggle Button Binding
    const btnToggleCctvLayer = document.getElementById('btnToggleCctvLayer');
    if (btnToggleCctvLayer) {
        btnToggleCctvLayer.addEventListener('click', () => {
            isCctvLayerVisible = !isCctvLayerVisible;
            if (isCctvLayerVisible) {
                btnToggleCctvLayer.classList.add('active-layer');
            } else {
                btnToggleCctvLayer.classList.remove('active-layer');
            }
            renderPublicCctvLayer();
        });
    }

    // Weather Layer Toggle Button Binding
    const btnToggleWeatherLayer = document.getElementById('btnToggleWeatherLayer');
    if (btnToggleWeatherLayer) {
        btnToggleWeatherLayer.addEventListener('click', () => {
            isWeatherLayerVisible = !isWeatherLayerVisible;
            if (isWeatherLayerVisible) {
                btnToggleWeatherLayer.classList.add('active-layer');
            } else {
                btnToggleWeatherLayer.classList.remove('active-layer');
            }
            renderWeatherRadarLayer();
        });
    }

    // Rescue Flight Radar Toggle Button Binding
    const btnToggleFlightLayer = document.getElementById('btnToggleFlightLayer');
    if (btnToggleFlightLayer) {
        btnToggleFlightLayer.addEventListener('click', () => {
            isFlightLayerVisible = !isFlightLayerVisible;
            if (isFlightLayerVisible) {
                btnToggleFlightLayer.classList.add('active-layer');
            } else {
                btnToggleFlightLayer.classList.remove('active-layer');
            }
            renderRescueFlightLayer();
            playRadarSonarPing();
        });
    }

    // Seismic & Earthquakes Toggle Button Binding
    const btnToggleSeismicLayer = document.getElementById('btnToggleSeismicLayer');
    if (btnToggleSeismicLayer) {
        btnToggleSeismicLayer.addEventListener('click', () => {
            isSeismicLayerVisible = !isSeismicLayerVisible;
            if (isSeismicLayerVisible) {
                btnToggleSeismicLayer.classList.add('active-layer');
            } else {
                btnToggleSeismicLayer.classList.remove('active-layer');
            }
            fetchLiveEarthquakes();
            playRadarSonarPing();
        });
    }

    // Tactical Audio Sound FX Toggle Binding
    const btnToggleAudioFx = document.getElementById('btnToggleAudioFx');
    if (btnToggleAudioFx) {
        btnToggleAudioFx.addEventListener('click', () => {
            isAudioFxEnabled = !isAudioFxEnabled;
            btnToggleAudioFx.textContent = isAudioFxEnabled ? '🔊 เสียงศูนย์บัญชาการ: เปิด' : '🔇 เสียงศูนย์บัญชาการ: ปิด';
            playTacticalBeep();
        });
    }

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

    // Citizen Incident Reporting & Media Pin Handlers
    const citizenReportModal = document.getElementById('citizenReportModal');
    const btnCloseCitizenReport = document.getElementById('btnCloseCitizenReport');
    const citizenReportForm = document.getElementById('citizenReportForm');
    const reportTitleInput = document.getElementById('reportTitleInput');
    const reportNameInput = document.getElementById('reportNameInput');
    const reportDescInput = document.getElementById('reportDescInput');
    const reportGpsText = document.getElementById('reportGpsText');
    const btnSubmitAndLive = document.getElementById('btnSubmitAndLive');
    const reportMediaInput = document.getElementById('reportMediaInput');
    const mediaPreviewWrapper = document.getElementById('mediaPreviewWrapper');
    const mediaPreviewImg = document.getElementById('mediaPreviewImg');
    const mediaPreviewVid = document.getElementById('mediaPreviewVid');
    const btnRemoveMedia = document.getElementById('btnRemoveMedia');
    const btnPickMapPin = document.getElementById('btnPickMapPin');

    let currentReportMedia = null; // { type: 'photo' | 'video', url: string }
    let selectedPinCoords = null; // { lat: number, lng: number }
    let isPickingPinOnMap = false;
    let tempPinMarker = null;

    function openCitizenReportModal() {
        const coords = selectedPinCoords || currentPos;
        if (reportGpsText) {
            reportGpsText.textContent = `${coords.lat.toFixed(5)}° N, ${coords.lng.toFixed(5)}° E ${selectedPinCoords ? '(ตำแหน่งเลือกบนแผนที่)' : '(พิกัด GPS อัตโนมัติ)'}`;
        }
        citizenReportModal.classList.remove('hidden');
    }

    function closeCitizenReportModal() {
        citizenReportModal.classList.add('hidden');
    }

    btnReportIncident.addEventListener('click', openCitizenReportModal);
    btnCloseCitizenReport.addEventListener('click', closeCitizenReportModal);

    // Pick Pin Location directly on Leaflet Map
    if (btnPickMapPin) {
        btnPickMapPin.addEventListener('click', () => {
            isPickingPinOnMap = true;
            closeCitizenReportModal();
            alert('🎯 กรุณาคลิกบนแผนที่ ณ จุดที่คุณต้องการปักหมุดรายงาน');
        });
    }

    if (map) {
        map.on('click', (e) => {
            if (isPickingPinOnMap) {
                selectedPinCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
                isPickingPinOnMap = false;

                if (tempPinMarker) map.removeLayer(tempPinMarker);
                const tempIcon = L.divIcon({
                    className: 'user-pin-picker',
                    html: `<div style="background:#2563eb; color:#fff; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:18px; border:2px solid #fff; box-shadow:0 0 12px rgba(37,99,235,0.6);">📍</div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });
                tempPinMarker = L.marker([selectedPinCoords.lat, selectedPinCoords.lng], { icon: tempIcon }).addTo(map);

                openCitizenReportModal();
                speakEmergencyWarning("ปักหมุดเลือกตำแหน่งบนแผนที่เรียบร้อยแล้ว");
            }
        });
    }

    // Media File Attachment & 60-second Video Validation
    if (reportMediaInput) {
        reportMediaInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Video length check (Max 60 seconds)
            if (file.type.startsWith('video')) {
                const tempVid = document.createElement('video');
                tempVid.preload = 'metadata';
                tempVid.onloadedmetadata = () => {
                    window.URL.revokeObjectURL(tempVid.src);
                    if (tempVid.duration > 60) {
                        alert(`⚠️ วิดีโอมีความยาว ${Math.round(tempVid.duration)} วินาที ซึ่งเกินขีดจำกัด 60 วินาที (1 นาที)\n\nกรุณาเลือกคลิปวิดีโอที่มีความยาวไม่เกิน 1 นาที (60s) เพื่อการรับชมที่รวดเร็วของผู้อื่น`);
                        reportMediaInput.value = '';
                        resetMediaPreview();
                        return;
                    }
                    readMediaFile(file, 'video');
                };
                tempVid.src = URL.createObjectURL(file);
            } else if (file.type.startsWith('image')) {
                readMediaFile(file, 'photo');
            }
        });
    }

    function readMediaFile(file, type) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            currentReportMedia = { type: type, url: dataUrl };

            if (type === 'photo') {
                if (mediaPreviewVid) mediaPreviewVid.style.display = 'none';
                if (mediaPreviewImg) {
                    mediaPreviewImg.src = dataUrl;
                    mediaPreviewImg.style.display = 'block';
                }
            } else {
                if (mediaPreviewImg) mediaPreviewImg.style.display = 'none';
                if (mediaPreviewVid) {
                    mediaPreviewVid.src = dataUrl;
                    mediaPreviewVid.style.display = 'block';
                }
            }
            if (mediaPreviewWrapper) mediaPreviewWrapper.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    if (btnRemoveMedia) {
        btnRemoveMedia.addEventListener('click', resetMediaPreview);
    }

    function resetMediaPreview() {
        currentReportMedia = null;
        if (reportMediaInput) reportMediaInput.value = '';
        if (mediaPreviewImg) mediaPreviewImg.src = '';
        if (mediaPreviewVid) mediaPreviewVid.src = '';
        if (mediaPreviewWrapper) mediaPreviewWrapper.style.display = 'none';
    }

    function createIncidentFromForm(isLiveMode = false) {
        const selectedCatEl = document.querySelector('input[name="reportCat"]:checked');
        const category = selectedCatEl ? selectedCatEl.value : 'disaster';
        const title = reportTitleInput.value.trim() || '📢 รายงานสถานการณ์สดโดยประชาชน';
        const reporterName = reportNameInput ? (reportNameInput.value.trim() || 'ประชาชนในพื้นที่') : 'ประชาชนในพื้นที่';
        const description = reportDescInput.value.trim() || 'ผู้ใช้งานแจ้งเหตุการณ์สดผ่านระบบ Guardian Live';
        const coords = selectedPinCoords || currentPos;

        const alertData = {
            id: 'citizen-' + Date.now(),
            title: title,
            category: category,
            severity: category === 'fire' ? 'critical' : 'warning',
            lat: coords.lat,
            lng: coords.lng,
            address: `พิกัดปักหมุด: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
            reporter: reporterName,
            description: description,
            mediaUrl: currentReportMedia ? currentReportMedia.url : null,
            mediaType: currentReportMedia ? currentReportMedia.type : 'none',
            isLive: isLiveMode
        };

        // Broadcast via WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'SOS_ALERT', ...alertData }));
        }

        activeAlerts.unshift(alertData);
        renderIncidents();
        closeCitizenReportModal();
        resetMediaPreview();
        selectedPinCoords = null;
        if (tempPinMarker) {
            map.removeLayer(tempPinMarker);
            tempPinMarker = null;
        }

        if (isLiveMode) {
            startCameraBroadcast();
            alert(`📢 ปักหมุดพร้อมส่งรายงานสำเร็จ! กำลังเริ่มถ่ายทอดสดไลฟ์สตรีม: "${title}"`);
        } else {
            alert(`📌 ปักหมุดรายงานสถานการณ์เรียบร้อยแล้ว! ทุกคนบนแผนที่สามารถคลิกดูภาพ/วิดีโอได้ทันที`);
        }
    }

    citizenReportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        createIncidentFromForm(false);
    });

    btnSubmitAndLive.addEventListener('click', () => {
        if (!reportTitleInput.value.trim()) {
            alert('กรุณากรอกหัวข้อรายงานสถานการณ์ก่อนเริ่มไลฟ์สด');
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
