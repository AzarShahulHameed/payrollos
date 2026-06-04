'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsIndex() {
  const router = useRouter();
  useEffect(() => { router.replace('/settings/organization'); }, []);
  return null;
}
