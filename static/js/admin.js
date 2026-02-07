// ==================== RESEARCH NOTES API ====================
const NOTES_API = "/api/notes/";

// Shared constants
// Lunar distance in kilometers (average)
const LUNAR_DISTANCE_KM = 384400;
// NEO lookup URL
const LOOKUP_URL = 'https://api.nasa.gov/neo/rest/v1/neo';

// ==================== CSRF TOKEN HELPER ====================
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// ==================== LOAD NOTES ====================
async function loadNotes() {
  try {
    const res = await fetch(NOTES_API, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Network');
    const data = await res.json();
    const log = document.getElementById('notesLog');
    
    if (!data.notes || data.notes.length === 0) {
      log.innerHTML = '<div style="text-align:center; padding:12px; color:#888;">No notes yet</div>';
      return;
    }
    
    log.innerHTML = data.notes.map(n => `
      <div style="padding: 10px; margin-bottom: 10px; background: rgba(0,255,255,0.05); border-left: 3px solid cyan; border-radius: 4px;">
        <div style="font-size: 12px; color: #00ff88;">${new Date(n.created_at).toLocaleString()}</div>
        <div style="margin-top: 5px; color: #b0b8d4;">${n.text}</div>
      </div>
    `).join('');
  } catch (e) {
    console.error('Failed to load notes', e);
    document.getElementById('notesLog').innerHTML = '<div style="color:red;">Failed to load notes</div>';
  }
}

// ==================== SAVE NOTE ====================
document.getElementById('add-note-btn')?.addEventListener('click', async () => {
  const input = document.getElementById('noteInput');
  const text = input.value.trim();
  
  if (!text) {
    alert('Please enter a note');
    return;
  }
  
  const csrftoken = getCookie('csrftoken');
  try {
    const res = await fetch(NOTES_API, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken
      },
      body: JSON.stringify({ text })
    });
    
    if (!res.ok) {
      const err = await res.text();
      console.error('Save failed', err);
      alert('Failed to save note');
      return;
    }
    
    input.value = '';
    loadNotes();
  } catch (e) {
    console.error('Save failed', e);
    alert('Failed to save note');
  }
});

// Shared globals (admin dashboard uses `allAsteroids` and Chart instances)
let allAsteroids = [];
let sizeChart, velocityChart, yearChart, riskChart;

// Watchlist is managed globally in `main.js` using the `watchlist` array and helpers
// We provide a small delegate so admin UI can call the same functions if available.
function loadWatchlistFromStorage() {
  if (typeof window.loadWatchlistFromStorage === 'function') return window.loadWatchlistFromStorage();
  // fallback: noop
}

function saveWatchlistToStorage() {
  if (typeof window.saveWatchlistToStorage === 'function') return window.saveWatchlistToStorage();
}

function toggleWatchlist(id) {
  if (typeof window.toggleWatchlist === 'function') return window.toggleWatchlist(id);
}

function updateWatchlistUI() {
  if (typeof window.updateWatchlistUI === 'function') return window.updateWatchlistUI();
  const listEl = document.getElementById('watchlist');
  if (!listEl) return;
  listEl.innerHTML = '<li style="color: #888;">No items in watchlist</li>';
}

// ==================== ALERT FUNCTIONS ====================
function showAlert(msg) {
  const alertsEl = document.getElementById('alerts');
  if (!alertsEl) return;
  
  if (alertsEl.innerHTML.includes('No active alerts')) {
    alertsEl.innerHTML = '';
  }
  
  const li = document.createElement('li');
  li.textContent = msg;
  li.style.cssText = 'margin-bottom: 10px; padding: 8px; background: rgba(255,0,0,0.1); border-left: 3px solid #ff4444; border-radius: 4px; color: #ff6666;';
  alertsEl.prepend(li);
  
  while (alertsEl.children.length > 5) {
    alertsEl.removeChild(alertsEl.lastChild);
  }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  loadWatchlistFromStorage();
  updateWatchlistUI();
  loadNotes();
  
  // Wire up date search button and fetch button
  const dateSearchBtn = document.getElementById('date-search-btn');
  const fetchBtn = document.getElementById('fetch-btn');
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  
  // Set today's date as default
  const today = new Date().toISOString().split('T')[0];
  if (startDateInput) startDateInput.value = today;
  if (endDateInput) endDateInput.value = today;
  
  // Fetch button - fetch today's data
  if (fetchBtn) {
    fetchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Fetch button clicked');
      if (typeof fetchAsteroidData === 'function') {
        fetchAsteroidData();
      }
    });
  }
  
  // Date search button - fetch data for date range
  if (dateSearchBtn) {
    dateSearchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const startVal = startDateInput?.value || '';
      const endVal = endDateInput?.value || '';
      console.log('Date search clicked:', startVal, endVal);
      if (typeof fetchAsteroidData === 'function') {
        fetchAsteroidData(startVal, endVal);
      }
    });
  }
});

// ========================
// INITIALIZATION
// ========================
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    loadInitialData();
    setupEventListeners();
});

function initializeDashboard() {
    // Inject advanced controls
    injectAdvancedControls();
    injectModalTemplates();
    renderWatchlist();
    renderAlerts();
}

// Global flag to track if event listeners are attached
let listenersAttached = false;

