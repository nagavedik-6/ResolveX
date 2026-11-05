import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Link } from "react-router-dom";
import { StatusBadge } from "./ComplaintCard";

function makeIcon(status, priority) {
  const color = priority === "Urgent" || priority === "High" ? "#dc6854" :
    status === "Resolved" ? "#5c9b76" : status === "In Progress" ? "#6589b5" :
      status === "Assigned" ? "#8f76bd" : "#df9a43";
  return L.divIcon({
    className: "",
    html: `<span class="map-marker" style="--marker-color:${color}"><span></span></span>`,
    iconSize: [28, 36],
    iconAnchor: [14, 33],
    popupAnchor: [0, -31]
  });
}

function FitMarkers({ complaints, center }) {
  const map = useMap();
  useEffect(() => {
    const points = complaints.filter((item) => item.location?.coordinates?.length === 2);
    if (points.length > 1) {
      map.fitBounds(points.map((item) => [item.location.coordinates[1], item.location.coordinates[0]]), { padding: [40, 40], maxZoom: 14 });
    } else if (points.length === 1) {
      map.setView([points[0].location.coordinates[1], points[0].location.coordinates[0]], 13);
    }
  }, [complaints, center, map]);
  return null;
}

export default function MapView({ complaints = [], center = [20.5937, 78.9629], className = "" }) {
  return (
    <MapContainer className={`leaflet-map ${className}`} center={center} zoom={5} scrollWheelZoom>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitMarkers complaints={complaints} />
      {complaints.map((item) => {
        const coordinates = item.location?.coordinates;
        if (!coordinates || coordinates.length !== 2) return null;
        return <Marker key={item._id} position={[coordinates[1], coordinates[0]]} icon={makeIcon(item.status, item.priority)}>
          <Popup>
            <div className="map-popup">
              {item.imageUrls?.[0] && <img src={item.imageUrls[0]} alt="" />}
              <span className="map-popup-category">{item.category}</span>
              <strong>{item.title}</strong>
              <span>{item.village}{item.district ? `, ${item.district}` : ""}</span>
              <StatusBadge status={item.status} />
              <Link to={`/complaints/${item._id}`}>View report ↗</Link>
            </div>
          </Popup>
        </Marker>;
      })}
    </MapContainer>
  );
}

function ClickToSet({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect([event.latlng.lng.toFixed(6), event.latlng.lat.toFixed(6)]);
    }
  });
  return null;
}

function PickerPosition({ position, selected }) {
  const map = useMap();
  useEffect(() => {
    if (selected) map.setView(position, Math.max(map.getZoom(), 13));
  }, [map, position, selected]);
  return null;
}

export function LocationPicker({ coordinates, onSelect }) {
  const hasCoordinates = coordinates?.length === 2 && coordinates.every((item) => item !== "");
  const position = hasCoordinates
    ? [Number(coordinates[1]), Number(coordinates[0])]
    : [20.5937, 78.9629];
  return (
    <MapContainer className="location-picker-map" center={position} zoom={hasCoordinates ? 13 : 5} scrollWheelZoom>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickToSet onSelect={onSelect} />
      <PickerPosition position={position} selected={hasCoordinates} />
      {hasCoordinates && <Marker position={position} icon={makeIcon("Submitted", "Normal")} />}
    </MapContainer>
  );
}
