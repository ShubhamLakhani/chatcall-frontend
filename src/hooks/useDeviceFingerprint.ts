import { useEffect, useState } from 'react';
import FingerprintJS, { GetResult } from '@fingerprintjs/fingerprintjs';
import { useAppDispatch } from './useAppDispatch';
import { setDevice } from '~/store/slices/authSlice';

export const useDeviceFingerprint = () => {
  const [deviceInfo, setDeviceInfo] = useState<GetResult | null>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetchFingerprint = async () => {
      // Initialize FingerprintJS
      const fp = await FingerprintJS.load();
      // Get the device fingerprint
      const result = await fp.get();
      // You can now use the fingerprint (result.visitorId)
      setDeviceInfo(result); // Storing the fingerprint in the state
      dispatch(setDevice(result)); // Dispatching the fingerprint to the Redux store
    };

    fetchFingerprint();
  }, []);

  return deviceInfo;
};