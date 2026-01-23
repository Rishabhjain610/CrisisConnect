import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AuthDataContext } from "../context/AuthDataContext";
import { MapPin, Truck, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";

const CoordinatorRequests = () => {
    const { serverUrl } = useContext(AuthDataContext);
    const [activeMissions, setActiveMissions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchActiveMissions = async () => {
        try {
            const res = await axios.get(`${serverUrl}/api/resource/my-list`, { withCredentials: true });
            // Filter resources that are marked as 'Reserved' (Dispatched)
            const reserved = res.data.resources.filter(r => r.status === 'Reserved');
            setActiveMissions(reserved);
        } catch (err) {
            console.error("Error fetching missions:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveMissions();
        const interval = setInterval(fetchActiveMissions, 5000); // Poll every 5s for faster updates
        return () => clearInterval(interval);
    }, [serverUrl]);

    // 🔥 THE CONNECTED FUNCTION
    const markEnRoute = async (resource) => {
        try {
            // Update status to 'Maintenance' (Simulating it's busy/deployed)
            await axios.patch(
                `${serverUrl}/api/resource/update/${resource._id}`,
                { status: "Deployed" },
                { withCredentials: true }
            );

            toast.success(`✅ ${resource.item_name} deployed successfully!`);

            // Immediate refresh so the Red Card disappears instantly
            fetchActiveMissions();

        } catch (err) {
            console.error(err);
            toast.error("Failed to deploy resource");
        }
    };

    if (loading) return <div className="animate-pulse h-32 bg-zinc-100 rounded-xl"></div>;

    if (activeMissions.length === 0) {
        return (
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center shadow-sm">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">All Systems Normal</h3>
                <p className="text-zinc-500 mt-2">No active dispatch requests at this moment.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Live Dispatch Requests
            </h2>

            {activeMissions.map((mission) => (
                <div key={mission._id} className="relative overflow-hidden bg-white border border-red-100 rounded-2xl p-6 shadow-lg shadow-red-500/5">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <AlertTriangle size={100} className="text-red-500" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-red-100">
                                    Critical Dispatch
                                </span>
                                <span className="text-zinc-500 text-sm flex items-center gap-1">
                                    <Truck size={14} /> Unit Dispatched
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold text-zinc-900 mb-1">{mission.item_name}</h3>
                            <p className="text-zinc-500 flex items-center gap-2">
                                <MapPin size={16} className="text-red-500" />
                                Deployed to Incident Location
                            </p>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto">
                            {/* 🔥 CONNECTED BUTTON */}
                            <button
                                onClick={() => markEnRoute(mission)}
                                className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-md shadow-red-500/20 active:scale-95"
                            >
                                Confirm Deployment <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CoordinatorRequests;