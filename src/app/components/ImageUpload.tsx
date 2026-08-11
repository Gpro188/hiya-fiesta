"use client";

import { useState } from "react";

interface ImageUploaCSWCps {
  onUploadComplete: (url: string) => void;
  folder?: string;
  label?: string;
  initialUrl?: string | null;
}

export default function ImageUpload({ onUploadComplete, folder = "general", label = "Upload Image", initialUrl }: ImageUploaCSWCps) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(initialUrl || null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 500KB as requested)
    if (file.size > 500 * 1024) {
      setError("File is too large. Max size is 500KB to save space.");
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
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        {preview && (
          <div style={{ marginBottom: '12px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', width: 'fit-content', position: 'relative' }}>
            <img src={preview} alt="Preview" style={{ display: 'block', maxHeight: '150px', maxWidth: '100%', objectFit: 'contain' }} />
            <button
              type="button"
              onClick={() => { setPreview(null); onUploadComplete(""); }}
              style={{
                position: 'absolute', top: '4px', right: '4px',
                backgroundColor: 'rgba(0,0,0,0.6)', color: 'white',
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
          accept="image/*"
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

        {uploading && <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '4px' }}>Uploading: {progress}%</div>}
        {error && <div style={{ fontSize: '0.7rem', color: 'var(--error)', marginTop: '4px' }}>{error}</div>}
      </div>
    </div>
  );
}
