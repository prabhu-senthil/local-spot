const Review = require("../models/Review");

exports.calculateTrust = async (req, res) => {

    const { venueId } = req.body;

    const reviews = await Review.find({ venueId });

    if (reviews.length === 0) {
        return res.json({ score: 0 });
    }

    const avgRating =
        reviews.reduce((sum, r) => sum + r.rating, 0) /
        reviews.length;

    const trustScore = avgRating * 20;

    res.json({
        score: trustScore
    });

};
