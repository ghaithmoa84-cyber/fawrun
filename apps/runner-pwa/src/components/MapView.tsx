import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

const deliveryIcon = L.divIcon({
  className: 'marker-delivery',
  html:
    '<div style="background:#dc2626;border-radius:50%;width:20px;height:20px;border:3px solid #fff;box-shadow:0 0 0 3px #fff;"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

interface MapViewProps {
  lat: number;
  lng: number;
  description: string;
}

export function MapView({ lat, lng, description }: MapViewProps) {
  return (
    <div className="map-container">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={deliveryIcon}>
          <Popup>{description}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
