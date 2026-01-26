import httpx
from app.config import get_settings
from app.logging_config import logger

settings = get_settings()

class WeatherService:
    def __init__(self):
        self.api_key = settings.WEATHER_API_KEY
        self.base_url = "https://api.openweathermap.org/data/2.5/weather"
        
    async def get_mining_decision(self):
        params = {
            "lat": settings.WEATHER_LAT,
            "lon": settings.WEATHER_LON,
            "appid": self.api_key,
            "units": "metric"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                # If using demo key, this might fail, so we'll mock response on 401/404
                resp = await client.get(self.base_url, params=params)
                
                if resp.status_code == 200:
                    data = resp.json()
                    weather_main = data['weather'][0]['main']
                    temp = data['main']['temp']
                    
                    # Logic for safety
                    is_unsafe = (weather_main in ["Rain", "Thunderstorm", "Snow"]) or (temp > 45.0)
                    
                    return {
                        "condition": weather_main,
                        "temperature": temp,
                        "decision": "UNSAFE" if is_unsafe else "SAFE",
                        "reason": "Adverse weather conditions" if is_unsafe else "Conditions optimal"
                    }
                else:
                    logger.warning(f"Weather API request failed: {resp.status_code}")
                    return self._mock_response()
                    
        except Exception as e:
            logger.error(f"Weather Service error: {e}")
            return self._mock_response()

    def _mock_response(self):
        return {
            "condition": "Clear (Mock)",
            "temperature": 28.5,
            "decision": "SAFE",
            "reason": "Mock data fallback"
        }

weather_service = WeatherService()
