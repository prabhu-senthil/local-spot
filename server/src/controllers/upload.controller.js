import { v2 as cloudinary } from "cloudinary";

export async function generateSignature(req, res) {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // Cloudinary config should be set from environment variables automatically if CLOUDINARY_URL is present, 
    // but we can explicitly set it to be safe, assuming the user added it to .env
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: "localspot_uploads",
      },
      process.env.CLOUDINARY_API_SECRET
    );

    res.status(200).json({
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (error) {
    console.error("Error generating Cloudinary signature:", error);
    res.status(500).json({ message: "Failed to generate upload signature" });
  }
}
