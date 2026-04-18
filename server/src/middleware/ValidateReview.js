// src/middleware/validationMiddleware.js

export const validateReview = (req, res, next) => {
    const { venueId, rating, comment } = req.body;

    if (!venueId || !rating) {
        return res.status(400).json({
            message: "Venue ID and rating are required",
        });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({
            message: "Rating must be between 1 and 5",
        });
    }

    if (comment && comment.length < 5) {
        return res.status(400).json({
            message: "Review must be at least 5 characters",
        });
    }

    next();
};