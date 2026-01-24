import React, { useState, useEffect, useContext } from 'react'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { Mic, Image as ImageIcon, FileText, Zap, MapPin, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { AuthDataContext } from '../context/AuthDataContext'

const CitizenOwn = () => {
  const { userData } = useSelector(state => state.user)
  const { serverUrl } = useContext(AuthDataContext)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [groupedByLocation, setGroupedByLocation] = useState([])

  useEffect(() => {
    fetchUserIncidents()
  }, [userData?._id])

  const fetchUserIncidents = async () => {
    try {
      setLoading(true)
      
      const res = await axios.get(`${serverUrl}/api/incident/list`, {
        withCredentials: true
      })

      if (!res.data.incidents) {
        setIncidents([])
        setLoading(false)
        return
      }

      const myIncidents = res.data.incidents.filter(
        inc => inc.reportedBy?._id === userData?._id
      )

      const sorted = myIncidents.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )

      setIncidents(sorted)
      groupIncidentsByLocation(sorted)
    } catch (err) {
      console.error('Error fetching user incidents:', err)
      setIncidents([])
      setGroupedByLocation([])
    } finally {
      setLoading(false)
    }
  }

  const groupIncidentsByLocation = (incidents) => {
    const grouped = {}

    incidents.forEach(inc => {
      const lat = inc.location?.coordinates?.[1]
      const lon = inc.location?.coordinates?.[0]
      
      if (!lat || !lon) return

      const key = `${lat.toFixed(4)}-${lon.toFixed(4)}`

      if (!grouped[key]) {
        grouped[key] = {
          location: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
          coords: [lat, lon],
          incidents: [],
          methods: {
            voice: 0,
            imageText: 0,
          },
          avgTrustScore: 0,
          highestSeverity: 'Low',
        }
      }

      grouped[key].incidents.push(inc)

      if (inc.mode === 'VOICE') grouped[key].methods.voice++
      if (inc.mode === 'IMAGE_TEXT') grouped[key].methods.imageText++

      const severityLevel = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 }
      if (severityLevel[inc.severity] > severityLevel[grouped[key].highestSeverity]) {
        grouped[key].highestSeverity = inc.severity
      }
    })

    Object.values(grouped).forEach(group => {
      const total = group.incidents.reduce((sum, inc) => sum + inc.trustScore, 0)
      group.avgTrustScore = Math.round(total / group.incidents.length)
    })

    setGroupedByLocation(Object.values(grouped))
  }

  const getMethodInfo = (mode) => {
    switch(mode) {
      case 'VOICE':
        return {
          label: '🎤 Voice',
          color: 'bg-orange-100 text-orange-700',
        }
      case 'IMAGE_TEXT':
        return {
          label: '📸📝 Image + Text',
          color: 'bg-purple-100 text-purple-700',
        }
      default:
        return {
          label: '📋 Unknown',
          color: 'bg-gray-100 text-gray-700',
        }
    }
  }

  const getTrustScoreColor = (score) => {
    if (score >= 85) return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Verified', textBg: 'text-emerald-600' }
    if (score >= 70) return { bg: 'bg-green-100', text: 'text-green-700', label: 'Excellent', textBg: 'text-green-600' }
    if (score >= 50) return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Good', textBg: 'text-blue-600' }
    if (score >= 30) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Fair', textBg: 'text-amber-600' }
    return { bg: 'bg-red-100', text: 'text-red-700', label: 'Low', textBg: 'text-red-600' }
  }

  const getSeverityInfo = (severity) => {
    switch(severity) {
      case 'Critical':
        return { bg: 'bg-red-100', text: 'text-red-700', emoji: '🚨' }
      case 'High':
        return { bg: 'bg-orange-100', text: 'text-orange-700', emoji: '⚠️' }
      case 'Medium':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', emoji: '⚡' }
      case 'Low':
        return { bg: 'bg-green-100', text: 'text-green-700', emoji: '✓' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', emoji: '◯' }
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active':
        return { bg: 'bg-green-100', text: 'text-green-700', emoji: '🔴', label: 'Active' }
      case 'Pending':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', emoji: '⏳', label: 'Pending' }
      case 'Resolved':
        return { bg: 'bg-blue-100', text: 'text-blue-700', emoji: '✅', label: 'Resolved' }
      case 'Spam':
        return { bg: 'bg-red-100', text: 'text-red-700', emoji: '🚫', label: 'Spam' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', emoji: '◯', label: 'Unknown' }
    }
  }

  const formatTimeAgo = (date) => {
    const now = Date.now()
    const diff = now - new Date(date).getTime()
    
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    
    return new Date(date).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-4 mx-auto"></div>
          <p className="text-gray-600 text-lg font-medium">Loading your incidents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ========== HEADER ========== */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                My SOS Reports
              </h1>
              <p className="text-gray-600 mt-2">
                View all your crisis reports organized by location
              </p>
            </div>
            <div className="text-right bg-white/80 backdrop-blur rounded-2xl border border-gray-200 px-8 py-6 shadow-sm">
              <p className="text-5xl font-bold text-gray-900">{incidents.length}</p>
              <p className="text-gray-600 text-sm mt-1 font-semibold">Reports Filed</p>
            </div>
          </div>
        </div>

        {/* ========== INCIDENTS GROUPED BY LOCATION ========== */}
        {groupedByLocation.length > 0 ? (
          <div className="space-y-8">
            {groupedByLocation.map((group, groupIdx) => {
              const hasMultipleMethods = group.methods.voice > 0 && group.methods.imageText > 0
              const avgScoreColor = getTrustScoreColor(group.avgTrustScore)
              const severityInfo = getSeverityInfo(group.highestSeverity)

              return (
                <div 
                  key={groupIdx} 
                  className="bg-white/80 backdrop-blur rounded-3xl border border-gray-200 overflow-hidden shadow-md hover:shadow-xl hover:border-blue-300 transition-all duration-300"
                >
                  
                  {/* ========== LOCATION HEADER ========== */}
                  <div className="bg-gradient-to-r from-blue-50 via-blue-100/50 to-purple-50 px-8 py-8 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold text-gray-900">Location Report</h2>
                          <p className="text-gray-600 text-sm mt-1 font-mono">{group.location}</p>
                        </div>
                      </div>
                      <div className={`text-center px-8 py-4 rounded-2xl bg-white ${avgScoreColor.bg} border border-gray-200 shadow-sm`}>
                        <p className={`text-4xl font-bold ${avgScoreColor.textBg}`}>
                          {group.avgTrustScore}%
                        </p>
                        <p className={`text-xs font-bold ${avgScoreColor.text} uppercase tracking-wider mt-2`}>
                          {avgScoreColor.label}
                        </p>
                      </div>
                    </div>

                    {/* ========== METHOD MIX ========== */}
                    <div className="flex flex-wrap gap-3 items-center">
                      {group.methods.imageText > 0 && (
                        <div className="inline-flex items-center gap-2 bg-white/80 text-purple-700 px-4 py-2 rounded-xl font-bold border border-purple-200 shadow-sm">
                          <ImageIcon size={18} />
                          {group.methods.imageText} Image+Text
                        </div>
                      )}
                      {group.methods.voice > 0 && (
                        <div className="inline-flex items-center gap-2 bg-white/80 text-orange-700 px-4 py-2 rounded-xl font-bold border border-orange-200 shadow-sm">
                          <Mic size={18} />
                          {group.methods.voice} Voice
                        </div>
                      )}
                      
                      {/* Highest Severity Badge */}
                      <div className={`inline-flex items-center gap-2 ${severityInfo.bg} ${severityInfo.text} px-4 py-2 rounded-xl font-bold ml-auto border border-current border-opacity-30`}>
                        <span className="text-lg">{severityInfo.emoji}</span>
                        {group.highestSeverity} Severity
                      </div>

                      {hasMultipleMethods && (
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-4 py-2 rounded-xl font-bold border border-green-300 shadow-sm">
                          <Zap size={18} />
                          Mixed Methods ⚡
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ========== INDIVIDUAL INCIDENTS ========== */}
                  <div className="divide-y divide-gray-100">
                    {group.incidents.map((incident, incIdx) => {
                      const methodInfo = getMethodInfo(incident.mode)
                      const scoreInfo = getTrustScoreColor(incident.trustScore)
                      const statusInfo = getStatusColor(incident.status)
                      const incidentSeverityInfo = getSeverityInfo(incident.severity)

                      return (
                        <div key={incIdx} className="p-8 hover:bg-blue-50/30 transition-all duration-200 group">
                          
                          {/* ========== TOP ROW ========== */}
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition">
                                  {incident.type}
                                </h3>
                                <span className={`px-4 py-2 rounded-xl text-sm font-bold ${methodInfo.color} border border-current border-opacity-30 shadow-sm`}>
                                  {methodInfo.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-gray-600 text-sm">
                                <Clock size={16} className="text-blue-600" />
                                <span className="font-semibold">{formatTimeAgo(incident.createdAt)}</span>
                                <span className="text-gray-400">•</span>
                                <span>{new Date(incident.createdAt).toLocaleString()}</span>
                              </div>
                            </div>

                            {/* ========== TRUST SCORE BADGE ========== */}
                            <div className={`text-center px-8 py-6 rounded-2xl ${scoreInfo.bg} border border-current border-opacity-30 shadow-md group-hover:shadow-lg transition-all`}>
                              <p className={`text-5xl font-bold ${scoreInfo.textBg}`}>
                                {incident.trustScore}%
                              </p>
                              <p className={`text-xs font-semibold ${scoreInfo.text} mt-2 uppercase tracking-wide`}>
                                {scoreInfo.label}
                              </p>
                            </div>
                          </div>

                          {/* ========== DETAILS GRID ========== */}
                          <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-100">
                            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
                              <p className="text-xs text-gray-600 font-bold uppercase tracking-wide mb-2">Severity</p>
                              <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold ${incidentSeverityInfo.bg} ${incidentSeverityInfo.text}`}>
                                {incidentSeverityInfo.emoji} {incident.severity}
                              </span>
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                              <p className="text-xs text-gray-600 font-bold uppercase tracking-wide mb-2">Status</p>
                              <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold ${statusInfo.bg} ${statusInfo.text}`}>
                                {statusInfo.emoji} {statusInfo.label}
                              </span>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                              <p className="text-xs text-gray-600 font-bold uppercase tracking-wide mb-2">Method</p>
                              <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold ${methodInfo.color}`}>
                                {incident.mode === 'VOICE' ? '🎤' : '📸📝'} {incident.mode === 'VOICE' ? 'Voice' : 'Image+Text'}
                              </span>
                            </div>
                          </div>

                          {/* ========== EVIDENCE DISPLAY ========== */}
                          {incident.mode === 'VOICE' && incident.translatedTranscript && (
                            <div className={`p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200`}>
                              <p className="text-sm font-bold text-orange-900 mb-3 flex items-center gap-2">
                                <Mic size={18} />
                                Voice Transcript
                              </p>
                              <p className="text-gray-800 text-sm leading-relaxed mb-3">
                                "{incident.translatedTranscript || incident.transcript}"
                              </p>
                            </div>
                          )}

                          {incident.mode === 'IMAGE_TEXT' && (
                            <div className="space-y-4">
                              {incident.imageUrl && (
                                <div className={`p-4 rounded-2xl bg-purple-50 border-2 border-purple-200`}>
                                  <p className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                                    <ImageIcon size={18} />
                                    Image Evidence
                                  </p>
                                  <img 
                                    src={incident.imageUrl} 
                                    alt="incident" 
                                    className="max-h-72 rounded-xl object-cover w-full shadow-lg border border-purple-300"
                                  />
                                </div>
                              )}
                              {incident.description && (
                                <div className={`p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200`}>
                                  <p className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                                    <FileText size={18} />
                                    Description
                                  </p>
                                  <p className="text-gray-800 text-sm leading-relaxed">
                                    {incident.description}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/80 backdrop-blur rounded-3xl border border-gray-200">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-700 text-2xl font-bold">No incident reports yet</p>
            <p className="text-gray-500 mt-3 text-lg">Create your first SOS report to see it here</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CitizenOwn