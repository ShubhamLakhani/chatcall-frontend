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
      
      let visitorId = result.visitorId;

      if (
        process.env.NODE_ENV === 'development' ||
        (typeof window !== 'undefined' && window.location.hostname === 'localhost')
      ) {
        let tabId = sessionStorage.getItem('tab_id');
        if (!tabId) {
          tabId = Math.random().toString(36).substring(2, 8);
          sessionStorage.setItem('tab_id', tabId);
        }
        visitorId = `${visitorId}_tab_${tabId}`;
      }

      const customResult: GetResult = {
        ...result,
        visitorId,
      };

      setDeviceInfo(customResult); // Storing the fingerprint in the state
      dispatch(setDevice(customResult)); // Dispatching the fingerprint to the Redux store
    };

    fetchFingerprint();
  }, [dispatch]);

  return deviceInfo;
};