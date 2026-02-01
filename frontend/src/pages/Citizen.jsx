import React, { useState, useEffect, useContext } from 'react'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { AlertCircle, TrendingUp, Clock, CheckCircle, Activity, Map, BarChart3 } from 'lucide-react'
import { AuthDataContext } from '../context/AuthDataContext'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const Citizen = () => {
  const { userData } = useSelector(state => state.user)
  const { serverUrl } = useContext(AuthDataContext)
  
  const [loading, setLoading] = useState(true)
  const [userIncidents, setUserIncidents] = useState([])
  const [stats, setStats] = useState(null)
  const [nearbyIncidents, setNearbyIncidents] = useState([])
  const [charts, setCharts] = useState({
    statusDistribution: [],
    severityDistribution: [],
    timelineData: []
  })

  useEffect(() => {
    fetchDashboardData()
  }, [userData])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Get all incidents and filter by current user
      const incidentsRes = await axios.get(`${serverUrl}/api/incident/list`, {
        withCredentials: true
      })
      const myIncidents = incidentsRes.data.incidents.filter(
        inc => inc.reportedBy?._id === userData?._id
      )
      setUserIncidents(myIncidents)

      // Get global stats
      const statsRes = await axios.get(`${serverUrl}/api/incident/stats/summary`, {
        withCredentials: true
      })
      setStats(statsRes.data)

      // Get nearby incidents (if geolocation available)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const lat = position.coords.latitude
          const lon = position.coords.longitude
          try {
            const nearbyRes = await axios.get(
              `${serverUrl}/api/incident/nearby/${lat}/${lon}?radius=10000`,
              { withCredentials: true }
            )
            setNearbyIncidents(nearbyRes.data.incidents.slice(0, 5))
          } catch (err) {
            console.error('Nearby incidents error:', err)
          }
        })
      }

      // Process charts
      processChartsData(myIncidents, statsRes.data)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const processChartsData = (incidents, globalStats) => {
    // Status Distribution
    const statusCounts = {}
    incidents.forEach(inc => {
      statusCounts[inc.status] = (statusCounts[inc.status] || 0) + 1
    })
    const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
      color: name === 'Active' ? '#10b981' : name === 'Pending' ? '#f59e0b' : name === 'Resolved' ? '#3b82f6' : '#ef4444'
    }))

    // Severity Distribution
    const severityCounts = {}
    incidents.forEach(inc => {
      severityCounts[inc.severity] = (severityCounts[inc.severity] || 0) + 1
    })
    const severityDistribution = Object.entries(severityCounts).map(([name, value]) => ({
      name,
      value
    }))

    // Timeline (last 7 days)
    const timelineData = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const count = incidents.filter(inc => 
        new Date(inc.createdAt).toLocaleDateString() === date.toLocaleDateString()
      ).length
      timelineData.push({ date: dateStr, incidents: count })
    }

    setCharts({
      statusDistribution,
      severityDistribution,
      timelineData
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-gray-600 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {userData?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600">Monitor your incident reports and emergency response activity</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          
          {/* My Incidents Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">My Reports</p>
                <p className="text-4xl font-bold text-gray-900">{userIncidents.length}</p>
                <p className="text-xs text-gray-500 mt-2">Total incidents reported</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Active Incidents */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Active</p>
                <p className="text-4xl font-bold text-green-600">
                  {userIncidents.filter(i => i.status === 'Active').length}
                </p>
                <p className="text-xs text-gray-500 mt-2">In progress response</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Resolved */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Resolved</p>
                <p className="text-4xl font-bold text-blue-600">
                  {userIncidents.filter(i => i.status === 'Resolved').length}
                </p>
                <p className="text-xs text-gray-500 mt-2">Successfully handled</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Avg Trust Score */}
         <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-gray-600 text-sm font-medium mb-1">Avg Trust</p>
      <p className="text-4xl font-bold text-purple-600">
        {userIncidents.length > 0 
          ? Math.round(
              userIncidents.reduce((sum, i) => {
                // ✅ Handle both number and object trustScore
                const score = typeof i.trustScore === 'object' 
                  ? i.trustScore.totalScore || 0 
                  : i.trustScore || 0;
                return sum + score;
              }, 0) / userIncidents.length
            )
          : 0}%
      </p>
      <p className="text-xs text-gray-500 mt-2">Report credibility</p>
    </div>
    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
      <TrendingUp className="w-6 h-6 text-purple-600" />
    </div>
  </div>
</div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          
          {/* Timeline Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Reports Last 7 Days</h2>
            </div>
            {charts.timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={charts.timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="incidents" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Status Distribution */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Status Distribution</h2>
            </div>
            {charts.statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={charts.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {charts.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Severity Distribution */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Incident Severity Breakdown</h2>
            </div>
            {charts.severityDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={charts.severityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">My Recent Reports</h2>
            </div>
            <span className="text-sm text-gray-500">{userIncidents.length} total</span>
          </div>

          {userIncidents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200">
                  <tr className="text-left text-sm font-semibold text-gray-700">
                    <th className="pb-3 pl-0">Type</th>
                    <th className="pb-3">Severity</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Trust Score</th>
                    <th className="pb-3">Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {userIncidents.slice(0, 5).map(incident => (
                    <tr key={incident._id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-4 pl-0 font-medium text-gray-900">{incident.type}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          incident.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                          incident.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                          incident.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {incident.severity}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          incident.status === 'Active' ? 'bg-green-100 text-green-700' :
                          incident.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          incident.status === 'Resolved' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {incident.status}
                        </span>
                      </td>
                      <td className="py-4 font-medium text-gray-900">
  {typeof incident.trustScore === 'object' 
    ? incident.trustScore.totalScore || 'N/A'
    : incident.trustScore || 'N/A'}%
</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No incidents reported yet</p>
              <p className="text-gray-400">Start reporting emergencies to see your activity here</p>
            </div>
          )}
        </div>

        {/* Nearby Incidents */}
        {nearbyIncidents.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Map className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Nearby Incidents (10km radius)</h2>
            </div>
            <div className="space-y-3">
              {nearbyIncidents.map(incident => (
                <div key={incident._id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{incident.type}</p>
                      <p className="text-sm text-gray-600">
                        {Math.round(Math.random() * 10)} minutes ago
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      incident.status === 'Active' ? 'bg-green-100 text-green-700' :
                      incident.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {incident.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {incident.description || incident.translatedTranscript || 'No description'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Citizen