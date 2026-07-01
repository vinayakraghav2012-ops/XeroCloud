/* ─────────────────────────────────────────────────────────
   XEROOS MASTER MOBILE CLIENT — INTEGRATED ARCHITECTURE
   Combines Marketplace, Benchmarking, & REST WebRTC Signaling
────────────────────────────────────────────────────────── */
(() => {
  // ─── CONFIGURATION & STATIC DATA ───────────────────────────────────────────
  const API_URL = process.env.URL;

  const STUN_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  const promos = [
    { tag: 'NEW TOOL', title: 'XeroSearch 2.0 — Semantic search across your entire workspace', badge: 'LIVE' },
    { tag: 'ACTIVE TASK', title: 'Earn 500 XC — Complete the Speed Operator mission by Sunday', badge: 'XC' },
    { tag: 'MARKETPLACE', title: 'NVIDIA RTX 5090 rigs now listed — prices in XeroCoins', badge: 'HOT' },
    { tag: 'SYSTEM', title: 'XeroCloud uptime 99.9% — Zero incidents this quarter', badge: 'OK' },
    { tag: 'COMMUNITY', title: 'Top operator leaderboard reset — claim your position now', badge: 'NEW' },
    { tag: 'FEATURE', title: 'Device Power scoring v3 — more accurate XeroScale index', badge: 'UPD' },
  ];

  const missionsData = [
    { type: 'survey', name: 'Consumer Preference Survey — Tech & Gadgets', desc: 'Complete a 5-minute survey on your technology usage patterns and purchasing behavior.', cashUSD: 2.50, progress: 0, status: 'new', difficulty: 2 },
    { type: 'offer', name: 'Sign Up — Cloud Storage Pro Trial', desc: 'Create a free account on a partner cloud platform and verify your email address to qualify.', cashUSD: 5.00, progress: 35, status: 'active', difficulty: 1 },
    { type: 'video', name: 'Watch & Engage — Product Launch Series', desc: 'Watch 3 product launch videos and answer a brief comprehension quiz at the end.', cashUSD: 1.00, progress: 0, status: 'new', difficulty: 1 },
    { type: 'app', name: 'Install & Open — Crypto Tracker App', desc: 'Download the partner app, open it once, and keep it installed for 48 hours.', cashUSD: 8.00, progress: 0, status: 'hot', difficulty: 2 },
    { type: 'survey', name: 'Financial Habits Questionnaire', desc: 'A 10-minute detailed survey on spending, savings, and investment behavior.', cashUSD: 4.00, progress: 60, status: 'active', difficulty: 3 },
    { type: 'offer', name: 'Register — Online Brokerage Platform', desc: 'Open a demo trading account and complete the onboarding tutorial to earn.', cashUSD: 12.00, progress: 0, status: 'hot', difficulty: 3 },
    { type: 'video', name: 'Educational Series — Web3 Fundamentals', desc: 'Watch a 4-part video series on blockchain technology basics and complete the review.', cashUSD: 2.00, progress: 80, status: 'active', difficulty: 1 },
    { type: 'app', name: 'Play & Reach Level 5 — Strategy Game', desc: 'Install the partner game, complete the tutorial, and reach level 5 within 7 days.', cashUSD: 6.50, progress: 0, status: 'new', difficulty: 2 },
  ];

  const tierRanges = [
    { min: 8000, label: 'ULTRA TIER', color: '#0FF6F6' },
    { min: 6000, label: 'APEX TIER', color: '#8C2FFF' },
    { min: 4000, label: 'PRO TIER', color: '#A855F7' },
    { min: 0, label: 'CORE TIER', color: '#6B7280' },
  ];

  const pcSvg = `<svg class="pc-svg" viewBox="0 0 80 80" fill="none"><rect x="8" y="10" width="52" height="40" rx="3" stroke="#8C2FFF" stroke-width="1.5"/><rect x="12" y="14" width="44" height="32" rx="1" fill="rgba(140,47,255,0.1)"/><path d="M24 54h20v6H24z" stroke="#0FF6F6" stroke-width="1.5"/><line x1="20" y1="60" x2="48" y2="60" stroke="#0FF6F6" stroke-width="1.5"/><circle cx="34" cy="48" r="1.5" fill="#0FF6F6"/></svg>`;

  // ─── STATE MANAGEMENT VARIABLES ──────────────────────────────────────────────
  let pcData = [];
  let liveNodes = [];

  let peerConnection = null;
  let dataChannel = null;
  let currentNodeId = null;
  let currentRequestId = null;  
  let currentClientId = null;   
  let pollIntervalTimer = null; 
  
  let processedHostCandidates = new Set();

  let hostWidth = 1920;
  let hostHeight = 1080;

  function getTier(s) { 
    return tierRanges.find(t => s >= t.min) || tierRanges[tierRanges.length - 1]; 
  }

  // ─── MASTER SYSTEM INITIALIZATION ───────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initPromoTicker();
    setupEventHandlers();
    loadNodePool();
    setInterval(loadNodePool, 30000);
    initMissionsGrid();
    initReveal(document.getElementById('page-home'));

    const params = new URLSearchParams(window.location.search);
    const nodeParam = params.get('node');
    if (nodeParam) {
      currentNodeId = nodeParam.toUpperCase();
      const inputEl = document.getElementById('cs-node-input');
      if (inputEl) inputEl.value = currentNodeId;
      
      initiateStreamRequest();
    }
  });

  // ─── TICKER & PROMOTIONS RENDER ──────────────────────────────────────────────
  function initPromoTicker() {
    const track = document.getElementById('promoTrack');
    if (!track) return;
    [...promos, ...promos].forEach(p => {
      const card = document.createElement('div');
      card.className = 'promo-card';
      card.innerHTML = `<div class="promo-badge">${p.badge}</div><div class="promo-tag">${p.tag}</div><div class="promo-title">${p.title}</div>`;
      track.appendChild(card);
    });
  }

  // ─── MISSIONS ENGINE ────────────────────────────────────────────────────────
  function initMissionsGrid() {
    const missionsGrid = document.getElementById('missionsGrid');
    if (!missionsGrid) return;
    missionsGrid.innerHTML = '';
    
    missionsData.forEach((m, i) => {
      const xcVal = Math.round(m.cashUSD / 2 * 100) / 100;
      const xcDisplay = xcVal % 1 === 0 ? xcVal.toFixed(0) : xcVal.toFixed(1);
      const diffDots = [1, 2, 3].map(d => `<div class="diff-dot" style="background:${d <= m.difficulty ? 'var(--purple)' : 'rgba(255,255,255,0.1)'}"></div>`).join('');
      const statusClass = m.status === 'active' ? 'active' : m.status === 'hot' ? 'hot' : 'new';
      const statusText = m.status === 'active' ? 'IN PROGRESS' : m.status === 'hot' ? 'HOT' : 'AVAILABLE';
      
      const card = document.createElement('div');
      card.className = 'mission-card reveal';
      card.style.transitionDelay = (i * 0.06) + 's';
      card.innerHTML = `
        <div class="mission-card-top">
          <div class="mission-difficulty">${diffDots}</div>
          <div class="mission-card-type">${m.type.toUpperCase()} · LOOTABLY</div>
          <div class="mission-card-name">${m.name}</div>
          <div class="mission-card-desc">${m.desc}</div>
          ${m.progress > 0 ? `<div class="mission-card-progress-wrap"><div class="mission-card-progress-bar" style="width:${m.progress}%"></div></div><div class="mission-card-progress-label">${m.progress}% COMPLETE</div>` : ''}
        </div>
        <div class="mission-card-footer">
          <div>
            <div class="mission-reward-label">REWARD</div>
            <div class="mission-reward-val">${xcDisplay} XC</div>
            <div class="mission-reward-xc">$${m.cashUSD.toFixed(2)} USD</div>
          </div>
          <div class="mission-status-badge ${statusClass}">${statusText}</div>
        </div>`;
      missionsGrid.appendChild(card);
    });
  }

  // ─── MESH COMPUTE NODE NETWORK OVERSEER ──────────────────────────────────────
  function nodeToCard(node) {
    const hw = node.hardwareSpecs || {};
    return {
      name: hw.deviceModel || node.nodeId || 'OPERATOR RIG',
      cpu: hw.cpuModel || 'Unknown CPU',
      gpu: (hw.gpuBrand ? hw.gpuBrand.toUpperCase() + ' ' : '') + (hw.gpuModel || 'Unknown GPU'),
      ram: hw.totalRamGB || '--',
      stor: '--',
      age: hw.systemAge || '--',
      score: node.xeroScaleScore || 0,
      price: Math.round((node.xeroScaleScore || 1000) * 1.5),
      status: node.status || 'idle',
      nodeId: node.nodeId,
      metrics: node.liveMetrics || {},
      desc: `${hw.cpuArch ? hw.cpuArch.toUpperCase() : ''} platform · ${hw.cores || '--'} cores · ${hw.totalRamGB || '--'} RAM · ${(hw.vramSize || '--')} VRAM. Provisioned on the XeroCloud Mesh and available for distributed compute assignments.`,
    };
  }

  function renderPcGrid(data) {
    const pcGrid = document.getElementById('pcGrid');
    if (!pcGrid) return;
    pcGrid.innerHTML = '';
    if (data.length === 0) {
      pcGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-dim);font-size:12px;letter-spacing:2px;border:1px dashed rgba(140,47,255,0.2)">
        <div style="font-size:32px;margin-bottom:16px;opacity:0.3">◎</div>
        <div>NO NODES ONLINE IN MESH</div>
        <div style="margin-top:8px;font-size:10px;opacity:0.6">Waiting for PC operators to provision their rigs...</div>
      </div>`;
      return;
    }
    data.forEach((pc, i) => {
      const tier = getTier(pc.score);
      const statusColor = pc.status === 'idle' ? '#0FF6F6' : pc.status === 'busy' ? '#8C2FFF' : '#555';
      const card = document.createElement('div');
      card.className = 'pc-card reveal';
      card.style.transitionDelay = (i * 0.08) + 's';
      card.innerHTML = `
        <div class="pc-img-wrap">
          <div style="position:absolute;top:10px;right:10px;width:7px;height:7px;border-radius:50%;background:${statusColor};box-shadow:0 0 8px ${statusColor};z-index:2"></div>
          ${pcSvg}
        </div>
        <div class="pc-body">
          <div class="pc-name">${pc.name}</div>
          <div class="pc-spec">CPU <span>${pc.cpu}</span></div>
          <div class="pc-spec">GPU <span>${pc.gpu}</span></div>
          <div class="pc-spec">RAM <span>${pc.ram}</span></div>
          <div class="pc-spec">NODE <span style="font-size:9px">${pc.nodeId}</span></div>
        </div>
        <div class="pc-footer">
          <div>
            <div class="pc-score-val">${pc.score.toLocaleString()}</div>
            <div class="pc-score-lbl">XEROSCALE</div>
          </div>
          <div class="pc-tier-badge">${tier.label}</div>
        </div>`;
      card.addEventListener('click', () => openSpaFromNode(i));
      pcGrid.appendChild(card);
    });
    setTimeout(() => initReveal(document.querySelector('.page.active')), 50);
  }

  async function loadNodePool() {
    const pcGrid = document.getElementById('pcGrid');
    if (!pcGrid) return;
    try {
      const res = await fetch(`${API_URL}/api/nodes/active`);
      const data = await res.json();
      liveNodes = (data.nodes || []).map(nodeToCard);
      pcData = liveNodes;
      renderPcGrid(pcData);
      const badge = document.querySelector('.section-badge');
      if (badge) badge.textContent = pcData.length + ' ONLINE';
    } catch (e) {
      pcGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-dim);font-size:11px;letter-spacing:2px;border:1px dashed rgba(255,51,85,0.2)">MESH API UNREACHABLE — CHECK SERVER</div>`;
    }
  }

  function updateStatus(text, type = '') {
    const el = document.getElementById('stream-status-text');
    if (el) el.textContent = text.toUpperCase();
    console.log(`[Status] ${text}`);
  }

  // ─── HTTP REST SIGNALING SYSTEMS (MAPPED POLLING MESH) ───────────────────────────
  async function initiateStreamRequest() {
    if (!currentNodeId) return;
    updateStatus('CREATING MESH STREAM REQUEST...');
    
    try {
      const res = await fetch(`${API_URL}/api/stream/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: currentNodeId,
          requesterInfo: { email: localStorage.getItem('xc_user_email') || 'Anonymous Client' }
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request stream channel');
      
      currentRequestId = data.requestId;
      currentClientId = data.clientId;
      
      updateStatus('REQUEST SENT — WAITING FOR HOST ACCEPTANCE...');
      
      clearInterval(pollIntervalTimer);
      pollIntervalTimer = setInterval(pollSessionState, 2000);
      
    } catch (err) {
      console.error('Handshake initiation failed:', err);
      updateStatus(err.message || 'SIGNALING BLOCK — CHECK SERVER', 'error');
    }
  }

  async function pollSessionState() {
    if (!currentRequestId) return;
    
    try {
      const res = await fetch(`${API_URL}/api/stream/${currentRequestId}`);
      const data = await res.json();
      
      if (!res.ok || !data.request) return;
      
      const session = data.request;
      
      if (session.status === 'accepted' && !peerConnection) {
        updateStatus('REQUEST APPROVED! INITIALIZING PEER PIPELINE...');
        initializePeerConnection();
      }
      
      if (session.status === 'rejected') {
        clearInterval(pollIntervalTimer);
        handleStreamEnd('Host node rejected the connection request.');
      }
      
      if (session.status === 'ended') {
        clearInterval(pollIntervalTimer);
        handleStreamEnd('Live stream ended by host machine.');
      }

      if (session.offer && peerConnection && !peerConnection.remoteDescription) {
        updateStatus('OFFER RECEIVED — COMPUTING WEBRTC HANDSHAKE...');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(session.offer));
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        await fetch(`${API_URL}/api/stream/${currentRequestId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer, clientId: currentClientId })
        });
        
        updateStatus('HANDSHAKE TRANSMITTED — SYNCING RENDER PIPELINE...');
      }

      if (session.hostIce && session.hostIce.length > 0 && peerConnection && peerConnection.remoteDescription) {
        session.hostIce.forEach(async (rawEntry) => {
          if (!rawEntry) return;

          let candidateString;
          try {
            candidateString = typeof rawEntry === 'string' ? rawEntry : JSON.stringify(rawEntry);
          } catch(e) { return; }

          if (processedHostCandidates.has(candidateString)) return;

          try {
            let parsed = rawEntry;
            if (typeof rawEntry === 'string') {
              try { parsed = JSON.parse(rawEntry); } catch(e) { parsed = rawEntry; }
            }
            
            if (parsed && parsed.candidate && typeof parsed.candidate === 'object') {
              parsed = parsed.candidate;
            }

            if (!parsed || (!parsed.candidate && parsed.candidate !== "")) return;

            const validCandidateInit = {
              candidate: parsed.candidate ?? '',
              sdpMid: parsed.sdpMid ?? null,
              sdpMLineIndex: parsed.sdpMLineIndex ?? null,
              usernameFragment: parsed.usernameFragment ?? null
            };

            await peerConnection.addIceCandidate(new RTCIceCandidate(validCandidateInit));
            processedHostCandidates.add(candidateString);
            console.log("Successfully synced raw flat host ICE candidate structural entry.");
          } catch (e) {
            console.warn('ICE Candidate formatting pass skipped:', e);
          }
        });
      }
      
    } catch (err) {
      console.error('Session state parsing crash:', err);
    }
  }

  // ─── WEBRTC CONNECTION HANDLING ──────────────────────────────────────────────
  function initializePeerConnection() {
    if (peerConnection) {
      try { peerConnection.close(); } catch(e) {}
    }

    peerConnection = new RTCPeerConnection(STUN_SERVERS);

    // FIX: Core DataChannel setup before creating offers or mapping remote descriptors
    dataChannel = peerConnection.createDataChannel('inputChannel', {
      ordered: false,
      maxRetransmits: 0
    });

    dataChannel.onopen = () => {
      console.log('🎮 Input data pipe active (Sub-100ms lag achieved)');
      updateStatus('Stream Connected');
      clearInterval(pollIntervalTimer); 
      const connScreen = document.getElementById('connection-screen');
      if (connScreen) connScreen.style.display = 'none';
    };
    
    dataChannel.onclose = () => console.log('🎮 Input data pipe closed');
    dataChannel.onerror = (err) => console.error('🎮 Data Channel Error:', err);

   peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      console.log('[WebRTC Network State]:', state);
      
      if (state === 'checking') {
        setStatus('COMPUTING WEBRTC HANDSHAKE...');
      }
      
      if (state === 'connected') {
        setStatus('Stream Connected');
        console.log('[Status] Network Connected — Synchronizing UI State Viewport');

        // ─── ARCHITECTURAL FIX: DROP OVERLAY VEIL & REVEAL STREAM WORKSPACE ───
        const connScreen = document.getElementById('connection-screen');
        if (connScreen) {
          connScreen.style.setProperty('display', 'none', 'important');
        }

        // Force reveal the streaming top-bar and viewport elements
        const topBar = document.querySelector('.stream-topbar');
        if (topBar) {
          topBar.style.setProperty('display', 'flex', 'important');
        }

        const streamStats = document.getElementById('stream-stats');
        if (streamStats) {
          streamStats.style.setProperty('display', 'block', 'important');
        }
        
        // Ensure the video container wrapper is computing layouts properly
        const videoVideo = document.getElementById('remote-stream-video');
        if (videoVideo) {
          videoVideo.style.setProperty('display', 'block', 'important');
          videoVideo.style.setProperty('opacity', '1', 'important');
        }
      }

      if (state === 'disconnected' || state === 'failed') {
        handleStreamEnd('Peer connection lost or terminated by host.');
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        fetch(`${API_URL}/api/stream/${currentRequestId}/ice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'client',
            candidate: event.candidate,
            clientId: currentClientId
          })
        }).catch(err => console.error("Failed uploading client ICE candidate:", err));
      }
    };

    // FIXED: Unlocking programmatic play attributes BEFORE setting stream data source
    peerConnection.ontrack = (event) => {
      console.log('[WebRTC Stream]: Remote media tracks received.');
      
      const video = document.getElementById('remote-stream-video');
      if (video && event.streams && event.streams[0]) {
        // Direct assignment of track streams to the DOM element
        video.srcObject = event.streams[0];
        
        // ─── ARCHITECTURAL FIX: FORCE MOBILE ENGINE RASTERIZATION ───
        video.setAttribute('autoplay', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;

        // Force low-level layout recalculation
        video.load();
        
        // Explicitly trigger the decoder engine thread
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('[Render Pipeline] Hardware video surface active and rendering frames.');
            })
            .catch(err => {
              console.warn('[Render Pipeline] Autoplay throttled by mobile container policy. Adding user engagement fallback lock.', err);
              // Fallback for strict mobile web containers: trigger play on first interaction touch
              document.body.addEventListener('touchstart', () => {
                video.play().catch(() => {});
              }, { once: true });
            });
        }
      } else {
        console.error('[Render Pipeline] Initialization failed: No valid stream elements detected.');
      }
    };
  }

  // ─── HIGH-SPEED TOUCH & SCALE COMPUTING ──────────────────────────────────────
  function bindStreamTouchCoordinates() {
    const video = document.getElementById('remote-stream-video');
    if (!video) return;

    let isDragging = false;

    const handleTouchInput = (e, type) => {
      if (!dataChannel || dataChannel.readyState !== 'open') return;
      if (e.touches.length === 0 && type === 'mm') return;

      const rect = video.getBoundingClientRect();
      const touch = e.touches[0] || e.changedTouches[0];
      
      const clientX = touch.clientX - rect.left;
      const clientY = touch.clientY - rect.top;

      if (clientX < 0 || clientX > rect.width || clientY < 0 || clientY > rect.height) {
        if (type === 'mu') sendInputPacket({ t: 'mu' });
        return;
      }

      const x = Math.round((clientX / rect.width) * hostWidth);
      const y = Math.round((clientY / rect.height) * hostHeight);

      if (type === 'md') {
        sendInputPacket({ t: 'md', x, y });
      } else if (type === 'mm') {
        sendInputPacket({ t: 'mm', x, y });
      } else if (type === 'mu') {
        sendInputPacket({ t: 'mu', x, y });
      }
    };

    video.addEventListener('touchstart', (e) => { e.preventDefault(); isDragging = true; handleTouchInput(e, 'md'); }, { passive: false });
    video.addEventListener('touchmove', (e) => { e.preventDefault(); if (isDragging) handleTouchInput(e, 'mm'); }, { passive: false });
    video.addEventListener('touchend', (e) => { e.preventDefault(); isDragging = false; handleTouchInput(e, 'mu'); }, { passive: false });
  }

  function sendInputPacket(packet) {
    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        dataChannel.send(JSON.stringify(packet));
      } catch (err) {
        console.error("Failed sending down-packet transmission via mesh pipeline:", err);
      }
    }
  }

  // ─── INTERACTION & SPA DETAILED DRAWER EVENTS ───────────────────────────────
  function openSpaFromNode(i) {
    const pc = pcData[i]; 
    const tier = getTier(pc.score);
    const spa = document.getElementById('innerSpa');
    if (!spa) return;
    
    document.getElementById('spaTitle').textContent = pc.name;
    const bigSvg = `<svg class="spa-visual-svg" viewBox="0 0 80 80" fill="none"><rect x="8" y="10" width="52" height="40" rx="3" stroke="#8C2FFF" stroke-width="1.5"/><rect x="12" y="14" width="44" height="32" rx="1" fill="rgba(140,47,255,0.15)"/><path d="M24 54h20v6H24z" stroke="#0FF6F6" stroke-width="1.5"/><line x1="20" y1="60" x2="48" y2="60" stroke="#0FF6F6" stroke-width="1.5"/><circle cx="34" cy="48" r="1.5" fill="#0FF6F6"/></svg>`;
    const metrics = pc.metrics || {};
    const statusColor = pc.status === 'idle' ? '#0FF6F6' : pc.status === 'busy' ? '#8C2FFF' : '#555';
    
    document.getElementById('spaBody').innerHTML = `
      <div class="spa-visual">${bigSvg}
        <div style="position:absolute;bottom:20px;left:0;right:0;text-align:center;font-size:9px;letter-spacing:3px;color:${statusColor}">${(pc.status || 'idle').toUpperCase()}</div>
      </div>
      <div class="spa-details">
        <div class="spa-specs-grid">
          <div class="spa-spec-cell"><div class="spec-key">PROCESSOR</div><div class="spec-val">${pc.cpu}</div></div>
          <div class="spa-spec-cell"><div class="spec-key">GRAPHICS</div><div class="spec-val">${pc.gpu}</div></div>
          <div class="spa-spec-cell"><div class="spec-key">MEMORY</div><div class="spec-val">${pc.ram}</div></div>
          <div class="spa-spec-cell"><div class="spec-key">AGE</div><div class="spec-val">${pc.age}</div></div>
          <div class="spa-spec-cell"><div class="spec-key">CPU LOAD</div><div class="spec-val">${metrics.cpuUsagePct || 0}%</div></div>
          <div class="spa-spec-cell"><div class="spec-key">NET SPEED</div><div class="spec-val">${metrics.networkSpeedMBs || 0} MB/s</div></div>
          <div class="spa-spec-cell" style="grid-column:1/-1">
            <div class="spec-key">NODE ID</div>
            <div class="spec-val" style="display:flex;align-items:center;gap:10px">
              <span id="spa-node-id-val">${pc.nodeId}</span>
              <button id="spa-copy-btn" style="padding:3px 10px;background:rgba(15,246,246,0.08);border:1px solid rgba(15,246,246,0.25);color:var(--cyan);font-family:'Electrolize',sans-serif;font-size:9px;letter-spacing:1px;cursor:pointer;clip-path:polygon(4px 0%,100% 0%,100% calc(100% - 4px),calc(100% - 4px) 100%,0% 100%,0% 4px)">⧉ COPY</button>
            </div>
          </div>
        </div>
        <div class="spa-score-block">
          <div><div class="spa-score-num">${pc.score.toLocaleString()}</div><div style="font-size:9px;letter-spacing:3px;color:var(--text-dim)">XEROSCALE INDEX</div></div>
          <div style="padding:8px 16px;border:1px solid;border-color:${tier.color};color:${tier.color};font-size:10px;letter-spacing:2px">${tier.label}</div>
        </div>
        <div class="spa-desc-block"><div class="spa-desc-label">SYSTEM OVERVIEW</div><div class="spa-desc-text">${pc.desc}</div></div>
      </div>
      <div class="spa-cta-block">
        <div class="spa-cta">
          <div><div class="spa-price-label">PRICE IN XEROCOINS</div><div class="spa-price"><span>XC </span>${pc.price.toLocaleString()}</div></div>
          <a href="xeroos.html?node=${pc.nodeId}" style="text-decoration: none;"><button class="get-btn">GET NOW →</button></a>
        </div>
      </div>`;
      
    document.getElementById('spa-copy-btn').addEventListener('click', function() {
      navigator.clipboard.writeText(pc.nodeId).then(() => {
        this.textContent = '✓';
        setTimeout(() => this.textContent = '⧉ COPY', 1500);
      });
    });
    
    spa.classList.add('open');
    spa.scrollTop = 0;
  }

  // ─── HANDLERS REGISTER SYSTEM ───────────────────────────────────────────────
  function setupEventHandlers() {
    const connectBtn = document.getElementById('cs-connect-btn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => {
        const inputVal = document.getElementById('cs-node-input').value.trim();
        if (!inputVal) return;
        currentNodeId = inputVal.toUpperCase();
        initiateStreamRequest();
      });
    }

    document.querySelectorAll('.pad-btn, .act-btn').forEach(btn => {
      const key = btn.getAttribute('data-key');
      if (!key) return;

      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.style.transform = 'scale(0.9) translateZ(0)';
        sendInputPacket({ t: 'kd', k: key });
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        btn.style.transform = '';
        sendInputPacket({ t: 'ku', k: key });
      }, { passive: false });
    });

    const video = document.getElementById('remote-stream-video');
    if (video) {
      video.addEventListener('loadedmetadata', () => {
        bindStreamTouchCoordinates();
      });
      // Fallback touch interaction setup for unlocking strict browser engine rules
      video.addEventListener('click', () => {
        if (video.srcObject && video.paused) {
          video.play().catch(e => console.warn("Forced play failed on click handle:", e));
        }
      });
    }

    const spaBack = document.getElementById('spaBack');
    if (spaBack) {
      spaBack.addEventListener('click', () => document.getElementById('innerSpa').classList.remove('open'));
    }

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        const page = link.dataset.page;
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        const target = document.getElementById(`page-${page}`);
        if (target) {
          target.classList.add('active');
          document.getElementById('mainScroll').scrollTop = 0;
          setTimeout(() => initReveal(target), 50);
        }
        
        if (window.innerWidth <= 900) {
          document.getElementById('sidebar').classList.remove('open');
          document.getElementById('overlay').classList.remove('active');
          document.getElementById('hamburger').classList.remove('open');
        }
      });
    });

    const ham = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (ham && sidebar && overlay) {
      ham.addEventListener('click', () => { ham.classList.toggle('open'); sidebar.classList.toggle('open'); overlay.classList.toggle('active'); });
      overlay.addEventListener('click', () => { ham.classList.remove('open'); sidebar.classList.remove('open'); overlay.classList.remove('active'); });
    }

    const contactSubmit = document.getElementById('contactSubmit');
    if (contactSubmit) {
      contactSubmit.addEventListener('click', () => {
        document.getElementById('contactFormWrap').style.display = 'none';
        document.getElementById('formSuccess').classList.add('visible');
      });
    }

    const fileInput = document.getElementById('fileInput');
    const fileDrop = document.getElementById('fileDrop');
    const filePreviewName = document.getElementById('filePreviewName');
    if (fileInput && fileDrop && filePreviewName) {
      fileInput.addEventListener('change', () => { if (fileInput.files[0]) filePreviewName.textContent = '✓ ' + fileInput.files[0].name; });
      fileDrop.addEventListener('dragover', e => { e.preventDefault(); fileDrop.classList.add('dragover'); });
      fileDrop.addEventListener('dragleave', () => fileDrop.classList.remove('dragover'));
      fileDrop.addEventListener('drop', e => { e.preventDefault(); fileDrop.classList.remove('dragover'); if (e.dataTransfer.files[0]) filePreviewName.textContent = '✓ ' + e.dataTransfer.files[0].name; });
    }

    const benchBtn = document.getElementById('benchBtn');
    const benchProgress = document.getElementById('benchProgress');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const scoreNum = document.getElementById('scoreNum');
    const scoreBar = document.getElementById('scoreBar');
    const scoreTier = document.getElementById('scoreTier');

    if (benchBtn) {
      benchBtn.addEventListener('click', () => {
        benchBtn.disabled = true; benchProgress.classList.add('visible'); scoreDisplay.classList.remove('visible');
        const messages = ['INITIALIZING COMPUTE THREADS...', 'EXECUTING LOOP BENCHMARK...', 'MEASURING CLOCK CYCLES...', 'CALCULATING XEROSCALE INDEX...'];
        let mi = 0;
        const msgInt = setInterval(() => { if (mi < messages.length) benchProgress.textContent = messages[mi++]; }, 350);
        
        setTimeout(() => {
          const t0 = performance.now(); let x = 0;
          for (let i = 0; i < 50000000; i++) x += Math.sqrt(i) * Math.sin(i) * 0.001;
          const elapsed = performance.now() - t0;
          clearInterval(msgInt);
          
          const rawScore = Math.round(Math.max(500, Math.min(9999, (1 / (elapsed / 1000)) * 400)));
          const tier = getTier(rawScore);
          scoreNum.textContent = '0'; scoreDisplay.classList.add('visible');
          
          scoreTier.style.borderColor = tier.color; scoreTier.style.color = tier.color; scoreTier.textContent = tier.label;
          benchProgress.classList.remove('visible');
          
          let cur = 0; const step = Math.ceil(rawScore / 60);
          const counter = setInterval(() => { cur = Math.min(cur + step, rawScore); scoreNum.textContent = cur.toLocaleString(); if (cur >= rawScore) clearInterval(counter); }, 16);
          setTimeout(() => { scoreBar.style.width = (rawScore / 9999 * 100) + '%'; }, 100);
          benchBtn.disabled = false;
        }, 1600);
      });
    }

    const filterBtns = document.querySelectorAll('.m-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.dataset.filter;
        document.querySelectorAll('.mission-card').forEach((card, i) => {
          const m = missionsData[i];
          const show = f === 'all' || m.type === f;
          card.style.display = show ? '' : 'none';
        });
      });
    });

    const mainEl = document.getElementById('mainScroll');
    if (mainEl) {
      mainEl.addEventListener('scroll', () => {
        const activePage = document.querySelector('.page.active');
        if (activePage) initReveal(activePage);
      });
    }
  }

  // ─── VIEW REVEAL VISUAL EFFICIENCY TRANSITIONS ───────────────────────────────
  function initReveal(container) {
    const els = (container || document).querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-scale');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => obs.observe(el));
  }

  function handleStreamEnd(reason) {
    alert(reason);
    clearInterval(pollIntervalTimer);
    processedHostCandidates.clear(); 
    if (peerConnection) {
      try { peerConnection.close(); } catch(e) {}
      peerConnection = null;
    }
    const video = document.getElementById('remote-stream-video');
    if (video) video.srcObject = null;
    const connScreen = document.getElementById('connection-screen');
    if (connScreen) connScreen.style.display = 'flex';
    updateStatus('Disconnected');
  }

  window.initiateStreamRequest = initiateStreamRequest;
  window.handleStreamEnd = handleStreamEnd;

})();
// checkinggg savee
