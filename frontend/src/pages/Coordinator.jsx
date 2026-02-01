import React, { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { AuthDataContext } from "../context/AuthDataContext";
import {
  Package, Activity, Truck, AlertOctagon, ArrowUpRight,
  MapPin, Clock, ExternalLink, RefreshCw
} from "lucide-react";
import CoordinatorRequests from "../components/CoordinatorRequests";

// --- Dynamic Stat Card Component ---
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

const Coordinator = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const [allResources, setAllResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, available: 0, reserved: 0, deployed: 0, maintenance: 0 });

  // --- Fetch Data ---
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
    } catch (err) {
      console.error("Stats fetch error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Poll every 5s for live updates
    return () => clearInterval(interval);
  }, [serverUrl]);

  // Filter for the bottom list view
  const activeDeployments = allResources.filter(r => r.status === 'Deployed');

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 pb-12 px-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* --- 1. Header Section --- */}
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
            <button
              onClick={fetchStats}
              className="bg-white border border-zinc-200 text-zinc-600 px-4 py-3 rounded-xl font-bold hover:bg-zinc-50 transition-all flex items-center gap-2 shadow-sm"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <Link
              to="/coordinator/manage"
              className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-lg shadow-zinc-200 active:scale-95"
            >
              <Package className="w-5 h-5" /> Manage Inventory
            </Link>
          </div>
        </div>

        {/* --- 2. CRITICAL ALERTS (Top Priority) --- */}
        <div className="space-y-4">
          {/* CoordinatorRequests component handles its own "Empty State", so we just wrap it */}
          <CoordinatorRequests />
        </div>

        {/* --- 3. Live Statistics Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Assets"
            value={stats.total}
            icon={Package}
            color="bg-blue-500"
            subtext="Items in database"
          />
          <StatCard
            title="Ready to Deploy"
            value={stats.available}
            icon={Activity}
            color="bg-emerald-500"
            subtext="Available immediately"
          />
          <StatCard
            title="Active Missions"
            value={stats.deployed}
            icon={Truck}
            color="bg-indigo-500"
            subtext="Currently en route"
          />
          <StatCard
            title="Maintenance"
            value={stats.maintenance}
            icon={AlertOctagon}
            color="bg-amber-500"
            subtext="Unavailable / Repair"
          />
        </div>

        {/* --- 4. Active Field Operations List --- */}
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
                {activeDeployments.map((resource) => (
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
                      <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                        <Clock size={12} />
                        EN ROUTE
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm p-2 bg-zinc-50 rounded-lg">
                        <span className="text-zinc-500">Quantity</span>
                        <span className="font-bold text-zinc-900">{resource.quantity} Units</span>
                      </div>

                      {resource.location && (
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-2 px-1">
                          <MapPin size={12} />
                          <span className="font-mono">
                            {resource.location.coordinates[1].toFixed(4)}, {resource.location.coordinates[0].toFixed(4)}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${resource.location.coordinates[1]},${resource.location.coordinates[0]}`}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-auto text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            Track <ExternalLink size={10} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Coordinator;