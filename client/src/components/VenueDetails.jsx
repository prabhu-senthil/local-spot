import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getVenueDetails } from "../services/venueApi";

export default function VenueDetails() {

  const { id } = useParams();

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {

    const fetchVenue = async () => {

      try {

        const data = await getVenueDetails(id);
        setVenue(data);

      } catch (err) {
        setError("Venue not found");
      }

      setLoading(false);
    };

    fetchVenue();

  }, [id]);

  if (loading) return <p>Loading venue...</p>;
  if (error) return <p>Venue not found</p>;

  return (

    <div>

      <h2>{venue.name}</h2>
      <p>Category: {venue.category}</p>

      <h3>Trust Score</h3>
      <p>{venue.trustScore || "Not available"}</p>

      {/*   <h3>Crowd Insights</h3>
      <p>Busy Reports: {venue.crowdSummary.bestHours}</p>
      <p>Quiet Reports: {venue.crowdSummary.peakHours}</p> */}

      <h3>Reviews</h3>

      {venue.reviews?.length > 0 ? (
        venue.reviews.map((r) => (
          <div key={r._id}>
            <strong>{r.rating}/5</strong>
            <p>{r.comment}</p>
          </div>
        ))
      ) : (
        <p>No reviews yet</p>
      )}

    </div>

  );
}
