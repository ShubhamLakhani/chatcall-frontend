'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '~/libs/socket';

interface UseWebRTCParams {
  chatRoomId: string;
  userId: string;
  isInitiator: boolean;
}

const webrtcDebug =
  typeof window !== 'undefined'
    ? (window as typeof window & {
        __webrtc_debug__?: Window['__webrtc_debug__'];
      }).__webrtc_debug__
    : undefined;

export function useWebRTC({ chatRoomId, isInitiator }: UseWebRTCParams) {
  const [isMuted, setIsMuted] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);

  const socket = getSocket();
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const isMakingOffer = useRef(false);
  const isIgnoringOffer = useRef(false);
  const isSettingRemoteAnswerPending = useRef(false);
  const isPolite = !isInitiator;

  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    const setupConnection = async () => {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = localStream;

        const peer = new RTCPeerConnection(rtcConfig);
        peerRef.current = peer;

        localStream.getTracks().forEach((track) => {
          peer.addTrack(track, localStream);
          if (track.kind === 'audio') {
            webrtcDebug?.setLocalTrackStatus({
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
            });
          }
        });

        peer.ontrack = (event) => {
          console.log('[TRACK] ontrack fired. Stream:', event.streams[0]);
          const remoteStream = event.streams[0];
          if (remoteStream) {
            const [audioTrack] = remoteStream.getAudioTracks();
            if (audioTrack) {
              console.log('[TRACK] Remote audio track:', audioTrack);
              webrtcDebug?.setRemoteTrackStatus({
                enabled: audioTrack.enabled,
                muted: audioTrack.muted,
                readyState: audioTrack.readyState,
              });
            }
            setRemoteStream(remoteStream);
          }
        };

        peer.onicecandidate = (event) => {
          if (event.candidate && partnerId) {
            socket.emit('webrtc-ice-candidate', {
              to: partnerId,
              candidate: event.candidate,
            });
          }
        };

        peer.onicecandidateerror = (e) => {
          console.error('[ICE ERROR]', e.errorText);
        };

        peer.oniceconnectionstatechange = () => {
          console.log('[ICE] Connection state:', peer.iceConnectionState);
        };

        socket.on('webrtc-offer', async ({ offer, from }) => {
          const peer = peerRef.current;
          if (!peer) return;

          const readyForOffer =
            !isMakingOffer.current &&
            (peer.signalingState === 'stable' || isSettingRemoteAnswerPending.current);

          const offerCollision = !readyForOffer;
          isIgnoringOffer.current = !isPolite && offerCollision;

          if (isIgnoringOffer.current) {
            console.warn('[SIGNAL] Ignoring offer due to collision.');
            return;
          }

          try {
            isSettingRemoteAnswerPending.current = true;
            await peer.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit('webrtc-answer', { to: from, answer });
            setPartnerId(from);
          } catch (err) {
            console.error('[SIGNAL] Offer handling error:', err);
          } finally {
            isSettingRemoteAnswerPending.current = false;
          }
        });

        socket.on('webrtc-answer', async ({ answer, from }) => {
          const peer = peerRef.current;
          if (!peer) return;

          if (peer.signalingState !== 'have-local-offer') {
            console.warn('[SIGNAL] Ignoring answer — unexpected signaling state:', peer.signalingState);
            return;
          }

          try {
            await peer.setRemoteDescription(new RTCSessionDescription(answer));
            setPartnerId(from);
          } catch (err) {
            console.error('[SIGNAL] Answer handling error:', err);
          }
        });

        socket.on('webrtc-ice-candidate', async ({ candidate }) => {
          const peer = peerRef.current;
          if (!peer) return;

          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn('[ICE] Candidate error:', err);
          }
        });

        socket.on('call-started', async ({ from }) => {
          const peer = peerRef.current;
          if (!peer) return;

          setPartnerId(from);
          if (isInitiator && peer.signalingState === 'stable') {
            try {
              isMakingOffer.current = true;
              const offer = await peer.createOffer();
              await peer.setLocalDescription(offer);
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
      peerRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
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

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  };

  return {
    isMuted,
    toggleMute,
    remoteAudioRef,
  };
}