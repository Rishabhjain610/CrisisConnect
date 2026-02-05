import React, { useEffect, useState, useContext, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Popup,
  Marker,
  LayersControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import axios from "axios";
import { AuthDataContext } from "../context/AuthDataContext";

// ✅ FIX LEAFLET DEFAULT ICONS
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ✅ INCIDENT TYPE ICONS WITH CUSTOM STYLING
const getIncidentIcon = (type) => {
  const iconMap = {
    Fire: { emoji: "🔥", color: "#ef4444" },
    Flood: { emoji: "💧", color: "#06b6d4" },
    "Medical Emergency": { emoji: "🚑", color: "#ec4899" },
    "Traffic Accident": { emoji: "🚧", color: "#f59e0b" },
    "Armed Incident": { emoji: "🚨", color: "#dc2626" },
    Earthquake: { emoji: "📍", color: "#8b5cf6" },
    "Hazmat Incident": { emoji: "☢️", color: "#10b981" },
    "Trapped Person": { emoji: "🆘", color: "#f97316" },
    "Crowd Disturbance": { emoji: "👥", color: "#6366f1" },
    Other: { emoji: "⚠️", color: "#64748b" },
  };

  const { emoji = "⚠️", color = "#3b82f6" } = iconMap[type] || {};

  return L.divIcon({
    html: `<div style="background: linear-gradient(135deg, ${color} 0%, ${adjustBrightness(
      color,
      -20
    )} 100%); border-radius: 50%; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-size: 24px; transition: transform 0.2s; cursor: pointer;">${emoji}</div>`,
    className: "incident-marker",
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
};

// ✅ CUSTOM CLUSTER ICON
const createCustomClusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  let bgColor = "#3b82f6";
  let scale = 1;

  if (count > 20) {
    bgColor = "#7f1d1d";
    scale = 1.5;
  } else if (count > 10) {
    bgColor = "#dc2626";
    scale = 1.3;
  } else if (count > 5) {
    bgColor = "#f59e0b";
    scale = 1.15;
  }

  return L.divIcon({
    html: `<div style="background: linear-gradient(135deg, ${bgColor} 0%, ${adjustBrightness(
      bgColor,
      -20
    )} 100%); border-radius: 50%; width: ${45 * scale}px; height: ${
      45 * scale
    }px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: ${
      16 * scale
    }px; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer;">${count}</div>`,
    className: "custom-cluster-icon",
    iconSize: [45 * scale, 45 * scale],
    iconAnchor: [(45 * scale) / 2, (45 * scale) / 2],
  });
};

// ✅ ADJUST COLOR BRIGHTNESS
const adjustBrightness = (color, percent) => {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
};

// ✅ MAP CONTROLLER - AUTO ZOOM TO BOUNDS
function MapController({ incidents }) {
  const map = useMap();
  const hasSetBounds = useRef(false);

  useEffect(() => {
    if (!hasSetBounds.current && incidents?.length > 0) {
      const allCoords = incidents
        .filter((inc) => inc.location?.coordinates?.[0] && inc.location?.coordinates?.[1])
        .map((inc) => [
          inc.location.coordinates[1],
          inc.location.coordinates[0],
        ]);

      if (allCoords.length > 1) {
        try {
          const bounds = L.latLngBounds(allCoords);
          map.fitBounds(bounds, {
            padding: [100, 100],
            maxZoom: 15,
            animate: true,
          });
          hasSetBounds.current = true;
        } catch (err) {
          console.error("Bounds error:", err);
        }
      } else if (allCoords.length === 1) {
        map.setView(allCoords[0], 14, { animate: true });
        hasSetBounds.current = true;
      }
    }
  }, [incidents, map]);

  return null;
}

// ✅ MAIN MAPS COMPONENT
const Maps = ({ 
  height = "h-screen",
  size = "large",
  showLegend = true,
  showControls = false,
  autoRefresh = true 
}) => {
  const { serverUrl } = useContext(AuthDataContext);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMapType, setSelectedMapType] = useState("standard");
  const [mapStats, setMapStats] = useState({ total: 0 });

  // ✅ SIZE PRESETS
  const sizeMap = {
    small: "h-80 w-full max-w-2xl",
    medium: "h-[500px] w-full max-w-4xl",
    large: "h-[680px] w-full",
    fullscreen: "h-screen w-screen",
    custom: height,
  };

  const containerHeight = sizeMap[size] || height;

  useEffect(() => {
    let mounted = true;

    const fetchIncidents = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${serverUrl}/api/incident/list`, {
          withCredentials: true,
        });

        if (!mounted) return;

        // ✅ FILTER: ONLY SHOW ACTIVE INCIDENTS
        const activeIncidents = (response.data?.incidents || []).filter(
          (inc) => inc.status === "Active"
        );

        setIncidents(activeIncidents);

        // ✅ UPDATE STATS - ONLY ACTIVE
        setMapStats({
          total: activeIncidents.length,
        });

        setError(null);
        console.log("✅ Active incidents loaded:", activeIncidents.length);
      } catch (err) {
        console.error("❌ Fetch error:", err);
        if (mounted) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Failed to load incidents"
          );
          setIncidents([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchIncidents();

    const interval = autoRefresh ? setInterval(fetchIncidents, 30000) : null;
    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [serverUrl, autoRefresh]);

  const defaultCenter = [19.076, 72.8777];

  const mapCenter =
    incidents.length > 0 && incidents[0].location?.coordinates
      ? [
          incidents[0].location.coordinates[1],
          incidents[0].location.coordinates[0],
        ]
      : defaultCenter;

  // ✅ MAP TILE LAYERS
  const mapLayers = {
    standard: {
      name: "🗺️ Standard",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },
    dark: {
      name: "🌙 Dark Mode",
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    light: {
      name: "☀️ Light Mode",
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    satellite: {
      name: "🛰️ Satellite",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
    },
    toner: {
      name: "🖤 Toner",
      url: "https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
    },
    terrain: {
      name: "⛰️ Terrain",
      url: "https://tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a>'
    },
    voyager: {
      name: "🌍 Voyager",
      url: "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
    },
  };

  return (
    <div className={`${containerHeight} relative w-full rounded-xl overflow-hidden shadow-2xl border border-gray-300 bg-white flex flex-col mt-24`}>
      
      {/* ✅ OPTIONAL HEADER - ONLY IF showControls IS TRUE */}
      {showControls && (
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex justify-between items-center shadow-lg flex-shrink-0">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-2xl">🗺️</span>
            <div>
              <h2 className="text-lg font-bold">Active Incidents Map</h2>
              <p className="text-xs text-green-100">Real-time crisis response - Active Only</p>
            </div>
          </div>

          {/* Map Type Selector */}
          <div className="flex gap-2 flex-wrap justify-end max-w-md">
            {Object.entries(mapLayers).map(([key, layer]) => (
              <button
                key={key}
                onClick={() => setSelectedMapType(key)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedMapType === key
                    ? "bg-white text-green-600 shadow-lg scale-105"
                    : "bg-green-500 text-white hover:bg-green-400"
                }`}
                title={layer.name}
              >
                {layer.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ✅ LOADING STATE */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 z-50 rounded-xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mb-4 mx-auto"></div>
            <p className="text-gray-700 font-semibold">Loading active incidents...</p>
            <p className="text-sm text-gray-500 mt-1">Fetching real-time data</p>
          </div>
        </div>
      )}

      {/* ✅ ERROR STATE */}
      {error && !loading && (
        <div className="absolute top-4 left-4 right-4 bg-red-100 border-2 border-red-400 text-red-900 px-4 py-3 rounded-lg shadow-lg z-50 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="font-bold text-sm">Error Loading Map</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* ✅ EMPTY STATE */}
      {!loading && incidents.length === 0 && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-100 z-40 rounded-xl">
          <div className="text-center">
            <div className="text-7xl mb-4">✅</div>
            <p className="text-gray-700 font-bold text-lg">No Active Incidents</p>
            <p className="text-sm text-gray-600 mt-2">All situations are under control!</p>
          </div>
        </div>
      )}

      {/* ✅ MAP CONTAINER */}
      <MapContainer
        center={mapCenter}
        zoom={12}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ height: "100%", width: "100%", flex: 1 }}
        className="relative"
      >
        {/* BASE LAYERS */}
        <LayersControl position="topright" collapsed={false}>
          {Object.entries(mapLayers).map(([key, layer]) => (
            <LayersControl.BaseLayer
              key={key}
              checked={selectedMapType === key}
              name={layer.name}
            >
              <TileLayer
                attribution={layer.attribution}
                url={layer.url}
              />
            </LayersControl.BaseLayer>
          ))}
        </LayersControl>

        {/* INCIDENTS LAYER - ONLY ACTIVE */}
        {incidents.length > 0 && (
          <MarkerClusterGroup
            iconCreateFunction={createCustomClusterIcon}
            maxClusterRadius={60}
            disableClusteringAtZoom={14}
          >
            {incidents.map((incident) => {
              if (!incident.location?.coordinates?.[0]) return null;

              const [lon, lat] = incident.location.coordinates;
              return (
                <Marker
                  key={incident._id}
                  position={[lat, lon]}
                  icon={getIncidentIcon(incident.type)}
                >
                  {/* ✅ COMPACT POPUP */}
                  <Popup 
                    maxWidth={240}
                    minWidth={220}
                    className="compact-popup"
                    autoPan={true}
                    autoPanPaddingTopLeft={[50, 50]}
                    autoPanPaddingBottomRight={[50, 50]}
                  >
                    <style>{`.compact-popup .leaflet-popup-content { padding: 8px !important; margin: 0 !important; } .compact-popup .leaflet-popup-tip { height: 8px !important; }`}</style>
                    <div className="text-xs space-y-2">
                      {/* Header */}
                      <div className="font-bold flex items-center gap-1.5 pb-1.5 border-b">
                        <span className="text-base">
                          {incident.type === "Fire" ? "🔥" : 
                           incident.type === "Flood" ? "💧" : 
                           incident.type === "Medical Emergency" ? "🚑" :
                           incident.type === "Traffic Accident" ? "🚧" :
                           incident.type === "Armed Incident" ? "🚨" :
                           "⚠️"}
                        </span>
                        <span className="text-gray-900 flex-1 line-clamp-1">{incident.type}</span>
                      </div>

                      {/* Quick Info - Single Row */}
                      <div className="grid grid-cols-3 gap-1 text-center bg-gray-50 p-1 rounded">
                        <div>
                          <p className="text-gray-600 font-semibold">Severity</p>
                          <p className="font-bold text-red-600">{incident.severity}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-semibold">Trust</p>
                          <p className="font-bold text-blue-600">
                            {typeof incident.trustScore === "object"
                              ? incident.trustScore.totalScore || "N/A"
                              : incident.trustScore || "N/A"}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-semibold">Mode</p>
                          <p className="font-bold text-purple-600">{incident.mode}</p>
                        </div>
                      </div>

                      {/* Coordinates - Compact */}
                      <div className="text-xs text-gray-600 bg-gray-100 p-1 rounded border-l-2 border-green-500">
                        <p>📍 {lat.toFixed(4)}, {lon.toFixed(4)}</p>
                      </div>

                      {/* Time */}
                      <div className="text-xs text-gray-500 text-center">
                        ⏰ {new Date(incident.createdAt).toLocaleTimeString()}
                      </div>

                      {/* Transcript - Only if VOICE */}
                      {incident.mode === "VOICE" && incident.transcript && (
                        <div className="bg-blue-50 p-1 rounded border-l-2 border-blue-300 line-clamp-2">
                          <p className="text-xs font-semibold text-blue-900">🎤 {incident.transcript}</p>
                        </div>
                      )}

                      {/* Image Quick Preview */}
                      {incident.imageUrl && (
                        <div className="rounded overflow-hidden border border-gray-300">
                          <img
                            src={incident.imageUrl}
                            alt="incident"
                            className="w-full h-20 object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-green-200 text-green-800">
                          ✓ ACTIVE
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        )}

        {/* AUTO-FIT BOUNDS */}
        {incidents.length > 0 && <MapController incidents={incidents} />}
      </MapContainer>

      {/* ✅ LEGEND - Bottom Left with HIGHER Z-INDEX */}
      {showLegend && !loading && incidents.length > 0 && (
        <div className="absolute bottom-6 left-6 bg-white/98 backdrop-blur-sm border-2 border-green-300 rounded-lg px-4 py-3 shadow-2xl z-[400] max-w-xs">
          <div className="space-y-3">
            {/* Stats */}
            <div className="border-b pb-3">
              <p className="font-bold text-gray-900 text-base flex items-center gap-2 mb-2">
                <span className="text-xl">🚨</span>
                Active Incidents
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Currently Active:</span>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold text-xs">
                    {mapStats.total}
                  </span>
                </div>
              </div>
            </div>

            {/* Type Legend */}
            <div>
              <p className="font-bold text-gray-900 text-sm mb-2">🎯 Incident Types</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2"><span>🔥</span><span className="text-gray-700">Fire</span></div>
                <div className="flex items-center gap-2"><span>💧</span><span className="text-gray-700">Flood</span></div>
                <div className="flex items-center gap-2"><span>🚑</span><span className="text-gray-700">Medical</span></div>
                <div className="flex items-center gap-2"><span>🚧</span><span className="text-gray-700">Traffic</span></div>
                <div className="flex items-center gap-2"><span>🚨</span><span className="text-gray-700">Armed</span></div>
                <div className="flex items-center gap-2"><span>📍</span><span className="text-gray-700">Earthquake</span></div>
              </div>
            </div>

            {/* Auto Update */}
            <div className="text-xs text-gray-500 border-t pt-2 text-center">
              ✅ Auto-updates every 30s
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maps;