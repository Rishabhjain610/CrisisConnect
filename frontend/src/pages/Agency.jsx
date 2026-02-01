
import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AuthDataContext } from "../context/AuthDataContext";
import {
  MapContainer,
  TileLayer,
  Popup,
  Marker,
  LayersControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import greenflag from "../assets/greenflag.png";
import redflag from "../assets/redflag.png";
import yellowflag from "../assets/yellowflag.png";

const getStatusIcon = (status) => {
  let iconUrl = greenflag;
  let size = [40, 50];

  switch (status) {
    case "Active":
      iconUrl = greenflag;
      break;
    case "Pending":
      iconUrl = yellowflag;
      break;
    case "Spam":
      iconUrl = redflag;
      break;
    case "Resolved":
      iconUrl = greenflag;
      break;
    default:
      iconUrl = greenflag;
  }

  return L.icon({
    iconUrl: iconUrl,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1]],
    shadowUrl: null,
  });
};

const createCustomClusterIcon = (cluster) => {
  return L.divIcon({
    html: `<div style="background-color: rgba(255, 0, 0, 0.7); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">${cluster.getChildCount()}</div>`,
    className: "custom-cluster-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

function FitBounds({ incidents }) {
  const map = useMap();
  useEffect(() => {
    if (!incidents || incidents.length === 0) return;
    const bounds = L.latLngBounds(
      incidents
        .filter((inc) => inc.location?.coordinates)
        .map((inc) => [
          inc.location.coordinates[1],
          inc.location.coordinates[0],
        ])
    );
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [incidents, map]);
  return null;
}

const TacticalMap = ({ incidents }) => {
  const defaultCenter = [19.0760, 72.8777];
  const mapCenter =
    incidents.length > 0
      ? [
          incidents[0].location.coordinates[1],
          incidents[0].location.coordinates[0],
        ]
      : defaultCenter;

  return (
    <MapContainer
      center={mapCenter}
      zoom={12}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%" }}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="CartoDB Dark">
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <MarkerClusterGroup iconCreateFunction={createCustomClusterIcon}>
        {incidents.map((incident) => {
          if (!incident.location || !incident.location.coordinates) {
            return null;
          }

          const [lon, lat] = incident.location.coordinates;
          const position = [lat, lon];

          return (
            <Marker
              key={incident._id}
              position={position}
              icon={getStatusIcon(incident.status)}
            >
              <Popup>
                <div style={{ minWidth: 200, fontSize: "13px" }}>
                  <strong style={{ fontSize: "15px", color: "#d32f2f" }}>
                    🚨 {incident.type}
                  </strong>
                  <hr style={{ margin: "8px 0" }} />
                  <div style={{ marginBottom: "6px" }}>
                    <strong>Status:</strong>{" "}
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontWeight: "600",
                        backgroundColor:
                          incident.status === "Active"
                            ? "rgba(34, 197, 94, 0.2)"
                            : incident.status === "Pending"
                              ? "rgba(234, 179, 8, 0.2)"
                              : incident.status === "Spam"
                                ? "rgba(239, 68, 68, 0.2)"
                                : "rgba(59, 130, 246, 0.2)",
                        color:
                          incident.status === "Active"
                            ? "#16a34a"
                            : incident.status === "Pending"
                              ? "#b45309"
                              : incident.status === "Spam"
                                ? "#991b1b"
                                : "#1e40af",
                      }}
                    >
                      {incident.status}
                    </span>
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <strong>Severity:</strong> {incident.severity}
                  </div>
                  <div>
                    <strong>Trust:</strong> {typeof incident.trustScore === 'object' ? incident.trustScore.totalScore || 'N/A' : incident.trustScore || 'N/A'}%
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>

      <FitBounds incidents={incidents} />
    </MapContainer>
  );
};

const Agency = () => {
  const { serverUrl } = useContext(AuthDataContext);

  const [coordinators, setCoordinators] = useState([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState(null);
  const [step, setStep] = useState(1);

  const [allIncidents, setAllIncidents] = useState([]);
  const [pendingIncidents, setPendingIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchResources, setDispatchResources] = useState([]);

  const severityPreset = {
    Low: 1,
    Medium: 3,
    High: 5,
    Critical: 8,
  };

  const fetchCoordinators = async () => {
    if (!selectedIncident) return;
    try {
      const res = await axios.post(
        `${serverUrl}/api/request/nearby`,
        {
          latitude: selectedIncident.location.coordinates[1],
          longitude: selectedIncident.location.coordinates[0],
          radius: 50,
        },
        { withCredentials: true }
      );
      setCoordinators(res.data.coordinators || []);
      setStep(2);
    } catch (err) {
      console.error("Fetch coordinators error:", err);
      alert("Failed to find coordinators");
    }
  };

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${serverUrl}/api/incident/list`, {
        withCredentials: true,
      });

      const all = res.data.incidents || [];
      const pending = all
        .filter((i) => i.status === "Pending")
        .sort((a, b) => {
          const scoreA = typeof b.trustScore === 'object' ? b.trustScore.totalScore || 0 : b.trustScore || 0;
          const scoreB = typeof a.trustScore === 'object' ? a.trustScore.totalScore || 0 : a.trustScore || 0;
          return scoreA - scoreB;
        });

      setAllIncidents(all);
      setPendingIncidents(pending);
      if (pending.length > 0 && !selectedIncident) {
        setSelectedIncident(pending[0]);
      }
    } catch (err) {
      console.error("Fetch incidents error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [serverUrl]);

  const acceptIncident = async (id) => {
    try {
      await axios.patch(
        `${serverUrl}/api/incident/${id}/status`,
        { status: "Active" },
        { withCredentials: true }
      );
      fetchIncidents();
    } catch (err) {
      console.error("Accept error:", err);
    }
  };

  const rejectIncident = async (id) => {
    try {
      await axios.patch(
        `${serverUrl}/api/incident/${id}/mark-spam`,
        {},
        { withCredentials: true }
      );
      fetchIncidents();
    } catch (err) {
      console.error("Reject error:", err);
    }
  };

  const handleDispatch = async () => {
    if (!selectedCoordinator) return alert("Please select a coordinator");

    try {
      await axios.post(
        `${serverUrl}/api/request/create`,
        {
          coordinatorId: selectedCoordinator._id,
          incidentId: selectedIncident._id,
          resources: dispatchResources,
        },
        { withCredentials: true }
      );

      await axios.patch(
        `${serverUrl}/api/incident/${selectedIncident._id}/status`,
        { status: "Active" },
        { withCredentials: true }
      );

      alert(
        `✅ Request sent to ${selectedCoordinator.name}! They have been notified via SMS.`
      );
      setShowDispatchModal(false);
      setStep(1);
      setSelectedCoordinator(null);
      fetchIncidents();
    } catch (err) {
      console.error(err);
      alert("Failed to send request");
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "fire":
        return "🔥";
      case "medical":
        return "🚑";
      case "police":
        return "🚨";
      case "accident":
        return "🚧";
      case "natural disaster":
        return "🌪️";
      default:
        return "⚠️";
    }
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case "VOICE":
        return "🎤";
      case "IMAGE_TEXT":
        return "📷";
      default:
        return "📄";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 border-green-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Spam":
        return "bg-red-100 text-red-800 border-red-200";
      case "Resolved":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <span className="text-xl">🚨</span>
                  </div>
                  Agency Triage Dashboard
                </h1>
                <p className="text-gray-600 text-sm mt-1">
                  Monitor and manage incoming emergency incidents
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={fetchIncidents}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-200 shadow-sm transition-colors text-sm"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex p-6 gap-6">
          {/* LEFT PANEL - Incident Queue */}
          <div className="w-[40%] h-[1320px] flex flex-col">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-full">
              <div className="p-6 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Triage Queue
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Review and prioritize incoming incidents
                    </p>
                  </div>
                  <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    {pendingIncidents.length} pending
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-gray-500 text-lg">Loading incidents...</p>
                    </div>
                  ) : pendingIncidents.length === 0 ? (
                    <div className="text-center py-24">
                      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">🎉</span>
                      </div>
                      <h3 className="text-xl font-semibold text-green-700 mb-3">
                        All Clear!
                      </h3>
                      <p className="text-gray-600 text-lg">
                        No pending incidents at the moment
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingIncidents.map((incident) => (
                        <div
                          key={incident._id}
                          onClick={() => setSelectedIncident(incident)}
                          className={`bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all hover:shadow-lg ${
                            selectedIncident?._id === incident._id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div
                                className={`p-3 rounded-xl ${getSeverityColor(
                                  incident.severity
                                )}`}
                              >
                                <span className="text-2xl">
                                  {getTypeIcon(incident.type)}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900 text-lg">
                                  {incident.type}
                                </h3>
                                <div className="flex items-center gap-3 mt-2">
                                  <span
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${getSeverityColor(
                                      incident.severity
                                    )}`}
                                  >
                                    {incident.severity}
                                  </span>
                                  <span className="text-sm text-gray-500">•</span>
                                  <span className="text-sm text-gray-500 flex items-center gap-1">
                                    <span>{getModeIcon(incident.mode)}</span>
                                    <span>
                                      {incident.mode === "IMAGE_TEXT"
                                        ? "Image Report"
                                        : "Voice Report"}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500 mb-1">
                                Trust Score
                              </div>
                              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                                <span className="font-bold text-gray-900 text-xl">
                                  {typeof incident.trustScore === 'object' 
                                    ? incident.trustScore.totalScore || 'N/A' 
                                    : incident.trustScore || 'N/A'}
                                </span>
                                <span className="text-gray-500">/100</span>
                              </div>
                            </div>
                          </div>

                          {incident.mode === "VOICE" && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-xl text-gray-700 line-clamp-3">
                              <p className="text-sm">{incident.transcript}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-6">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-500">
                                {new Date(
                                  incident.createdAt
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                              <span className="text-sm text-green-600 font-medium">
                                Live
                              </span>
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  acceptIncident(incident._id);
                                }}
                                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2 shadow-sm"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                Accept
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rejectIncident(incident._id);
                                }}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2 shadow-sm"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Map and Details */}
          <div className="w-[60%] h-[90%] flex flex-col gap-6">
            {/* Tactical Operations Map */}
            <div className="flex-none h-[350px] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-2xl">🗺️</span>
                      Tactical Operations Map
                    </h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <img src={greenflag} alt="Active" className="w-6 h-6" />
                      <span className="text-xs text-gray-600 font-medium">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src={yellowflag} alt="Pending" className="w-6 h-6" />
                      <span className="text-xs text-gray-600 font-medium">
                        Pending
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src={redflag} alt="Spam" className="w-6 h-6" />
                      <span className="text-xs text-gray-600 font-medium">
                        Spam
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-[calc(100%-60px)]">
                <TacticalMap incidents={allIncidents} />
              </div>
            </div>

            {/* Incident Details Section */}
            <div className="flex-1 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Incident Analysis
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Detailed information and response recommendations
                    </p>
                  </div>
                  {selectedIncident && (
                    <div className="flex items-center gap-4">
                      <span
                        className={`px-4 py-2 rounded-xl text-sm font-medium ${getSeverityColor(
                          selectedIncident.severity
                        )}`}
                      >
                        {selectedIncident.severity}
                      </span>
                      <div className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                        <span className="font-bold text-gray-900 text-xl">
                          {typeof selectedIncident.trustScore === 'object' 
                            ? selectedIncident.trustScore.totalScore || 'N/A' 
                            : selectedIncident.trustScore || 'N/A'}
                        </span>
                        <span className="text-gray-500">/100</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 h-[calc(100%-100px)] overflow-y-auto">
                {selectedIncident ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500 mb-2 block">
                            Incident Details
                          </label>
                          <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                            <div className="flex items-center gap-4">
                              <div
                                className={`p-3 rounded-lg ${getSeverityColor(
                                  selectedIncident.severity
                                )}`}
                              >
                                <span className="text-3xl">
                                  {getTypeIcon(selectedIncident.type)}
                                </span>
                              </div>
                              <div>
                                <p className="text-xl font-bold text-gray-900">
                                  {selectedIncident.type}
                                </p>
                                <p className="text-gray-600 flex items-center gap-1">
                                  <span>
                                    {getModeIcon(selectedIncident.mode)}
                                  </span>
                                  <span>
                                    {selectedIncident.mode === "IMAGE_TEXT"
                                      ? "Image Report"
                                      : "Voice Report"}
                                  </span>
                                </p>
                              </div>
                            </div>

                            {selectedIncident.mode === "IMAGE_TEXT" &&
                              selectedIncident.description && (
                                <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                  <p className="text-sm text-gray-700">
                                    <span className="font-semibold text-gray-600">
                                      Description:{" "}
                                    </span>
                                    {selectedIncident.description}
                                  </p>
                                </div>
                              )}
                          </div>
                        </div>

                        {selectedIncident.mode === "VOICE" &&
                          selectedIncident.transcript && (
                            <div>
                              <label className="text-sm font-medium text-gray-500 mb-2 block">
                                Voice Transcript
                              </label>
                              <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-gray-700">
                                  {selectedIncident.transcript}
                                </p>
                              </div>
                            </div>
                          )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500 mb-2 block">
                            Timeline & Status
                          </label>
                          <div className="space-y-3">
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                              <div className="text-sm text-blue-700 font-medium mb-1">
                                Reported
                              </div>
                              <div className="text-lg text-gray-900">
                                {new Date(
                                  selectedIncident.createdAt
                                ).toLocaleString()}
                              </div>
                            </div>
                            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                              <div className="text-sm text-yellow-700 font-medium mb-1">
                                Current Status
                              </div>
                              <div
                                className={`text-lg font-medium px-3 py-1 rounded inline-block ${getStatusColor(
                                  selectedIncident.status
                                )}`}
                              >
                                {selectedIncident.status}
                              </div>
                            </div>
                          </div>
                        </div>

                        {selectedIncident.imageUrl && (
                          <div>
                            <label className="text-sm font-medium text-gray-500 mb-2 block">
                              Evidence
                            </label>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                              <img
                                src={selectedIncident.imageUrl}
                                alt="Incident evidence"
                                className="rounded-lg w-full h-48 object-cover"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedIncident.translatedTranscript && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">
                          Translated Content
                        </label>
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                          <p className="text-gray-700">
                            {selectedIncident.translatedTranscript}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                      <button
                        onClick={() => rejectIncident(selectedIncident._id)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 text-base font-medium rounded-xl transition-all flex items-center gap-2"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Mark as Spam
                      </button>
                      <button
                        onClick={() => {
                          const qty =
                            severityPreset[selectedIncident.severity] || 2;

                          setDispatchResources([
                            {
                              item_name: "Medical Kit",
                              category: "Medical",
                              quantity: qty,
                            },
                            {
                              item_name: "Rescue Team",
                              category: "Rescue",
                              quantity: qty,
                            },
                          ]);

                          setShowDispatchModal(true);
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-base font-medium rounded-xl transition-all flex items-center gap-2 shadow-lg"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Activate & Deploy Response
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">📋</span>
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                        No Incident Selected
                      </h3>
                      <p className="text-gray-600 text-lg max-w-xl mb-6">
                        Select an incident from the queue to view detailed
                        analysis, location data, and response recommendations.
                      </p>
                      <div className="inline-flex items-center gap-3 px-6 py-3 bg-blue-50 text-blue-700 rounded-xl">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-sm">
                          Click on any incident card to view details
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              Emergency Response System v2.1 • Secure Connection • Last updated:{" "}
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                System Active
              </span>
              <span>•</span>
              <span>{pendingIncidents.length} pending incidents</span>
            </div>
          </div>
        </footer>

        {/* DISPATCH MODAL */}
        {showDispatchModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white w-[500px] rounded-xl p-6 shadow-xl transition-all">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                {step === 1
                  ? "🚑 Step 1: Define Resources"
                  : "📡 Step 2: Select Coordinator"}
              </h2>

              {/* STEP 1: SELECT RESOURCES */}
              {step === 1 && (
                <>
                  <div className="space-y-4 mb-6">
                    {dispatchResources.map((res, index) => (
                      <div key={index} className="grid grid-cols-3 gap-3 items-center">
                        <input
                          type="text"
                          value={res.item_name}
                          readOnly
                          className="border rounded-lg px-3 py-2 bg-gray-100 text-sm"
                        />
                        <input
                          type="text"
                          value={res.category}
                          readOnly
                          className="border rounded-lg px-3 py-2 bg-gray-100 text-sm"
                        />
                        <input
                          type="number"
                          value={res.quantity}
                          onChange={(e) => {
                            const updated = [...dispatchResources];
                            updated[index].quantity = Number(e.target.value);
                            setDispatchResources(updated);
                          }}
                          className="border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowDispatchModal(false)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={fetchCoordinators}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Find Coordinators →
                    </button>
                  </div>
                </>
              )}

              {/* STEP 2: SELECT COORDINATOR */}
              {step === 2 && (
                <>
                  <p className="text-sm text-gray-500 mb-3">
                    Found {coordinators.length} coordinators near the incident location.
                  </p>
                  <div className="max-h-60 overflow-y-auto space-y-3 mb-6">
                    {coordinators.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">
                        No coordinators found nearby.
                      </p>
                    ) : (
                      coordinators.map((coord) => (
                        <div
                          key={coord._id}
                          onClick={() => setSelectedCoordinator(coord)}
                          className={`p-3 border rounded-xl cursor-pointer flex justify-between items-center transition-colors ${
                            selectedCoordinator?._id === coord._id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div>
                            <p className="font-bold text-gray-900">
                              {coord.name || "Coordinator"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {coord.distanceKm ? coord.distanceKm.toFixed(1) : 'N/A'} km away • {coord.resourceCount || 0} assets
                            </p>
                          </div>
                          {selectedCoordinator?._id === coord._id && (
                            <span className="text-blue-600 font-bold">✓</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleDispatch}
                      disabled={!selectedCoordinator}
                      className={`px-4 py-2 rounded-lg text-white transition-opacity ${
                        !selectedCoordinator
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      Send Request
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Agency;