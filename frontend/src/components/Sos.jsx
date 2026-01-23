"use client";
import React, { useState, useRef, useEffect, useContext } from "react";
import axios from "axios";
import { AuthDataContext } from "../context/AuthDataContext";

const SpeechRecognitionClass =
  typeof window !== "undefined" &&
  (window.webkitSpeechRecognition || window.SpeechRecognition);

export default function Sos() {
  const { serverUrl } = useContext(AuthDataContext);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("Idle");
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const recognitionLangRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const finalTranscriptRef = useRef("");

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {}
      try {
        mediaRecorderRef.current?.stop();
      } catch {}
    };
  }, []);

  const getCurrentPositionAsync = (opts = {}) =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation)
        return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        opts,
      );
    });

  const startRecording = async () => {
    setError(null);
    setTranscript("");
    finalTranscriptRef.current = "";
    recognitionLangRef.current = navigator.language || "en-US";

    try {
      const pos = await getCurrentPositionAsync({ timeout: 3000 });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e) {
      console.warn("Geolocation (start) failed:", e);
    }

    if (SpeechRecognitionClass) {
      try {
        const Rec = SpeechRecognitionClass;
        const rec = new Rec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = recognitionLangRef.current;
        rec.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            const t = r[0].transcript;
            if (r.isFinal)
              finalTranscriptRef.current = (
                finalTranscriptRef.current +
                " " +
                t
              ).trim();
            else interim += t;
          }
          setTranscript(
            (
              finalTranscriptRef.current + (interim ? " " + interim : "")
            ).trim(),
          );
        };
        rec.onerror = (e) => {
          console.warn("Speech error", e);
        };
        rec.onend = () => setIsListening(false);
        recognitionRef.current = rec;
        try {
          rec.start();
        } catch (e) {
          console.warn("Recognition start error:", e);
        }
      } catch (err) {
        console.warn("Speech recognition init error:", err);
      }
    } else {
      console.warn("SpeechRecognition not supported in this browser");
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) audioChunksRef.current.push(ev.data);
      };
      mr.start(250);
      mediaRecorderRef.current = mr;
    } catch (err) {
      console.error("Mic access error", err);
      setError("Microphone access denied");
      try {
        recognitionRef.current?.stop();
      } catch {}
      recognitionRef.current = null;
      return;
    }

    setIsListening(true);
    setStatus("Recording");
  };

  const stopRecording = async () => {
    setStatus("Processing");
    try {
      recognitionRef.current?.stop();
    } catch {}
    recognitionRef.current = null;

    if (!coords) {
      try {
        const pos = await getCurrentPositionAsync({ timeout: 5000 });
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch (e) {
        console.warn("Geolocation (stop) failed:", e);
      }
    }

    const mr = mediaRecorderRef.current;
    if (!mr) {
      setIsListening(false);
      setError("No recording in progress");
      setStatus("Idle");
      return;
    }
    try {
      if (mr.state !== "inactive") mr.stop();
    } catch (e) {
      console.warn(e);
    }
    mediaRecorderRef.current = null;

    await new Promise((r) => setTimeout(r, 350));
    const chunks = audioChunksRef.current;
    audioChunksRef.current = [];
    if (!chunks || chunks.length === 0) {
      setIsListening(false);
      setError("No audio captured");
      setStatus("Idle");
      return;
    }
    const blob = new Blob(chunks, { type: "audio/webm" });

    setIsListening(false);

    // Transcribe preserving original language
    setStatus("Transcribing");
    let groqTranscript = "";
    let groqRaw = null;
    try {
      const form = new FormData();
      form.append("file", blob, "sos.webm");
      form.append("model", "whisper-large-v3");
      // language hint (BCP-47) or "auto"
      form.append(
        "language",
        recognitionLangRef.current || navigator.language || "auto",
      );
      // request no translation (send transcript in original language)
      form.append("translate", "false");
      const groqKey = import.meta.env.VITE_GROQ_API;
      const resp = await fetch(
        "https://api.groq.com/v1/speech/transcriptions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKey}` },
          body: form,
        },
      );
      groqRaw = await resp.json();
      console.log("Groq raw transcription response:", groqRaw);
      // Groq may return different fields; prefer explicit original-text fields
      groqTranscript =
        groqRaw?.text || groqRaw?.transcription || groqRaw?.data?.text || "";
    } catch (err) {
      console.error("Groq transcription error:", err);
      setError("Transcription failed — will send raw interim text");
    }

    const finalTranscript =
      groqTranscript && groqTranscript.trim()
        ? groqTranscript.trim()
        : finalTranscriptRef.current.trim() || transcript.trim();
    if (!finalTranscript) {
      setError("No transcribed text available");
      setStatus("Idle");
      return;
    }

    setStatus("Sending");
    try {
      const payload = {
        mode: "VOICE",
        transcript: finalTranscript,
        description: finalTranscript,
        latitude: coords?.lat,
        longitude: coords?.lng,
        severity: "Medium",
        language: recognitionLangRef.current || navigator.language || "und",
        groqRawResponse: groqRaw, // optional debugging payload
      };

      console.log("Frontend VOICE transcript:", payload.transcript);
      console.log("Frontend VOICE language:", payload.language);

      // send using cookies (withCredentials:true). DO NOT send Authorization header.
      await axios.post(`${serverUrl || ""}/api/incident/create`, payload, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      setStatus("Sent");
      setError(null);
      setTranscript(finalTranscript);
      setTimeout(() => {
        setStatus("Idle");
        setTranscript("");
        setCoords(null);
        finalTranscriptRef.current = "";
      }, 3000);
    } catch (err) {
      console.error("Create incident error:", err);
      setError(err?.response?.data?.message || "Failed to register incident");
      setStatus("Idle");
    }
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    if (!isListening) startRecording();
  };
  const handlePointerUp = (e) => {
    e.preventDefault();
    if (isListening) stopRecording();
  };
  const handleKeyDown = (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!isListening) startRecording();
    }
  };
  const handleKeyUp = (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (isListening) stopRecording();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">Emergency SOS — Voice</h1>

      {error && (
        <div className="p-3 mb-4 text-red-700 bg-red-100 rounded">{error}</div>
      )}

      <div className="relative mb-8">
        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          className={`w-44 h-44 rounded-full text-white font-bold ${isListening ? "bg-red-600" : "bg-red-500"} shadow-lg`}
          aria-pressed={isListening}
        >
          SOS
        </button>
      </div>

      <div className="w-full max-w-2xl">
        <div className="mb-3">
          <strong>Status:</strong> {status}
        </div>

        <label className="block text-sm font-semibold mb-1">
          Live / Final Transcript
        </label>
        <textarea
          readOnly
          value={transcript}
          className="w-full min-h-[120px] p-3 border rounded"
        />

        <div className="mt-3 text-sm">
          <div>
            GPS:{" "}
            {coords
              ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
              : "Not available"}
          </div>
        </div>
      </div>
    </div>
  );
}
