'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/student/dashboard');
  }, [router]);

  return null;
}
