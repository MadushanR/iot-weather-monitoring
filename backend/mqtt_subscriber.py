import os
import json
import time
import threading
import paho.mqtt.client as mqtt
from firebase_service import save_weather_reading

MQTT_BROKER = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_PORT   = int(os.getenv("MQTT_BROKER_PORT", 1883))
MQTT_TOPIC  = os.getenv("MQTT_TOPIC", "weather/data")

def on_connect(client, userdata, flags, rc):
    print(f"[MQTT] Connected (rc={rc}), subscribing to '{MQTT_TOPIC}'")
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    payload_str = msg.payload.decode("utf-8")
    try:
        data = json.loads(payload_str)
        # Expect data keys: timestamp, owm_temp, owm_humidity, owm_pressure, owm_wind_speed, owm_weather
        data["server_received_ts"] = int(time.time() * 1000)
        save_weather_reading(data)
        print(f"[MQTT→Firestore] Saved: {data}")
    except Exception as e:
        print(f"[MQTT] Failed to process message: {e}")

def start_mqtt_listener():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    client.loop_forever()

def init_mqtt_thread():
    thread = threading.Thread(target=start_mqtt_listener)
    thread.daemon = True
    thread.start()
