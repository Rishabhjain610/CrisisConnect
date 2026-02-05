import React, { useState, useEffect, useContext } from 'react'
import { useSelector } from 'react-redux'
import axios from 'axios'
import {
  Mic, Image as ImageIcon, FileText, MapPin, Clock,
  AlertCircle, CheckCircle2, ArrowRight, Loader2, Calendar, ExternalLink, Truck, X
} from 'lucide-react'
import { AuthDataContext } from '../context/AuthDataContext'
import { Link } from 'react-router-dom'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const defaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = defaultIcon

const truckIcon = new L.DivIcon({
  html: '<div style="background-color:#2563eb; color:white; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.3);">🚑</div>',
  className: 'custom-truck-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
})

const incidentIcon = new L.DivIcon({
  html: '<div style="background-color:#dc2626; color:white; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.3);">🚨</div>',
  className: 'incident-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
})

const CitizenOwn = () => {
  const { userData } = useSelector(state => state.user)
  const { serverUrl } = useContext(AuthDataContext)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTracking, setShowTracking] = useState(false)
  const [trackingIncident, setTrackingIncident] = useState(null)
  const [deployedResources, setDeployedResources] = useState([])
  const [trackingLoading, setTrackingLoading] = useState(false)

  useEffect(() => {
    if (userData?._id) {
      fetchUserIncidents()
    }
  }, [userData?._id])

  useEffect(() => {
    if (!showTracking || !trackingIncident?._id) return

    fetchDeployedResources(trackingIncident._id)
    const interval = setInterval(() => {
      fetchDeployedResources(trackingIncident._id)
    }, 3000)

    return () => clearInterval(interval)
  }, [showTracking, trackingIncident?._id, serverUrl])

  const fetchUserIncidents = async () => {
    try {
      setLoading(true)

      const res = await axios.get(`${serverUrl}/api/incident/list`, {
        withCredentials: true
      })

      if (!res.data.incidents) {
        setIncidents([])
        return
      }

      // Filter for current user
      const myIncidents = res.data.incidents.filter(
        inc => inc.reportedBy?._id === userData?._id
      )

      // Sort by newest first
      const sorted = myIncidents.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )

      setIncidents(sorted)
    } catch (err) {
      console.error('Error fetching user incidents:', err)
      setIncidents([])
    } finally {
      setLoading(false)
    }
  }

  const fetchDeployedResources = async (incidentId) => {
    try {
      setTrackingLoading(true)
      const res = await axios.get(`${serverUrl}/api/resource/incident/${incidentId}/deployed`, {
        withCredentials: true
      })
      setDeployedResources(res.data.resources || [])
    } catch (err) {
      console.error('Error fetching deployed resources:', err)
      setDeployedResources([])
    } finally {
      setTrackingLoading(false)
    }
  }

  const openTracking = (incident) => {
    setTrackingIncident(incident)
    setShowTracking(true)
  }

  // Helper for Severity Color
  const getSeverityStyle = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  }

  // Helper for Status Color
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'active': return 'bg-blue-100 text-blue-700';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const incidentCoords = trackingIncident?.location?.coordinates
  const incidentLatLng = incidentCoords?.length === 2
    ? [incidentCoords[1], incidentCoords[0]]
    : null
  const mapCenter = deployedResources?.[0]?.location?.coordinates?.length === 2
    ? [deployedResources[0].location.coordinates[1], deployedResources[0].location.coordinates[0]]
    : incidentLatLng || [19.0760, 72.8777]

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 pb-12 px-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">My Incident Reports</h1>
            <p className="text-zinc-500 mt-2 text-sm md:text-base">
              Track the status and details of every emergency you've reported.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white px-4 py-2 rounded-xl border border-zinc-200 shadow-sm flex flex-col items-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total</span>
              <span className="text-xl font-bold text-zinc-900">{incidents.length}</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 size={40} className="animate-spin text-blue-500" />
            <p className="text-zinc-400 font-medium">Loading your reports...</p>
          </div>
        ) : incidents.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {incidents.map((incident) => {
              const isVoice = incident.mode === 'VOICE'
              const date = new Date(incident.createdAt).toLocaleDateString(undefined, {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
              })
              const time = new Date(incident.createdAt).toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit'
              })

              return (
                <div
                  key={incident._id}
                  className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow duration-300 overflow-hidden group"
                >
                  {/* Card Header */}
                  <div className="bg-zinc-50/50 p-5 border-b border-zinc-100 flex flex-wrap justify-between items-start gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${isVoice ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                        {isVoice ? <Mic size={20} /> : <ImageIcon size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-zinc-900 text-lg">
                            {isVoice ? "Voice SOS Report" : "Visual Report"}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase border ${getSeverityStyle(incident.severity)}`}>
                            {incident.severity} Priority
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {date}</span>
                          <span className="flex items-center gap-1"><Clock size={12} /> {time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${getStatusStyle(incident.status)}`}>
                        {incident.status === 'Resolved' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {incident.status}
                      </div>
                      {incident.status === 'Active' && (
                        <button
                          onClick={() => openTracking(incident)}
                          className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1"
                        >
                          Track Help <ExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 grid md:grid-cols-3 gap-6">

                    {/* Left: Description/Transcript */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                          <FileText size={12} />
                          {isVoice ? "Transcript Analysis" : "Visual Analysis"}
                        </h4>
                        <p className="text-zinc-700 text-sm leading-relaxed bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                          {incident.description || incident.transcript || "No details available."}
                        </p>
                      </div>
                    </div>

                    {/* Right: Location & Meta */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <MapPin size={12} /> Location
                        </h4>
                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                          <p className="text-blue-900 font-mono text-xs font-bold">
                            {incident.location?.coordinates[1].toFixed(5)}, <br />
                            {incident.location?.coordinates[0].toFixed(5)}
                          </p>
                        </div>
                      </div>

                      {/* Image Thumbnail (if available) */}
                      {incident.imageUrl && (
                        <div className="relative group/img overflow-hidden rounded-xl border border-zinc-200 h-32 w-full">
                          <img
                            src={incident.imageUrl}
                            alt="Report Evidence"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover/img:bg-transparent transition-colors" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-24 bg-white rounded-3xl border border-zinc-200 shadow-sm">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-100">
              <FileText className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-zinc-900 text-xl font-bold mb-2">No Reports Found</h3>
            <p className="text-zinc-500 text-sm max-w-md mx-auto mb-8">
              You haven't submitted any SOS reports yet. If you are in an emergency, use the Report button below.
            </p>
            <Link to="/sos" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-200">
              Create New Report <ArrowRight size={18} />
            </Link>
          </div>
        )}

        {showTracking && trackingIncident && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <div>
                  <h3 className="font-bold text-lg text-zinc-900 flex items-center gap-2">
                    <Truck size={18} className="text-blue-600" />
                    Track Help: Incident #{trackingIncident._id.slice(-4).toUpperCase()}
                  </h3>
                  <p className="text-xs text-zinc-500">Live location of deployed units</p>
                </div>
                <button onClick={() => setShowTracking(false)} className="p-2 bg-white rounded-full hover:bg-zinc-100 transition-colors">
                  <X size={18} className="text-zinc-500" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
                <div className="lg:col-span-2 h-[380px] w-full rounded-2xl overflow-hidden border border-zinc-200">
                  <MapContainer
                    center={mapCenter}
                    zoom={14}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {incidentLatLng && (
                      <Marker position={incidentLatLng} icon={incidentIcon}>
                        <Popup>Incident Location</Popup>
                      </Marker>
                    )}

                    {deployedResources.map((res) => {
                      if (!res.location?.coordinates?.length) return null
                      const resLat = res.location.coordinates[1]
                      const resLng = res.location.coordinates[0]
                      const arrived = incidentLatLng
                        ? calculateDistance(resLat, resLng, incidentLatLng[0], incidentLatLng[1]) < 0.1
                        : false

                      return (
                        <Marker
                          key={res._id}
                          position={[resLat, resLng]}
                          icon={truckIcon}
                        >
                          <Popup>
                            <div className="text-center">
                              <strong>{res.item_name}</strong><br />
                              Qty: {res.quantity}<br />
                              <span className={arrived ? 'text-green-600 font-bold' : 'text-blue-600 font-bold'}>
                                {arrived ? 'ON SCENE' : 'En Route'}
                              </span>
                            </div>
                          </Popup>
                        </Marker>
                      )
                    })}
                  </MapContainer>
                </div>

                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 h-[380px] overflow-y-auto">
                  <h4 className="text-sm font-bold text-zinc-900 mb-3">Deployed Units</h4>

                  {trackingLoading && deployedResources.length === 0 ? (
                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                      <Loader2 size={16} className="animate-spin" /> Loading live units...
                    </div>
                  ) : deployedResources.length === 0 ? (
                    <div className="text-zinc-500 text-sm">
                      No units have been deployed yet. You will see updates here soon.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deployedResources.map((res) => {
                        const resLat = res.location?.coordinates?.[1]
                        const resLng = res.location?.coordinates?.[0]
                        const arrived = incidentLatLng && resLat && resLng
                          ? calculateDistance(resLat, resLng, incidentLatLng[0], incidentLatLng[1]) < 0.1
                          : false

                        return (
                          <div key={res._id} className="bg-white border border-zinc-200 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-zinc-900 text-sm">{res.item_name}</p>
                                <p className="text-xs text-zinc-500">{res.category} • {res.quantity} units</p>
                              </div>
                              <span className={`text-xs font-bold px-2 py-1 rounded-full ${arrived ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {arrived ? 'ON SCENE' : 'EN ROUTE'}
                              </span>
                            </div>
                            {resLat && resLng && (
                              <div className="text-[11px] text-zinc-400 font-mono mt-2">
                                {resLat.toFixed(4)}, {resLng.toFixed(4)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CitizenOwn