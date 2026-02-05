import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  useMap,
  CircleMarker,
  Tooltip,
  Popup,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.heat";
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  Users,
  MapPin,
  Shield,
  CheckCircle,
  Activity,
  Zap,
  Layers,
  Flame,
  Gauge,
  Timer,
} from "lucide-react";
import { AuthDataContext } from "../context/AuthDataContext";

const bucketLabels = {
  0: "0-1h",
  1: "1-6h",
  6: "6-24h",
  24: "1-3d",
  72: "3-7d",
  168: ">7d",
  unknown: "Unknown",
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatHours = (value) => (value || value === 0 ? `${value.toFixed(1)}h` : "—");
const formatPercent = (value) => (value || value === 0 ? `${value.toFixed(1)}%` : "—");

const HeatmapLayer = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !points?.length) return undefined;

    const layer = L.heatLayer(points, {
      radius: 28,
      blur: 22,
      maxZoom: 14,
      gradient: {
        0.2: "#a5b4fc",
        0.4: "#6366f1",
        0.6: "#4f46e5",
        0.8: "#db2777",
        1.0: "#dc2626",
      },
    });

    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
};

const AnalyticsPage = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapMode, setMapMode] = useState("heatmap");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError("");
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const res = await axios.get(
          `${serverUrl}/api/incident/analytics?days=${days}&timezone=${encodeURIComponent(
            timezone
          )}`,
          { withCredentials: true }
        );
        setData(res.data);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    if (serverUrl) fetchAnalytics();
  }, [serverUrl, days]);

  const summary = data?.summary || {};
  const totalIncidents = summary.total || 0;
  const trends = data?.trends || [];

  const maxTrend = useMemo(
    () => Math.max(1, ...trends.map((t) => t.count || 0)),
    [trends]
  );

  const hourMax = useMemo(
    () => Math.max(1, ...(data?.hourlyPattern || []).map((t) => t.count || 0)),
    [data]
  );

  const dayMax = useMemo(
    () => Math.max(1, ...(data?.dayOfWeekPattern || []).map((t) => t.count || 0)),
    [data]
  );

  const topType = useMemo(() => {
    const type = data?.byType?.[0];
    if (!type) return null;
    return `${type.type} (${type.count})`;
  }, [data]);

  const peakHour = useMemo(() => {
    const peak = [...(data?.hourlyPattern || [])].sort((a, b) => b.count - a.count)[0];
    if (!peak) return null;
    return `${peak.hour}:00`;
  }, [data]);

  const backlogOver24h = useMemo(() => {
    const buckets = data?.backlogAging || [];
    const bucketMap = new Map(buckets.map((b) => [b.bucket, b.count]));
    return (bucketMap.get(24) || 0) + (bucketMap.get(72) || 0) + (bucketMap.get(168) || 0);
  }, [data]);

  const heatPoints = useMemo(() => {
    const hotspots = data?.hotspots || [];
    return hotspots.map((h) => [
      Number(h.lat),
      Number(h.lon),
      Math.max(0.5, (h.count || 1) * (h.avgSeverityScore || 1)),
    ]);
  }, [data]);

  const mapCenter = useMemo(() => {
    if (heatPoints.length) return [heatPoints[0][0], heatPoints[0][1]];
    return [20.5937, 78.9629];
  }, [heatPoints]);

  const hotspotMax = useMemo(
    () => Math.max(1, ...(data?.hotspots || []).map((h) => h.count || 0)),
    [data]
  );

  const hotspotMarkers = useMemo(() => data?.hotspots || [], [data]);

  return (
    <div className="min-h-screen pt-18 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-sm shadow-lg">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                Agency Analytics Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Real-world operational insights across incidents, resources, and response quality
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="text-xs text-gray-500">Window</div>
                <div className="text-sm font-semibold text-gray-900">Last {days} days</div>
              </div>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200 text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={180}>Last 180 days</option>
              </select>
            </div>
          </div>
        </header>

        {loading && (
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 text-gray-600">
            Loading analytics...
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 p-6 rounded-2xl shadow-lg border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <span className="text-sm text-gray-500">Total</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{totalIncidents}</div>
                <p className="text-gray-600 text-sm mt-1">Incidents Handled</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-500">Resolved</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{summary.resolved || 0}</div>
                <p className="text-gray-600 text-sm mt-1">
                  Resolution Rate {formatPercent(summary.resolutionRate || 0)}
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-500">Average</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {formatHours(summary.avgResolutionHours)}
                </div>
                <p className="text-gray-600 text-sm mt-1">Resolution Time</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-500">Active</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{summary.active || 0}</div>
                <p className="text-gray-600 text-sm mt-1">Active Incidents</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <MapPin className="w-6 h-6 text-indigo-600" />
                  </div>
                  <span className="text-sm text-gray-500">Coverage</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{summary.pending || 0}</div>
                <p className="text-gray-600 text-sm mt-1">Pending Incidents</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <Shield className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="text-sm text-gray-500">Satisfaction</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {formatPercent(summary.autoDispatchRate || 0)}
                </div>
                <p className="text-gray-600 text-sm mt-1">Auto-dispatch Rate</p>
              </div>
            </div>

            {/* Insight Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-6 rounded-2xl shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="w-6 h-6" />
                  <h3 className="text-lg font-semibold">Key Insights</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div>Top incident type: {topType || "—"}</div>
                  <div>Peak demand hour: {peakHour || "—"}</div>
                  <div>Backlog &gt; 24h: {backlogOver24h}</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <Gauge className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Operational Health</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <div>Resolved: {summary.resolved || 0}</div>
                  <div>Active: {summary.active || 0}</div>
                  <div>Spam filtered: {summary.spam || 0}</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <Timer className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Resolution Spread</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <div>Fastest: {formatHours(summary.minResolutionHours)}</div>
                  <div>Average: {formatHours(summary.avgResolutionHours)}</div>
                  <div>Slowest: {formatHours(summary.maxResolutionHours)}</div>
                </div>
              </div>
            </div>

            {/* Main Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Incident Trends Chart */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-600" />
                      Incident Trends
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">Daily volume for the selected window</p>
                  </div>
                  <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    {trends.length} days
                  </div>
                </div>
                <div className="h-64">
                  <div className="flex items-end justify-between h-full space-x-2">
                    {trends.map((item, index) => (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg transition-all hover:opacity-90"
                          style={{ height: `${(item.count / maxTrend) * 200}px` }}
                        ></div>
                        <div className="mt-2 text-xs text-gray-600">{item.date?.slice(5)}</div>
                        <div className="text-sm font-semibold text-gray-900">{item.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Incident Type Distribution */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Incident Type Distribution
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">Breakdown by incident category</p>
                  </div>
                  <div className="px-3 py-1 bg-gray-50 text-gray-700 rounded-full text-sm font-medium">
                    Total: {totalIncidents}
                  </div>
                </div>
                <div className="space-y-4">
                  {(data?.byType || []).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-700">{item.type}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-48 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${totalIncidents ? (item.count / totalIncidents) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="font-semibold text-gray-900 w-8 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Second Row - 3 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Severity Distribution */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    Severity Distribution
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">Incident severity levels</p>
                </div>
                <div className="space-y-4">
                  {(data?.bySeverity || []).map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">{item.severity}</span>
                        <span className="font-semibold text-gray-900">
                          {item.count} ({formatPercent(totalIncidents ? (item.count / totalIncidents) * 100 : 0)})
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-full ${item.severity === 'Critical' ? 'bg-red-500' :
                            item.severity === 'High' ? 'bg-orange-500' :
                              item.severity === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                            } rounded-full`}
                          style={{ width: `${totalIncidents ? (item.count / totalIncidents) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SLA Compliance */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    SLA Compliance
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">Resolved within severity targets</p>
                </div>
                <div className="space-y-4">
                  {(data?.slaBySeverity || []).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{item.severity}</div>
                        <div className="text-sm text-gray-600">
                          {item.met}/{item.total} met
                        </div>
                      </div>
                      <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {formatPercent(item.rate)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Response Time by Severity */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-purple-600" />
                    Resolution Time by Severity
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">Average hours to resolve</p>
                </div>
                <div className="space-y-4">
                  {(data?.responseBySeverity || []).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div>
                        <div className="font-medium text-gray-900">{item.severity}</div>
                        <div className="text-sm text-gray-600">{item.count} resolved</div>
                      </div>
                      <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        {formatHours(item.avgResolutionHours)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Demand Patterns & Trust Score */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-600" />
                      Demand Patterns
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">Peak hours and weekdays</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">By Hour</div>
                    <div className="grid grid-cols-12 gap-2">
                      {(data?.hourlyPattern || []).map((h) => (
                        <div key={h.hour} className="flex flex-col items-center">
                          <div
                            className="w-full bg-indigo-500 rounded-t"
                            style={{ height: `${(h.count / hourMax) * 80}px` }}
                          ></div>
                          <div className="text-[10px] text-gray-500 mt-1">{h.hour}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-2">By Day of Week</div>
                    <div className="grid grid-cols-7 gap-2">
                      {(data?.dayOfWeekPattern || []).map((d) => (
                        <div key={d.day} className="flex flex-col items-center">
                          <div
                            className="w-full bg-indigo-300 rounded-t"
                            style={{ height: `${(d.count / dayMax) * 80}px` }}
                          ></div>
                          <div className="text-[10px] text-gray-500 mt-1">{dayNames[d.day - 1]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-600" />
                      Trust Score Distribution
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">Quality of incoming reports</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {(data?.trustScoreBuckets || []).map((bucket, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-700">{bucket.range}</span>
                      <div className="flex items-center gap-4">
                        <div className="w-48 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${totalIncidents ? (bucket.count / totalIncidents) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="font-semibold text-gray-900 w-8 text-right">{bucket.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Operations & Resource Readiness */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-gray-600" />
                    Backlog Aging
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">Open incidents by age bucket</p>
                </div>
                <div className="space-y-3">
                  {(data?.backlogAging || []).map((b, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-700">{bucketLabels[b.bucket] || b.bucket}</span>
                      <span className="font-semibold text-gray-900">{b.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Resource Status
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">Availability across fleet</p>
                </div>
                <div className="space-y-3">
                  {(data?.resources?.byStatus || []).map((r, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-700">{r.status}</span>
                      <span className="font-semibold text-gray-900">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    Geospatial Heatmap
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">
                    Real-time incident intensity (count × severity)
                  </p>
                </div>
                {heatPoints.length ? (
                  <div className="relative h-72 w-full rounded-xl overflow-hidden border border-gray-200">
                    <div className="absolute z-[500] top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2">
                      <button
                        onClick={() => setMapMode("heatmap")}
                        className={`px-2 py-1 text-xs rounded ${mapMode === "heatmap"
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700"
                          }`}
                      >
                        Heatmap
                      </button>
                      <button
                        onClick={() => setMapMode("clusters")}
                        className={`px-2 py-1 text-xs rounded ${mapMode === "clusters"
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700"
                          }`}
                      >
                        Clusters
                      </button>
                    </div>
                    <div className="absolute z-[500] bottom-3 left-3 bg-white/90 backdrop-blur px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                      <div className="text-[11px] font-semibold text-gray-700 mb-1">Intensity</div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-28 rounded-full bg-gradient-to-r from-indigo-300 via-indigo-600 to-rose-600" />
                        <div className="text-[10px] text-gray-500">Low → High</div>
                      </div>
                    </div>
                    <MapContainer
                      center={mapCenter}
                      zoom={11}
                      className="h-full w-full"
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                      />
                      {mapMode === "heatmap" ? (
                        <HeatmapLayer points={heatPoints} />
                      ) : (
                        <MarkerClusterGroup chunkedLoading>
                          {hotspotMarkers.map((h, index) => {
                            const radius = 10 + (h.count / hotspotMax) * 18;
                            const intensity = Math.min(1, (h.count / hotspotMax) * 0.9 + 0.1);
                            return (
                              <CircleMarker
                                key={`${h.lat}-${h.lon}-${index}`}
                                center={[Number(h.lat), Number(h.lon)]}
                                radius={radius}
                                pathOptions={{
                                  color: "#4f46e5",
                                  fillColor: "#6366f1",
                                  fillOpacity: intensity,
                                  weight: 1,
                                }}
                              >
                                <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                                  <div className="text-xs">
                                    <div className="font-semibold">Hotspot</div>
                                    <div>Incidents: {h.count}</div>
                                    <div>Avg Severity: {h.avgSeverityScore}</div>
                                  </div>
                                </Tooltip>
                                <Popup>
                                  <div className="text-sm">
                                    <div className="font-semibold">Hotspot Detail</div>
                                    <div>Incidents: {h.count}</div>
                                    <div>Avg Severity: {h.avgSeverityScore}</div>
                                    <div>
                                      Location: {Number(h.lat).toFixed(2)}, {Number(h.lon).toFixed(2)}
                                    </div>
                                  </div>
                                </Popup>
                              </CircleMarker>
                            );
                          })}
                        </MarkerClusterGroup>
                      )}
                    </MapContainer>
                  </div>
                ) : (
                  <div className="h-72 flex items-center justify-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No hotspot data available for this window.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-gray-600" />
                    Recent Incidents
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">Latest incoming incidents</p>
                </div>
                <div className="px-3 py-1 bg-gray-50 text-gray-700 rounded-full text-sm font-medium">
                  Live Feed
                </div>
              </div>
              <div className="space-y-3">
                {(data?.recent || []).map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-3 h-3 rounded-full ${item.status === "Resolved"
                          ? "bg-green-500"
                          : item.status === "Active"
                            ? "bg-blue-500"
                            : item.status === "Pending"
                              ? "bg-yellow-500"
                              : "bg-purple-500"
                          }`}
                      ></div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {item.type} • {item.severity}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.priorityCode?.code || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        {item.status}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div>
                  Analytics Dashboard • Data updated in real-time • v3.0
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>All systems operational</span>
                </div>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;