'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SettingsLayout, Card } from '../_components';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import PhotoUpload from '@/components/ui/PhotoUpload';

export default function ProfileSettings() {
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const name = `${user?.firstName||''} ${user?.lastName||''}`.trim();
  const AV = ['#0a84ff','#28a745','#ff9500','#af52de'];
  const color = AV[(name.charCodeAt(0)||0) % AV.length];

  const handleUpload = async (url: string) => {
    setError('');
    try {
      await api.patch('/auth/me/photo', { photoUrl: url });
      updateUser({ photoUrl: url });
      qc.invalidateQueries({ queryKey: ['me'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save. Check Cloudinary configuration.');
    }
  };

  return (
    <SettingsLayout title="Profile photo" subtitle="Your photo appears in the dashboard and sidebar">
      <Card>
        {saved && <div style={{ background:'#e7f6ea', border:'1px solid #28a74533', borderRadius:8, padding:'10px 14px', fontSize:13.5, color:'#28a745', fontWeight:500, marginBottom:20 }}>Photo updated — visible across the application immediately</div>}
        {error && <div style={{ background:'#fdecea', border:'1px solid #fcc', borderRadius:8, padding:'10px 14px', fontSize:13.5, color:'#d83933', marginBottom:20 }}>{error}</div>}
        <PhotoUpload currentUrl={user?.photoUrl} folder="payrollos/users" size={96} shape="circle" label="Upload photo" initials={name.split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2)} color={color} onUploaded={handleUpload} />
        <div style={{ marginTop:20, padding:'14px 18px', background:'var(--bg)', border:'1px solid var(--line)', borderRadius:10, fontSize:13, color:'var(--ink-3)', lineHeight:1.6 }}>
          Use a clear, professionally cropped square photo. It appears as a circular avatar throughout the interface.
          Minimum recommended size: 400×400px. Accepted formats: JPG, PNG, WebP.
        </div>
      </Card>
    </SettingsLayout>
  );
}
