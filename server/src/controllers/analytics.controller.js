export async function getVenueAnalytics(req, res) {
  return res.status(200).json({
    venueId: req.params.venueId,
    analytics: {
      bestTime: [],
      peakTime: [],
    },
  });
}