function setupEventListeners() {
    // Only attach once to avoid duplicate listeners
    if (listenersAttached) return;
    listenersAttached = true;
    
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button, .remove-watchlist');
        if (!btn) return;
        // view details
        if (btn.classList.contains('view-details-btn')) {
            const id = btn.dataset.id;
            console.log('Details clicked for ID:', id);
            openAsteroidProfile(id);
            return;
        }
        // add/remove watchlist
        if (btn.classList.contains('add-watchlist-btn')) {
            const id = btn.dataset.id;
            console.log('Watchlist clicked for ID:', id);
            addToWatchlist(id);
            return;
        }
        if (btn.classList.contains('remove-watchlist')) {
            const id = btn.dataset.id;
            console.log('Remove watchlist clicked for ID:', id);
            removeFromWatchlist(id);
            return;
        }
        // compare toggle
        if (btn.classList.contains('compare-btn')) {
            const id = btn.dataset.id;
            console.log('Compare clicked for ID:', id);
            toggleCompareSelection(id);
            return;
        }
    });
}


// ========================
// UI INJECTION
// ========================
function injectAdvancedControls() {
    const controlsHTML = `
        <section class="advanced-controls" style="background: #111633; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <h3 style="margin-top: 0;">🔬 Research Controls</h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px;">Min Diameter (m)</label>
                    <input type="number" id="min-diameter" placeholder="0" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #333; background: #0a0d1f; color: white;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px;">Max Diameter (m)</label>
                    <input type="number" id="max-diameter" placeholder="10000" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #333; background: #0a0d1f; color: white;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px;">Max Distance (km)</label>
                    <input type="number" id="max-distance" placeholder="10000000" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #333; background: #0a0d1f; color: white;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px;">Min Velocity (km/h)</label>
                    <input type="number" id="min-velocity" placeholder="0" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #333; background: #0a0d1f; color: white;">
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px;">Max Distance (km)</label>
                    <input type="number" id="max-distance" placeholder="10000000" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #333; background: #0a0d1f; color: white;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px;">Min Velocity (km/h)</label>
                    <input type="number" id="min-velocity" placeholder="0" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #333; background: #0a0d1f; color: white;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px;">PHA Only</label>
                    <select id="pha-filter" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #333; background: #0a0d1f; color: white;">
                        <option value="all">All Objects</option>
                        <option value="true">PHA Only</option>
                        <option value="false">Non-PHA Only</option>
                    </select>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px;">Sort By</label>
                    <select id="sort-by" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #333; background: #0a0d1f; color: white;">
                        <option value="distance">Closest Approach</option>
                        <option value="size">Diameter (Largest)</option>
                        <option value="velocity">Velocity (Fastest)</option>
                        <option value="risk">Risk Score (Highest)</option>
                        <option value="name">Designation (A-Z)</option>
                    </select>
                </div>
            </div>

            <div style="background: #0b1a33; padding: 18px; border-radius: 8px; margin-bottom: 15px; display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: center;">
                <div>
                    <label style="display:block; margin-bottom:6px; color: cyan; font-weight:600;">Start Date:</label>
                    <input type="date" id="start-date" style="width:100%; padding:10px; border-radius:6px; border:1px solid rgba(0,255,255,0.08); background:#081226; color:#bfefff;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:6px; color: cyan; font-weight:600;">End Date:</label>
                    <input type="date" id="end-date" style="width:100%; padding:10px; border-radius:6px; border:1px solid rgba(0,255,255,0.08); background:#081226; color:#bfefff;">
                </div>
                <div style="display:flex; gap:8px; justify-content:flex-end;">
                    <button id="date-search-btn" style="padding:10px 16px; background:#00f0ff; color:#000; border-radius:6px; font-weight:bold; cursor:pointer;">🔎 Search</button>
                    <button id="fetch-btn" style="padding:10px 12px; background:#00c3ff; color:#000; border-radius:6px; font-weight:bold; cursor:pointer;">📥 Fetch Data</button>
                </div>
            </div>

            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                
                <button id="export-csv-btn" style="padding: 10px 20px; background: #00ff88; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    📥 Export CSV
                </button>
                <button id="export-json-btn" style="padding: 10px 20px; background: #ffcc00; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    📥 Export JSON
                </button>
                <button id="analytics-btn" style="padding: 10px 20px; background: #ff44ff; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    📊 Analytics Dashboard
                </button>
                <button id="compare-btn" style="padding: 10px 20px; background: #ff8800; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    ⚖️ Compare Selected (<span id="compare-count">0</span>)
                </button>
            </div>
        </section>
    `;
    
    document.querySelector('.welcome').insertAdjacentHTML('afterend', controlsHTML);
    
    // Event listeners for controls (search/fetch/export/analytics/compare)
    document.getElementById('date-search-btn')?.addEventListener('click', (e) => { e.preventDefault(); loadInitialData(); });
    document.getElementById('fetch-btn')?.addEventListener('click', (e) => { e.preventDefault(); loadInitialData(); });
    document.getElementById('export-csv-btn')?.addEventListener('click', exportCSV);
    document.getElementById('export-json-btn')?.addEventListener('click', exportJSON);
    document.getElementById('analytics-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('analytics-modal');
        if (modal) modal.style.display = 'block';
    });
    document.getElementById('compare-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('compare-modal');
        if (modal) modal.style.display = 'block';
    });
    document.getElementById('export-json-btn').addEventListener('click', exportJSON);
    document.getElementById('analytics-btn').addEventListener('click', openAnalyticsDashboard);
    document.getElementById('compare-btn').addEventListener('click', openCompareModal);
    
    // Real-time filtering
    ['min-diameter', 'max-diameter', 'max-distance', 'min-velocity', 'pha-filter', 'sort-by'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', applyFiltersAndRender);
    });
}

