# IoT Weather Monitoring System

A real-time weather monitoring dashboard built with Angular 19 (standalone components), Flask (Python) backend, Firebase Firestore, and a Raspberry Pi client that fetches OpenWeatherMap data and publishes it via MQTT. Farmers can view live weather conditions and historical trends to optimize irrigation schedules.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Directory Structure](#directory-structure)
6. [Configuration & Environment Variables](#configuration--environment-variables)
   - [Backend](#backend)
   - [Pi-Client (Publisher)](#pi-client-publisher)
   - [Frontend](#frontend)
7. [Installation & Setup](#installation--setup)
   - [1. Clone the Repository](#1-clone-the-repository)
   - [2. Set Up the Backend](#2-set-up-the-backend)
   - [3. Set Up the Pi-Client](#3-set-up-the-pi-client)
   - [4. Set Up the Frontend](#4-set-up-the-frontend)
8. [How to Run](#how-to-run)
   - [Start the Backend (Flask)](#start-the-backend-flask)
   - [Start the Pi-Client Publisher](#start-the-pi-client-publisher)
   - [Start the Frontend (Angular)](#start-the-frontend-angular)
9. [Firebase Firestore Security Rules](#firebase-firestore-security-rules)
10. [Troubleshooting & Common Issues](#troubleshooting--common-issues)
11. [License](#license)

---

## Project Overview

This project collects weather data from OpenWeatherMap (simulating sensors) using a Raspberry Pi (or any Linux machine) and publishes it to an MQTT broker. A Flask backend subscribes to the MQTT topic, writes each reading to Firestore (via the Admin SDK), and exposes a REST API for historical data. An Angular 19 frontend displays:

- **Live weather readings** (fetched via Firestore real-time listeners).
- **Historical trends** (temperature, humidity, pressure, wind speed) using Chart.js.
- **Leaflet map** showing farmer’s farm location (stored in Firestore user settings).
- **Authentication** via Firebase Authentication (email/password).
- **User settings** (farm location, alert thresholds) stored under `/users/{uid}` in Firestore.

---

## Features

- **Real-time Dashboard**: Displays the single latest reading from Firestore with <2s latency.
- **Historical Trends**: Line charts for temperature, humidity, pressure, and wind speed (last N readings).
- **Leaflet Map**: Shows farm location on an interactive map (OpenStreetMap tiles).
- **Authentication**: Firebase Email/Password sign-in & registration.
- **User Settings**: Each farmer can save farm latitude/longitude and irrigation thresholds in Firestore.
- **Backend API**: Flask REST endpoint (`GET /api/readings/recent?limit=N`) for historical data.
- **MQTT Pipeline**: Pi-Client publishes weather data JSON to an MQTT topic; Flask subscriber ingests and writes to Firestore.
- **Secure Firestore Rules**: Public read for `weather_readings`; authenticated read/write only for `/users/{uid}`.

---

## Architecture

1. **Pi-Client** (\`pi-client/\`):  
   - Fetches current weather from OpenWeatherMap every \`PUBLISH_INTERVAL\` seconds.  
   - Publishes JSON to \`MQTT_TOPIC\` on \`MQTT_BROKER_HOST:MQTT_BROKER_PORT\`.

2. **Flask Backend** (\`backend/\`):  
   - Subscribes to the same MQTT topic via Paho-MQTT.  
   - On each message, saves the reading to Firestore under \`weather_readings\` (Admin SDK).  
   - Exposes \`GET /api/readings/recent?limit=N\` for historical data (JSON response).  
   - Enables CORS so Angular frontend (localhost:4200) can access it.

3. **Angular Frontend** (\`frontend/\`):  
   - **Auth**: Uses AngularFire (v19) with Firebase v10 to handle sign-in/registration.  
   - **Live Data**: Subscribes to Firestore collection \`weather_readings\` (ordered by timestamp desc, limit=1).  
   - **Historical Data**: Calls Flask REST API to fetch last N readings.  
   - **Charts**: Chart.js (v4) with \`chartjs-adapter-date-fns\` for time scales.  
   - **Map**: Leaflet (v1.9.4) displays farm location from user settings.  
   - **User Settings**: \`/users/{uid}\` in Firestore, read/write only by authenticated user (security rules).

---

## Prerequisites

Before proceeding, ensure you have the following installed on your local machine:

- **Node.js** (>= v18) & **npm** (>= v9)  
- **Angular CLI** (>= v19.1.x)  
- **Python 3.9+**  
- **pip** (for Python packages)  
- **Virtualenv** or **venv** module  
- **Mosquitto** (or another MQTT broker) running on your LAN or local machine  
- **Git** (for cloning the repository)  

Additionally, you need:

- A **Firebase project** with Firestore and Authentication enabled.  
- A **Firebase Admin service account key** (JSON) for the backend.  
- An **OpenWeatherMap API key** (free tier is fine).  

---

## Directory Structure

\`\`\`
iot-weather-monitoring/
├── backend/
│   ├── .env                         # (UNTRACKED) Environment variables for Flask (e.g. FIREBASE_CREDENTIALS)
│   ├── serviceAccountKey.json       # (UNTRACKED) Firebase Admin service account
│   ├── app.py                       # Flask app + MQTT subscriber + REST API
│   ├── firebase_service.py          # Firestore Admin SDK helper (save & get_historical_readings)
│   ├── mqtt_subscriber.py           # Paho-MQTT subscriber thread logic
│   └── requirements.txt             # Python dependencies for Flask backend
│
├── pi-client/
│   ├── .env                         # (UNTRACKED) MQTT & OWM settings (broker host, API key, etc.)
│   ├── owm_publisher.py             # Python script: fetch OWM & publish to MQTT
│   └── requirements.txt             # Python dependencies for Pi-Client
│
└── frontend/
    ├── angular.json
    ├── package.json
    ├── package-lock.json
    └── src/
        ├── environments/
        │   ├── environment.ts           # (TRACKED) Placeholder Firebase Web config
        │   └── environment.prod.ts      # (TRACKED) Placeholder Firebase Web config (prod)
        │
        ├── index.html
        ├── main.ts
        ├── styles.css
        │
        └── app/
            ├── app.component.ts
            │
            ├── auth/
            │   ├── login.component.ts
            │   ├── login.component.html
            │   ├── login.component.css
            │   ├── register.component.ts
            │   ├── register.component.html
            │   └── register.component.css
            │
            ├── dashboard/
            │   ├── dashboard.component.ts
            │   ├── dashboard.component.html
            │   └── dashboard.component.css
            │
            ├── settings/
            │   ├── settings.component.ts
            │   ├── settings.component.html
            │   └── settings.component.css
            │
            └── services/
                ├── auth.service.ts
                ├── auth.guard.ts
                ├── api.service.ts
                ├── weather-data.service.ts
                └── user-settings.service.ts
\`\`\`

---

## Configuration & Environment Variables

Before running any component, you must configure environment variables or placeholder files as described below.

### Backend

#### \`backend/.env\` (UNTRACKED)

Create a file named \`.env\` in the \`backend/\` folder with the following keys:

\`\`\`bash
# Path to Firebase Admin service account JSON (absolute or relative)
FIREBASE_CREDENTIALS=./serviceAccountKey.json

# MQTT broker settings (e.g., local Mosquitto on 192.168.1.100:1883)
MQTT_BROKER_HOST=YOUR_MQTT_BROKER_HOST
MQTT_BROKER_PORT=1883
MQTT_TOPIC=weather/data

# Flask server settings (optional; defaults are below)
FLASK_HOST=127.0.0.1
FLASK_PORT=5000

# (Optional) A secret key for session or JWT-based auth
SECRET_KEY=YOUR_FLASK_SECRET_KEY
\`\`\`

- **\`FIREBASE_CREDENTIALS\`**: Path to your \`serviceAccountKey.json\` (downloaded from Firebase Console → Project Settings → Service Accounts → Generate Private Key).  
- **\`MQTT_BROKER_HOST\`**: IP or hostname of your MQTT broker.  
- **\`MQTT_TOPIC\`**: Topic name (e.g., \`weather/data\`).  
- **\`FLASK_HOST\`** / **\`FLASK_PORT\`**: Host & port where Flask will listen.  
- **\`SECRET_KEY\`**: (Optional) Used if you add sessions or JWT functionality.

> **Security:**  
> - **Do not commit** this \`.env\` file or \`serviceAccountKey.json\` to version control.  
> - Add them to \`.gitignore\` to prevent accidental commits.

---

#### \`backend/serviceAccountKey.json\` (UNTRACKED)

Download this JSON file from Firebase Console → Project Settings → Service Accounts → Generate New Private Key. Place it in \`backend/\`. It looks like:

\`\`\`jsonc
{
  "type": "service_account",
  "project_id": "your-firebase-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-abc@your-firebase-project-id.iam.gserviceaccount.com",
  // ...
}
\`\`\`

> **Action:**  
> - **Do not** commit.  
> - Rotate/regenerate if already pushed.

---

### Pi-Client (Publisher)

#### \`pi-client/.env\` (UNTRACKED)

Create \`pi-client/.env\` with:

\`\`\`bash
# MQTT broker (Mosquitto) settings
MQTT_BROKER_HOST=YOUR_MQTT_BROKER_HOST
MQTT_BROKER_PORT=1883
MQTT_TOPIC=weather/data

# OpenWeatherMap API settings
OPENWEATHERMAP_API_KEY=YOUR_OPENWEATHERMAP_API_KEY
LAT=43.6532
LON=-79.3832
UNITS=metric

# Interval (seconds) between API calls
PUBLISH_INTERVAL=60
\`\`\`

- **\`OPENWEATHERMAP_API_KEY\`**: Your OWM key (free tier).  
- **\`LAT\`** / **\`LON\`**: Coordinates of your farm.  
- **\`MQTT_BROKER_*\`**: Must match your broker’s IP/port.  
- **\`PUBLISH_INTERVAL\`**: Seconds between successive fetches (e.g., \`60\` = once per minute).

> **Action:**  
> - Add \`pi-client/.env\` to \`.gitignore\`.  
> - If you already committed your real key, rotate it in your OpenWeatherMap account.

---

### Frontend

#### \`frontend/src/environments/environment.ts\` (TRACKED, but no secrets)

Replace real Firebase values with placeholders before committing:

\`\`\`ts
export const environment = {
  production: false,
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_FIREBASE_AUTH_DOMAIN',
    projectId: 'YOUR_FIREBASE_PROJECT_ID',
    storageBucket: 'YOUR_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'YOUR_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'YOUR_FIREBASE_APP_ID',
    measurementId: 'YOUR_FIREBASE_MEASUREMENT_ID'
  }
};
\`\`\`

#### \`frontend/src/environments/environment.prod.ts\` (TRACKED, but no secrets)

\`\`\`ts
export const environment = {
  production: true,
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_FIREBASE_AUTH_DOMAIN',
    projectId: 'YOUR_FIREBASE_PROJECT_ID',
    storageBucket: 'YOUR_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'YOUR_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'YOUR_FIREBASE_APP_ID',
    measurementId: 'YOUR_FIREBASE_MEASUREMENT_ID'
  }
};
\`\`\`

> **Tip:**  
> - Do **not** include actual API keys.  
> - In CI/CD or production builds, supply real values via environment‐specific files or secrets.

---

## Installation & Setup

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/MadushanR/iot-weather-monitoring.git
cd iot-weather-monitoring
\`\`\`

---

### 2. Set Up the Backend (Flask)

1. **Navigate to the backend folder**:
   \`\`\`bash
   cd backend
   \`\`\`

2. **Create & activate a Python virtual environment**:
   \`\`\`bash
   python3 -m venv .venv
   source .venv/bin/activate       # macOS/Linux
   .venv\Scripts\activate        # Windows PowerShell
   \`\`\`

3. **Install Python dependencies**:
   \`\`\`bash
   pip install --upgrade pip
   pip install -r requirements.txt
   \`\`\`

4. **Create the \`.env\` file** (see [Configuration](#backend)).  
   - Copy:
     \`\`\`bash
     cp .env.example .env   # if .env.example exists
     \`\`\`
   - Edit \`.env\` to set \`FIREBASE_CREDENTIALS\`, \`MQTT_BROKER_HOST\`, etc.

5. **Place your \`serviceAccountKey.json\`** in this folder. Ensure \`FIREBASE_CREDENTIALS\` in \`.env\` points to it.

6. **Verify**:
   \`\`\`bash
   python -c "import os; print(os.getenv('FIREBASE_CREDENTIALS'))"
   # Should print “./serviceAccountKey.json” or your actual path.
   \`\`\`

---

### 3. Set Up the Pi-Client (Publisher)

1. **Open a new terminal** and navigate to the project root:
   \`\`\`bash
   cd iot-weather-monitoring/pi-client
   \`\`\`

2. **Create & activate a Python virtual environment**:
   \`\`\`bash
   python3 -m venv .venv
   source .venv/bin/activate       # macOS/Linux
   .venv\Scripts\activate        # Windows PowerShell
   \`\`\`

3. **Install Python dependencies**:
   \`\`\`bash
   pip install --upgrade pip
   pip install -r requirements.txt
   \`\`\`

4. **Create the \`.env\` file** (see [Configuration](#pi-client-publisher)).  
   - Copy:
     \`\`\`bash
     cp .env.example .env   # if .env.example exists
     \`\`\`
   - Edit \`.env\` to set \`OPENWEATHERMAP_API_KEY\`, \`MQTT_BROKER_HOST\`, etc.

5. **Verify**:
   \`\`\`bash
   python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.getenv('OPENWEATHERMAP_API_KEY'))"
   \`\`\`

---

### 4. Set Up the Frontend (Angular)

1. **Navigate to the frontend folder**:
   \`\`\`bash
   cd iot-weather-monitoring/frontend
   \`\`\`

2. **Install Node.js dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

3. **Update environment files** (see [Configuration](#frontend)):
   - Open \`src/environments/environment.ts\` & \`environment.prod.ts\` and replace placeholder strings (\`YOUR_FIREBASE_API_KEY\`, etc.) with your actual Firebase Web config for development and production.  
   - **Do not** commit your real keys; ensure they’re placeholders before pushing publicly.

4. **Verify**:
   \`\`\`bash
   npm run build
   \`\`\`
   - Should compile without errors.

---

## How to Run

### Start the Backend (Flask)

1. In a terminal, **activate the backend venv** and **run**:
   \`\`\`bash
   cd backend
   source .venv/bin/activate       # macOS/Linux
   .venv\Scripts\activate        # Windows PowerShell
   python app.py
   \`\`\`
   - Flask will start on \`http://127.0.0.1:5000\` (unless you changed \`FLASK_HOST\`/\`FLASK_PORT\`).
   - Confirm you see logs like:
     ```
     * Running on http://127.0.0.1:5000/ (Press CTRL+C to quit)
     [MQTT] Connected (rc=0), subscribing to 'weather/data'
     ```

2. **Test the REST endpoint** (in a separate terminal):
   \`\`\`bash
   curl http://127.0.0.1:5000/api/readings/recent?limit=5
   \`\`\`
   - Should return JSON:  
     \`\`\`json
     { "status": "success", "data": [ /* array of readings */ ] }
     \`\`\`

---

### Start the Pi-Client Publisher

1. In a **new terminal**, **activate the pi-client venv** and **run**:
   \`\`\`bash
   cd pi-client
   source .venv/bin/activate       # macOS/Linux
   .venv\Scripts\activate        # Windows PowerShell
   python owm_publisher.py
   \`\`\`
   - You should see output every \`PUBLISH_INTERVAL\` seconds:
     ```
     Starting OWM → MQTT publisher (press Ctrl+C to stop).
     [PUBLISH] {"timestamp": 169…, "owm_temp": 22.5, …}
     ```

2. **Verify** MQTT messages (in a separate terminal):
   \`\`\`bash
   mosquitto_sub -h YOUR_MQTT_BROKER_HOST -t weather/data -v
   \`\`\`
   - You should see lines like:
     ```
     weather/data {"timestamp":169…, "owm_temp":22.5, …}
     ```

3. The Flask subscriber will automatically pick up these messages and write them into Firestore under \`weather_readings\`.

---

### Start the Frontend (Angular)

1. In another terminal, **navigate to** \`frontend\` and **run**:
   \`\`\`bash
   cd frontend
   ng serve --open
   \`\`\`
   - This opens \`http://localhost:4200\` in your browser.

2. **Navigate to**:
   - \`/register\` to create a new account (Firebase Email/Password).  
   - \`/login\` to sign in.  

3. After login, you’ll be redirected to \`/dashboard\`:
   - **Live Weather**: Displays the most recent reading in real time.  
   - **Historical Trends**: Enter “Number of Records” (e.g. \`24\`) and click **Load** to see charts.  
   - **Map**: Displays farm location from your user settings.  
   - **Settings**: Navigate to \`/settings\` (via the nav bar) to update \`farmLocation\` or irrigation thresholds.

---

## Firebase Firestore Security Rules

In the Firebase Console → Firestore Database → Rules, use:

```groovy
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 1) weather_readings: anyone can read; no client writes
    match /weather_readings/{docId} {
      allow read: if true;
      allow write: if false;
    }

    // 2) users: only authenticated user can read/write their own doc
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 3) Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- **Public read** on \`weather_readings\` for live & historical data.  
- **Authenticated read/write** for \`/users/{uid}\` so each farmer can only manage their own settings.

---

## Troubleshooting & Common Issues

1. **“Missing or insufficient permissions” (Firestore)**  
   - Confirm your Firestore rules match the snippet above.  
   - Ensure you’re authenticated before accessing \`/users/{uid}\`.

2. **CORS errors (Flask → Angular)**  
   - Make sure \`app.py\` includes:
     ```python
     from flask_cors import CORS
     app = Flask(__name__)
     CORS(app)
     ```
   - Restart Flask after editing \`app.py\`.

3. **“Canvas is already in use” (Chart.js)**  
   - We now explicitly destroy previous charts via \`Chart.getChart(id)?.destroy()\` before creating new ones.

4. **“Cannot read properties of null (getContext)”**  
   - The code waits until \`latestReading\` is non-null (so \`<canvas>\` is in the DOM) before drawing charts.

5. **“date adapter not implemented” (Chart.js time scale)**  
   - We installed & imported \`chartjs-adapter-date-fns\`. Confirm \`npm install chartjs-adapter-date-fns date-fns\` ran successfully.

6. **“FirebaseError: Type does not match expected instance” (Firestore SDK)**  
   - Ensure **all** Firestore imports come from \`@angular/fire/firestore\` (Modular SDK).  
   - Run \`npm uninstall firebase/compat @firebase/firestore-compat\` if accidentally installed.

7. **“OPENWEATHERMAP_API_KEY” missing (Pi-Client)**  
   - Verify \`pi-client/.env\` exists and contains \`OPENWEATHERMAP_API_KEY=YOUR_KEY\`.  
   - Run \`python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.getenv('OPENWEATHERMAP_API_KEY'))"\` to confirm.

8. **“ServiceAccountKey.json not found” (Backend)**  
   - Ensure \`backend/.env\` contains \`FIREBASE_CREDENTIALS=./serviceAccountKey.json\` (or absolute path).  
   - Confirm \`serviceAccountKey.json\` exists at that location.

---

## License

This project is released under the MIT License. See the [LICENSE](LICENSE) file for details.


