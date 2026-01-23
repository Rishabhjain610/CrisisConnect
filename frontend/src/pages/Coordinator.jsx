import React, { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { AuthDataContext } from "../context/AuthDataContext";
import {
  Package, Activity, Truck, AlertOctagon, Box, ArrowUpRight,
  ShieldCheck, MapPin, Clock
} from "lucide-react";
import CoordinatorRequests from "../components/CoordinatorRequests";

// Modern Stat Card
const StatCard = ({ title, value, icon: Icon, color, subtext, trend }) => (
  <div className="bg-white/70 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3.5 rounded-2xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-6 h-6 ${color.replace("bg-", "text-")}`} />
      </div>
      {trend && (
        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
          <ArrowUpRight size={12} /> {trend}
        </span>
      )}
    </div>
    <div>
      <h3 className="text-zinc-500 text-sm font-medium mb-1">{title}</h3>
      <p className="text-4xl font-bold text-zinc-900 tracking-tight">{value}</p>
      {subtext && <p className="text-xs text-zinc-400 mt-2 font-medium">{subtext}</p>}
    </div>
  </div>
);

const Coordinator = () => {
  const { serverUrl } = useContext(AuthDataContext);
  // Store full list of resources to render the bottom list
  const [allResources, setAllResources] = useState([]);
  const [stats, setStats] = useState({ total: 0, available: 0, reserved: 0, deployed: 0, maintenance: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${serverUrl}/api/resource/my-list`, { withCredentials: true });
        const data = res.data.resources;

        setAllResources(data); // Save full list for the "Active Deployments" section

        setStats({
          total: data.length,
          available: data.filter(r => r.status === 'Available').length,
          reserved: data.filter(r => r.status === 'Reserved').length,
          deployed: data.filter(r => r.status === 'Deployed').length,
          maintenance: data.filter(r => r.status === 'Maintenance').length,
        });
      } catch (err) {
        console.error("Stats fetch error:", err);
      }
    };

    fetchStats();
    // Optional: Poll every 5s to keep stats synced
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [serverUrl]);

  // Filter for the list view
  const activeDeployments = allResources.filter(r => r.status === 'Deployed');

  return (
    <div className="min-h-screen bg-zinc-50/50 pt-20 pb-12 px-6">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">

        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-2">Coordinator Command</h1>
            <p className="text-zinc-500 text-lg">Overview of logistics, assets, and active deployments.</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/coordinator/manage"
              className="bg-zinc-900 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-xl shadow-zinc-200 active:scale-95"
            >
              <Package className="w-5 h-5" /> Manage Inventory
            </Link>
          </div>
        </div>

        {/* Live Alerts Section */}
        <div className="bg-white/40 backdrop-blur-md rounded-3xl p-1 border border-white/50">
          <CoordinatorRequests />
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Assets"
            value={stats.total}
            icon={Box}
            color="bg-blue-500"
            subtext="Registered in database"
          />
          <StatCard
            title="Ready to Deploy"
            value={stats.available}
            icon={Activity}
            color="bg-emerald-500"
            subtext="Available for immediate dispatch"
          />
          <StatCard
            title="Active Missions"
            // 👇 FIXED: Was pointing to stats.reserved, now points to stats.deployed
            value={stats.deployed}
            icon={Truck}
            color="bg-indigo-500"
            subtext="Currently deployed on field"
          />
          <StatCard
            title="Maintenance"
            value={stats.maintenance}
            icon={AlertOctagon}
            color="bg-amber-500"
            subtext="Unavailable / Under repair"
          />
        </div>

        {/* 🔥 NEW SECTION: Active Deployments List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <Truck className="text-indigo-600" /> Live Field Operations
            </h2>

            {activeDeployments.length === 0 ? (
              <div className="bg-white/60 border border-zinc-200 rounded-3xl p-12 text-center">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
                  <Truck size={32} />
                </div>
                <h3 className="text-lg font-bold text-zinc-900">No Active Deployments</h3>
                <p className="text-zinc-500">All assets are currently in storage or maintenance.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeDeployments.map((resource) => (
                  <div key={resource._id} className="bg-white border border-indigo-100 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Truck size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg text-zinc-900">{resource.item_name}</h3>
                          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                            En Route
                          </span>
                        </div>
                        <p className="text-sm text-zinc-500 flex items-center gap-4">
                          <span className="flex items-center gap-1"><Package size={14} /> {resource.quantity} Units</span>
                          <span className="flex items-center gap-1"><MapPin size={14} /> {resource.location?.coordinates[1].toFixed(4)}, {resource.location?.coordinates[0].toFixed(4)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="w-full md:w-auto pl-14 md:pl-0">
                      <div className="text-xs text-zinc-400 font-mono mb-1">DEPLOYED AT</div>
                      <div className="flex items-center gap-1 text-sm font-semibold text-zinc-700">
                        <Clock size={14} />
                        {new Date(resource.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Status Card (Existing) */}
          <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white flex flex-col justify-between shadow-2xl shadow-zinc-500/20 h-fit">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>

            <div className="mb-8">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_#4ade80]"></div>
                System Online
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Your inventory is synchronized. Agency Commanders can view your real-time asset locations.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                <span className="text-zinc-400">Connection</span>
                <span className="font-mono text-emerald-400">Secure (TLS)</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Sync Rate</span>
                <span className="font-mono text-blue-400">24ms</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Coordinator;