function injectModalTemplates() {
    const modalsHTML = `
        <!-- Asteroid Profile Modal -->
        <div id="profile-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; overflow-y: auto;">
            <div style="max-width: 900px; margin: 50px auto; background: #0b0f2b; border-radius: 12px; padding: 30px; position: relative;">
                <button onclick="closeModal('profile-modal')" style="position: absolute; top: 15px; right: 15px; background: #ff4444; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer;">✕ Close</button>
                <div id="profile-content"></div>
            </div>
        </div>

        <!-- Analytics Modal -->
        <div id="analytics-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; overflow-y: auto;">
            <div style="max-width: 1200px; margin: 50px auto; background: #0b0f2b; border-radius: 12px; padding: 30px; position: relative;">
                <button onclick="closeModal('analytics-modal')" style="position: absolute; top: 15px; right: 15px; background: #ff4444; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer;">✕ Close</button>
                <h2 style="margin-top: 0;">📊 Data Analytics Dashboard</h2>
                <div id="analytics-content" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div style="background: #111633; padding: 20px; border-radius: 12px;">
                        <h3>Size Distribution</h3>
                        <canvas id="size-chart"></canvas>
                    </div>
                    <div style="background: #111633; padding: 20px; border-radius: 12px;">
                        <h3>Velocity Distribution</h3>
                        <canvas id="velocity-chart"></canvas>
                    </div>
                    <div style="background: #111633; padding: 20px; border-radius: 12px;">
                        <h3>Discovery Timeline</h3>
                        <canvas id="year-chart"></canvas>
                    </div>
                    <div style="background: #111633; padding: 20px; border-radius: 12px;">
                        <h3>Risk Classification</h3>
                        <canvas id="risk-chart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <!-- Compare Modal -->
        <div id="compare-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; overflow-y: auto;">
            <div style="max-width: 1000px; margin: 50px auto; background: #0b0f2b; border-radius: 12px; padding: 30px; position: relative;">
                <button onclick="closeModal('compare-modal')" style="position: absolute; top: 15px; right: 15px; background: #ff4444; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer;">✕ Close</button>
                <h2 style="margin-top: 0;">⚖️ Asteroid Comparison</h2>
                <div id="compare-content"></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalsHTML);
}

// ========================
// DATA FETCHING
// ========================
async function loadInitialData() {
    const startInput = document.getElementById('start-date');
    const endInput = document.getElementById('end-date');
    
    let startDate = startInput.value;
    let endDate = endInput.value;
    
    // Default to last 7 days
    if (!startDate || !endDate) {
        const today = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        startInput.value = startDate;
        endInput.value = endDate;
    }
    
    // Validate 7-day limit
    const diffDays = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
    if (diffDays > 7) {
        alert('⚠️ NASA API limit: Maximum 7-day range allowed');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${BASE_URL}?start_date=${startDate}&end_date=${endDate}&api_key=${API_KEY}`);
        if (!response.ok) throw new Error('API request failed');
        
        const data = await response.json();
        const allDates = Object.values(data.near_earth_objects);
        allAsteroids = processAsteroidData(allDates.flat());
        
        applyFiltersAndRender();
        updateSummaryStats();
        checkForAlerts();
        
    } catch (error) {
        console.error('Data fetch error:', error);
        alert('❌ Error fetching data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function processAsteroidData(rawList) {
    return rawList.map(item => {
        const diameter = item.estimated_diameter.meters.estimated_diameter_max;
        const diameterMin = item.estimated_diameter.meters.estimated_diameter_min;
        const approach = item.close_approach_data[0];
        const missDistance = parseFloat(approach.miss_distance.kilometers);
        const velocity = parseFloat(approach.relative_velocity.kilometers_per_hour);
        const isPHA = item.is_potentially_hazardous_asteroid;
        
        // Risk Score Calculation (Scientific Formula)
        const riskScore = calculateRiskScore(diameter, velocity, missDistance, isPHA);
        
        return {
            id: item.id,
            name: item.name,
            designation: item.designation || item.name,
            nasaJplUrl: item.nasa_jpl_url,
            absoluteMagnitude: item.absolute_magnitude_h,
            
            // Diameter
            diameterMin: diameterMin,
            diameterMax: diameter,
            diameterAvg: (diameterMin + diameter) / 2,
            
            // Approach Data
            closeApproachDate: approach.close_approach_date_full,
            closeApproachDateShort: approach.close_approach_date,
            missDistanceKm: missDistance,
            missDistanceLunar: (missDistance / LUNAR_DISTANCE_KM).toFixed(4),
            missDistanceAU: parseFloat(approach.miss_distance.astronomical),
            
            // Velocity
            velocityKmh: velocity,
            velocityKms: (velocity / 3600).toFixed(2),
            
            // Orbit
            orbitingBody: approach.orbiting_body,
            
            // Classification
            isPHA: isPHA,
            isSentryObject: item.is_sentry_object,
            
            // Risk
            riskScore: riskScore,
            riskLevel: getRiskLevel(riskScore, isPHA),
            
            // Full object for detailed view
            _raw: item
        };
    });
}

function calculateRiskScore(diameter, velocity, distance, isPHA) {
    // Scientific Risk Formula
    // Factors: Size (kinetic energy potential), Velocity, Proximity, PHA status
    
    const sizeWeight = Math.pow(diameter, 1.5); // Kinetic energy scales with mass (diameter^3) and velocity^2
    const velocityWeight = velocity / 100000; // Normalize
    const proximityWeight = 1 / (distance / LUNAR_DISTANCE_KM + 1); // Closer = higher risk
    const phaMultiplier = isPHA ? 2.0 : 1.0;
    
    const baseScore = (sizeWeight * velocityWeight * proximityWeight) * phaMultiplier;
    
    // Normalize to 0-100 scale (logarithmic)
    return Math.min(100, Math.log10(baseScore + 1) * 15).toFixed(2);
}

function getRiskLevel(score, isPHA) {
    if (isPHA && score > 40) return 'critical';
    if (score > 50 || isPHA) return 'high';
    if (score > 25) return 'medium';
    return 'low';
}

// ========================
// FILTERING & RENDERING
// ========================
function applyFiltersAndRender() {
    const minDiam = parseFloat(document.getElementById('min-diameter').value) || 0;
    const maxDiam = parseFloat(document.getElementById('max-diameter').value) || Infinity;
    const maxDist = parseFloat(document.getElementById('max-distance').value) || Infinity;
    const minVel = parseFloat(document.getElementById('min-velocity').value) || 0;
    const phaFilter = document.getElementById('pha-filter').value;
    const sortBy = document.getElementById('sort-by').value;
    
    let filtered = allAsteroids.filter(a => {
        if (a.diameterMax < minDiam || a.diameterMax > maxDiam) return false;
        if (a.missDistanceKm > maxDist) return false;
        if (a.velocityKmh < minVel) return false;
        if (phaFilter === 'true' && !a.isPHA) return false;
        if (phaFilter === 'false' && a.isPHA) return false;
        return true;
    });
    
    // Sorting
    filtered.sort((a, b) => {
        switch(sortBy) {
            case 'distance': return a.missDistanceKm - b.missDistanceKm;
            case 'size': return b.diameterMax - a.diameterMax;
            case 'velocity': return b.velocityKmh - a.velocityKmh;
            case 'risk': return b.riskScore - a.riskScore;
            case 'name': return a.designation.localeCompare(b.designation);
            default: return 0;
        }
    });
    
    renderAsteroidFeed(filtered);
    updateSummaryStats(filtered);
}

function renderAsteroidFeed(asteroids) {
    const feed = document.getElementById('feed');
    
    if (asteroids.length === 0) {
        feed.innerHTML = '<p style="text-align: center; color: #888; grid-column: 1/-1;">No asteroids match current filters</p>';
        return;
    }
    
    feed.innerHTML = asteroids.map(a => `
        <div class="card" data-id="${a.id}">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <div>
                    <h3 style="margin: 0 0 5px 0; font-size: 16px;">${a.designation}</h3>
                    <span style="font-size: 12px; color: #888;">ID: ${a.id}</span>
                </div>
                <span class="badge-${a.riskLevel}" style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">
                    ${a.isPHA ? '⚠️ PHA' : '✓ Non-PHA'}
                </span>
            </div>
            
            <div style="font-size: 13px; line-height: 1.6; margin-bottom: 12px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div>
                        <strong>Diameter:</strong><br>
                        ${a.diameterMin.toFixed(1)} - ${a.diameterMax.toFixed(1)} m
                    </div>
                    <div>
                        <strong>Velocity:</strong><br>
                        ${a.velocityKms} km/s
                    </div>
                    <div>
                        <strong>Miss Distance:</strong><br>
                        ${a.missDistanceLunar} LD
                    </div>
                    <div>
                        <strong>Risk Score:</strong><br>
                        <span class="${a.riskLevel}">${a.riskScore}</span>
                    </div>
                </div>
                <div style="margin-top: 8px;">
                    <strong>Approach:</strong> ${a.closeApproachDateShort}
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px;">
                <button class="view-details-btn" data-id="${a.id}" style="font-size: 12px; padding: 6px;">
                    🔬 Details
                </button>
                <button class="add-watchlist-btn" data-id="${a.id}" style="font-size: 12px; padding: 6px; background: ${watchlist.includes(a.id) ? '#666' : 'cyan'};">
                    ${watchlist.includes(a.id) ? '⭐' : '☆'}
                </button>
                <button class="compare-btn" data-id="${a.id}" style="font-size: 12px; padding: 6px; background: #ff8800;">
                    ⚖️
                </button>
            </div>
        </div>
    `).join('');
    
    // Re-attach event listeners after rendering new cards
    if (listenersAttached) setupEventListeners(); // Will be no-op since flag is true
}

function updateSummaryStats(filtered = allAsteroids) {
    const high = filtered.filter(a => a.riskLevel === 'high' || a.riskLevel === 'critical').length;
    const medium = filtered.filter(a => a.riskLevel === 'medium').length;
    const low = filtered.filter(a => a.riskLevel === 'low').length;
    
    document.getElementById('highCount').textContent = high;
    document.getElementById('mediumCount').textContent = medium;
    document.getElementById('lowCount').textContent = low;
}

// ========================
// DETAILED PROFILE
// ========================
async function openAsteroidProfile(id) {
    const asteroid = allAsteroids.find(a => a.id === id);
    if (!asteroid) return;
    
    showLoading(true);
    
    try {
        // Fetch full details from NASA API
        const response = await fetch(`${LOOKUP_URL}/${id}?api_key=${API_KEY}`);
        const fullData = await response.json();
        
        const content = `
            <h2 style="margin-top: 0;">${fullData.name}</h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                <div style="background: #111633; padding: 15px; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: cyan;">📋 Identification</h3>
                    <p><strong>NEO Reference ID:</strong> ${fullData.id}</p>
                    <p><strong>Designation:</strong> ${fullData.designation}</p>
                    <p><strong>NASA JPL URL:</strong><br><a href="${fullData.nasa_jpl_url}" target="_blank" style="color: cyan; word-break: break-all;">${fullData.nasa_jpl_url}</a></p>
                    <p><strong>Absolute Magnitude (H):</strong> ${fullData.absolute_magnitude_h}</p>
                </div>
                
                <div style="background: #111633; padding: 15px; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: cyan;">📏 Physical Characteristics</h3>
                    <p><strong>Estimated Diameter:</strong></p>
                    <ul style="margin: 5px 0;">
                        <li>Min: ${asteroid.diameterMin.toFixed(2)} m</li>
                        <li>Max: ${asteroid.diameterMax.toFixed(2)} m</li>
                        <li>Avg: ${asteroid.diameterAvg.toFixed(2)} m</li>
                    </ul>
                </div>
            </div>
            
            <div style="background: #111633; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin-top: 0; color: cyan;">🚀 Close Approach Data</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <strong>Date & Time:</strong><br>
                        ${asteroid.closeApproachDate}
                    </div>
                    <div>
                        <strong>Relative Velocity:</strong><br>
                        ${asteroid.velocityKms} km/s<br>
                        (${asteroid.velocityKmh.toLocaleString()} km/h)
                    </div>
                    <div>
                        <strong>Miss Distance:</strong><br>
                        ${asteroid.missDistanceKm.toLocaleString()} km<br>
                        ${asteroid.missDistanceLunar} Lunar Distance<br>
                        ${asteroid.missDistanceAU} AU
                    </div>
                    <div>
                        <strong>Orbiting Body:</strong><br>
                        ${asteroid.orbitingBody}
                    </div>
                </div>
            </div>
            
            <div style="background: #111633; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin-top: 0; color: cyan;">⚠️ Hazard Assessment</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                    <div>
                        <strong>Potentially Hazardous:</strong><br>
                        <span style="color: ${asteroid.isPHA ? '#ff4444' : '#00ff88'}; font-size: 20px;">
                            ${asteroid.isPHA ? '⚠️ YES' : '✓ NO'}
                        </span>
                    </div>
                    <div>
                        <strong>Sentry Object:</strong><br>
                        <span style="color: ${asteroid.isSentryObject ? '#ff4444' : '#00ff88'}; font-size: 20px;">
                            ${asteroid.isSentryObject ? '⚠️ YES' : '✓ NO'}
                        </span>
                    </div>
                    <div>
                        <strong>Risk Score:</strong><br>
                        <span style="color: ${asteroid.riskLevel === 'high' || asteroid.riskLevel === 'critical' ? '#ff4444' : '#ffcc00'}; font-size: 24px; font-weight: bold;">
                            ${asteroid.riskScore}
                        </span>
                    </div>
                </div>
            </div>
            
            <div style="background: #111633; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin-top: 0; color: cyan;">🛰️ Orbital Parameters</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    ${fullData.orbital_data ? `
                        <div><strong>Orbit Class:</strong><br>${fullData.orbital_data.orbit_class?.orbit_class_type || 'N/A'}</div>
                        <div><strong>Semi-Major Axis:</strong><br>${fullData.orbital_data.semi_major_axis || 'N/A'} AU</div>
                        <div><strong>Eccentricity:</strong><br>${fullData.orbital_data.eccentricity || 'N/A'}</div>
                        <div><strong>Inclination:</strong><br>${fullData.orbital_data.inclination || 'N/A'}°</div>
                        <div><strong>Perihelion Distance:</strong><br>${fullData.orbital_data.perihelion_distance || 'N/A'} AU</div>
                        <div><strong>Aphelion Distance:</strong><br>${fullData.orbital_data.aphelion_distance || 'N/A'} AU</div>
                        <div><strong>Orbital Period:</strong><br>${fullData.orbital_data.orbital_period || 'N/A'} days</div>
                        <div><strong>First Observation:</strong><br>${fullData.orbital_data.first_observation_date || 'N/A'}</div>
                        <div><strong>Last Observation:</strong><br>${fullData.orbital_data.last_observation_date || 'N/A'}</div>
                        <div><strong>Orbit Determination:</strong><br>${fullData.orbital_data.orbit_determination_date || 'N/A'}</div>
                    ` : '<p>Orbital data not available</p>'}
                </div>
            </div>
            
            ${fullData.orbital_data ? `
            <div style="background: #111633; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin-top: 0; color: cyan;">🌌 Orbit Visualization</h3>
                <canvas id="orbit-canvas" width="700" height="400" style="width: 100%; max-width: 700px; border: 1px solid #333; border-radius: 8px;"></canvas>
            </div>
            ` : ''}
            
            <div style="background: #111633; padding: 15px; border-radius: 8px;">
                <h3 style="margin-top: 0; color: cyan;">📝 Research Notes</h3>
                <textarea id="research-notes-${id}" style="width: 100%; min-height: 100px; background: #0a0d1f; color: white; border: 1px solid #333; border-radius: 6px; padding: 10px; font-family: monospace;">${researchNotes[id] || ''}</textarea>
                <button onclick="saveResearchNotes('${id}')" style="margin-top: 10px; padding: 10px 20px; background: #00ff88; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    💾 Save Notes
                </button>
            </div>
        `;
        
        document.getElementById('profile-content').innerHTML = content;
        document.getElementById('profile-modal').style.display = 'block';
        
        // Draw orbit if data available
        if (fullData.orbital_data && fullData.orbital_data.semi_major_axis) {
            setTimeout(() => drawOrbitVisualization(fullData.orbital_data), 100);
        }
        
    } catch (error) {
        console.error('Profile fetch error:', error);
        alert('❌ Could not load detailed profile');
    } finally {
        showLoading(false);
    }
}

function drawOrbitVisualization(orbitalData) {
    const canvas = document.getElementById('orbit-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = 700;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // Parse orbital elements
    const a = parseFloat(orbitalData.semi_major_axis) || 1.5; // AU
    const e = parseFloat(orbitalData.eccentricity) || 0.2;
    
    // Scale factor (AU to pixels)
    const scale = 120;
    
    // Draw Sun
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText('☉ Sun', centerX + 15, centerY + 5);
    
    // Draw Earth orbit (1 AU circle)
    ctx.strokeStyle = '#0088ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 1 * scale, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw Earth
    ctx.fillStyle = '#0088ff';
    ctx.beginPath();
    ctx.arc(centerX + scale, centerY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('🌍 Earth', centerX + scale + 10, centerY + 5);
    
    // Draw asteroid elliptical orbit
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Ellipse parameters
    const b = a * Math.sqrt(1 - e * e); // Semi-minor axis
    const c = a * e; // Distance from center to focus
    
    // Draw ellipse (Sun at focus)
    ctx.ellipse(
        centerX + c * scale,  // Center shifted by focal distance
        centerY, 
        a * scale,            // Semi-major axis
        b * scale,            // Semi-minor axis
        0,                    // Rotation
        0, 
        Math.PI * 2
    );
    ctx.stroke();
    
    // Draw asteroid at perihelion
    const perihelion = a * (1 - e);
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(centerX + perihelion * scale, centerY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('☄️ Asteroid', centerX + perihelion * scale + 10, centerY - 10);
    
    // Legend
    ctx.fillStyle = '#888';
    ctx.font = '11px sans-serif';
    ctx.fillText(`Semi-major axis: ${a} AU`, 10, height - 40);
    ctx.fillText(`Eccentricity: ${e}`, 10, height - 25);
    ctx.fillText(`Orbital period: ${orbitalData.orbital_period || 'N/A'} days`, 10, height - 10);
}

// ========================
// ANALYTICS DASHBOARD
// ========================
function openAnalyticsDashboard() {
    document.getElementById('analytics-modal').style.display = 'block';
    
    setTimeout(() => {
        renderAnalytics();
    }, 100);
}

function renderAnalytics() {
    // Destroy existing charts
    [sizeChart, velocityChart, yearChart, riskChart].forEach(chart => {
        if (chart) chart.destroy();
    });
    
    // 1. Size Distribution Histogram
    const sizeData = allAsteroids.map(a => a.diameterMax);
    const sizeBins = [0, 50, 100, 200, 500, 1000, 5000];
    const sizeHistogram = createHistogram(sizeData, sizeBins);
    
    const sizeCtx = document.getElementById('size-chart').getContext('2d');
    sizeChart = new Chart(sizeCtx, {
        type: 'bar',
        data: {
            labels: ['0-50m', '50-100m', '100-200m', '200-500m', '500-1km', '1km+'],
            datasets: [{
                label: 'Number of Asteroids',
                data: sizeHistogram,
                backgroundColor: 'rgba(0, 255, 136, 0.6)',
                borderColor: 'rgba(0, 255, 136, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: {
                x: { ticks: { color: '#fff' }, grid: { color: '#333' } },
                y: { ticks: { color: '#fff' }, grid: { color: '#333' } }
            }
        }
    });
    
    // 2. Velocity Distribution
    const velocityData = allAsteroids.map(a => a.velocityKmh);
    const velBins = [0, 20000, 40000, 60000, 80000, 100000];
    const velHistogram = createHistogram(velocityData, velBins);
    
    const velCtx = document.getElementById('velocity-chart').getContext('2d');
    velocityChart = new Chart(velCtx, {
        type: 'bar',
        data: {
            labels: ['0-20k', '20-40k', '40-60k', '60-80k', '80-100k', '100k+'],
            datasets: [{
                label: 'Number of Asteroids',
                data: velHistogram,
                backgroundColor: 'rgba(255, 204, 0, 0.6)',
                borderColor: 'rgba(255, 204, 0, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: {
                x: { ticks: { color: '#fff' }, grid: { color: '#333' } },
                y: { ticks: { color: '#fff' }, grid: { color: '#333' } }
            }
        }
    });
    
    // 3. Discovery Year Timeline (using first observation)
    // Note: This requires full asteroid data with orbital_data
    const yearCounts = {};
    allAsteroids.forEach(a => {
        if (a._raw.orbital_data?.first_observation_date) {
            const year = a._raw.orbital_data.first_observation_date.split('-')[0];
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
    });
    
    const years = Object.keys(yearCounts).sort();
    const counts = years.map(y => yearCounts[y]);
    
    const yearCtx = document.getElementById('year-chart').getContext('2d');
    yearChart = new Chart(yearCtx, {
        type: 'line',
        data: {
            labels: years.length > 0 ? years : ['N/A'],
            datasets: [{
                label: 'Discoveries',
                data: counts.length > 0 ? counts : [0],
                borderColor: 'rgba(0, 212, 255, 1)',
                backgroundColor: 'rgba(0, 212, 255, 0.2)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: {
                x: { ticks: { color: '#fff' }, grid: { color: '#333' } },
                y: { ticks: { color: '#fff' }, grid: { color: '#333' } }
            }
        }
    });
    
    // 4. Risk Classification Pie Chart
    const riskCounts = {
        critical: allAsteroids.filter(a => a.riskLevel === 'critical').length,
        high: allAsteroids.filter(a => a.riskLevel === 'high').length,
        medium: allAsteroids.filter(a => a.riskLevel === 'medium').length,
        low: allAsteroids.filter(a => a.riskLevel === 'low').length
    };
    
    const riskCtx = document.getElementById('risk-chart').getContext('2d');
    riskChart = new Chart(riskCtx, {
        type: 'doughnut',
        data: {
            labels: ['Critical', 'High', 'Medium', 'Low'],
            datasets: [{
                data: [riskCounts.critical, riskCounts.high, riskCounts.medium, riskCounts.low],
                backgroundColor: ['#ff0000', '#ff4444', '#ffcc00', '#00ff88']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { 
                legend: { 
                    labels: { color: '#fff' },
                    position: 'bottom'
                } 
            }
        }
    });
}

function createHistogram(data, bins) {
    const histogram = new Array(bins.length).fill(0);
    data.forEach(value => {
        for (let i = 0; i < bins.length; i++) {
            if (i === bins.length - 1 || value < bins[i + 1]) {
                histogram[i]++;
                break;
            }
        }
    });
    return histogram;
}

// ========================
// COMPARISON TOOL
// ========================
let compareSelection = [];

function toggleCompareSelection(id) {
    const index = compareSelection.indexOf(id);
    if (index === -1) {
        if (compareSelection.length < 2) {
            compareSelection.push(id);
        } else {
            alert('⚠️ Maximum 2 asteroids for comparison. Deselect one first.');
            return;
        }
    } else {
        compareSelection.splice(index, 1);
    }
    
    document.getElementById('compare-count').textContent = compareSelection.length;
    applyFiltersAndRender(); // Re-render to update button states
}

function openCompareModal() {
    if (compareSelection.length !== 2) {
        alert('⚠️ Please select exactly 2 asteroids to compare');
        return;
    }
    
    const a1 = allAsteroids.find(a => a.id === compareSelection[0]);
    const a2 = allAsteroids.find(a => a.id === compareSelection[1]);
    
    const content = `
        <table style="width: 100%; border-collapse: collapse; color: white;">
            <thead>
                <tr style="background: #1a1f3a;">
                    <th style="padding: 12px; text-align: left; border: 1px solid #333;">Parameter</th>
                    <th style="padding: 12px; text-align: center; border: 1px solid #333;">${a1.designation}</th>
                    <th style="padding: 12px; text-align: center; border: 1px solid #333;">${a2.designation}</th>
                </tr>
            </thead>
            <tbody>
                ${createCompareRow('NEO ID', a1.id, a2.id)}
                ${createCompareRow('Diameter (m)', `${a1.diameterMin.toFixed(1)} - ${a1.diameterMax.toFixed(1)}`, `${a2.diameterMin.toFixed(1)} - ${a2.diameterMax.toFixed(1)}`)}
                ${createCompareRow('Velocity (km/s)', a1.velocityKms, a2.velocityKms, true)}
                ${createCompareRow('Miss Distance (LD)', a1.missDistanceLunar, a2.missDistanceLunar, false)}
                ${createCompareRow('Close Approach', a1.closeApproachDateShort, a2.closeApproachDateShort)}
                ${createCompareRow('PHA Status', a1.isPHA ? '⚠️ YES' : '✓ NO', a2.isPHA ? '⚠️ YES' : '✓ NO')}
                ${createCompareRow('Risk Score', a1.riskScore, a2.riskScore, true)}
                ${createCompareRow('Risk Level', a1.riskLevel.toUpperCase(), a2.riskLevel.toUpperCase())}
                ${createCompareRow('Absolute Magnitude', a1.absoluteMagnitude, a2.absoluteMagnitude)}
                ${createCompareRow('Orbiting Body', a1.orbitingBody, a2.orbitingBody)}
            </tbody>
        </table>
        
        <div style="margin-top: 20px; text-align: center;">
            <button onclick="compareSelection = []; closeModal('compare-modal'); applyFiltersAndRender();" style="padding: 10px 20px; background: #ff4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                Clear Selection
            </button>
        </div>
    `;
    
    document.getElementById('compare-content').innerHTML = content;
    document.getElementById('compare-modal').style.display = 'block';
}

function createCompareRow(label, val1, val2, highlightMax = false) {
    let style1 = '';
    let style2 = '';
    
    if (highlightMax && !isNaN(val1) && !isNaN(val2)) {
        if (parseFloat(val1) > parseFloat(val2)) {
            style1 = 'background: rgba(255, 68, 68, 0.3); font-weight: bold;';
        } else if (parseFloat(val2) > parseFloat(val1)) {
            style2 = 'background: rgba(255, 68, 68, 0.3); font-weight: bold;';
        }
    }
    
    return `
        <tr>
            <td style="padding: 10px; border: 1px solid #333; background: #111633;"><strong>${label}</strong></td>
            <td style="padding: 10px; border: 1px solid #333; text-align: center; ${style1}">${val1}</td>
            <td style="padding: 10px; border: 1px solid #333; text-align: center; ${style2}">${val2}</td>
        </tr>
    `;
}

// ========================
// WATCHLIST & ALERTS
// ========================
function addToWatchlist(id) {
    if (watchlist.includes(id)) {
        removeFromWatchlist(id);
        return;
    }
    
    watchlist.push(id);
    localStorage.setItem('researcher_watchlist', JSON.stringify(watchlist));
    renderWatchlist();
    applyFiltersAndRender();
}

function removeFromWatchlist(id) {
    watchlist = watchlist.filter(wid => wid !== id);
    localStorage.setItem('researcher_watchlist', JSON.stringify(watchlist));
    renderWatchlist();
    applyFiltersAndRender();
}

function renderWatchlist() {
    const container = document.getElementById('watchlist');
    
    if (watchlist.length === 0) {
        container.innerHTML = '<li style="color: #888;">No items in watchlist</li>';
        return;
    }
    
    container.innerHTML = watchlist.map(id => {
        const asteroid = allAsteroids.find(a => a.id === id);
        if (!asteroid) return '';
        return `
            <li style="margin-bottom: 8px; font-size: 13px;">
                <strong>${asteroid.designation}</strong><br>
                <span style="color: #888;">Risk: ${asteroid.riskScore} | ${asteroid.closeApproachDateShort}</span><br>
                <button class="remove-watchlist" data-id="${id}" style="font-size: 11px; padding: 4px 8px; margin-top: 4px; background: #ff4444;">
                    Remove
                </button>
            </li>
        `;
    }).join('');
}

function checkForAlerts() {
    const newAlerts = [];
    
    allAsteroids.forEach(a => {
        // Alert conditions
        if (a.isPHA && a.riskScore > 50) {
            newAlerts.push({
                id: a.id,
                type: 'critical',
                message: `⚠️ CRITICAL: PHA ${a.designation} with risk score ${a.riskScore}`
            });
        } else if (a.missDistanceKm < LUNAR_DISTANCE_KM) {
            newAlerts.push({
                id: a.id,
                type: 'proximity',
                message: `🌑 CLOSE APPROACH: ${a.designation} at ${a.missDistanceLunar} LD on ${a.closeApproachDateShort}`
            });
        } else if (a.diameterMax > 1000) {
            newAlerts.push({
                id: a.id,
                type: 'size',
                message: `📏 LARGE OBJECT: ${a.designation} diameter ${a.diameterMax.toFixed(0)}m`
            });
        }
    });
    
    alerts = newAlerts;
    localStorage.setItem('alerts', JSON.stringify(alerts));
    renderAlerts();
}

function renderAlerts() {
    const container = document.getElementById('alerts');
    
    if (alerts.length === 0) {
        container.innerHTML = '<li style="color: #888;">No active alerts</li>';
        return;
    }
    
    container.innerHTML = alerts.slice(0, 10).map(alert => `
        <li style="margin-bottom: 10px; font-size: 12px; padding: 8px; background: ${
            alert.type === 'critical' ? 'rgba(255,0,0,0.2)' : 
            alert.type === 'proximity' ? 'rgba(255,200,0,0.2)' : 
            'rgba(0,200,255,0.2)'
        }; border-radius: 6px;">
            ${alert.message}
        </li>
    `).join('');
}

// ========================
// DATA EXPORT
// ========================
function exportCSV() {
    const headers = ['ID', 'Designation', 'Diameter_Min', 'Diameter_Max', 'Velocity_km/s', 'Miss_Distance_km', 'Miss_Distance_LD', 'Close_Approach', 'PHA', 'Risk_Score', 'Risk_Level'];
    
    const rows = allAsteroids.map(a => [
        a.id,
        a.designation,
        a.diameterMin.toFixed(2),
        a.diameterMax.toFixed(2),
        a.velocityKms,
        a.missDistanceKm.toFixed(2),
        a.missDistanceLunar,
        a.closeApproachDateShort,
        a.isPHA,
        a.riskScore,
        a.riskLevel
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadFile(csv, 'asteroid_data.csv', 'text/csv');
}

function exportJSON() {
    const json = JSON.stringify(allAsteroids, null, 2);
    downloadFile(json, 'asteroid_data.json', 'application/json');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// ========================
// RESEARCH NOTES
// ========================
function saveResearchNotes(id) {
    const notes = document.getElementById(`research-notes-${id}`).value;
    researchNotes[id] = notes;
    localStorage.setItem('research_notes', JSON.stringify(researchNotes));
    alert('✅ Research notes saved');
}

// Make it global for onclick
window.saveResearchNotes = saveResearchNotes;

// ========================
// UTILITIES
// ========================
function showLoading(show) {
    const existing = document.getElementById('global-loader');
    if (existing) existing.remove();
    
    if (show) {
        const loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;';
        loader.innerHTML = '<div style="color: cyan; font-size: 24px;">⏳ Loading...</div>';
        document.body.appendChild(loader);
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

window.closeModal = closeModal;

// ========================
// CHART.JS CDN LOADER
// ========================
(function loadChartJS() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.onload = () => console.log('✅ Chart.js loaded');
    document.head.appendChild(script);
})();