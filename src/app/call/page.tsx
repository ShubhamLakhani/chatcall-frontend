import { Suspense } from 'react';
import CallClient from '~/components/call/CallClient';


export default function CallPage() {
  return (
    <Suspense fallback={<div>Loading call...</div>}>
      <CallClient />
    </Suspense>
  );
}
