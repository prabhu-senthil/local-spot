import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const MapView = () => {
  const mapRef = useRef(null);
  const mapContainer = useRef(null);
  const markersRef = useRef([]);

  const [coords, setCoords] = useState({
    lng: -6.59,
    lat: 53.38,
  });

  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [coords.lng, coords.lat],
      zoom: 13,
    });

    mapRef.current.on("moveend", () => {
      const center = mapRef.current.getCenter();
      setCoords({
        lng: center.lng,
        lat: center.lat,
      });
    });
  }, []);

  const fetchVenues = async (lng, lat) => {
    try {
      setLoading(true);

      const res = await fetch(
        `http://localhost:5000/api/venues?lat=${lat}&lng=${lng}&radius=2000`
      );

      const data = await res.json();
      setVenues(data);

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      data.forEach((venue) => {
        const marker = new mapboxgl.Marker()
          .setLngLat([venue.longitude, venue.latitude])
          .setPopup(
            new mapboxgl.Popup().setHTML(`
              <h3>${venue.name}</h3>
              <p>${venue.address || ""}</p>
              <small>${venue.distanceText || ""}</small>
            `)
          )
          .addTo(mapRef.current);

        markersRef.current.push(marker);
      });
    } catch (err) {
      console.error("Error fetching venues:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues(coords.lng, coords.lat);
  }, [coords]);

  return (
    <div>
      <h2>Nearby Restaurants</h2>

      {loading && <p>Loading venues...</p>}

      <div
        ref={mapContainer}
        style={{
          height: "500px",
          width: "100%",
          borderRadius: "10px",
        }}
      />
    </div>
  );
};

export default MapView;