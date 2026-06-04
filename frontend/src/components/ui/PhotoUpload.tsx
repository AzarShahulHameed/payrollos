
'use client';
import { useState, useRef } from 'react';
import { uploadToCloudinary, validateImage, cloudinaryUrl } from '@/lib/cloudinary';
 
interface Props {
  currentUrl?:  string;
  folder?:      string;
  size?:        number;       // px — diameter for circle, side for square
  shape?:       'circle' | 'rounded';
  label?:       string;
  initials?:    string;       // fallback initials when no photo
  color?:       string;       // fallback avatar bg
  onUploaded:   (url: string) => void;
  disabled?:    boolean;
}
 
export default function PhotoUpload({
  currentUrl, folder = 'payrollos', size = 80, shape = 'circle',
  label = 'Upload photo', initials = '?', color = '#0a84ff',
  onUploaded, disabled = false,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [error,     setError]     = useState('');
  const [preview,   setPreview]   = useState(currentUrl || '');
  const inputRef = useRef<HTMLInputElement>(null);
 
  const radius = shape === 'circle' ? '50%' : `${Math.round(size * 0.22)}px`;
 
  const handleFile = async (file: File) => {
    const err = validateImage(file, 5);
    if (err) { setError(err); return; }
    setError('');
    setUploading(true);
    setProgress(0);
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const result = await uploadToCloudinary(file, folder, pct => setProgress(pct));
      setPreview(result.url);
      onUploaded(result.url);
    } catch (e: any) {
      setError('Upload failed — check your Cloudinary config in .env.local');
      setPreview(currentUrl || '');
    } finally {
      setUploading(false);
    }
  };
 
  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };
 
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };
 
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      {/* Avatar */}
      <div
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        style={{
          position: 'relative', width: size, height: size, borderRadius: radius,
          cursor: disabled ? 'default' : 'pointer', flexShrink: 0, overflow: 'hidden',
          border: '2px solid #e3e3e6', background: color,
          boxShadow: '0 2px 8px rgba(0,0,0,.1)',
        }}
      >
        {preview ? (
          <img src={cloudinaryUrl(preview, { w: size * 2, h: size * 2 })} alt="Photo"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.32, fontWeight: 700 }}>
            {initials}
          </div>
        )}
 
        {/* Hover overlay — only shown when uploading */}
        {!disabled && uploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600 }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>⬆</div>
            <div>{progress}%</div>
          </div>
        )}
 
        {/* Progress bar */}
        {uploading && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,.3)' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#fff', transition: 'width .2s' }} />
          </div>
        )}
      </div>
 
      {/* Right side text + button */}
      <div>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onInput} />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          style={{ padding: '8px 16px', background: '#0a84ff', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: disabled ? .5 : 1 }}
        >
          {uploading ? `Uploading ${progress}%…` : label}
        </button>
        <div style={{ fontSize: 12, color: '#a1a1a6', marginTop: 6 }}>
          JPG, PNG or WebP · max 5MB
        </div>
        {error && <div style={{ fontSize: 12, color: '#d83933', marginTop: 4 }}>⚠ {error}</div>}
      </div>
    </div>
  );
}