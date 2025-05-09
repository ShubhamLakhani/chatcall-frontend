import { useEffect, useState } from 'react';
import FingerprintJS, { GetResult } from '@fingerprintjs/fingerprintjs';

export const useDeviceFingerprint = () => {
  const [deviceInfo, setDeviceInfo] = useState<GetResult | null>(null);

  useEffect(() => {
    const fetchFingerprint = async () => {
      // Initialize FingerprintJS
      const fp = await FingerprintJS.load();
      // Get the device fingerprint
      const result = await fp.get();
      // You can now use the fingerprint (result.visitorId)
      setDeviceInfo(result); // Storing the fingerprint in the state
    };

    fetchFingerprint();
  }, []);

  return deviceInfo;
};