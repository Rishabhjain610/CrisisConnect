import React, { useState, useEffect, useRef } from "react";
import { AlertTriangle, Camera, Mic, MapPin, Send, X } from "lucide-react";
import axios from "axios";

// ✅ ADD THIS - Dynamic API URL
const getApiUrl = () => {
  if (typeof window === "undefined") return "http://localhost:8901";
  
  const hostname = window.location.hostname;
  
  // If localhost, use localhost backend
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:8901";
  }
  
  // If accessing from 192.168.31.166, use same IP for backend
  if (hostname === "192.168.31.166") {
    return "http://192.168.31.166:8901";
  }
  
  // Default fallback
  return `http://${hostname}:8901`;
};

const API_URL = getApiUrl();
console.log("🌐 API URL:", API_URL);

const ShakeSOS = () => {
  // ==================== STATE ====================
  const [isShakeDetected, setIsShakeDetected] = useState(false);
  const [shakeIntensity, setShakeIntensity] = useState(0); // 0-100
  const [showModal, setShowModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const accelerometerDataRef = useRef([]);
  const shakeThresholdRef = useRef(25); // Threshold for shake detection

  // ==================== GEOLOCATION ====================
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          // Fallback location (Delhi)
          setLocation({ latitude: 28.6139, longitude: 77.209 });
        }
      );
    }
  }, []);

  // ==================== SHAKE DETECTION ====================
  useEffect(() => {
    if (!window.DeviceMotionEvent) {
      console.log("Device Motion not supported");
      return;
    }

    const handleDeviceMotion = (event) => {
      const { x, y, z } = event.acceleration || {};

      if (!x || !y || !z) return;

      // Calculate magnitude of acceleration
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Smooth out data
      accelerometerDataRef.current.push(magnitude);
      if (accelerometerDataRef.current.length > 10) {
        accelerometerDataRef.current.shift();
      }

      // Calculate average
      const avgMagnitude =
        accelerometerDataRef.current.reduce((a, b) => a + b, 0) /
        accelerometerDataRef.current.length;

      // Detect shake (threshold = 25 m/s²)
      const intensity = Math.min(100, (avgMagnitude / 50) * 100);
      setShakeIntensity(intensity);

      if (avgMagnitude > shakeThresholdRef.current) {
        setIsShakeDetected(true);
        setShowModal(true);

        // Auto-enable camera
        if (!cameraActive) {
          startCamera();
        }

        // Vibrate phone
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    };

    window.addEventListener("devicemotion", handleDeviceMotion);

    return () => {
      window.removeEventListener("devicemotion", handleDeviceMotion);
    };
  }, [cameraActive]);

  // ==================== CAMERA CAPTURE ====================
  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: "environment", // Back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraActive(true);
    } catch (error) {
      console.error("Camera error:", error);
      alert("📷 Camera access denied. Please enable camera permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setCameraActive(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      context.drawImage(videoRef.current, 0, 0);
      const imageBase64 = canvasRef.current.toDataURL("image/jpeg");
      setCapturedImage(imageBase64);
    }
  };

  // ==================== VOICE RECORDING ====================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });

        // Convert to text (using Web Speech API as fallback)
        if ("webkitSpeechRecognition" in window) {
          const recognition = new webkitSpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.language = "en-US";

          recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
          };

          recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
          };

          // For demo, just use manual text input
          console.log("Recording stopped. Use text input below.");
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      alert("🎤 Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ==================== SUBMIT INCIDENT ====================
  const handleSubmit = async () => {
    if (!capturedImage || !transcript || !location) {
      alert("⚠️ Please capture image, add description, and enable location");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      // ✅ CHECK TOKEN
      if (!token) {
        alert("❌ You must be logged in to report incidents");
        setLoading(false);
        return;
      }

      console.log("📤 Sending incident to:", API_URL);

      const response = await axios.post(
        `${API_URL}/api/incident/create`,  // ✅ USE DYNAMIC API URL
        {
          mode: "SHAKE_HYBRID",
          type: "Emergency",
          transcript: transcript || "Shake SOS triggered - Emergency detected",
          imageBase64: capturedImage,
          latitude: location.latitude,
          longitude: location.longitude,
          severity: "Critical",
        },
        {
          // ✅ HEADERS WITH AUTH
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          timeout: 15000, // 15 second timeout
        }
      );

      // ✅ CHECK STATUS 201
      if (response.status === 201) {
        setSubmitted(true);
        console.log("✅ Incident submitted successfully:", response.data);

        playSuccessSound();

        setTimeout(() => {
          closeModal();
        }, 3000);
      }
    } catch (error) {
      console.error("❌ Submit error:", error);

      let errorMsg = "Unknown error occurred";

      if (error.response) {
        // Server responded with error
        errorMsg = error.response.data?.message || error.response.statusText;
        console.error("Response error:", error.response.status, error.response.data);
      } else if (error.request) {
        // Request made but no response
        errorMsg = "No response from server. Check if backend is running at " + API_URL;
        console.error("Request error:", error.request);
      } else {
        // Error in request setup
        errorMsg = error.message;
      }

      alert("❌ Error: " + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const playSuccessSound = () => {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 1000; // Hz
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsShakeDetected(false);
    setCameraActive(false);
    setCapturedImage(null);
    setTranscript("");
    setSubmitted(false);
    stopCamera();
    accelerometerDataRef.current = [];
  };

  // ==================== SHAKE INDICATOR ====================
  const ShakeIndicator = () => (
    <div className="fixed top-4 left-4 z-40 pointer-events-none">
      {shakeIntensity > 0 && (
        <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} />
            <div>
              <p className="font-bold">SHAKE DETECTED! 🌍</p>
              <p className="text-sm">Intensity: {Math.round(shakeIntensity)}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ==================== MODAL UI ====================
  return (
    <>
      <ShakeIndicator />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-red-600 text-white p-4 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <AlertTriangle size={24} className="animate-bounce" />
                <h2 className="text-xl font-bold">🚨 SHAKE SOS ALERT</h2>
              </div>
              {!loading && !submitted && (
                <button
                  onClick={closeModal}
                  className="hover:bg-red-700 p-2 rounded"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Success State */}
            {submitted ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">
                  Incident Reported!
                </h3>
                <p className="text-gray-600 mb-4">
                  Emergency services have been notified
                </p>
                <div className="bg-green-50 border border-green-200 rounded p-4 text-sm text-green-700">
                  <p className="font-semibold">Priority Code: DELTA 🟡</p>
                  <p>Auto-dispatch activated</p>
                </div>
              </div>
            ) : (
              <>
                {/* Camera Section */}
                <div className="p-4 border-b">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Camera size={18} /> Step 1: Capture Scene
                  </h3>

                  {capturedImage ? (
                    <div className="space-y-3">
                      <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-full rounded border-2 border-red-300"
                      />
                      <button
                        onClick={() => setCapturedImage(null)}
                        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded font-semibold"
                      >
                        📷 Retake Photo
                      </button>
                    </div>
                  ) : (
                    <>
                      {cameraActive ? (
                        <div className="space-y-3">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full rounded border-2 border-red-300 bg-black"
                          />
                          <canvas
                            ref={canvasRef}
                            className="hidden"
                            width="1280"
                            height="720"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={captureImage}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-semibold"
                            >
                              📸 Capture Now
                            </button>
                            <button
                              onClick={stopCamera}
                              className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded font-semibold"
                            >
                              ❌ Stop
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={startCamera}
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded font-semibold flex items-center justify-center gap-2"
                        >
                          <Camera size={20} />
                          Enable Camera
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Audio/Text Section */}
                <div className="p-4 border-b">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Mic size={18} /> Step 2: Describe Emergency
                  </h3>

                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Type what happened... (e.g., 'Help! There's a fire in my apartment!')"
                    className="w-full h-24 p-3 border rounded font-semibold text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={
                        isRecording ? stopRecording : startRecording
                      }
                      className={`flex-1 py-2 rounded font-semibold flex items-center justify-center gap-2 transition ${
                        isRecording
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      }`}
                    >
                      <Mic size={18} />
                      {isRecording ? "🔴 Recording..." : "🎤 Record"}
                    </button>
                    <button
                      onClick={() => setTranscript("")}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Location Section */}
                <div className="p-4 border-b">
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    <MapPin size={18} /> Step 3: Location
                  </h3>

                  {location ? (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <p className="text-sm text-green-700">
                        ✅ Location captured
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {location.latitude.toFixed(4)},{" "}
                        {location.longitude.toFixed(4)}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="text-sm text-yellow-700">
                        ⏳ Waiting for location...
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit Section */}
                <div className="p-4 bg-gray-50 flex gap-2">
                  <button
                    onClick={closeModal}
                    disabled={loading}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded font-bold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={
                      loading ||
                      !capturedImage ||
                      !transcript ||
                      !location
                    }
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin">⏳</div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        🚨 SEND EMERGENCY
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ShakeSOS;