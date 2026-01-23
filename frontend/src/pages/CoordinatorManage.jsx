import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthDataContext } from "../context/AuthDataContext";
import { toast } from "react-toastify";
import {
    Plus, MapPin, Trash2, Loader2,
    Leaf, Cross, Tent, Shield, Box, MoreHorizontal
} from "lucide-react";

const CATEGORIES = [
    { name: "Food", icon: Leaf, color: "text-green-600 bg-green-100" },
    { name: "Medical", icon: Cross, color: "text-red-600 bg-red-100" },
    { name: "Shelter", icon: Tent, color: "text-amber-600 bg-amber-100" },
    { name: "Rescue", icon: Shield, color: "text-blue-600 bg-blue-100" },
    { name: "Equipment", icon: Box, color: "text-purple-600 bg-purple-100" }
];

const CoordinatorManage = () => {
    const { serverUrl } = useContext(AuthDataContext);
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        item_name: "",
        quantity: "",
        category: "Food",
        latitude: "",
        longitude: "",
        status: "Available"
    });

    useEffect(() => {
        fetchResources();
    }, [serverUrl]);

    const fetchResources = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${serverUrl}/api/resource/my-list`, { withCredentials: true });
            setResources(res.data.resources);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load inventory");
        } finally {
            setLoading(false);
        }
    };

    const getLocation = () => {
        if (navigator.geolocation) {
            toast.info("📍 Fetching GPS location...");
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setFormData(prev => ({
                        ...prev,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    }));
                    toast.success("Location acquired!");
                },
                () => toast.error("Location access denied")
            );
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            await axios.post(`${serverUrl}/api/resource/create`, formData, { withCredentials: true });
            toast.success("Resource added successfully");
            setIsModalOpen(false);
            setFormData({ item_name: "", quantity: "", category: "Food", latitude: "", longitude: "", status: "Available" });
            fetchResources();
        } catch (err) {
            toast.error("Failed to add resource");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this resource?")) return;
        try {
            await axios.delete(`${serverUrl}/api/resource/delete/${id}`, { withCredentials: true });
            setResources(prev => prev.filter(r => r._id !== id));
            toast.success("Resource deleted");
        } catch (err) {
            toast.error("Delete failed");
        }
    };

    const toggleStatus = async (res) => {
        const newStatus = res.status === "Available" ? "Maintenance" : "Available";
        try {
            await axios.patch(`${serverUrl}/api/resource/update/${res._id}`, { status: newStatus }, { withCredentials: true });
            fetchResources();
            toast.success(`Status updated to ${newStatus}`);
        } catch (err) {
            toast.error("Update failed");
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50/50 pt-20 pb-12 px-6">
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 pb-6 border-b border-zinc-200">
                    <div>
                        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Inventory</h1>
                        <p className="text-zinc-500 mt-2">Manage your relief supplies and assets.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-zinc-200 active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> Add Resource
                    </button>
                </div>

                {/* Content Grid */}
                {loading ? (
                    <div className="flex justify-center py-32"><Loader2 className="w-10 h-10 animate-spin text-zinc-300" /></div>
                ) : resources.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-zinc-200 p-16 text-center shadow-sm">
                        <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Box className="w-10 h-10 text-zinc-300" />
                        </div>
                        <h3 className="text-2xl font-bold text-zinc-900 mb-2">Inventory is empty</h3>
                        <p className="text-zinc-500 max-w-md mx-auto mb-8">
                            You haven't added any resources yet. Add ambulances, food supplies, or equipment to make them available for dispatch.
                        </p>
                        <button onClick={() => setIsModalOpen(true)} className="text-blue-600 font-bold hover:underline">
                            + Add your first item
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {resources.map((res) => {
                            const CatIcon = CATEGORIES.find(c => c.name === res.category)?.icon || Box;
                            const catColor = CATEGORIES.find(c => c.name === res.category)?.color || 'bg-zinc-100 text-zinc-600';

                            return (
                                <div key={res._id} className="group bg-white hover:bg-white/80 p-6 rounded-3xl border border-zinc-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 relative">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`p-3 rounded-2xl ${catColor}`}>
                                            <CatIcon size={24} />
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${res.status === 'Available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                            res.status === 'Reserved' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 animate-pulse' :
                                                // 👇 ADD THIS LINE for the Blue/Indigo "Deployed" badge
                                                res.status === 'Deployed' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' :
                                                    'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                                            }`}>
                                            {res.status}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-zinc-900 mb-1">{res.item_name}</h3>
                                    <p className="text-zinc-500 text-sm mb-6">{res.category} • {res.quantity} Units</p>

                                    <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
                                        <button onClick={() => toggleStatus(res)} className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">
                                            {res.status === 'Available' ? 'Disable' : 'Enable'}
                                        </button>
                                        <button onClick={() => handleDelete(res._id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal - Modernized */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-zinc-900">Add Resource</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition"><Cross className="rotate-45 w-6 h-6 text-zinc-400" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Item Name</label>
                                    <input required className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition" value={formData.item_name} onChange={e => setFormData({ ...formData, item_name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Category</label>
                                    <select className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                        {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Quantity</label>
                                <input type="number" required className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                            </div>

                            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                                <div className="flex justify-between mb-3">
                                    <label className="text-sm text-blue-900 font-bold">GPS Location</label>
                                    <button type="button" onClick={getLocation} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold flex gap-1 items-center transition"><MapPin size={12} /> Auto-Detect</button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="number" placeholder="Lat" className="bg-white border-none rounded-xl p-2.5 text-sm shadow-sm" value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} />
                                    <input type="number" placeholder="Lng" className="bg-white border-none rounded-xl p-2.5 text-sm shadow-sm" value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-white border border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50 transition">Cancel</button>
                                <button type="submit" disabled={submitLoading} className="flex-1 py-3.5 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition flex justify-center items-center gap-2">
                                    {submitLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Save Asset"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoordinatorManage;