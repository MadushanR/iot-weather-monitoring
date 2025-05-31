import os
import time
import json
import requests
import paho.mqtt.client as mqtt
from dotenv import load_dotenv

# ─── Load environment ─────────────────────────────────────────
load_dotenv()

BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", 1883))
TOPIC       = os.getenv("MQTT_TOPIC", "weather/data")

API_KEY     = os.getenv("OPENWEATHERMAP_API_KEY")
LAT         = os.getenv("LAT")
LON         = os.getenv("LON")
UNITS       = os.getenv("UNITS")

INTERVAL    = int(os.getenv("PUBLISH_INTERVAL", 60))

if not API_KEY or not LAT or not LON:
    raise ValueError("Missing OWM API key or LAT/LON in environment.")

# ─── MQTT Setup ───────────────────────────────────────────────
client = mqtt.Client()
client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
client.loop_start()

# ─── Helper: fetch from OWM ──────────────────────────────────
def fetch_openweathermap(latitude, longitude, api_key, units="metric"):
    """
    Call the OWM "Current Weather" endpoint for given coordinates.
    Returns a dict: { owm_temp, owm_humidity, owm_pressure, owm_wind_speed, owm_weather }
    """
    url = (
        f"http://api.openweathermap.org/data/2.5/weather?"
        f"lat={latitude}&lon={longitude}&units={units}&appid={api_key}"
    )
    try:
        response = requests.get(url, timeout=5)
        data = response.json()
        return {
            "owm_temp": data["main"]["temp"],                # °C or °F
            "owm_humidity": data["main"]["humidity"],         # %
            "owm_pressure": data["main"]["pressure"],         # hPa
            "owm_wind_speed": data["wind"]["speed"],          # m/s or mph
            "owm_weather": data["weather"][0]["description"], # e.g. “clear sky”
        }
    except Exception as e:
        print(f"[ERROR] OWM fetch failed: {e}")
        return None

# ─── Main Loop ────────────────────────────────────────────────
try:
    print("Starting OWM → MQTT publisher (press Ctrl+C to stop).")
    while True:
        owm_data = fetch_openweathermap(LAT, LON, API_KEY, UNITS)
        if owm_data:
            timestamp = int(time.time() * 1000)  # ms since epoch
            payload = {
                "timestamp": timestamp,
                **owm_data
            }
            client.publish(TOPIC, json.dumps(payload))
            print(f"[PUBLISH] {payload}")
        else:
            print("[WARN] Skipping publish due to fetch error.")

        time.sleep(INTERVAL)

except KeyboardInterrupt:
    print("Stopping publisher...")
    client.loop_stop()
    client.disconnect()
