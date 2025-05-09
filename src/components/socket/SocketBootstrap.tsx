'use client';

import { useEffect } from 'react';
import { useDeviceFingerprint } from '~/hooks/useDeviceFingerprint';
import { getSocket } from '~/libs/socket';

export default function SocketBootstrap() {
  useEffect(() => {
    getSocket(); // this ensures the socket is established on initial load
    useDeviceFingerprint(); // this ensures the device fingerprint is fetched on initial load
  }, []);

  return null; // nothing rendered
}
