import React, { useEffect, useState, useContext } from "react";
import {
  MapContainer,
  TileLayer,
  Popup,
  Marker,
  LayersControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import axios from "axios";
import fire from "../assets/fire.png";
import flood from "../assets/flood.png";
import medical from "../assets/medical.png";
import { AuthDataContext } from "../context/AuthDataContext";

// Icon mapping by incident type
const ICON_MAP = {
  Fire: fire,
  Flood: flood,
  Medical: medical,
  Accident: fire,
  Infrastructure: fire,
  Other: fire,
};

const getIcon = (type) =>
  new L.Icon({
    iconUrl: ICON_MAP[type] || fire,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
    shadowUrl: null,
  });

const createCustomClusterIcon = (cluster) => {
  return L.divIcon({
    html: `<div style="background-color: rgba(255, 0, 0, 0.7); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">${cluster.getChildCount()}</div>`,
    className: "custom-cluster-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

function FitBounds({ incidents }) {
  const map = useMap();
  useEffect(() => {
    if (!incidents || incidents.length === 0) return;
    const bounds = L.latLngBounds(
      incidents
        .filter((inc) => inc.location?.coordinates)
        .map((inc) => [
          inc.location.coordinates[1],
          inc.location.coordinates[0],
        ])
    );
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [incidents, map]);
  return null;
}

const Maps = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${serverUrl}/api/incident/list`, {
          withCredentials: true,
        });

        if (!mounted) return;

        // Filter only ACTIVE incidents
        const activeIncidents = (response.data?.incidents || []).filter(
          (inc) => inc.status === "Active"
        );

        setIncidents(activeIncidents);
        setError(null);
        console.log("Active incidents loaded:", activeIncidents.length);
      } catch (err) {
        console.error("Fetch error:", err);
        if (mounted) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Failed to load incidents"
          );
          setIncidents([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [serverUrl]);

  // Default center if no incidents
  const defaultCenter = [19.0760, 72.8777]; // Mumbai

  // Calculate map center from first incident or default
  const mapCenter =
    incidents.length > 0
      ? [
          incidents[0].location.coordinates[1],
          incidents[0].location.coordinates[0],
        ]
      : defaultCenter;

  return (
    <div style={{ position: "relative", height: "100vh", width: "100vw" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1000,
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "20px 30px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          ⏳ Loading active incidents...
        </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "rgba(211,47,47,0.9)",
            color: "white",
            padding: "15px 20px",
            borderRadius: "8px",
            fontSize: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            maxWidth: "400px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {!loading && incidents.length === 0 && !error && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1000,
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "20px 30px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          ✓ No active incidents at the moment
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="CartoDB Dark">
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; Mapbox'
              url="https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbHZiMjkydDAybTAwIn0.example"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <MarkerClusterGroup iconCreateFunction={createCustomClusterIcon}>
          {incidents.map((incident) => {
            if (!incident.location || !incident.location.coordinates) {
              return null;
            }

            const [lon, lat] = incident.location.coordinates;
            const position = [lat, lon];

            return (
              <Marker
                key={incident._id}
                position={position}
                icon={getIcon(incident.type)}
              >
                <Popup>
                  <div style={{ minWidth: 220, fontSize: "13px", fontFamily: "Arial, sans-serif" }}>
                    <strong style={{ fontSize: "15px", color: "#d32f2f" }}>
                      🚨 {incident.type}
                    </strong>
                    <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid #ddd" }} />

                    <div style={{ marginBottom: "6px" }}>
                      <strong>Status:</strong>{" "}
                      <span
                        style={{
                          background: "rgba(76, 175, 80, 0.3)",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontWeight: "600",
                          color: "#2e7d32",
                        }}
                      >
                        ✓ {incident.status}
                      </span>
                    </div>

                    <div style={{ marginBottom: "6px" }}>
                      <strong>Severity:</strong>{" "}
                      <span
                        style={{
                          background:
                            incident.severity === "Critical"
                              ? "rgba(211, 47, 47, 0.3)"
                              : incident.severity === "High"
                              ? "rgba(255, 152, 0, 0.3)"
                              : "rgba(76, 175, 80, 0.3)",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontWeight: "600",
                        }}
                      >
                        {incident.severity}
                      </span>
                    </div>

                    <div style={{ marginBottom: "6px" }}>
                      <strong>Trust Score:</strong>{" "}
                      <span style={{ fontWeight: "600", color: "#1976d2" }}>
                        {incident.trustScore}%
                      </span>
                    </div>

                    <div style={{ marginBottom: "6px" }}>
                      <strong>📍 Coordinates:</strong>
                      <div style={{ fontSize: "12px", marginTop: "4px", fontFamily: "monospace" }}>
                        Lat: {lat.toFixed(6)}
                        <br />
                        Lon: {lon.toFixed(6)}
                      </div>
                    </div>

                    <div style={{ marginBottom: "6px" }}>
                      <strong>📅 Reported:</strong>
                      <div style={{ fontSize: "12px", marginTop: "2px" }}>
                        {new Date(incident.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {incident.mode === "VOICE" && incident.translatedTranscript && (
                      <>
                        <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid #ddd" }} />
                        <div>
                          <strong>🎤 Transcript:</strong>
                          <div
                            style={{
                              background: "#f5f5f5",
                              padding: "8px",
                              borderRadius: "4px",
                              marginTop: "4px",
                              maxHeight: "80px",
                              overflowY: "auto",
                              fontSize: "12px",
                            }}
                          >
                            {incident.translatedTranscript}
                          </div>
                        </div>
                      </>
                    )}

                    {incident.mode === "IMAGE_TEXT" && incident.imageUrl && (
                      <>
                        <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid #ddd" }} />
                        <div>
                          <strong>📷 Image:</strong>
                          <img
                            src={incident.imageUrl}
                            alt="incident"
                            style={{
                              width: "100%",
                              borderRadius: "4px",
                              marginTop: "6px",
                              maxHeight: "120px",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      </>
                    )}

                    {incident.dispatchedResources && incident.dispatchedResources.length > 0 && (
                      <>
                        <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid #ddd" }} />
                        <div>
                          <strong>🚑 Resources Dispatched:</strong>{" "}
                          <span style={{ fontWeight: "600", color: "#d32f2f" }}>
                            {incident.dispatchedResources.length}
                          </span>
                        </div>
                      </>
                    )}

                    {incident.respondedBy && (
                      <div style={{ marginTop: "8px", fontSize: "11px", color: "#666" }}>
                        <strong>Responder ID:</strong> {incident.respondedBy}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>

        <FitBounds incidents={incidents} />
      </MapContainer>
    </div>
  );
};

export default Maps;