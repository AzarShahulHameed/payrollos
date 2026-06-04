// Cloudinary — uses signed uploads via our backend
// API_SECRET stays on server, only CLOUD_NAME is exposed in frontend
 
export type UploadResult = { url: string; publicId: string };
 
export async function uploadToCloudinary(
  file: File,
  folder = 'payrollos',
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  // Step 1: Get signed params from our backend
  const { api } = await import('./api');
  const sign = await api.post('/upload/sign', { folder }).then(r => r.data);
 
  // Step 2: Upload directly to Cloudinary with signature
  const fd = new FormData();
  fd.append('file',      file);
  fd.append('folder',    sign.folder);
  fd.append('timestamp', String(sign.timestamp));
  fd.append('signature', sign.signature);
  fd.append('api_key',   sign.apiKey);
 
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', sign.uploadUrl);
 
    if (onProgress) {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
      };
    }
 
    xhr.onload = () => {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        resolve({ url: res.secure_url, publicId: res.public_id });
      } else {
        const msg = JSON.parse(xhr.responseText)?.error?.message || 'Upload failed';
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(fd);
  });
}
 
export function validateImage(file: File, maxMB = 5): string | null {
  if (!file.type.startsWith('image/')) return 'Please select an image file (JPG, PNG, WebP)';
  if (file.size > maxMB * 1024 * 1024)  return `Image must be under ${maxMB}MB`;
  return null;
}
 
// Cloudinary URL transformation — auto-resize + format
export function cloudinaryUrl(
  url: string,
  opts: { w?: number; h?: number; c?: string } = {},
): string {
  if (!url?.includes('cloudinary.com')) return url || '';
  const { w = 200, h = 200, c = 'fill' } = opts;
  return url.replace('/upload/', `/upload/w_${w},h_${h},c_${c},q_auto,f_auto/`);
}
 