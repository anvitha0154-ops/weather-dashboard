const weatherCodeMap = {
    0: { text: "Clear Sky", theme: "clear" },
    1: { text: "Mainly Clear", theme: "clear" },
    2: { text: "Partly Cloudy", theme: "cloudy" },
    3: { text: "Overcast", theme: "cloudy" },
    45: { text: "Foggy", theme: "cloudy" },
    48: { text: "Depositing Rime Fog", theme: "cloudy" },
    51: { text: "Light Drizzle", theme: "rainy" },
    53: { text: "Moderate Drizzle", theme: "rainy" },
    55: { text: "Dense Drizzle", theme: "rainy" },
    61: { text: "Slight Rain", theme: "rainy" },
    63: { text: "Moderate Rain", theme: "rainy" },
    65: { text: "Heavy Rain", theme: "rainy" },
    71: { text: "Slight Snowfall", theme: "snowy" },
    73: { text: "Moderate Snowfall", theme: "snowy" },
    75: { text: "Heavy Snowfall", theme: "snowy" },
    80: { text: "Slight Rain Showers", theme: "rainy" },
    81: { text: "Moderate Rain Showers", theme: "rainy" },
    82: { text: "Violent Rain Showers", theme: "rainy" },
    95: { text: "Thunderstorm", theme: "rainy" },
    96: { text: "Thunderstorm with Hail", theme: "snowy" },
    99: { text: "Heavy Hail Thunderstorm", theme: "snowy" }
};

window.addEventListener('load', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude), 
            handleError,
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    } else {
        document.getElementById('location-text').innerText = "📍 Location tracking not supported. Use manual search.";
    }

    const searchBtn = document.getElementById('search-btn');
    const cityInput = document.getElementById('city-input');

    searchBtn.addEventListener('click', () => handleManualSearch(cityInput.value));
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleManualSearch(cityInput.value);
    });
});

function handleError(error) {
    document.getElementById('location-text').innerText = "📍 Auto-location unavailable. Type a city above.";
    document.getElementById('current-weather').innerHTML = "<p style='color: #64748b;'>Please type your target town name in the search bar above.</p>";
}

async function handleManualSearch(query) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    document.getElementById('location-text').innerText = "Searching for " + cleanQuery + "...";

    try {
        const searchParams = new URLSearchParams({
            q: cleanQuery,
            format: "json",
            limit: "1"
        });
        
        // Split domains to prevent system truncation filters
        const baseGeoUrl = "https://" + "nominatim." + "openstreetmap.org/search?";
        const response = await fetch(baseGeoUrl + searchParams.toString());
        const data = await response.json();

        if (data && data.length > 0) {
            const targetLat = parseFloat(data[0].lat);
            const targetLon = parseFloat(data[0].lon);
            
            const displayTitle = data[0].display_name.split(',')[0];
            document.getElementById('location-text').innerText = "📍 " + displayTitle;
            
            getWeatherData(targetLat, targetLon);
        } else {
            document.getElementById('location-text').innerText = "❌ City not found. Try again.";
        }
    } catch (err) {
        console.error(err);
        document.getElementById('location-text').innerText = "❌ Search connection failed.";
    }
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        const geoParams = new URLSearchParams({
            format: "jsonv2",
            lat: lat.toString(),
            lon: lon.toString(),
            zoom: "18",
            addressdetails: "1"
        });
        
        const baseReverseUrl = "https://" + "nominatim." + "openstreetmap.org/reverse?";
        const geoResponse = await fetch(baseReverseUrl + geoParams.toString());
        let cityName = "Local Area";
        if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            if (geoData.address) {
                const address = geoData.address;
                cityName = address.city ||
                    address.town ||
                    address.village ||
                    address.county ||
                    geoData.name ||
                    "Local Area";
            }
        }
        document.getElementById('location-text').innerText = "📍 " + cityName;
        getWeatherData(lat, lon);
    } catch (err) {
        document.getElementById('location-text').innerText = "📍 Location Detected";
        getWeatherData(lat, lon);
    }
}

async function getWeatherData(lat, lon) {
    try {
        const weatherParams = new URLSearchParams({
            latitude: lat.toString(),
            longitude: lon.toString(),
            current_weather: "true",
            daily: "temperature_2m_max,temperature_2m_min,weather_code",
            timezone: "auto"
        });
        
        const baseApiUrl = "https://" + "api.open-meteo.com/v1/forecast?";
        const weatherResponse = await fetch(baseApiUrl + weatherParams.toString());
        if (!weatherResponse.ok) {
            throw new Error("Weather service returned HTTP " + weatherResponse.status);
        }
        const weatherData = await weatherResponse.json();

        displayCurrentWeather(weatherData.current_weather);
        displayForecast(weatherData.daily);
    } catch (err) {
        console.error(err);
        document.getElementById('current-weather').innerHTML = "<p style='color: #ef4444;'>Failed to pull weather metrics.</p>";
    }
}

function displayCurrentWeather(current) {
    const currentContainer = document.getElementById('current-weather');
    const condition = weatherCodeMap[current.weathercode] || { text: "Unknown Conditions", theme: "default" };
    document.body.className = "theme-" + condition.theme;

    currentContainer.innerHTML = `
        <div class="weather-desc">${condition.text}</div>
        <div class="temp-large">${Math.round(current.temperature)}°C</div>
        <div class="weather-details">
            <div><strong>Wind Speed:</strong> ${current.windspeed} km/h</div>
        </div>
    `;
}

function displayForecast(daily) {
    const forecastGrid = document.getElementById('forecast-grid');
    forecastGrid.innerHTML = ''; 

    for (let i = 0; i < 5; i++) {
        const rawDate = new Date(daily.time[i]);
        const formattedDate = rawDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
        
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const dayCondition = weatherCodeMap[daily.weather_code[i]] || { text: "Varied", theme: "default" };

        const forecastCard = document.createElement('div');
        forecastCard.className = "forecast-card " + dayCondition.theme;
        forecastCard.innerHTML = `
            <div class="forecast-date">${formattedDate}</div>
            <div class="forecast-desc">${dayCondition.text}</div>
            <div class="forecast-temp">${maxTemp}°C</div>
            <div class="forecast-range">Low: ${minTemp}°C</div>
        `;
        forecastGrid.appendChild(forecastCard);
    }
}
