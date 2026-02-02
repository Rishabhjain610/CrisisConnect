import React, { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { AuthDataContext } from "../context/AuthDataContext";
import {
  Package, Activity, Truck, AlertOctagon, ArrowUpRight,
  MapPin, Clock, ExternalLink, RefreshCw, X, CheckCircle2
} from "lucide-react";
import CoordinatorRequests from "../components/CoordinatorRequests";

// --- Leaflet Imports ---
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet Icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Truck Icon
const truckIcon = new L.DivIcon({
  html: `<div style="background-color:blue; color:white; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.3);">🚚</div>`,
  className: "custom-truck-icon",
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

// --- HELPER: Calculate Distance (Haversine) ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in KM
};

const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
  <div className="bg-white border border-zinc-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex items-start justify-between group">
    <div>
      <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
      <p className="text-3xl font-extrabold text-zinc-900 tracking-tight mt-1">{value}</p>
      {subtext && <p className="text-xs text-zinc-400 mt-2 font-medium">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform`}>
      <Icon className={`w-6 h-6 ${color.replace("bg-", "text-")}`} />
    </div>
  </div>
);

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 15);
  }, [center, map]);
  return null;
}

const Coordinator = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const [allResources, setAllResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, available: 0, reserved: 0, deployed: 0, maintenance: 0 });

  const [showMap, setShowMap] = useState(false);
  const [trackingResource, setTrackingResource] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/resource/my-list`, { withCredentials: true });
      const data = res.data.resources;

      setAllResources(data);
      setStats({
        total: data.length,
        available: data.filter(r => r.status === 'Available').length,
        reserved: data.filter(r => r.status === 'Reserved').length,
        deployed: data.filter(r => r.status === 'Deployed').length,
        maintenance: data.filter(r => r.status === 'Maintenance').length,
      });
      setLoading(false);

      if (showMap && trackingResource) {
        const updated = data.find(r => r._id === trackingResource._id);
        if (updated) setTrackingResource(updated);
      }

    } catch (err) {
      console.error("Stats fetch error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, [serverUrl, showMap, trackingResource]);

  const openTracking = (resource) => {
    setTrackingResource(resource);
    setShowMap(true);
  };

  const activeDeployments = allResources.filter(r => r.status === 'Deployed');

  // --- LOGIC: Check Arrival ---
  const checkArrival = (resource) => {
    if (!resource.current_incident?.location) return false;
    const dist = calculateDistance(
      resource.location.coordinates[1], resource.location.coordinates[0],
      resource.current_incident.location.coordinates[1], resource.current_incident.location.coordinates[0]
    );
    return dist < 0.1; // Arrived if < 100 meters
  };

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 pb-12 px-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* --- 1. Header --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-bold text-green-600 uppercase tracking-wide">Live Operations Center</span>
            </div>
            <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Coordinator Command</h1>
            <p className="text-zinc-500 mt-2 text-sm max-w-lg">
              Monitor active missions, approve resource requests, and manage your logistics inventory in real-time.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchStats} className="bg-white border border-zinc-200 text-zinc-600 px-4 py-3 rounded-xl font-bold hover:bg-zinc-50 transition-all shadow-sm">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <Link to="/coordinator/manage" className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-lg shadow-zinc-200 active:scale-95">
              <Package className="w-5 h-5" /> Manage Inventory
            </Link>
          </div>
        </div>

        {/* --- 2. Alerts --- */}
        <div className="space-y-4">
          <CoordinatorRequests />
        </div>

        {/* --- 3. Stats --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Assets" value={stats.total} icon={Package} color="bg-blue-500" subtext="Items in database" />
          <StatCard title="Ready to Deploy" value={stats.available} icon={Activity} color="bg-emerald-500" subtext="Available immediately" />
          <StatCard title="Active Missions" value={stats.deployed} icon={Truck} color="bg-indigo-500" subtext="Currently en route" />
          <StatCard title="Maintenance" value={stats.maintenance} icon={AlertOctagon} color="bg-amber-500" subtext="Unavailable / Repair" />
        </div>

        {/* --- 4. Live Field Operations --- */}
        <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Truck size={20} className="text-indigo-600" />
              Live Field Operations
            </h2>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-md">
              {activeDeployments.length} Active
            </span>
          </div>

          <div className="p-2">
            {activeDeployments.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100">
                  <Truck size={24} className="text-zinc-300" />
                </div>
                <h3 className="text-zinc-900 font-bold">No Active Deployments</h3>
                <p className="text-zinc-500 text-sm mt-1">All resources are currently at base.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-2">
                {activeDeployments.map((resource) => {
                  const hasArrived = checkArrival(resource);
                  return (
                    <div key={resource._id} className="group bg-white border border-zinc-200 hover:border-indigo-300 p-5 rounded-2xl transition-all hover:shadow-md">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Truck size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-zinc-900">{resource.item_name}</h3>
                            <p className="text-xs text-zinc-500 font-medium uppercase">{resource.category}</p>
                          </div>
                        </div>
                        {hasArrived ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                            <CheckCircle2 size={12} /> ON SCENE
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg animate-pulse">
                            <Clock size={12} /> EN ROUTE
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm p-2 bg-zinc-50 rounded-lg">
                          <span className="text-zinc-500">Quantity</span>
                          <span className="font-bold text-zinc-900">{resource.quantity} Units</span>
                        </div>

                        {resource.location && (
                          <div className="flex items-center justify-between text-xs text-zinc-400 mt-2 px-1">
                            <div className="flex items-center gap-1">
                              <MapPin size={12} />
                              <span className="font-mono">
                                {resource.location.coordinates[1].toFixed(4)}, {resource.location.coordinates[0].toFixed(4)}
                              </span>
                            </div>
                            <button
                              onClick={() => openTracking(resource)}
                              className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline"
                            >
                              Track Live <ExternalLink size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* --- 5. LIVE TRACKING MODAL --- */}
        {showMap && trackingResource && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <div>
                  <h3 className="font-bold text-lg text-zinc-900 flex items-center gap-2">
                    {checkArrival(trackingResource) ? (
                      <span className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 size={20} /> Arrived at Scene
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="animate-pulse w-3 h-3 bg-red-500 rounded-full"></span>
                        Live Tracking: {trackingResource.item_name}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Unit ID: {trackingResource._id.slice(-6).toUpperCase()}
                  </p>
                </div>
                <button onClick={() => setShowMap(false)} className="p-2 bg-white rounded-full hover:bg-zinc-100 transition-colors">
                  <X size={20} className="text-zinc-500" />
                </button>
              </div>

              <div className="h-[400px] w-full relative">
                <MapContainer
                  center={[trackingResource.location.coordinates[1], trackingResource.location.coordinates[0]]}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <ChangeView center={[trackingResource.location.coordinates[1], trackingResource.location.coordinates[0]]} />

                  {/* Moving Truck Marker */}
                  <Marker
                    position={[trackingResource.location.coordinates[1], trackingResource.location.coordinates[0]]}
                    icon={truckIcon}
                  >
                    <Popup>
                      <div className="text-center">
                        <strong>{trackingResource.item_name}</strong><br />
                        Qty: {trackingResource.quantity}<br />
                        <span className={checkArrival(trackingResource) ? "text-green-600 font-bold" : "text-blue-600 font-bold"}>
                          {checkArrival(trackingResource) ? "ON SCENE" : "En Route"}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>

                {/* Overlay Stats */}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg border border-zinc-200 z-[1000] text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-zinc-700">Current Position:</span>
                    <span className="font-mono">{trackingResource.location.coordinates[1].toFixed(5)}, {trackingResource.location.coordinates[0].toFixed(5)}</span>

                    {checkArrival(trackingResource) ? (
                      <span className="text-green-600 font-extrabold mt-1 flex items-center gap-1">
                        <CheckCircle2 size={12} /> REACHED DESTINATION
                      </span>
                    ) : (
                      <span className="text-blue-600 font-bold mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span> Updating Live...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Coordinator;