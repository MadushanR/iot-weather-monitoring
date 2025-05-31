from flask import Flask, jsonify, request, abort
from flask_cors import CORS
import os
from mqtt_subscriber import init_mqtt_thread
from firebase_service import get_historical_readings, db
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

app = Flask(__name__)
CORS(app)

# Start MQTT listener in background
init_mqtt_thread()

@app.route("/api/readings/recent", methods=["GET"])
def recent_readings():
    """
    GET /api/readings/recent?limit=24
    Returns the last `limit` readings from Firestore.
    """
    try:
        limit = int(request.args.get("limit", 24))
    except ValueError:
        limit = 24

    readings = get_historical_readings(limit=limit)
    # Firestore returns DESC order; if you want ASC, reverse here:
    readings.reverse()
    return jsonify({ "status": "success", "data": readings }), 200

@app.route("/api/users/<user_id>/settings", methods=["GET", "POST", "PUT"])
def user_settings(user_id):
    """
    GET:   Fetch settings for `users/{user_id}`.
    POST/PUT: Update or create that document.
    """
    user_ref = db.collection("users").document(user_id)
    if request.method == "GET":
        doc = user_ref.get()
        if doc.exists:
            return jsonify({ "status": "success", "data": doc.to_dict() }), 200
        else:
            return jsonify({ "status": "error", "message": "User not found" }), 404

    # For POST/PUT
    payload = request.get_json()
    if not payload:
        abort(400, description="Invalid JSON payload")
    payload["updated_ts"] = SERVER_TIMESTAMP
    user_ref.set(payload, merge=True)
    return jsonify({ "status": "success", "message": "Settings updated" }), 200

@app.errorhandler(400)
def bad_request(e):
    return jsonify({ "status": "error", "message": str(e) }), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify({ "status": "error", "message": str(e) }), 404

if __name__ == "__main__":
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", 5000))
    app.run(host=host, port=port, debug=True)
