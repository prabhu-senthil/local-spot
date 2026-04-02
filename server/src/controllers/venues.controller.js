export async function getVenues(_req, res) {
  return res.status(200).json([]);
}

export async function getVenueById(req, res) {
  // Placeholder: In the next step you can implement MongoDB lookups + aggregation fields.
  return res.status(200).json({
    id: req.params.id,
    name: "Example Venue",
  });
}

