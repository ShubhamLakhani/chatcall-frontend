'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '~/libs/socket';

interface UseWebRTCParams {
  chatRoomId: string;
  userId: string;
  isInitiator: boolean;
}

const webrtcDebug = typeof window !== 'undefined' ? (window as typeof window & { __webrtc_debug__?: Window['__webrtc_debug__'] }).__webrtc_debug__ : undefined;

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
    const setupConnection = async () => {
      try {
        console.log('[STEP] 1: Getting local stream...');
        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[MEDIA] Got local stream:', localStream);
        console.log('[STEP] 2: Got local stream', localStream.getTracks());

        localStreamRef.current = localStream;

        const peer = new RTCPeerConnection(rtcConfig);
        console.log('[STEP] 3: Created RTCPeerConnection');
        peerRef.current = peer;

        peerRef.current.onicecandidateerror = (e) => {
          console.error('[ICE] Candidate error:', e.errorText);
        };
        // localStream.getTracks().forEach((track) => {
        //   peer.addTrack(track, localStream);
        //   console.log('[WEBRTC] Added local track:', track.kind);
        // });

        localStream.getTracks().forEach((track) => {
          peer.addTrack(track, localStream);
          console.log('[STEP] 4: Added track:', track.kind);
        
          if (track.kind === 'audio') {
            webrtcDebug?.setLocalTrackStatus({
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
            });
          }
        });

        // peer.ontrack = (event) => {
        //   console.log('[TRACK] Remote track received:', event.streams[0]);
        //   setRemoteStream(event.streams[0]);
        // };

        peer.ontrack = (event) => {
          const [audioTrack] = event.streams[0].getAudioTracks();
          webrtcDebug?.setRemoteTrackStatus({
            enabled: audioTrack.enabled,
            muted: audioTrack.muted,
            readyState: audioTrack.readyState,
          });

          setRemoteStream(event.streams[0]);
        };

        // peer.onicecandidate = (event) => {
        //   if (event.candidate && partnerId) {
        //     console.log('[ICE] Sending candidate to:', partnerId);
        //     socket.emit('webrtc-ice-candidate', {
        //       to: partnerId,
        //       candidate: event.candidate,
        //     });
        //   }
        // };

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            const type = event.candidate.candidate.split(' ')[7];
            webrtcDebug?.pushICE(type);

            if (partnerId) {
              socket.emit('webrtc-ice-candidate', {
                to: partnerId,
                candidate: event.candidate,
              });
            }
          }
        };


        peer.oniceconnectionstatechange = () => {
          console.log('[ICE] Connection state:', peer.iceConnectionState);
        };

        // Signaling handlers
        socket.on('webrtc-offer', async ({ offer, from }) => {
          console.log('[SIGNAL] Got offer from', from);
          setPartnerId(from);
          const peer = peerRef.current;
          if (!peer) {
            console.warn('[SIGNAL] Peer connection is null');
            return;
          }
          const ready = !makingOffer.current && (peer.signalingState === 'stable' || isPolite);

          if (!ready) {
            console.warn('[SIGNAL] Skipping offer — peer not ready');
            return;
          }

          try {
            isSettingRemoteAnswerPending.current = true;
            await peer.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit('webrtc-answer', { to: from, answer });
          } catch (err) {
            console.error('[SIGNAL] Offer error:', err);
          } finally {
            isSettingRemoteAnswerPending.current = false;
          }
        });

        socket.on('webrtc-answer', async ({ answer, from }) => {
          console.log('[SIGNAL] Got answer from', from);
          setPartnerId(from);
          try {
            await peer.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (err) {
            console.error('[SIGNAL] Answer error:', err);
          }
        });

        socket.on('webrtc-ice-candidate', async ({ candidate }) => {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn('[ICE] Candidate error:', err);
          }
        });

        socket.on('call-started', async ({ from }) => {
          console.log('[CALL] Started by:', from);
          setPartnerId(from);

          // MANUALLY trigger negotiation when partnerId is ready
          if (isInitiator) {
            try {
              makingOffer.current = true;
              const offer = await peer.createOffer();
              await peer.setLocalDescription(offer);
              socket.emit('webrtc-offer', { to: from, offer });
              console.log('[CALL] Offer sent to', from);
            } catch (err) {
              console.error('[CALL] Offer error:', err);
            } finally {
              makingOffer.current = false;
            }
          }
        });

        // Kick off call
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

  // assign stream to <audio> once it's ready
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
