// useWebRTC.ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '~/libs/socket';

interface UseWebRTCParams {
  chatRoomId: string;
  userId: string;
  isInitiator: boolean;
}

export function useWebRTC({ chatRoomId, userId, isInitiator }: UseWebRTCParams) {
  const [isMuted, setIsMuted] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);

  const socket = getSocket();
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  const makingOffer = useRef(false);
  const isSettingRemoteAnswerPending = useRef(false);
  const isPolite = !isInitiator;

  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:relay1.expressturn.com:3478',
        username: 'efk3Z7ApzZ1Fx0oVdM6Dqg==',
        credential: 'bDux3zh8mZkb99kC',
      },
    ],
  };

  useEffect(() => {
    const setupMedia = async () => {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = localStream;

        const peer = new RTCPeerConnection(rtcConfig);
        peerRef.current = peer;

        console.log('[DEBUG] Local stream:', peer);

        console.log('[DEBUG] Local stream tracks:', localStream.getTracks());
        localStream.getTracks().forEach((track) => {
          console.log('[DEBUG] Adding local track:', track.kind);
          peer.addTrack(track, localStream);
        });

        if (isInitiator) {
          peer.onnegotiationneeded = async () => {
            try {
              makingOffer.current = true;
              const offer = await peer.createOffer();
              await peer.setLocalDescription(offer);
              if (partnerId) {
                socket.emit('webrtc-offer', { to: partnerId, offer });
              }
            } catch (err) {
              console.error('[SIGNAL] Error during negotiation:', err);
            } finally {
              makingOffer.current = false;
            }
          };
        }

        peer.ontrack = (event) => {
          event.streams[0].getAudioTracks().forEach((track) => {
            console.log('[TRACK DEBUG] Remote audio track ID:', track.id);
            console.log('[TRACK DEBUG] Enabled:', track.enabled, '| Muted:', track.muted);
          });
          const [remoteStream] = event.streams;
          console.log('[TRACK] Remote track received');
          if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStream) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current
              .play()
              .then(() => console.log('[AUDIO] Playback started'))
              .catch((err) => console.warn('[AUDIO] Playback error:', err));
          }
        };

        peer.onicecandidate = (event) => {
          console.log('[ICE] Candidate:', event.candidate);
          if (event.candidate && partnerId) {
            socket.emit('webrtc-ice-candidate', {
              to: partnerId,
              candidate: event.candidate,
            });
          }
        };

        peer.oniceconnectionstatechange = () => {
          console.log('[ICE] State:', peer.iceConnectionState);
        };

        socket.on('webrtc-offer', async ({ offer, from }) => {
          const readyForOffer = !makingOffer.current &&
                                (peer.signalingState === 'stable' || isPolite);

          if (!readyForOffer) {
            console.warn('[SIGNAL] Skipping offer — peer not in stable state:', peer.signalingState);
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
            console.error('[SIGNAL] Error handling offer:', err);
          } finally {
            isSettingRemoteAnswerPending.current = false;
          }
        });

        socket.on('webrtc-answer', async ({ answer, from }) => {
          try {
            if (peer.signalingState !== 'have-local-offer') {
              console.warn('[SIGNAL] Skipping answer — unexpected signaling state:', peer.signalingState);
              return;
            }
            await peer.setRemoteDescription(new RTCSessionDescription(answer));
            setPartnerId(from);
          } catch (err) {
            console.error('[SIGNAL] Failed to set remote answer:', err);
          }
        });

        socket.on('webrtc-ice-candidate', async ({ candidate, from }) => {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn('[ICE] Failed to add candidate:', err);
          }
        });

        socket.on('call-started', ({ from }) => {
          setPartnerId(from);
        });

        socket.emit('start-call', { chatRoomId });
      } catch (err) {
        console.error('[ERROR] Setup failed:', err);
      }
    };

    setupMedia();

    return () => {
      peerRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [chatRoomId]);

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
