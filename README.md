# 🚨 CrisisConnect - AI-Powered Emergency Response Management Platform

[![Tech Stack](https://img.shields.io/badge/Stack-MERN%20%7C%20React--Leaflet%20%7C%20Ollama%20Gemma%203%20%7C%20Twilio-blue)](https://github.com/Rishabhjain610/CrisisConnect)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

CrisisConnect is an end-to-end, multi-modal emergency response management ecosystem designed for rapid disaster coordination. It connects citizens, first responders (police, fire, medical), and emergency coordinators with real-time AI verification, multi-layer deepfake forensics, geospatial indexing, and automated dispatch workflows.

---

## 🎬 Demo Video

https://github.com/user-attachments/assets/714b7c08-76cd-4ba2-96f9-8f71569d0351

_Demo shows: Incident reporting → AI verification → Dispatch → Real-time dashboards → Resolution_

---

## 🏛️ System Architecture & Overview

```
                                  CRISISCONNECT ARCHITECTURE
                                  
     ┌──────────────────┐            ┌──────────────────┐           ┌──────────────────┐
     │  CITIZEN CLIENT  │            │  AGENCY PORTAL   │           │ COORDINATOR HUB  │
     │ (Voice SOS/Image)│            │(Responders/Units)│           │ (Macro Dispatch) │
     └─────────┬────────┘            └────────┬─────────┘           └────────┬─────────┘
               │                              │                              │
               └──────────────────────┬───────┴──────────────────────────────┘
                                      │  HTTPS / REST / WebSocket
                                      ▼
                      ┌─────────────────────────────────┐
                      │  React 19 + Vite Frontend SPA   │
                      │  ├─ Redux Toolkit (State)       │
                      │  ├─ React-Leaflet (Map Layers)  │
                      │  └─ Tailwind CSS + Lucide Icons │
                      └───────────────┬─────────────────┘
                                      │
                                      ▼
                      ┌─────────────────────────────────┐
                      │    Node.js + Express Backend    │
                      │  ├─ Multer Upload Stream        │
                      │  ├─ JWT & Cookie Auth           │
                      │  └─ 4-Phase Forensics Pipeline  │
                      └───────────────┬─────────────────┘
                                      │
     ┌────────────────────────────────┼────────────────────────────────┬───────────────────────────┐
     ▼                                ▼                                ▼                           ▼
┌───────────────┐            ┌─────────────────┐             ┌───────────────────┐       ┌────────────────────┐
│   MONGODB     │            │   OLLAMA / AI   │             │  CLOUDINARY CDN   │       │   TWILIO & TAVILY  │
│ 2dsphere Geo- │            │ Gemma 3:4B VLM  │             │ Secure Cloudinary │       │ Twilio SMS Alerts  │
│ Index O(log n)│            │ Qwen / Gemini   │             │ Media Storage     │       │ Tavily News Search │
└───────────────┘            └─────────────────┘             └───────────────────┘       └────────────────────┘
```

---

## 🔬 Multi-Modal Incident Verification Pipeline (4-Phase Architecture)

When an emergency report is submitted (via **Voice SOS**, **Image + Text**, or **Shake-to-Report**), the backend executes a deterministic 4-phase analysis pipeline:

```
[ Incoming Incident Data ]
            │
            ├───────────────────────────────────────────────────────┐
            ▼                                                       ▼
   [ Mode: IMAGE / HYBRID ]                                 [ Mode: VOICE SOS ]
            │                                                       │
   ┌──────────────────────────────────────────────────┐             │
   │ PHASE 1: FORENSICS & DEEPFAKE DETECTION          │             │
   │  1. EXIF Metadata Parsing (exif-parser)          │             │
   │  2. Pocket Detection (Sharp dark pixel ratio)    │             │
   │  3. Watermark / AI Signatures OCR (Tesseract.js) │             │
   │  4. Local VLM AI Inspection (Ollama Gemma 3:4B)  │             │
   │  5. Image Format Check (PNG capped, WebP, JPEG)  │             │
   └────────────────────────┬─────────────────────────┘             │
                            ▼                                       ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ PHASE 2: VISION & VOICE INTELLIGENCE                                   │
   │  • Vision: Gemma 3:4B extracts objects, severity & casualty count      │
   │  • Voice: Qwen/NLP extracts emergency keywords, sentiment & urgency    │
   └────────────────────────┬───────────────────────────────────────────────┘
                            ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ PHASE 3: CROSS-MODAL SEMANTIC ALIGNMENT                                │
   │  • Computes Jaccard/Set overlap between Vision objects & Voice keywords│
   │  • Evaluates multi-modal consistency score (0 - 100%)                  │
   └────────────────────────┬───────────────────────────────────────────────┘
                            ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ PHASE 4: TRUST SCORING, PRIORITY CODING & DISPATCH DECISION            │
   │  • Formula A / B / C: Multimodal score weighted with realism & format  │
   │  • Location Consensus: MongoDB 2dsphere radius query (1km / 15 mins)   │
   │  • Priority Hierarchy: OMEGA (Velocity), DELTA, CHARLIE, BRAVO, ALPHA  │
   │  • Synthetic Spam Isolation: Flags AI deepfakes as X-RAY               │
   └────────────────────────┬───────────────────────────────────────────────┘
                            ▼
                 [ Auto-Dispatch & Alert ]
                 • Twilio SMS Broadcast to nearest units
                 • Real-time updates to Agency & Coordinator Maps
```

---

## 📐 Scoring Formulas & Mathematical Models

### 1. Location Consensus ($S_{geo}$)
Calculated using MongoDB `2dsphere` geospatial indexing within a 1,000-meter radius over the preceding 15 minutes:
$$S_{geo} = \begin{cases} 100, & \text{if } N_{nearby} \ge 3 \\ 75, & \text{if } N_{nearby} = 2 \\ 50, & \text{if } N_{nearby} = 1 \\ 0, & \text{if } N_{nearby} = 0 \end{cases}$$

### 2. Formula A (Image + Text Reports)
$$S_{pre} = (S_{visual} \times 0.50) + (S_{alignment} \times 0.20) + (S_{geo} \times 0.30)$$
$$S_{final} = \min(100, S_{pre} \times R_{realism})$$
*Note: If an image is flagged as AI-generated ($isFake = true$), the score is penalized ($S_{final} \le 25$). PNG formats (often AI generators/screenshots) are strictly capped below 30.*

### 3. Formula B (Voice SOS Reports)
$$S_{voice} = \min\Big(100, (S_{keywords} \times 0.50) + (S_{sentiment} \times 0.20) + (S_{geo} \times 0.30)\Big)$$
- $S_{sentiment}$: Panic = 85, Neutral = 50, Calm = 30.
- $S_{keywords}$: Trapped/Dying = 95–100, Fire/Collapse/Drowning = 90–95, Emergency = 80.

---

## 💻 Tech Stack & Library Rationale

### Backend (Node.js / Express)
| Library / Package | Version | Primary Function | Why We Need It |
| :--- | :--- | :--- | :--- |
| **`express`** | `^5.2.1` | REST API Routing & HTTP Server | High-performance, robust server handling API endpoints for incidents, users, news, and requests. |
| **`mongoose`** | `^9.1.2` | MongoDB ODM & Geospatial Schemas | Manages MongoDB schemas, models, validation, and enables spatial queries (`2dsphere` indexes). |
| **`tesseract.js`** | `^7.0.0` | In-memory Optical Character Recognition (OCR) | Extracts text & watermark signatures from submitted photos to detect stock watermarks (Getty, Shutterstock) and AI labels. |
| **`sharp`** | `^0.34.5` | High-speed C++ Image Processing | Resizes, normalizes, and enhances images for fast OCR; analyzes raw pixel buffers for pocket detection (brightness & dark pixel ratio). |
| **`exif-parser`** | `^0.1.12` | EXIF Binary Metadata Extractor | Inspects camera EXIF headers (`Make`, `Model`, `Software`, `DateTime`, `GPS`) to identify generative AI signatures (Midjourney, DALL-E, Photoshop). |
| **`axios`** | `^1.13.4` | HTTP Client for Ollama & APIs | Makes asynchronous HTTP calls to the local Ollama daemon (`http://localhost:11434`) and external webhooks. |
| **`cloudinary`** | `^2.8.0` | Cloud Media Storage CDN | Uploads, optimizes, and stores high-resolution incident photos and voice audio recordings securely in the cloud. |
| **`multer`** | `^2.0.2` | Multipart/Form-Data File Handler | Handles binary multipart file streams during incident uploads directly into memory buffers. |
| **`twilio`** | `^5.12.0` | Telephony & SMS Dispatch Gateway | Sends instant automated SMS alerts with GPS coordinates and priority codes to emergency agency personnel. |
| **`@tavily/core`** | `^0.6.4` | Real-time Web Search & News Extraction | Aggregates live crisis and disaster intelligence from local web and news sources. |
| **`jsonwebtoken`** | `^9.0.3` | Stateless JWT Authentication | Generates and verifies signed authentication tokens with role-based access control (Citizen, Agency, Coordinator). |
| **`bcryptjs`** | `^3.0.3` | Salted Password Hashing | Secures user and agency credentials using one-way bcrypt hashing. |
| **`cookie-parser`** | `^1.4.7` | HTTP Cookie Parser | Reads and parses HTTP-only session cookies for secure authenticated sessions. |
| **`cors`** | `^2.8.5` | Cross-Origin Resource Sharing | Enables safe CORS communication between the Vite frontend and Express backend. |
| **`dotenv`** | `^17.2.3` | Environment Variable Loader | Loads environment secrets (DB URIs, API keys, JWT secrets) into `process.env`. |

---

### Frontend (React 19 / Vite)
| Library / Package | Version | Primary Function | Why We Need It |
| :--- | :--- | :--- | :--- |
| **`react` & `react-dom`** | `^19.2.0` | Core UI Framework | Modern React 19 component-based architecture for responsive user interfaces. |
| **`vite`** | `^7.2.4` | Build Tool & Dev Server | Ultra-fast Hot Module Replacement (HMR) and optimized production bundling. |
| **`@reduxjs/toolkit`** | `^2.11.2` | Global State Management | Centralized store for live incident feeds, user authentication state, and active map filters. |
| **`react-redux`** | `^9.2.0` | React Redux Bindings | Connects React components with Redux store slices and asynchronous thunks. |
| **`leaflet` & `react-leaflet`** | `^1.9.4` / `^5.0.0` | Interactive Mapping & GIS Layers | Renders real-time OpenStreetMap tiles, custom disaster markers, priority heat zones, and responder GPS tracking. |
| **`leaflet.heat`** | `^0.2.0` | Geospatial Heatmaps | Displays incident density heatmaps based on coordinate clustering and severity weights. |
| **`react-leaflet-markercluster`**| `^5.0.0-rc.0` | Marker Clustering | Clusters dense incident points on the map to prevent UI degradation during mass emergencies. |
| **`tailwindcss`** | `^4.1.18` | Utility-First CSS Styling | Sleek, modern, and responsive UI design with dark mode and emergency status themes. |
| **`motion` & `@gsap/react`** | `^12.31.0` / `^2.1.2` | Micro-Animations & Transitions | Delivers smooth alerts, pulsating SOS buttons, and interactive dashboard state animations. |
| **`recharts`** | `^3.7.0` | Real-Time Data Visualization | Renders response time charts, incident category breakdowns, and trust score distribution graphs. |
| **`lucide-react` & `react-icons`** | `^0.562.0` | Iconography System | Crisp vector icons representing medical, fire, police, and alert statuses. |
| **`firebase`** | `^12.7.0` | Client Authentication Integration | Provides optional OAuth and phone authentication capabilities. |
| **`react-router-dom`** | `^7.12.0` | Client-Side SPA Routing | Multi-role page routing for Citizen, Agency, Coordinator, and News feeds. |
| **`react-toastify`** | `^11.0.5` | In-App Notifications | Real-time toast alerts for incident submissions, status updates, and dispatch confirmations. |

---

## 🤖 AI Models & Inference Breakdown

1. **Ollama `gemma3:4b` (Local Vision-Language Model)**:
   - **Role**: Visual forensic inspection & emergency object detection.
   - **Why Gemma 3**: Fast local multimodal inference (4B parameters), zero latency overhead from cloud queues, high precision in detecting fire, smoke, blood, vehicles, and debris, and structured JSON generation.
   - **Privacy & Disaster Resiliency**: Local inference allows the emergency platform to operate in localized edge nodes even if internet bandwidth is constrained.

2. **Ollama `qwen3-coder:480b-cloud` / Rule-based NLP Pipeline**:
   - **Role**: Emergency speech translation, sentiment classification (panic vs calm), and crisis keyword extraction.

3. **Tavily AI Core**:
   - **Role**: Autonomous web search agent for live crisis news aggregation and fact-checking.

---

## ⚡ Setup & Installation

### Prerequisites
- **Node.js**: v18+ or v20+
- **MongoDB**: Local instance or MongoDB Atlas URI
- **Ollama**: Installed and running locally with `gemma3:4b` pulled (`ollama run gemma3:4b`)

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/Rishabhjain610/CrisisConnect.git
cd CrisisConnect

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 2. Environment Variables Configuration

Create a `.env` file in `/backend`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/crisisconnect
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
TWILIO_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TAVILY_API_KEY=your_tavily_api_key
```

Create a `.env` file in `/frontend`:
```env
VITE_BACKEND_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

### 3. Run Development Servers
```bash
# Start Backend
cd backend
npm run dev

# Start Frontend (in a new terminal)
cd frontend
npm run dev
```

---

## 🛡️ License

This project is licensed under the MIT License.
