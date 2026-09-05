"use client";

import { useState } from "react";

interface ImageUploaCSWCps {
  onUploadComplete: (url: string) => void;
  folder?: string;
  label?: string;
  initialUrl?: string | null;
  maxSizeKb?: number;
}

export default function ImageUpload({ onUploadComplete, folder = "general", label = "Upload Image", initialUrl, maxSizeKb = 500 }: ImageUploaCSWCps) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(initialUrl || null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to maxSizeKb, default 500KB)
    if (file.size > maxSizeKb * 1024) {
      const fileSizeKb = Math.round(file.size / 1024);
      setError(`File is too large (${fileSizeKb} KB). Maximum allowed size is ${maxSizeKb} KB. Please compress or resize the photo.`);
      return;
    }

    // Set local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    setUploading(true);
    setError("");
    setProgress(10); // initial progress

    try {
      // 1. Send FormData directly to our API route
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            // progress from 10 to 100
            const p = 10 + Math.round((event.loaded / event.total) * 90);
            setProgress(p);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.finalUrl) {
                onUploadComplete(data.finalUrl);
                setUploading(false);
                setProgress(0);
                resolve();
              } else {
                 setError("Upload failed: No URL returned.");
                 setUploading(false);
                 reject(new Error("Upload failed"));
              }
            } catch (err) {
              setError("Upload failed: Invalid server response.");
              setUploading(false);
              reject(new Error("Invalid response"));
            }
          } else {
            console.error("Upload error:", xhr.statusText);
            setError("Upload failed. Server returned an error.");
            setUploading(false);
            reject(new Error("Upload failed"));
          }
        };

        xhr.onerror = () => {
          console.error("Upload error: Network Error");
          setError("Upload failed due to a network error.");
          setUploading(false);
          reject(new Error("Network Error"));
        };

        xhr.open("POST", "/api/upload", true);
        xhr.send(formData);
      });
      
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to start upload. Check your connection.");
      setUploading(false);
    }
  };

  return (
    <div className="form-group">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>{label}</label>
        <span style={{ 
          fontSize: '0.72rem', 
          fontWeight: 800, 
          padding: '2px 8px', 
          borderRadius: '4px', 
          backgroundColor: 'rgba(220, 38, 38, 0.1)', 
          color: '#dc2626', 
          border: '1px solid rgba(220, 38, 38, 0.25)',
          letterSpacing: '0.3px'
        }}>
          MAX SIZE: {maxSizeKb} KB
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        {preview && (
          <div style={{ marginBottom: '10px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', width: 'fit-content', position: 'relative' }}>
            <img src={preview} alt="Preview" style={{ display: 'block', maxHeight: '140px', maxWidth: '100%', objectFit: 'contain' }} />
            <button
              type="button"
              onClick={() => { setPreview(null); onUploadComplete(""); }}
              style={{
                position: 'absolute', top: '4px', right: '4px',
                backgroundColor: 'rgba(0,0,0,0.7)', color: 'white',
                border: 'none', borderRadius: '50%', width: '24px', height: '24px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px'
              }}
              title="Remove image"
            >
              ✕
            </button>
          </div>
        )}
        <input 
          type="file" 
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleUpload}
          disabled={uploading}
          style={{ 
            width: '100%', 
            padding: '8px', 
            borderRadius: 'var(--radius-md)', 
            border: '1px dashed var(--border-color)',
            backgroundColor: 'rgba(255,255,255,0.02)',
            cursor: uploading ? 'not-allowed' : 'pointer'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Formats: JPG, PNG, WebP · Passport / 1:1 square photo recommended
          </span>
          <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600 }}>
            Limit: ≤ {maxSizeKb} KB
          </span>
        </div>
        
        {uploading && (
          <div style={{ 
            marginTop: '8px', 
            height: '4px', 
            width: '100%', 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              height: '100%', 
              width: `${progress}%`, 
              backgroundColor: 'var(--primary)', 
              transition: 'width 0.3s' 
            }} />
          </div>
        )}

        {uploading && <div style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: '4px' }}>Uploading: {progress}%</div>}
        {error && (
          <div style={{ 
            fontSize: '0.78rem', 
            color: '#dc2626', 
            marginTop: '6px', 
            padding: '4px 8px', 
            backgroundColor: 'rgba(220, 38, 38, 0.08)', 
            borderRadius: '4px',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            fontWeight: 600
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}
