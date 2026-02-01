import React, { useState, useEffect, useContext } from 'react'
import { useSelector } from 'react-redux'
import axios from 'axios'
import {
  Mic, Image as ImageIcon, FileText, MapPin, Clock,
  AlertCircle, CheckCircle2, ArrowRight, Loader2, Calendar
} from 'lucide-react'
import { AuthDataContext } from '../context/AuthDataContext'
import { Link } from 'react-router-dom'

const CitizenOwn = () => {
  const { userData } = useSelector(state => state.user)
  const { serverUrl } = useContext(AuthDataContext)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userData?._id) {
      fetchUserIncidents()
    }
  }, [userData?._id])

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

                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${getStatusStyle(incident.status)}`}>
                      {incident.status === 'Resolved' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      {incident.status}
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
      </div>
    </div>
  )
}

export default CitizenOwn