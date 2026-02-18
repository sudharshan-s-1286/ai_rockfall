import httpx
from app.config import get_settings
from app.logging_config import logger
from app.models import WeatherLog
# from app.database import AsyncSessionLocal # Removed
from datetime import datetime

settings = get_settings()

class WeatherService:
    def __init__(self):
        self.api_key = settings.WEATHER_API_KEY
        self.base_url = "https://api.openweathermap.org/data/2.5"
        
    async def get_current_weather(self):
        """
        Fetches current weather, calculates risk, saves to DB, and returns data.
        """
        params = {
            "lat": settings.WEATHER_LAT,
            "lon": settings.WEATHER_LON,
            "appid": self.api_key,
            "units": "metric"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{self.base_url}/weather", params=params)
                
                if resp.status_code == 200:
                    data = resp.json()
                    return await self._process_weather_data(data)
                else:
                    logger.warning(f"Weather API request failed: {resp.status_code}")
                    return self._mock_response()
                    
        except Exception as e:
            logger.error(f"Weather Service error: {e}")
            return self._mock_response()

    async def get_forecast(self):
        """
        Fetches 5-day/3-hour forecast.
        """
        params = {
            "lat": settings.WEATHER_LAT,
            "lon": settings.WEATHER_LON,
            "appid": self.api_key,
            "units": "metric"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{self.base_url}/forecast", params=params)
                
                if resp.status_code == 200:
                    return resp.json()
                else:
                    logger.warning(f"Forecast API request failed: {resp.status_code}")
                    return {"error": "Failed to fetch forecast"}
                    
        except Exception as e:
            logger.error(f"Forecast Service error: {e}")
            return {"error": str(e)}

    async def _process_weather_data(self, data):
        """
        Extracts metrics, calculates risk including forecast, and saves to DB.
        """
        weather_main = data['weather'][0]['main']
        temp = data['main']['temp']
        humidity = data['main']['humidity']
        wind_speed = data['wind']['speed']
        
        # Rainfall (1h volume in mm) - key might not exist if no rain
        rainfall = 0.0
        if 'rain' in data:
            rainfall = data['rain'].get('1h', 0.0)
            
        # Get Forecast for next 24 hours to check for heavy rain
        forecast_heavy_rain = False
        try:
            forecast = await self.get_forecast()
            if "list" in forecast:
                # Check next 8 entries (3 hours * 8 = 24 hours)
                for entry in forecast["list"][:8]:
                    if "rain" in entry and entry["rain"].get("3h", 0) > 15.0: # Threshold for heavy rain/3h
                        forecast_heavy_rain = True
                        break
        except:
            logger.warning("Could not fetch forecast for risk calculation")

        # Risk Logic
        risk_score = 0.0
        risk_factors = []
        
        # 1. Current Rainfall Risk
        if rainfall > 50.0: # Extreme
            risk_score += 10.0
            risk_factors.append("Extreme Current Rainfall (>50mm)")
        elif rainfall > 20.0: # Heavy
            risk_score += 6.0
            risk_factors.append("Heavy Current Rainfall")
            
        # 2. Forecast Risk (24h)
        if forecast_heavy_rain:
            risk_score += 5.0
            risk_factors.append("Heavy Rainfall Predicted (Next 24h)")
            
        # 3. Wind Risk
        if wind_speed > 20.0: # m/s (approx 72 km/h)
            risk_score += 4.0
            risk_factors.append(f"High Winds ({wind_speed} m/s)")
            
        # 4. Condition Risk
        if weather_main in ["Thunderstorm", "Tornado", "Squall"]:
            risk_score += 5.0
            risk_factors.append(f"Adverse Condition: {weather_main}")
            
        # Normalize/Cap Risk Score
        risk_score = min(risk_score, 10.0)
        
        # Status & Recommendation
        risk_level = "LOW"
        status = "Safe"     # Legacy compatibility
        recommendation = "Normal mining operations authorized."
        
        if risk_score >= 8.0:
            risk_level = "HIGH"
            status = "High Risk"
            recommendation = "Pause mining operations for 24 hours due to heavy rainfall risk."
        elif risk_score >= 4.0:
            risk_level = "MEDIUM"
            status = "Monitor"
            recommendation = "Exercise caution. Monitor slope stability closely."
            
        result = {
            "temperature": temp,
            "rainfall": rainfall,
            "humidity": humidity,
            "wind_speed": wind_speed,
            "condition": weather_main,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "status": status,
            "recommendation": recommendation,
            "is_safe": "SAFE" if risk_level == "LOW" else "UNSAFE",
            "decision": "SAFE" if risk_level == "LOW" else "UNSAFE",
            "reason": ", ".join(risk_factors) if risk_factors else "Conditions Optimal"
        }
        
        # Save to DB (Weather History)
        await self._save_weather_log(result)
        
        # Create Alert if MEDIUM or HIGH
        if risk_level in ["MEDIUM", "HIGH"]:
            from app.models import Alert
            alert = Alert(
                alert_type="WEATHER",
                severity=risk_level,
                source="Weather Intelligence",
                message=f"{risk_level} Risk: {recommendation}",
                status="ACTIVE"
            )
            await alert.insert()
        
        return result

    async def _save_weather_log(self, data):
        try:
            log = WeatherLog(
                condition=data['condition'],
                temperature=data['temperature'],
                rainfall=data['rainfall'],
                humidity=data['humidity'],
                wind_speed=data['wind_speed'],
                risk_score=data['risk_score'],
                risk_level=data['risk_level'],
                recommendation=data['recommendation'],
                is_safe=data['status']
            )
            await log.insert()
        except Exception as e:
            logger.error(f"Failed to save weather log: {e}")

    def _mock_response(self):
        return {
            "temperature": 28.5,
            "rainfall": 0.0,
            "humidity": 65.0,
            "wind_speed": 5.2,
            "condition": "Clouds (Mock)",
            "risk_score": 0.0,
            "status": "Safe",
            "recommendation": "Continue Operations",
            "is_safe": "SAFE",
            "decision": "SAFE",
            "reason": "Mock data fallback"
        }

weather_service = WeatherService()
