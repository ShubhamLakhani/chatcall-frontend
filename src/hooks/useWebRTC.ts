'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '~/libs/socket';

interface UseWebRTCParams {
  chatRoomId: string;
  userId: string;
  isInitiator: boolean;
}

export function useWebRTC({ chatRoomId, isInitiator }: UseWebRTCParams) {
  const [isMuted, setIsMuted] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);

  const socket = getSocket();
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

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

        console.log('[WEBRTC] Local stream tracks:', localStream.getTracks());
        localStream.getTracks().forEach((track) => {
          peer.addTrack(track, localStream);
          console.log('[WEBRTC] Added local track:', track.kind);
        });

        // === NEGOTIATION (Initiator) ===
        if (isInitiator) {
          peer.onnegotiationneeded = async () => {
            try {
              if (!partnerId) {
                console.warn('[NEGOTIATION] Skipped: No partnerId yet.');
                return;
              }
              makingOffer.current = true;
              const offer = await peer.createOffer();
              await peer.setLocalDescription(offer);
              console.log('[NEGOTIATION] Sending offer to', partnerId);
              socket.emit('webrtc-offer', { to: partnerId, offer });
            } catch (err) {
              console.error('[NEGOTIATION] Offer error:', err);
            } finally {
              makingOffer.current = false;
            }
          };
        }

        // === REMOTE TRACK ===
        peer.ontrack = (event) => {
          console.log('[TRACK] Remote track event:', event.track.kind);
          console.log('[TRACK] Stream:', event.streams[0]);
          setRemoteStream(event.streams[0]);
        };

        // === ICE ===
        peer.onicecandidate = (event) => {
          if (event.candidate && partnerId) {
            console.log('[ICE] Emitting candidate:', event.candidate.candidate);
            socket.emit('webrtc-ice-candidate', {
              to: partnerId,
              candidate: event.candidate,
            });
          }
        };

        peer.oniceconnectionstatechange = () => {
          console.log('[ICE] Connection state:', peer.iceConnectionState);
        };

        // === SIGNAL HANDLERS ===
        socket.on('webrtc-offer', async ({ offer, from }) => {
          console.log('[SIGNAL] Received offer from', from);
          const readyForOffer = !makingOffer.current && (peer.signalingState === 'stable' || isPolite);

          if (!readyForOffer) {
            console.warn('[SIGNAL] Skipped offer — signaling state:', peer.signalingState);
            return;
          }

          try {
            isSettingRemoteAnswerPending.current = true;
            await peer.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            setPartnerId(from);
            socket.emit('webrtc-answer', { to: from, answer });
          } catch (err) {
            console.error('[SIGNAL] Error handling offer:', err);
          } finally {
            isSettingRemoteAnswerPending.current = false;
          }
        });

        socket.on('webrtc-answer', async ({ answer, from }) => {
          console.log('[SIGNAL] Received answer from', from);
          try {
            if (peer.signalingState !== 'have-local-offer') {
              console.warn('[SIGNAL] Skipped answer — bad state:', peer.signalingState);
              return;
            }
            await peer.setRemoteDescription(new RTCSessionDescription(answer));
            setPartnerId(from);
          } catch (err) {
            console.error('[SIGNAL] Failed to set remote answer:', err);
          }
        });

        socket.on('webrtc-ice-candidate', async ({ candidate }) => {
          console.log('[SIGNAL] Received ICE candidate');
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn('[ICE] Failed to add candidate:', err);
          }
        });

        socket.on('call-started', async ({ from }) => {
          console.log('[CALL] Call started by', from);
          setPartnerId(from);

          // Manual offer trigger
          if (peer.signalingState === 'stable' && isInitiator) {
            console.log('[CALL] Retrying negotiation (manual trigger)...');
            try {
              makingOffer.current = true;
              const offer = await peer.createOffer();
              await peer.setLocalDescription(offer);
              socket.emit('webrtc-offer', { to: from, offer });
              console.log('[CALL] Offer re-sent manually to', from);
            } catch (err) {
              console.error('[CALL] Manual negotiation error:', err);
            } finally {
              makingOffer.current = false;
            }
          }
        });

        socket.emit('start-call', { chatRoomId });
      } catch (err) {
        console.error('[WEBRTC] Error setting up media:', err);
      }
    };

    setupMedia();

    return () => {
      peerRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [chatRoomId]);

  // === Audio DOM Hook ===
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current
        .play()
        .then(() => console.log('[AUDIO] Playback started'))
        .catch((err) => {
          console.warn('[AUDIO] Playback failed:', err);
          alert('Click anywhere to resume audio playback');
        });
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
