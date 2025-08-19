document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("searchForm");
  const btnLocation = document.getElementById("useLocation");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    searchWeather();
  });

  btnLocation.addEventListener("click", () => {
    useMyLocation();
  });

  // Load history saat pertama kali buka
  renderRecent();
});

// --- Fungsi Utama ---
async function searchWeather() {
  const query = document.getElementById("q").value.trim();
  if (!query) return;

  setStatus("Mencari lokasi...");
  try {
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}`).then(r => r.json());
    if (!geo.results || !geo.results.length) {
      setStatus("Lokasi tidak ditemukan");
      return;
    }
    const place = geo.results[0];
    fetchWeather(place.latitude, place.longitude, place.name);
  } catch (err) {
    setStatus("Gagal mencari lokasi");
    console.error(err);
  }
}

async function useMyLocation() {
  if (!navigator.geolocation) {
    setStatus("Geolocation tidak didukung browser ini");
    return;
  }
  setStatus("Mengambil lokasi Anda...");
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    fetchWeather(latitude, longitude, "Lokasi Saya");
  }, (err) => {
    setStatus("Gagal mendapatkan lokasi");
    console.error(err);
  });
}

async function fetchWeather(lat, lon, placeName) {
  setStatus("Mengambil data cuaca...");
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto`;
    const data = await fetch(url).then(r => r.json());

    renderWeather(data, placeName);

    saveRecent({ name: placeName, lat, lon });
    renderRecent();

    setStatus("");
  } catch (err) {
    setStatus("Gagal mengambil data cuaca");
    console.error(err);
  }
}

function renderWeather(data, placeName) {
  document.getElementById("place").textContent = placeName;
  document.getElementById("temp").textContent = data.current.temperature_2m + "°C";
  document.getElementById("desc").textContent = getWeatherDesc(data.current.weather_code);
  document.getElementById("time").textContent = new Date(data.current.time).toLocaleString("id-ID");
  document.getElementById("wind").textContent = data.current.wind_speed_10m + " km/jam";
  document.getElementById("code").textContent = data.current.weather_code;
  document.getElementById("humidity").textContent = data.current.relative_humidity_2m + "%";
  document.getElementById("precip").textContent = data.daily.precipitation_sum[0] + " mm";
  document.getElementById("currentIcon").textContent = getWeatherIcon(data.current.weather_code);

  const fcEl = document.getElementById("forecast");
  fcEl.innerHTML = "";
  data.daily.time.forEach((day, i) => {
    const d = new Date(day).toLocaleDateString("id-ID", { weekday: "short" });
    const html = `<div class="day">
      <div>${d}</div>
      <div class="icon">${getWeatherIcon(data.daily.weather_code[i])}</div>
      <div>${data.daily.temperature_2m_min[i]}°–${data.daily.temperature_2m_max[i]}°</div>
    </div>`;
    fcEl.innerHTML += html;
  });
}

// --- Utils ---
function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

function getWeatherIcon(code) {
  if ([0].includes(code)) return "☀️";
  if ([1, 2].includes(code)) return "⛅";
  if ([3].includes(code)) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65].includes(code)) return "🌧️";
  if ([71, 73, 75, 77].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "❓";
}

function getWeatherDesc(code) {
  const desc = {
    0: "Cerah", 1: "Cerah Berawan", 2: "Berawan", 3: "Mendung",
    45: "Berkabut", 48: "Kabut Beku",
    51: "Gerimis Ringan", 53: "Gerimis Sedang", 55: "Gerimis Lebat",
    61: "Hujan Ringan", 63: "Hujan Sedang", 65: "Hujan Lebat",
    71: "Salju Ringan", 73: "Salju Sedang", 75: "Salju Lebat", 77: "Butiran Salju",
    95: "Badai Petir", 96: "Badai Petir + Hujan Es", 99: "Badai Petir + Hujan Es Lebat"
  };
  return desc[code] || "Tidak Diketahui";
}

// --- Local Storage ---
function saveRecent(item) {
  let recent = JSON.parse(localStorage.getItem("recentSearch") || "[]");
  recent = [item, ...recent.filter(x => x.name !== item.name)].slice(0, 5);
  localStorage.setItem("recentSearch", JSON.stringify(recent));
}

function renderRecent() {
  const recent = JSON.parse(localStorage.getItem("recentSearch") || "[]");
  const rEl = document.getElementById("recent");
  rEl.innerHTML = recent.map(x => 
    `<button class="btn small" onclick="fetchWeather(${x.lat}, ${x.lon}, '${x.name}')">${x.name}</button>`
  ).join("");
}
