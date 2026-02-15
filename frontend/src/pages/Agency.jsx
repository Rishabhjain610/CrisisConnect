
import React, { useEffect, useState, useContext, useRef } from "react";
import axios from "axios";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthDataContext } from "../context/AuthDataContext";
import {
  MapContainer,
  TileLayer,
  Popup,
  Marker,
  LayersControl,
  useMap,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";

// ✅ MARKER ICONS
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import greenflag from "../assets/greenflag.png";
import redflag from "../assets/redflag.png";
import yellowflag from "../assets/yellowflag.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ✅ INCIDENT ICON
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

// ✅ RESOURCE ICON (Updated for Master Catalog Categories)
// ✅ RESOURCE ICON (Updated for Master Catalog Categories)
const getResourceIcon = (category) => {
  const categoryMap = {
    // Standard Master Catalog Categories
    medical: { emoji: "🏥", color: "#ef4444" },  // Ambulance, Medical Kit
    fire: { emoji: "🚒", color: "#ea580c" },     // Fire Truck
    rescue: { emoji: "🆘", color: "#f97316" },   // Rescue Team, Boat, Ropes
    relief: { emoji: "📦", color: "#10b981" },    // Food Packets, Water Tanker
    equipment: { emoji: "⚡", color: "#8b5cf6" }, // Generator
    police: { emoji: "🚓", color: "#2563eb" },    // Police Patrol

    // Legacy / Fallback Categories (Keep these just in case)
    food: { emoji: "🍖", color: "#f59e0b" },
    water: { emoji: "💧", color: "#06b6d4" },
    shelter: { emoji: "🏠", color: "#10b981" },
    fuel: { emoji: "⛽", color: "#f97316" },
  };

  const categoryLower = category?.toLowerCase();
  const { emoji = "📍", color = "#64748b" } = categoryMap[categoryLower] || {};

  return L.divIcon({
    html: `<div style="background: linear-gradient(135deg, ${color} 0%, ${adjustBrightness(
      color,
      -20
    )} 100%); border-radius: 50%; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.2); font-size: 22px;">${emoji}</div>`,
    className: "resource-icon",
    iconSize: [45, 45],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

// ✅ CLUSTER ICON
const createCustomClusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  let bgColor = "#3b82f6";
  let scale = 1;

  if (count > 10) {
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
    )} 100%); border-radius: 50%; width: ${40 * scale}px; height: ${40 * scale
      }px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: ${14 * scale
      }px; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">${count}</div>`,
    className: "custom-cluster-icon",
    iconSize: [40 * scale, 40 * scale],
    iconAnchor: [(40 * scale) / 2, (40 * scale) / 2],
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

// ✅ MAP CONTROLLER - PREVENTS ZOOM ISSUES
function MapController({ incidents, resources, zoomTarget }) {
  const map = useMap();
  const hasSetBounds = useRef(false);

  // Handle zoom to specific location
  useEffect(() => {
    if (zoomTarget) {
      map.setView([zoomTarget.lat, zoomTarget.lon], 16, {
        animate: true,
        duration: 1.5
      });
    }
  }, [zoomTarget, map]);

  useEffect(() => {
    if (!hasSetBounds.current && (incidents?.length > 0 || resources?.length > 0)) {
      const allCoords = [];

      incidents?.forEach((inc) => {
        if (inc.location?.coordinates?.[0] && inc.location?.coordinates?.[1]) {
          allCoords.push([
            inc.location.coordinates[1],
            inc.location.coordinates[0],
          ]);
        }
      });

      resources?.forEach((res) => {
        if (res.location?.coordinates?.[0] && res.location?.coordinates?.[1]) {
          allCoords.push([
            res.location.coordinates[1],
            res.location.coordinates[0],
          ]);
        }
      });

      if (allCoords.length > 1) {
        try {
          const bounds = L.latLngBounds(allCoords);
          map.fitBounds(bounds, {
            padding: [100, 100],
            maxZoom: 16,
            animate: true,
          });
          hasSetBounds.current = true;
        } catch (err) {
          console.error("Bounds error:", err);
        }
      } else if (allCoords.length === 1) {
        map.setView(allCoords[0], 15);
        hasSetBounds.current = true;
      }
    }
  }, []);

  return null;
}

// ✅ TACTICAL MAP WITH INCIDENTS & RESOURCES
const TacticalMap = ({ incidents, resources, zoomTarget }) => {
  const defaultCenter = [19.0760, 72.8777];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      scrollWheelZoom={true}
      dragging={true}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
    >
      <LayersControl position="topright" collapsed={false}>
        {/* BASE LAYERS */}
        <LayersControl.BaseLayer checked name="🗺️ Standard">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="🌙 Dark">
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>


        <LayersControl.BaseLayer name="🛰️ Satellite">
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        {/* INCIDENTS LAYER */}
        <LayersControl.Overlay checked name="🚨 Incidents">
          <MarkerClusterGroup
            iconCreateFunction={createCustomClusterIcon}
            maxClusterRadius={50}
            disableClusteringAtZoom={16}
          >
            {incidents?.map((incident) => {
              if (!incident.location?.coordinates?.[0]) return null;

              const [lon, lat] = incident.location.coordinates;
              return (
                <Marker
                  key={incident._id}
                  position={[lat, lon]}
                  icon={getStatusIcon(incident.status)}
                >
                  <Popup maxWidth={300} minWidth={250}>
                    <div className="text-sm space-y-2">
                      <div className="font-bold text-red-600 text-base">
                        🚨 {incident.type}
                      </div>
                      <div className="border-t border-gray-300 pt-2 space-y-1">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-700">
                            Status:
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${incident.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : incident.status === "Pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                              }`}
                          >
                            {incident.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-700">
                            Severity:
                          </span>
                          <span className="font-bold text-red-600">
                            {incident.severity}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-700">
                            Trust:
                          </span>
                          <span className="font-bold text-blue-600">
                            {typeof incident.trustScore === "object"
                              ? incident.trustScore.totalScore || "N/A"
                              : incident.trustScore || "N/A"}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </LayersControl.Overlay>

        {/* RESOURCES LAYER */}
        <LayersControl.Overlay checked name="📦 Resources">
          <MarkerClusterGroup
            iconCreateFunction={createCustomClusterIcon}
            maxClusterRadius={50}
            disableClusteringAtZoom={15}
          >
            {resources?.map((resource) => {
              if (!resource.location?.coordinates?.[0]) return null;

              const [lon, lat] = resource.location.coordinates;
              return (
                <Marker
                  key={resource._id}
                  position={[lat, lon]}
                  icon={getResourceIcon(resource.category)}
                >
                  <Popup maxWidth={300} minWidth={260}>
                    <div className="text-sm space-y-2">
                      <div className="font-bold text-blue-600 text-base">
                        📦 {resource.category}
                      </div>
                      <div className="border-t border-gray-300 pt-2 space-y-1">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-700">
                            Item:
                          </span>
                          <span className="font-bold text-gray-900">
                            {resource.item_name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-700">
                            Qty:
                          </span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold text-xs">
                            ×{resource.quantity}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-700">
                            Status:
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${resource.status === "Available"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                              }`}
                          >
                            {resource.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Owner: {resource.owner?.name || "Unknown"}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </LayersControl.Overlay>
      </LayersControl>

      <MapController incidents={incidents} resources={resources} zoomTarget={zoomTarget} />
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
  const [resources, setResources] = useState([]);

  const [sentRequests, setSentRequests] = useState([]);
  const [mapZoomTarget, setMapZoomTarget] = useState(null);

  // ✅ GROUPED INCIDENTS VIEW
  const [viewMode, setViewMode] = useState("list"); // "list" or "grouped"
  const [groupedIncidents, setGroupedIncidents] = useState([]);
  const [groupingRadius, setGroupingRadius] = useState(5000); // meters (5km = practical city range)

  const severityPreset = {
    Low: 1,
    Medium: 3,
    High: 5,
    Critical: 8,
  };

  // ✅ COMPREHENSIVE RESOURCE RECOMMENDATIONS BASED ON INCIDENT TYPE & SEVERITY
  // ✅ SMART RECOMMENDATIONS (Updated to Match DB Master Catalog)
  const getResourceRecommendations = (incidentType, severity) => {
    const type = incidentType?.toLowerCase() || "other";
    const sevIndex = { "low": 0, "medium": 1, "high": 2, "critical": 3 }[severity?.toLowerCase()] || 1;

    const recommendations = {
      "fire": {
        name: "Fire Emergency",
        emoji: "🔥",
        resources: [
          { item_name: "Fire Truck", category: "Fire", description: "Heavy fire suppression unit", base: 1, levels: [1, 2, 3, 4] },
          { item_name: "Rescue Team", category: "Rescue", description: "Trained rescue personnel", base: 5, levels: [5, 10, 15, 20] },
          { item_name: "Ambulance", category: "Medical", description: "Medical emergency response", base: 1, levels: [1, 2, 3, 4] },
          { item_name: "Water Tanker", category: "Relief", description: "Additional water supply", base: 0, levels: [0, 1, 2, 3] },
          { item_name: "Medical Kit", category: "Medical", description: "Advanced life support supplies", base: 2, levels: [2, 4, 6, 8] },
        ]
      },
      "medical": {
        name: "Medical Emergency",
        emoji: "🚑",
        resources: [
          { item_name: "Ambulance", category: "Medical", description: "Patient transport vehicles", base: 1, levels: [1, 2, 3, 4] },
          { item_name: "ICU Ambulance", category: "Medical", description: "Critical care transport", base: 1, levels: [0, 1, 2, 3] },
          { item_name: "Medical Kit", category: "Medical", description: "Emergency medical supplies", base: 3, levels: [3, 6, 9, 12] },
          { item_name: "Rescue Team", category: "Rescue", description: "For patient lifting/moving", base: 1, levels: [1, 2, 2, 4] },
        ]
      },
      "police": {
        name: "Police/Security Incident",
        emoji: "🚨",
        resources: [
          { item_name: "Police Patrol", category: "Police", description: "Law enforcement unit", base: 2, levels: [2, 4, 6, 10] },
          { item_name: "Rescue Team", category: "Rescue", description: "Crowd control / support", base: 1, levels: [1, 2, 4, 6] },
          { item_name: "Ambulance", category: "Medical", description: "Standby medical support", base: 1, levels: [1, 1, 2, 2] },
          { item_name: "Generator", category: "Equipment", description: "Power for mobile command", base: 0, levels: [0, 1, 1, 2] },
        ]
      },
      "accident": {
        name: "Traffic/Vehicle Accident",
        emoji: "🚧",
        resources: [
          { item_name: "Ambulance", category: "Medical", description: "Emergency transport", base: 1, levels: [1, 2, 3, 4] },
          { item_name: "Rescue Team", category: "Rescue", description: "Extraction and support", base: 1, levels: [1, 2, 4, 6] },
          { item_name: "Police Patrol", category: "Police", description: "Traffic control", base: 1, levels: [1, 2, 3, 4] },
          { item_name: "Medical Kit", category: "Medical", description: "On-site treatment", base: 1, levels: [1, 2, 3, 4] },
        ]
      },
      "natural disaster": {
        name: "Natural Disaster",
        emoji: "🌪️",
        resources: [
          { item_name: "Rescue Team", category: "Rescue", description: "Search and rescue personnel", base: 5, levels: [5, 10, 15, 20] },
          { item_name: "Rescue Boat", category: "Rescue", description: "Water rescue vehicle", base: 0, levels: [0, 2, 4, 8] },
          { item_name: "Life Jackets & Ropes", category: "Rescue", description: "Safety gear", base: 10, levels: [10, 20, 50, 100] },
          { item_name: "Food Packets", category: "Relief", description: "Emergency rations", base: 50, levels: [50, 100, 300, 500] },
          { item_name: "Water Tanker", category: "Relief", description: "Potable water supply", base: 1, levels: [1, 2, 3, 5] },
          { item_name: "Generator", category: "Equipment", description: "Emergency power", base: 1, levels: [1, 2, 3, 5] },
        ]
      }
    };

    const incident = recommendations[type] || recommendations["accident"];
    const resources = incident.resources.map(res => ({
      ...res,
      quantity: res.levels[Math.min(sevIndex, res.levels.length - 1)]
    }));

    return { name: incident.name, emoji: incident.emoji, resources };
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
      toast.error("Failed to find coordinators");
    }
  };

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${serverUrl}/api/incident/list?limit=100`, { withCredentials: true });
      const all = res.data.incidents || [];

      // ✅ MODIFIED: SORT BY DATE DESCENDING (Newest First)
      const visibleIncidents = all
        .filter((i) => i.status === "Pending" || i.status === "Active")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setAllIncidents(all);
      setPendingIncidents(visibleIncidents);
      if (visibleIncidents.length > 0 && !selectedIncident) {
        setSelectedIncident(visibleIncidents[0]);
      }
    } catch (err) {
      console.error("Fetch incidents error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FETCH GROUPED INCIDENTS BY LOCATION & TYPE
  const fetchGroupedIncidents = async () => {
    try {
      setLoading(true);
      // Calculate center of all incidents
      const activeIncidents = allIncidents.filter((i) => i.location?.coordinates);
      if (activeIncidents.length === 0) {
        console.log("❌ No incidents with location coordinates found");
        toast.error("No incidents with valid location data to group");
        setGroupedIncidents([]);
        return;
      }

      const centerLat =
        activeIncidents.reduce((sum, inc) => sum + inc.location.coordinates[1], 0) / activeIncidents.length;
      const centerLon =
        activeIncidents.reduce((sum, inc) => sum + inc.location.coordinates[0], 0) / activeIncidents.length;

      console.log(`📍 GROUPED VIEW REQUEST:`);
      console.log(`   📋 Total incidents in list view: ${allIncidents.length}`);
      console.log(`   ✅ Incidents with valid coordinates: ${activeIncidents.length}`);
      console.log(`   📍 Center calculated: (${centerLat.toFixed(4)}, ${centerLon.toFixed(4)})`);
      console.log(`   📏 Search radius: ${groupingRadius}m`);
      console.log(`   🔗 API call: ${serverUrl}/api/incident/group?latitude=${centerLat}&longitude=${centerLon}&radius=${groupingRadius}`);

      const res = await axios.get(
        `${serverUrl}/api/incident/group?latitude=${centerLat}&longitude=${centerLon}&radius=${groupingRadius}`,
        { withCredentials: true }
      );

      console.log("✅ Grouped incidents response:", res.data);

      // Process grouped results - backend returns data.groupedIncidents
      const grouped = res.data.data?.groupedIncidents || [];
      console.log(`   📊 Groups returned: ${grouped.length}`);

      const processed = grouped.map((typeGroup) => ({
        ...typeGroup,
        clusters: (typeGroup.clusters || []).map((cluster) => ({
          ...cluster,
          // Sort incidents within cluster by creation date (newest first)
          incidents: (cluster.incidents || []).sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          ),
        })),
      }));

      setGroupedIncidents(processed);
      console.log("✅ Processed grouped incidents:", processed);
    } catch (err) {
      console.error("❌ Fetch grouped incidents error:", err);
      console.error("   Error response:", err.response?.data);
      toast.error("Failed to load grouped incidents: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/resource/available-grouped`, { withCredentials: true });
      // Flatten the grouped resources into a single array
      const allResources = res.data.groupedResources?.flatMap(group => group.resources) || [];
      setResources(allResources);
    } catch (err) {
      console.error("Fetch resources error:", err);
    }
  };

  const fetchSentRequests = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/request/agency/list`, { withCredentials: true });
      setSentRequests(res.data.requests);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchResources();

    fetchSentRequests();
    const interval = setInterval(fetchSentRequests, 5000); // Poll for updates
    return () => clearInterval(interval);
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
    if (!selectedCoordinator) return toast.error("Please select a coordinator");

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

      toast.success(
        `✅ Request sent to ${selectedCoordinator.name}! They have been notified via SMS.`
      );
      setShowDispatchModal(false);
      setStep(1);
      setSelectedCoordinator(null);
      fetchIncidents();
    } catch (err) {
      console.error(err);
      toast.error("Failed to send request");
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

  // ✅ Function to Resolve Incident
  const resolveIncident = async (id) => {
    if (!window.confirm("Mark this incident as RESOLVED? This will close the case and notify the citizen.")) return;
    try {
      await axios.patch(`${serverUrl}/api/incident/${id}/status`, { status: "Resolved" }, { withCredentials: true });
      fetchIncidents();
      setSelectedIncident(null);
      toast.success("Incident Resolved & Closed!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to resolve incident");
    }
  };

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-gray-50 to-gray-100">
      {/* <ToastContainer position="top-right" autoClose={3000} /> */}
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

        {/* --- STATUS TRACKER PANEL --- */}
        <div className="mb-2 px-6 py-4">
          <h2 className="text-xl font-bold text-zinc-900 mb-4">Live Dispatch Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sentRequests.length === 0 ? (
              <div className="col-span-3 p-4 bg-zinc-50 rounded-xl text-center text-zinc-400 text-sm">
                No active dispatch requests.
              </div>
            ) : (
              sentRequests.map(req => (
                <div key={req._id} className="bg-white border border-zinc-200 p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${req.status === 'Accepted' ? 'bg-green-100 text-green-700' :
                      req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                      {req.status === 'Accepted' ? 'Deployed' : req.status}
                    </span>
                    <span className="text-xs text-zinc-400">{new Date(req.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="font-bold text-zinc-900 text-sm">
                    {req.resourcesRequested.map(r => `${r.quantity} ${r.item_name}`).join(", ")}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Coordinator: {req.coordinatorId?.name || "Unknown"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex p-6 gap-6">
          {/* LEFT PANEL - Incident Queue */}
          <div className={`w-[40%] h-[1320px] flex flex-col ${showDispatchModal ? 'pointer-events-none opacity-50' : ''}`}>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-full">
              <div className="p-6 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Triage Queue
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Review and prioritize incoming incidents
                    </p>
                  </div>
                </div>
                {/* VIEW MODE TOGGLE */}
                <div className="flex items-center gap-3">
                  {/* <button
                    onClick={() => setViewMode("list")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === "list"
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    📋 List View
                  </button> */}
                  {/*
                  <button
                    onClick={() => {
                      setViewMode("grouped");
                      fetchGroupedIncidents();
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === "grouped"
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    🗺️ Grouped View
                  </button>
                  {viewMode === "grouped" && (
                    <div className="ml-auto flex items-center gap-2">
                      <label className="text-xs text-gray-600 font-medium">Search Radius:</label>
                      <select
                        value={groupingRadius}
                        onChange={(e) => setGroupingRadius(Number(e.target.value))}
                        className="px-3 py-1 border border-gray-300 rounded text-sm bg-white"
                      >
                        <option value={100}>100m</option>
                        <option value={500}>500m</option>
                        <option value={1000}>1km</option>
                        <option value={5000}>5km (Default)</option>
                        <option value={10000}>10km</option>
                      </select>
                    </div>
                  )}
                  */}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  {viewMode === "list" ? (
                    /* LIST VIEW */
                    <>
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
                              className={`bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all hover:shadow-lg ${selectedIncident?._id === incident._id
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
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-gray-400 font-medium">
                                    {new Date(incident.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-gray-700">
                                      {new Date(
                                        incident.createdAt
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: true
                                      })}
                                    </span>
                                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                    <span className="text-sm text-green-600 font-medium">
                                      Live
                                    </span>
                                  </div>
                                </div>

                                <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                  Select to Manage →
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : null /* Grouped view temporarily disabled */}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Map and Details */}
          <div className="w-[60%] h-[95%] flex flex-col gap-6">
            {/* Tactical Operations Map */}
            <div className="flex-none h-[440px] pt-4 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
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
              <div className={`h-[calc(100%-60px)] ${showDispatchModal ? 'pointer-events-none opacity-50' : ''}`}>
                <TacticalMap incidents={allIncidents} resources={resources} zoomTarget={mapZoomTarget} />
              </div>
            </div>

            {/* Incident Details Section */}
            <div className={`flex-1 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden ${showDispatchModal ? 'pointer-events-none opacity-50' : ''}`}>
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

                            {/* Reported By */}
                            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold text-gray-600">
                                  👤 Reported by:{" "}
                                </span>
                                <span className="font-medium text-gray-900">
                                  {selectedIncident.reportedBy?.name || "Unknown"}
                                </span>
                                {selectedIncident.reportedBy?.phone && (
                                  <span className="text-gray-500 ml-2">
                                    ({selectedIncident.reportedBy.phone})
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Location */}
                            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-700">
                                  <span className="font-semibold text-gray-600">
                                    📍 Location:{" "}
                                  </span>
                                  <span className="font-mono text-gray-900">
                                    {selectedIncident.location?.coordinates?.[1]?.toFixed(4)}, {selectedIncident.location?.coordinates?.[0]?.toFixed(4)}
                                  </span>
                                </p>
                                <button
                                  onClick={() => {
                                    setMapZoomTarget({
                                      lat: selectedIncident.location.coordinates[1],
                                      lon: selectedIncident.location.coordinates[0]
                                    });
                                    // Reset zoom target after a delay to allow re-triggering
                                    setTimeout(() => setMapZoomTarget(null), 2000);
                                  }}
                                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  See on Map
                                </button>
                              </div>
                            </div>
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

                    <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">

                      {/* LOGIC: Only show Spam/Acknowledge if it is still PENDING */}
                      {selectedIncident.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => rejectIncident(selectedIncident._id)}
                            className="px-4 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-bold rounded-xl transition-all flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            Spam
                          </button>

                          <button
                            onClick={() => acceptIncident(selectedIncident._id)}
                            className="px-4 py-3 border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 text-sm font-bold rounded-xl transition-all flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Acknowledge
                          </button>
                        </>
                      )}

                      {selectedIncident.status === 'Active' && (
                        <button
                          onClick={() => resolveIncident(selectedIncident._id)}
                          className="px-4 py-3 border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-sm font-bold rounded-xl transition-all flex items-center gap-2"
                        >
                          Mark Resolved
                        </button>
                      )}

                      {/* LOGIC: "Activate & Deploy" is always visible (even for Active incidents) */}
                      <button
                        onClick={() => {
                          const recommendations = getResourceRecommendations(selectedIncident.type, selectedIncident.severity);
                          setDispatchResources(recommendations.resources);
                          setStep(1);
                          setShowDispatchModal(true);
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {selectedIncident.status === 'Active' ? 'Dispatch More Units' : 'Activate & Deploy'}
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
        </div >

        {/* Footer */}
        < footer className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white/80 backdrop-blur-sm" >
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
              <span>{pendingIncidents.length} active/pending incidents (all-time)</span>
            </div>
          </div>
        </footer >

        {/* DISPATCH MODAL */}
        {
          showDispatchModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl transition-all max-h-[90vh] overflow-y-auto z-[10000]">
                <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 border-b border-blue-400">
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                    {step === 1
                      ? "🚨 Resource Allocation"
                      : "📡 Select Response Coordinator"}
                  </h2>
                  <p className="text-blue-100 text-sm">
                    {step === 1
                      ? `Deploying resources for ${selectedIncident?.type} (${selectedIncident?.severity} severity)`
                      : `Finding available coordinators near incident location`}
                  </p>
                </div>

                <div className="p-6">
                  {/* STEP 1: RESOURCE ALLOCATION */}
                  {step === 1 && selectedIncident && (
                    <>
                      {/* RECOMMENDATION SUMMARY */}
                      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{getResourceRecommendations(selectedIncident.type, selectedIncident.severity).emoji}</span>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-1">
                              {getResourceRecommendations(selectedIncident.type, selectedIncident.severity).name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              Recommended resources based on incident type and severity level
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {selectedIncident.type}
                              </span>
                              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                {selectedIncident.severity} Severity
                              </span>
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                {dispatchResources.length} Resource Types
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RESOURCE LIST */}
                      <div className="space-y-3 mb-6">
                        <h3 className="font-bold text-gray-900 text-lg">Required Resources</h3>
                        <div className="grid gap-3 max-h-96 overflow-y-auto">
                          {dispatchResources.map((res, index) => (
                            <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-gray-900 text-base">{res.item_name}</span>
                                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                                      {res.category}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-3">{res.description}</p>
                                </div>
                                <button
                                  onClick={() => {
                                    setDispatchResources(dispatchResources.filter((_, i) => i !== index));
                                  }}
                                  className="ml-2 p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>

                              <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-gray-700 min-w-fit">Quantity:</label>
                                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                  <button
                                    onClick={() => {
                                      const updated = [...dispatchResources];
                                      if (updated[index].quantity > 1) {
                                        updated[index].quantity -= 1;
                                        setDispatchResources(updated);
                                      }
                                    }}
                                    className="px-3 py-2 hover:bg-gray-200 text-gray-700 transition-colors"
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    value={res.quantity}
                                    onChange={(e) => {
                                      const updated = [...dispatchResources];
                                      const val = Math.max(1, Number(e.target.value) || 1);
                                      updated[index].quantity = val;
                                      setDispatchResources(updated);
                                    }}
                                    className="w-16 text-center border-none bg-white font-bold text-gray-900 focus:outline-none"
                                    min="1"
                                  />
                                  <button
                                    onClick={() => {
                                      const updated = [...dispatchResources];
                                      updated[index].quantity += 1;
                                      setDispatchResources(updated);
                                    }}
                                    className="px-3 py-2 hover:bg-gray-200 text-gray-700 transition-colors"
                                  >
                                    +
                                  </button>
                                </div>
                                <span className="text-xs text-gray-500 ml-auto">
                                  ≈ {['medical', 'rescue', 'food', 'water'].includes(res.category) ? res.quantity + ' units' : res.quantity + 'x available'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SUMMARY */}
                      <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm">
                        <div className="font-medium text-gray-700 mb-2">Dispatch Summary</div>
                        <ul className="space-y-1 text-gray-600">
                          {dispatchResources.filter(r => r.quantity > 0).map((res, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>{res.item_name}</span>
                              <span className="font-medium">{res.quantity} units</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* ACTION BUTTONS */}
                      <div className="flex justify-between gap-3">
                        <button
                          onClick={() => setShowDispatchModal(false)}
                          className="px-4 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-bold rounded-xl transition-all"
                        >
                          ✕ Cancel
                        </button>
                        <button
                          onClick={fetchCoordinators}
                          disabled={dispatchResources.filter(r => r.quantity > 0).length === 0}
                          className={`px-6 py-3 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${dispatchResources.filter(r => r.quantity > 0).length === 0
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                            }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Find Coordinators →
                        </button>
                      </div>
                    </>
                  )}

                  {/* STEP 2: SELECT COORDINATOR */}
                  {step === 2 && (
                    <>
                      {coordinators.length === 0 ? (
                        <div className="py-12 text-center">
                          <div className="text-5xl mb-4">🔍</div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">No coordinators found</h3>
                          <p className="text-gray-600 mb-6">
                            No emergency coordinators available within the search radius.
                          </p>
                          <button
                            onClick={() => setStep(1)}
                            className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
                          >
                            ← Adjust resources and try again
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-600 mb-4 p-3 bg-blue-50 rounded-lg">
                            Found <span className="font-bold text-blue-700">{coordinators.length}</span> available coordinators near the incident. Select one to dispatch resources.
                          </p>

                          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                            {coordinators.map((coord) => (
                              <div
                                key={coord._id}
                                onClick={() => setSelectedCoordinator(coord)}
                                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedCoordinator?._id === coord._id
                                  ? "border-blue-500 bg-blue-50 shadow-md"
                                  : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                                  }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-bold text-gray-900 text-lg">
                                        {coord.name || "Coordinator"}
                                      </span>
                                      {selectedCoordinator?._id === coord._id && (
                                        <span className="text-green-600 font-bold">✓ Selected</span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <span>📍</span>
                                        <span>{coord.distanceKm ? coord.distanceKm.toFixed(1) : 'N/A'} km away</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <span>📦</span>
                                        <span>{coord.resourceCount || 0} available assets</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between gap-3">
                            <button
                              onClick={() => setStep(1)}
                              className="px-4 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-bold rounded-xl transition-all flex items-center gap-2"
                            >
                              ← Back
                            </button>
                            <button
                              onClick={handleDispatch}
                              disabled={!selectedCoordinator}
                              className={`px-6 py-3 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${!selectedCoordinator
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                                }`}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Send Request
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        }
      </div >
    </div >
  );
};

export default Agency;