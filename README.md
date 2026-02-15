# 🚨 Crisis Command Center

**AI-Powered Emergency Response Management Platform**

A sophisticated platform for rapid disaster response that connects citizens, emergency agencies, and coordinators in a unified ecosystem. Features AI-driven incident verification, deepfake detection, intelligent resource allocation, and real-time coordination.

## ✨ Key Features

- **Multi-Modal Incident Reporting** - Voice (SOS), image/text, and accelerometer-based reporting
- **AI-Powered Verification** - Vision analysis, voice sentiment detection, and semantic alignment
- **Deepfake Detection** - EXIF analysis and AI generation detection with 95%+ accuracy
- **Smart Trust Scoring** - Synthesized 0-100 credibility score from multiple data sources
- **Intelligent Priority Coding** - Auto-assign OMEGA to X-RAY priority codes based on verification
- **Real-Time Resource Tracking** - GPS-tracked resources with proximity matching and allocation
- **Multi-Role Dashboards** - Customized interfaces for citizens, agencies, and coordinators
- **Crisis News Feed** - AI-summarized, categorized news aggregation with sentiment analysis
- **Interactive Heatmaps** - Geographic incident density visualization with clustering
- **Request Management** - Formal resource request system with approval workflow

---

## 🏗️ Tech Stack

**Frontend:**

- React 19 + Vite
- Redux Toolkit, Tailwind CSS
- Leaflet + React-Leaflet (maps), Recharts (analytics)
- Firebase (auth), Axios (HTTP)

**Backend:**

- Node.js + Express.js
- MongoDB + Mongoose
- Google Generative AI (Gemini)
- Ollama Gemma3:4B (deepfake detection)
- Tesseract.js (OCR), Sharp (image processing)

**APIs & Services:**

- Cloudinary (media storage)
- Twilio (SMS notifications)
- Tavily (news aggregation)
- exif-parser, JWT, Bcrypt

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas)
- Ollama with Gemma3:4B model installed
- API Keys: Google Generative AI, Cloudinary, Tavily, Firebase, Twilio (optional)

### Backend Setup

```bash
cd auth/backend
npm install

# Create .env file
cat > .env << EOF
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/crisis-db
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GOOGLE_API_KEY=your_google_api_key
TAVILY_API_KEY=your_tavily_key
TWILIO_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE=+1234567890
EOF

npm run dev
# Server runs on http://localhost:5000
```

### Frontend Setup

```bash
cd auth/frontend
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
EOF

npm run dev
# App runs on http://localhost:5173
```

### Database Seeding

```bash
cd auth/backend
node seed.js
```

---

## 📋 Project Structure

```
auth/
├── backend/
│   ├── controller/          # Route controllers
│   ├── models/              # MongoDB schemas
│   ├── routes/              # API endpoints
│   ├── middleware/          # Auth & file upload
│   ├── utils/               # AI analysis, scoring, forensics
│   ├── Db/                  # Database configuration
│   └── index.js             # Server entry point
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── context/         # Auth & user context
│   │   ├── redux/           # State management
│   │   └── utils/           # Firebase config
└── README.md
```

---

## 🎯 How It Works

1. **Citizen Reports**: User triggers SOS with voice, image, or motion data
2. **AI Analysis Pipeline**: 5-phase verification (deepfake → vision → voice → trust score → priority code)
3. **Auto-Dispatch**: High-confidence incidents automatically dispatch nearest resources
4. **Real-Time Coordination**: Agencies track response, coordinators allocate resources
5. **Event Resolution**: Incident closed with full audit trail and analytics

---

## 🎬 Demo Video

**[PLACEHOLDER: Link to demo video]**

_Demo shows: Incident reporting → AI verification → Dispatch → Real-time dashboards → Resolution_

---

## 🔌 API Endpoints

| Route                 | Method | Purpose                          |
| --------------------- | ------ | -------------------------------- |
| `/auth/signup`        | POST   | Register user                    |
| `/auth/login`         | POST   | Authenticate user                |
| `/incident/create`    | POST   | Submit incident with AI analysis |
| `/incident/:id`       | GET    | Get incident details             |
| `/resource/available` | GET    | List available resources         |
| `/request/create`     | POST   | Create resource request          |
| `/news/feed`          | GET    | Get crisis news feed             |

See `backend/routes/` for complete API documentation.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please ensure:

- Code follows existing style patterns
- Tests pass for new features
- README is updated for significant changes
- Mobile responsiveness is verified

---

## 📜 License

ISC License - See LICENSE file for details.

---

## 🙏 Acknowledgments

Built for rapid emergency response. Thanks to:

- Google Generative AI (Gemini)
- Ollama + Gemma3:4B
- Tavily API
- Emergency services communities

---

**Status**: Production Ready | **Last Updated**: February 2026 | **Version**: 1.0.0
