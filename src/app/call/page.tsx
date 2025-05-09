import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const CallClient = dynamic(() => import('~/components/call/CallClient'), { ssr: false });

export default function CallPage() {
  return (
    <Suspense fallback={<div>Loading call...</div>}>
      <CallClient />
    </Suspense>
  );
}
