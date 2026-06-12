const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const useLocationBtn = document.getElementById("use-location");
const statusEl = document.getElementById("status");
const currentEl = document.getElementById("current");
const forecastEl = document.getElementById("forecast");

const weatherCodes = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Showers",
  82: "Violent showers",
  95: "Thunderstorm"
};

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function formatDay(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, { weekday: "short" });
}

async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not search city right now.");
  const data = await response.json();
  const place = data?.results?.[0];
  if (!place) throw new Error("City not found. Try a different name.");
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    name: `${place.name}${place.country ? `, ${place.country}` : ""}`
  };
}

async function fetchWeather(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not fetch weather data.");
  return response.json();
}

function renderCurrent(locationName, current, timezone) {
  const description = weatherCodes[current.weather_code] || "Unknown";
  currentEl.innerHTML = `
    <div class="current-row">
      <div>
        <h2>${locationName}</h2>
        <div class="temp">${Math.round(current.temperature_2m)}°C</div>
        <div>${description}</div>
      </div>
      <div class="meta">
        <div>Feels like: ${Math.round(current.apparent_temperature)}°C</div>
        <div>Humidity: ${current.relative_humidity_2m}%</div>
        <div>Wind: ${Math.round(current.wind_speed_10m)} km/h</div>
        <div>Timezone: ${timezone}</div>
      </div>
    </div>
  `;
  currentEl.classList.remove("hidden");
}

function renderForecast(daily) {
  const cards = daily.time.map((date, index) => {
    const code = daily.weather_code[index];
    return `
      <article>
        <h3>${formatDay(date)}</h3>
        <div>${weatherCodes[code] || "Unknown"}</div>
        <div class="range">${Math.round(daily.temperature_2m_max[index])}° / ${Math.round(daily.temperature_2m_min[index])}°</div>
      </article>
    `;
  });

  forecastEl.innerHTML = cards.join("");
  forecastEl.classList.remove("hidden");
}

async function loadWeatherByCoords(latitude, longitude, locationName = "Current Location") {
  try {
    setStatus("Loading weather...");
    const weather = await fetchWeather(latitude, longitude);
    renderCurrent(locationName, weather.current, weather.timezone);
    renderForecast(weather.daily);
    setStatus("Weather updated.", "success");
  } catch (error) {
    currentEl.classList.add("hidden");
    forecastEl.classList.add("hidden");
    setStatus(error.message || "Failed to load weather.", "error");
  }
}

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;

  try {
    setStatus("Searching city...");
    const place = await geocodeCity(city);
    await loadWeatherByCoords(place.latitude, place.longitude, place.name);
  } catch (error) {
    currentEl.classList.add("hidden");
    forecastEl.classList.add("hidden");
    setStatus(error.message || "Could not load city weather.", "error");
  }
});

useLocationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported in this browser.", "error");
    return;
  }

  setStatus("Getting your location...");
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => loadWeatherByCoords(coords.latitude, coords.longitude),
    () => setStatus("Location access denied. Search by city instead.", "error")
  );
});

setStatus("Search a city or use your location to get started.");
