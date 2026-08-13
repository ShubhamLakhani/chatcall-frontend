'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '~/libs/socket';
import axiosInstance from '~/libs/axiosInstance';

interface UseWebRTCParams {
  chatRoomId: string;
  userId: string;
  isInitiator: boolean;
  enableVideo?: boolean;
}

const webrtcDebug =
  typeof window !== 'undefined'
    ? (window as typeof window & {
        __webrtc_debug__?: Window['__webrtc_debug__'];
      }).__webrtc_debug__
    : undefined;

export function useWebRTC({ chatRoomId, isInitiator, enableVideo = false }: UseWebRTCParams) {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(enableVideo);
  // Keep isMuted for backward compatibility
  const [isMuted, setIsMuted] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed' | 'disconnected'>('connecting');

  const socket = getSocket();
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const isMakingOffer = useRef(false);
  const isIgnoringOffer = useRef(false);
  const isSettingRemoteAnswerPending = useRef(false);
  const isPolite = !isInitiator;

  // Ref to track partner ID inside callbacks
  const partnerIdRef = useRef<string | null>(null);
  useEffect(() => {
    partnerIdRef.current = partnerId;
  }, [partnerId]);

  // Method to handle ICE restart for auto-reconnection recovery
  const handleIceRestart = async () => {
    const peer = peerRef.current;
    const currentPartnerId = partnerIdRef.current;
    if (!peer || !currentPartnerId || peer.signalingState === 'closed') return;
    try {
      console.log('[WEBRTC] Connection failed or disconnected. Initiating ICE restart for recovery...');
      isMakingOffer.current = true;
      const offer = await peer.createOffer({ iceRestart: true });
      await peer.setLocalDescription(offer);
      socket.emit('webrtc-offer', { to: currentPartnerId, offer });
    } catch (err) {
      console.error('[WEBRTC] ICE restart error:', err);
    } finally {
      isMakingOffer.current = false;
    }
  };

  useEffect(() => {
    let restartTimeout: NodeJS.Timeout;

    const setupConnection = async () => {
      try {
        // 1. Fetch ICE configuration dynamically from backend
        let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
        try {
          const response = await axiosInstance.get('webrtc/ice-servers');
          if (response.data && response.data.iceServers) {
            iceServers = response.data.iceServers;
            console.log('[WEBRTC] Dynamic ICE servers loaded:', iceServers);
          }
        } catch (fetchErr) {
          console.warn('[WEBRTC] Failed to fetch dynamic ICE servers, using Google STUN fallback:', fetchErr);
        }

        // 2. Request user media (audio + video if enabled)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: enableVideo,
        });
        localStreamRef.current = stream;
        setLocalStream(stream);

        // Update mute/video toggles to initial states
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          setIsAudioEnabled(audioTrack.enabled);
          setIsMuted(!audioTrack.enabled);
        }
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          setIsVideoEnabled(videoTrack.enabled);
        }

        // 3. Initialize peer connection
        const peer = new RTCPeerConnection({ iceServers });
        peerRef.current = peer;

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
          if (track.kind === 'audio') {
            webrtcDebug?.setLocalTrackStatus({
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
            });
          }
        });

        // 4. Set up peer event handlers
        peer.ontrack = (event) => {
          console.log('[TRACK] ontrack fired. Stream:', event.streams[0]);
          const remoteMediaStream = event.streams[0];
          if (remoteMediaStream) {
            const [audioTrack] = remoteMediaStream.getAudioTracks();
            if (audioTrack) {
              console.log('[TRACK] Remote audio track:', audioTrack);
              webrtcDebug?.setRemoteTrackStatus({
                enabled: audioTrack.enabled,
                muted: audioTrack.muted,
                readyState: audioTrack.readyState,
              });
            }
            setRemoteStream(remoteMediaStream);
          }
        };

        peer.onicecandidate = (event) => {
          const currentPartnerId = partnerIdRef.current;
          if (event.candidate && currentPartnerId) {
            socket.emit('webrtc-ice-candidate', {
              to: currentPartnerId,
              candidate: event.candidate,
            });
          }
        };

        peer.onicecandidateerror = (e) => {
          console.error('[ICE ERROR]', e.errorText);
        };

        // Connection state monitoring & auto-recovery
        const updateConnectionStatus = () => {
          const iceState = peer.iceConnectionState;
          const connState = peer.connectionState;

          console.log(`[ICE/CONN StateChange] iceConnectionState: ${iceState}, connectionState: ${connState}`);

          if (connState === 'connected' || iceState === 'connected' || iceState === 'completed') {
            setConnectionStatus('connected');
            clearTimeout(restartTimeout);
          } else if (
            connState === 'failed' ||
            iceState === 'failed' ||
            connState === 'disconnected' ||
            iceState === 'disconnected'
          ) {
            const newStatus = (connState === 'failed' || iceState === 'failed') ? 'failed' : 'disconnected';
            setConnectionStatus(newStatus);

            // Auto-recovery (ICE restart) with 3 seconds grace period
            clearTimeout(restartTimeout);
            restartTimeout = setTimeout(() => {
              const currentPartnerId = partnerIdRef.current;
              if (
                isInitiator &&
                currentPartnerId &&
                peer.signalingState !== 'closed' &&
                (peer.connectionState === 'failed' ||
                  peer.iceConnectionState === 'failed' ||
                  peer.connectionState === 'disconnected' ||
                  peer.iceConnectionState === 'disconnected')
              ) {
                void handleIceRestart();
              }
            }, 3000);
          } else {
            setConnectionStatus('connecting');
          }
        };

        peer.oniceconnectionstatechange = updateConnectionStatus;
        peer.onconnectionstatechange = updateConnectionStatus;

        // 5. Socket signaling event handlers
        socket.on('webrtc-offer', async ({ offer, from }) => {
          const peerConn = peerRef.current;
          if (!peerConn) return;

          const readyForOffer =
            !isMakingOffer.current &&
            (peerConn.signalingState === 'stable' || isSettingRemoteAnswerPending.current);

          const offerCollision = !readyForOffer;
          isIgnoringOffer.current = !isPolite && offerCollision;

          if (isIgnoringOffer.current) {
            console.warn('[SIGNAL] Ignoring offer due to collision.');
            return;
          }

          try {
            isSettingRemoteAnswerPending.current = true;
            await peerConn.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConn.createAnswer();
            await peerConn.setLocalDescription(answer);
            socket.emit('webrtc-answer', { to: from, answer });
            setPartnerId(from);
          } catch (err) {
            console.error('[SIGNAL] Offer handling error:', err);
          } finally {
            isSettingRemoteAnswerPending.current = false;
          }
        });

        socket.on('webrtc-answer', async ({ answer, from }) => {
          const peerConn = peerRef.current;
          if (!peerConn) return;

          if (peerConn.signalingState !== 'have-local-offer') {
            console.warn('[SIGNAL] Ignoring answer — unexpected signaling state:', peerConn.signalingState);
            return;
          }

          try {
            await peerConn.setRemoteDescription(new RTCSessionDescription(answer));
            setPartnerId(from);
          } catch (err) {
            console.error('[SIGNAL] Answer handling error:', err);
          }
        });

        socket.on('webrtc-ice-candidate', async ({ candidate }) => {
          const peerConn = peerRef.current;
          if (!peerConn) return;

          try {
            await peerConn.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn('[ICE] Candidate error:', err);
          }
        });

        socket.on('call-started', async ({ from }) => {
          const peerConn = peerRef.current;
          if (!peerConn) return;

          setPartnerId(from);
          if (isInitiator && peerConn.signalingState === 'stable') {
            try {
              isMakingOffer.current = true;
              const offer = await peerConn.createOffer();
              await peerConn.setLocalDescription(offer);
              socket.emit('webrtc-offer', { to: from, offer });
              console.log('[CALL] Offer sent to', from);
            } catch (err) {
              console.error('[CALL] Offer error:', err);
            } finally {
              isMakingOffer.current = false;
            }
          }
        });

        socket.emit('start-call', { chatRoomId });
      } catch (err) {
        console.error('[WEBRTC] Setup error:', err);
      }
    };

    setupConnection();

    return () => {
      clearTimeout(restartTimeout);
      peerRef.current?.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('call-started');
    };
  }, [chatRoomId]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current
        .play()
        .then(() => console.log('[AUDIO] Playback started'))
        .catch((err) => console.warn('[AUDIO] Playback error:', err));
    }
  }, [remoteStream]);

  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const newState = !audioTrack.enabled;
      audioTrack.enabled = newState;
      setIsAudioEnabled(newState);
      setIsMuted(!newState);
    }
  };

  const toggleMute = () => {
    toggleAudio();
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const newState = !videoTrack.enabled;
      videoTrack.enabled = newState;
      setIsVideoEnabled(newState);
    }
  };

  return {
    isMuted,
    toggleMute,
    isAudioEnabled,
    toggleAudio,
    isVideoEnabled,
    toggleVideo,
    localStream,
    remoteStream,
    connectionStatus,
    remoteAudioRef,
  };
}