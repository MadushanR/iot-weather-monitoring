import os
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin
cred_path = os.getenv("FIREBASE_CREDENTIALS")
if not cred_path:
    raise ValueError("FIREBASE_CREDENTIALS not set")

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)

db = firestore.client()

def save_weather_reading(reading: dict):
    """
    Save an incoming reading dict into Firestore under 'weather_readings'.
    """
    col_ref = db.collection("weather_readings")
    doc_ref = col_ref.document()  # auto-generated ID
    doc_ref.set(reading)

def get_historical_readings(limit: int = 100):
    """
    Return the last `limit` readings (ordered by timestamp DESC).
    """
    col_ref = db.collection("weather_readings")
    docs = col_ref.order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit).stream()
    return [doc.to_dict() for doc in docs]
