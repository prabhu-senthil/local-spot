import { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader2, ImagePlus } from 'lucide-react';
import axios from 'axios';

export default function PhotoUpload({ token, onUploadComplete, maxPhotos = 1, currentPhotos = [] }) {
  const [photos, setPhotos] = useState(currentPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setPhotos(currentPhotos);
  }, [currentPhotos]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (photos.length + files.length > maxPhotos) {
      setError(`You can only upload up to ${maxPhotos} photo${maxPhotos > 1 ? 's' : ''}.`);
      return;
    }

    // Validate file types and sizes (max 5MB)
    const validFiles = files.filter(f => {
      if (!f.type.startsWith('image/')) {
        setError('Only image files are allowed.');
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        setError('Images must be under 5MB.');
        return false;
      }
      return true;
    });

    if (!validFiles.length) return;

    setUploading(true);
    setError('');

    try {
      // 1. Get signature from our backend
      const sigRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/upload/signature`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { signature, timestamp, cloudName, apiKey } = sigRes.data;

      // 2. Upload to Cloudinary
      const newUrls = [];
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        formData.append('folder', 'localspot_uploads');

        const uploadRes = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          formData
        );
        newUrls.push(uploadRes.data.secure_url);
      }

      const updatedPhotos = [...photos, ...newUrls];
      setPhotos(updatedPhotos);
      onUploadComplete(updatedPhotos);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (indexToRemove) => {
    const updatedPhotos = photos.filter((_, i) => i !== indexToRemove);
    setPhotos(updatedPhotos);
    onUploadComplete(updatedPhotos);
  };

  return (
    <div className="w-full">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {photos.map((url, i) => (
            <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
              <img src={url} alt={`Upload ${i}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length < maxPhotos && (
        <div className="relative">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg, image/png, image/webp"
            multiple={maxPhotos > 1}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className={`flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed rounded-xl cursor-pointer transition ${
              uploading ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-brand-light/30 hover:border-brand hover:text-brand'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium text-sm">Uploading...</span>
              </>
            ) : (
              <>
                <ImagePlus className="w-5 h-5" />
                <span className="font-medium text-sm">
                  {photos.length === 0 ? "Add a photo" : "Add another photo"}
                </span>
              </>
            )}
          </label>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
