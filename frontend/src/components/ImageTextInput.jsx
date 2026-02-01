import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthDataContext } from "../context/AuthDataContext";
import {
  Camera, UploadCloud, MapPin, X, Loader2,
  FileText, ArrowLeft, Send, CheckCircle2
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function ImageTextInput() {
  const navigate = useNavigate();
  const { serverUrl } = useContext(AuthDataContext);

  // --- ORIGINAL STATE VARIABLES ---
  const [imageFile, setImageFile] = useState(null);
  const [extraText, setExtraText] = useState("");
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // UI Helper Ref (for clicking the upload box)
  const fileInputRef = useRef(null);

  // --- ORIGINAL LOGIC: Geolocation ---
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.warn("Geolocation error:", err);
          setError("Unable to get location. Please enable geolocation.");
        }
      );
    }
  }, []);

  // --- ORIGINAL LOGIC: File Change ---
  const onFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setImageFile(f);
  };

  const clearImage = (e) => {
    e.stopPropagation();
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- ORIGINAL LOGIC: Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!coords) {
        setError("Location not available. Please enable geolocation.");
        setLoading(false);
        return;
      }

      if (!imageFile && !extraText.trim()) {
        setError("Please provide at least an image or description.");
        setLoading(false);
        return;
      }

      const form = new FormData();
      form.append("mode", "IMAGE_TEXT");
      form.append("description", extraText || "");
      form.append("latitude", String(coords.lat));
      form.append("longitude", String(coords.lng));
      form.append("severity", "Medium");

      // Original field name "image"
      if (imageFile) {
        form.append("image", imageFile);
      }

      console.log("Submitting IMAGE_TEXT incident...");
      const response = await axios.post(
        `${serverUrl || ""}/api/incident/create`,
        form,
        {
          withCredentials: true,
        }
      );

      setSuccess(true);
      setImageFile(null);
      setExtraText("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      console.log("Incident created:", response.data);
      toast.success("Incident reported successfully!"); // Added toast for better UI feedback

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Submit error:", err);
      const errMsg = err?.response?.data?.message || err?.message || "Failed to submit incident";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW UI RENDERING ---
  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Navigation / Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors font-medium text-sm"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 rounded-full shadow-sm">
            <MapPin size={14} className={coords ? "text-green-500" : "text-amber-500"} />
            <span className="text-xs font-bold text-zinc-600">
              {coords
                ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                : "Locating..."}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl shadow-zinc-200/50 border border-zinc-100 overflow-hidden">
          <div className="grid md:grid-cols-5 h-full min-h-[600px]">

            {/* LEFT SIDE: Image Upload Area */}
            <div className="md:col-span-3 bg-zinc-50/50 p-8 border-r border-zinc-100 flex flex-col">
              <h2 className="text-2xl font-bold text-zinc-900 mb-2 flex items-center gap-2">
                <Camera className="text-blue-600" /> Visual Evidence
              </h2>
              <p className="text-zinc-500 text-sm mb-6">
                Upload a clear photo of the incident. This helps responders assess the situation accurately.
              </p>

              <div className="flex-1 relative group">
                {imageFile ? (
                  <div className="relative w-full h-full min-h-[300px] bg-zinc-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                    <button
                      onClick={clearImage}
                      type="button"
                      className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500 text-white rounded-full transition-colors backdrop-blur-sm"
                    >
                      <X size={20} />
                    </button>
                    <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 text-white text-xs font-bold rounded-lg backdrop-blur-sm flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-green-400" /> Image Ready
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="image-upload"
                    className="w-full h-full min-h-[300px] border-3 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 group-hover:scale-[0.99]"
                  >
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-blue-500 group-hover:scale-110 transition-transform">
                      <UploadCloud size={32} />
                    </div>
                    <span className="text-zinc-900 font-bold text-lg">Click to Upload</span>
                    <span className="text-zinc-400 text-sm mt-1">or drag and drop here</span>
                    <span className="mt-4 px-3 py-1 bg-zinc-100 text-zinc-500 text-xs font-bold rounded uppercase tracking-wider">
                      JPG, PNG, WEBP
                    </span>
                  </label>
                )}
                <input
                  ref={fileInputRef}
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* RIGHT SIDE: Details & Submit */}
            <div className="md:col-span-2 p-8 flex flex-col">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-zinc-900 mb-2 flex items-center gap-2">
                  <FileText className="text-purple-600" /> Details
                </h2>
                <p className="text-zinc-500 text-sm">
                  Describe the emergency. Be specific about hazards and people involved.
                </p>
              </div>

              <div className="flex-1 flex flex-col gap-6">
                <div className="relative h-full">
                  <textarea
                    value={extraText}
                    onChange={(e) => setExtraText(e.target.value)}
                    placeholder="Describe the situation here..."
                    className="w-full h-full min-h-[200px] p-4 bg-white border border-zinc-200 rounded-xl text-zinc-700 placeholder:text-zinc-300 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-base leading-relaxed"
                  />
                  <div className="absolute bottom-4 right-4 text-xs font-bold text-zinc-300">
                    {extraText.length} chars
                  </div>
                </div>

                {/* Error / Success Messages */}
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100 flex items-center gap-2">
                    <CheckCircle2 size={16} /> Incident reported successfully!
                  </div>
                )}

                <div className="mt-auto">
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !coords}
                    className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold text-lg shadow-lg shadow-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        Submit Report <Send size={18} />
                      </>
                    )}
                  </button>
                  <p className="text-center text-zinc-400 text-xs mt-4">
                    By submitting, you confirm this is a genuine emergency.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}