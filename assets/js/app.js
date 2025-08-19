document.addEventListener("componentsLoaded", () => {
  console.log("✅ Semua komponen sudah dimuat, sekarang jalankan app.js");

  function el(id) {
    return document.getElementById(id);
  }

  const status = el("status");
  const forecastEl = el("forecast");

  const WEATHER_MAP = {
    0: {label:'Cerah', icon:'☀️'},
    1: {label:'Cerah sebagian', icon:'🌤️'},
    2: {label:'Berawan sebagian', icon:'⛅'},
    3: {label:'Berawan', icon:'☁️'},
    45:{label:'Berkabut', icon:'🌫️'},
    48:{label:'Kabut rime', icon:'🌫️'},
    51:{label:'Gerimis ringan', icon:'🌦️'},
    53:{label:'Gerimis', icon:'🌦️'},
    55:{label:'Gerimis lebat', icon:'🌧️'},
    56:{label:'Gerimis beku ringan', icon:'🌧️'},
    57:{label:'Gerimis beku lebat', icon:'🌧️'},
    61:{label:'Hujan ringan', icon:'🌧️'},
    63:{label:'Hujan', icon:'🌧️'},
    65:{label:'Hujan lebat', icon:'⛈️'},
    66:{label:'Hujan beku ringan', icon:'🌧️'},
    67:{label:'Hujan beku lebat', icon:'🌧️'},
    71:{label:'Salju ringan', icon:'❄️'},
    73:{label:'Salju', icon:'❄️'},
    75:{label:'Salju lebat', icon:'❄️'},
    77:{label:'Butiran salju', icon:'❄️'},
    80:{label:'Hujan rintik', icon:'🌦️'},
    81:{label:'Hujan singkat', icon:'🌦️'},
    82:{label:'Hujan deras singkat', icon:'⛈️'},
    85:{label:'Hujan salju singkat', icon:'❄️'},
    86:{label:'Hujan salju deras', icon:'❄️'},
    95:{label:'Badai petir', icon:'⛈️'},
    96:{label:'Badai petir (es kecil)', icon:'⛈️'},
    99:{label:'Badai petir (es besar)', icon:'⛈️'}
  };

  const fmtTemp = t => `${Math.round(t)}°C`;
  const fmtWind = w => `${Math.round(w)} km/j`;
  const fmtPct  = x => x == null ? '—' : `${Math.round(x)}%`;
  const fmtMM = x => `${(x ?? 0).toFixed(1)} mm`;

  const saveRecent = (place) => {
    try{
      const list = JSON.parse(localStorage.getItem('recent_places')||'[]');
      const exists = list.find(x => x.id === place.id);
      const next = [place, ...list.filter(x => x.id !== place.id)].slice(0,8);
      localStorage.setItem('recent_places', JSON.stringify(next));
      renderRecent();
    }catch(e){/* ignore */}
  }

  const renderRecent = () => {
    const box = el('recent');
    box.innerHTML = '';
    try{
      const list = JSON.parse(localStorage.getItem('recent_places')||'[]');
      list.forEach(p => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.textContent = `${p.name}${p.admin1? ', '+p.admin1: ''}${p.country? ', '+p.country: ''}`;
        chip.onclick = () => fetchByCoords(p.lat, p.lon, p);
        box.appendChild(chip);
      })
    }catch(e){/* ignore */}
  }

  function setStatus(msg, isError=false){
    status.textContent = msg || '';
    status.className = 'status' + (isError? ' error': '');
  }

  function setCurrent(placeLabel, current, daily, humidity){
    el('place').textContent = placeLabel;
    const code = current.weathercode;
    const meta = WEATHER_MAP[code] || {label: '—', icon: '—'};
    el('currentIcon').textContent = meta.icon;
    el('desc').textContent = meta.label;
    el('temp').textContent = fmtTemp(current.temperature);
    el('time').textContent = new Date(current.time).toLocaleString();
    el('wind').textContent = fmtWind(current.windspeed);
    el('code').textContent = code;
    el('humidity').textContent = humidity != null ? fmtPct(humidity) : '—';
    el('precip').textContent = daily && daily.precipitation_sum && daily.precipitation_sum[0] != null ? fmtMM(daily.precipitation_sum[0]) : '—';
  }

  function renderForecast(daily){
    forecastEl.innerHTML = '';
    if(!daily || !daily.time) return;
    daily.time.forEach((iso, i) => {
      const day = new Date(iso);
      const tile = document.createElement('div');
      tile.className = 'tile';
      const code = daily.weathercode?.[i] ?? 0;
      const meta = WEATHER_MAP[code] || {label:'—', icon:'—'};
      tile.innerHTML = `
        <div class="muted">${day.toLocaleDateString(undefined, { weekday:'short', day:'2-digit', month:'short' })}</div>
        <div style="font-size:28px">${meta.icon}</div>
        <div class="muted">${meta.label}</div>
        <div style="margin-top:6px"><span class="hi">${fmtTemp(daily.temperature_2m_max?.[i])}</span> / ${fmtTemp(daily.temperature_2m_min?.[i])}</div>
        <div class="muted">Curah Hujan: ${fmtMM(daily.precipitation_sum?.[i])}</div>
      `;
      forecastEl.appendChild(tile);
    })
  }

  async function geocode(name){
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=id&format=json`;
    const res = await fetch(url, {headers:{'Accept':'application/json'}});
    if(!res.ok) throw new Error('Gagal geocoding');
    const data = await res.json();
    if(!data.results || !data.results.length) throw new Error('Kota tidak ditemukan');
    const r = data.results[0];
    return {
      id: r.id,
      name: r.name,
      admin1: r.admin1,
      country: r.country,
      lat: r.latitude,
      lon: r.longitude,
      tz: r.timezone
    };
  }

  async function fetchWeather(lat, lon, tz){
    const params = new URLSearchParams({
      latitude: lat, longitude: lon,
      timezone: tz || 'auto',
      current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m',
      hourly: 'relative_humidity_2m',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum'
    });
    // Backward compat names for some fields (the API provides both current and current_weather in different versions)
    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const res = await fetch(url, {headers:{'Accept':'application/json'}});
    if(!res.ok) throw new Error('Gagal mengambil cuaca');
    const data = await res.json();

    // Normalize current fields
    const current = {
      time: data.current?.time || data.current_weather?.time,
      temperature: data.current?.temperature_2m ?? data.current_weather?.temperature,
      windspeed: data.current?.wind_speed_10m ?? data.current_weather?.windspeed,
      winddirection: data.current?.wind_direction_10m ?? data.current_weather?.winddirection,
      weathercode: data.current?.weather_code ?? data.current_weather?.weathercode
    };

    // Try to get current humidity: prefer data.current.relative_humidity_2m, else approximate from hourly (first hour)
    let humidity = data.current?.relative_humidity_2m;
    if (humidity == null && data.hourly?.relative_humidity_2m?.length){
      // pick the hour matching current time if possible
      const idx = data.hourly.time?.indexOf(current.time);
      humidity = idx >= 0 ? data.hourly.relative_humidity_2m[idx] : data.hourly.relative_humidity_2m[0];
    }

    return { current, daily: data.daily, humidity };
  }

  async function fetchByCoords(lat, lon, placeMeta){
    try{
      setStatus('Mengambil data cuaca…');
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const {current, daily, humidity} = await fetchWeather(lat, lon, tz);
      const label = placeMeta ? `${placeMeta.name}${placeMeta.admin1? ', '+placeMeta.admin1: ''}${placeMeta.country? ', '+placeMeta.country: ''}` : `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`;
      setCurrent(label, current, daily, humidity);
      renderForecast(daily);
      setStatus('');
      if(placeMeta) saveRecent(placeMeta);
    }catch(err){
      console.error(err);
      setStatus(err.message || 'Terjadi kesalahan', true);
    }
  }

  async function handleSearch(e){
    e.preventDefault();
    const q = el('q').value.trim();
    if(!q){ setStatus('Masukkan nama kota'); return; }
    try{
      setStatus('Mencari lokasi…');
      const p = await geocode(q);
      await fetchByCoords(p.lat, p.lon, p);
    }catch(err){
      console.error(err);
      setStatus(err.message || 'Kota tidak ditemukan', true);
    }
  }

  function handleUseLocation(){
    if(!navigator.geolocation){ setStatus('Geolokasi tidak didukung browser ini', true); return; }
    setStatus('Meminta izin lokasi…');
    navigator.geolocation.getCurrentPosition(async pos => {
      const {latitude, longitude} = pos.coords;
      await fetchByCoords(latitude, longitude);
    }, err => {
      setStatus('Gagal mendapatkan lokasi (' + err.message + ')', true);
    }, { enableHighAccuracy:true, timeout: 10000, maximumAge: 60000 });
  }

  // Init
  document.getElementById('searchForm').addEventListener('submit', handleSearch);
  document.getElementById('useLocation').addEventListener('click', handleUseLocation);
  renderRecent();

  // Default: coba tampilkan cuaca Jakarta saat load pertama
  geocode('Jakarta').then(p => fetchByCoords(p.lat, p.lon, p)).catch(()=>{});
});


