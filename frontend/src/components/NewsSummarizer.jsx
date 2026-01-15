// ...existing code...
import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import {
  MapPin,
  Loader,
  AlertCircle,
  CheckCircle,
  Clock,
  Radio,
} from "lucide-react";
import { AuthDataContext } from "../context/AuthDataContext";

const NewsSummarizer = () => {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [radius, setRadius] = useState(50);
  const [query, setQuery] = useState("floods");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [lastSearchAt, setLastSearchAt] = useState(null);

  const { serverUrl } = useContext(AuthDataContext);

  useEffect(() => {
    getLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLocation = () => {
    setLocationLoading(true);
    setError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latVal = position.coords.latitude.toFixed(4);
          const lonVal = position.coords.longitude.toFixed(4);
          setLat(latVal);
          setLon(lonVal);
          setLocationLoading(false);
          console.log(`📍 Location detected: ${latVal}, ${lonVal}`);
        },
        (err) => {
          setError(
            "Unable to get your location. Enter manually or pick a sample location below."
          );
          setLocationLoading(false);
        },
        { timeout: 10000 }
      );
    } else {
      setError("Geolocation not supported by your browser.");
      setLocationLoading(false);
    }
  };

  const setSampleLocation = (latVal, lonVal) => {
    setLat(String(latVal));
    setLon(String(lonVal));
    setError(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!lat || !lon) return setError("Latitude and longitude required.");
    setLoading(true);
    try {
      console.log(
        `🔍 Searching for "${query}" near ${lat}, ${lon} (${radius}km radius)`
      );
      const response = await axios.post(`${serverUrl}/api/news/summary`, {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        radius: Number(radius),
        query: query || "crisis",
      });
      console.log("✅ Results received:", response.data);
      setResult(response.data);
      setLastSearchAt(new Date().toISOString());
    } catch (err) {
      console.error("❌ Error:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.details ||
          err.message ||
          "Request failed. Make sure backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setLat("");
    setLon("");
    setRadius(50);
    setQuery("floods");
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <MapPin className="w-8 h-8 text-red-500 animate-pulse" />
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Crisis Summarizer
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Real-time crisis detection and analysis by location
          </p>
        </header>

        {/* Main Card */}
        <main className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-8 border border-white/20 mb-6">
          <form
            onSubmit={submit}
            className="space-y-6"
            aria-describedby="form-help"
          >
            

            {/* Location Section */}
            <section className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20">
              <div className="flex items-center justify-between mb-4 flex-col md:flex-row gap-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  Your Location
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={getLocation}
                    disabled={locationLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2 text-sm disabled:opacity-50"
                    aria-label="Use my current location"
                  >
                    {locationLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Getting location...
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" />
                        Use My Location
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={clearForm}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="lat"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Latitude
                  </label>
                  <input
                    id="lat"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="e.g. 37.7749"
                    aria-required="true"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lon"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Longitude
                  </label>
                  <input
                    id="lon"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    type="number"
                    step="0.0001"
                    value={lon}
                    onChange={(e) => setLon(e.target.value)}
                    placeholder="e.g. -122.4194"
                    aria-required="true"
                  />
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-300">
                Can't get location? Try sample locations:
              </div>
              <div className="mt-2 flex gap-2 flex-wrap">
                
                
                <button
                  type="button"
                  onClick={() => setSampleLocation(19.033, 73.0297)}
                  className="px-3 py-1 bg-slate-700/60 hover:bg-slate-700 text-white rounded"
                >
                  Navi Mumbai
                </button>
                {" "}
                <button
                  type="button"
                  onClick={() => setSampleLocation(28.7041, 77.1025)}
                  className="px-3 py-1 bg-slate-700/60 hover:bg-slate-700 text-white rounded"
                >
                  Delhi
                </button>
                {" "}
                <button
                  type="button"
                  onClick={() => setSampleLocation(13.0827, 80.2707)}
                  className="px-3 py-1 bg-slate-700/60 hover:bg-slate-700 text-white rounded"
                >
                  Chennai
                </button>
                {" "}
                <button
                  type="button"
                  onClick={() => setSampleLocation(12.9716, 77.5946)}
                  className="px-3 py-1 bg-slate-700/60 hover:bg-slate-700 text-white rounded"
                >
                  Bangalore
                </button>
              </div>

              {error && (
                <div
                  className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="radius"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Search Radius (km)
                </label>
                <input
                  id="radius"
                  type="range"
                  min={1}
                  max={500}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full"
                />
                <div className="mt-2 text-sm text-gray-300">{radius} km</div>
              </div>
              <div>
                <label
                  htmlFor="query"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Crisis Type
                </label>
                <select
                  id="query"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                >
                  <option value="floods">Floods</option>
                  <option value="earthquake">Earthquake</option>
                  <option value="wildfire">Wildfire</option>
                  <option value="hurricane">Hurricane</option>
                  <option value="tornado">Tornado</option>
                  <option value="disaster">Disaster</option>
                  <option value="emergency">Emergency</option>
                  <option value="crisis">Crisis</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !lat || !lon}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 text-lg"
                aria-disabled={loading || !lat || !lon}
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Search & Summarize
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setError(null);
                }}
                className="px-4 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition text-lg"
              >
                Reset Results
              </button>
            </div>
          </form>
        </main>

        {/* Results */}
        <section aria-live="polite" className="space-y-6 animate-fadeIn">
          {result ? (
            <>
              <div
                className={`rounded-xl p-6 border ${
                  result.isLiveEvent
                    ? "bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20"
                    : "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {result.isLiveEvent ? (
                      <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded-full">
                        <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                        <span className="text-red-300 font-semibold text-sm">
                          LIVE EVENT
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1 rounded-full">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300 font-semibold text-sm">
                          HISTORICAL RECORDS
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">📍 Location</p>
                    <p className="text-white font-semibold">
                      {result.locationName || `${lat}, ${lon}`}
                    </p>
                  </div>
                  <div className="md:text-right">
                    <p className="text-gray-400 text-sm">Records Found</p>
                    <p className="text-white font-semibold">
                      {result.resultCount ?? result.sources?.length ?? 0}{" "}
                      results
                    </p>
                    {lastSearchAt && (
                      <p className="text-gray-400 text-xs mt-1">
                        Last search: {new Date(lastSearchAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/10 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-blue-500 rounded"></div>
                  Crisis Summary
                </h3>
                <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 max-h-96 overflow-auto">
                  <pre className="whitespace-pre-wrap text-gray-200 font-sans text-base leading-relaxed">
                    {typeof result.summary === "string"
                      ? result.summary
                      : JSON.stringify(result.summary, null, 2)}
                  </pre>
                </div>
              </div>

              {result.sources && result.sources.length > 0 ? (
                <div className="bg-white/5 rounded-xl p-6 border border-white/10 backdrop-blur-sm">
                  <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded"></div>
                    {result.isLiveEvent ? "News Sources" : "Past Records"} (
                    {result.sources.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.sources.map((s, i) => (
                      <a
                        key={i}
                        href={s.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="group p-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg border border-slate-600/50 hover:border-blue-500/50 transition hover:shadow-lg hover:shadow-blue-500/20"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-blue-400 group-hover:text-blue-300 font-semibold line-clamp-2 transition">
                              {s.title || "View Record"}
                            </p>
                            <div className="text-gray-500 text-xs mt-2 space-y-1">
                              {s.url && s.url !== "#" && (
                                <p className="truncate">{s.url}</p>
                              )}
                              {s.publishedDate && (
                                <p>
                                  {new Date(
                                    s.publishedDate
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <svg
                            className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 rounded-xl p-6 border border-white/10 backdrop-blur-sm">
                  <p className="text-gray-300">
                    No source records found for this search.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <Clock className="mx-auto mb-3 w-8 h-8 text-gray-400" />
              <p>No results yet — run a search to see summaries and sources.</p>
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </div>
  );
};

export default NewsSummarizer;
// ...existing code...
