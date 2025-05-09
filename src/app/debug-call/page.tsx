// 'use client';

// import { useEffect, useRef, useState } from 'react';

// export default function DebugCallPage() {
//   const [socketId, setSocketId] = useState('');
//   const [partnerId, setPartnerId] = useState('');
//   const [connectionState, setConnectionState] = useState('');
//   const [logs, setLogs] = useState<string[]>([]);

//   const socket = useRef<any>(null);
//   const peer = useRef<RTCPeerConnection | null>(null);
//   const localAudioRef = useRef<HTMLAudioElement>(null);
//   const remoteAudioRef = useRef<HTMLAudioElement>(null);

//   const log = (msg: string) => {
//     console.log(msg);
//     setLogs((prev) => [...prev, msg]);
//   };

//   useEffect(() => {
//     socket.current = io('http://192.168.1.21:5001'); // Change if needed
//     socket.current.on('connect', () => {
//       setSocketId(socket.current.id);
//       log(`Connected: ${socket.current.id}`);
//     });

//     navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
//       if (localAudioRef.current) {
//         localAudioRef.current.srcObject = stream;
//       }

//       peer.current = new RTCPeerConnection({
//         iceServers: [
//           { urls: 'stun:stun.l.google.com:19302' },
//           {
//             urls: 'turn:openrelay.metered.ca:80',
//             username: 'openrelayproject',
//             credential: 'openrelayproject',
//           },
//         ],
//       });

//       stream.getTracks().forEach((track) => peer.current?.addTrack(track, stream));

//       peer.current.onicecandidate = (e) => {
//         if (e.candidate && partnerId) {
//           socket.current.emit('debug-candidate', { to: partnerId, candidate: e.candidate });
//           log('Sent ICE candidate');
//         }
//       };

//       peer.current.onconnectionstatechange = () => {
//         const state = peer.current?.connectionState || '';
//         setConnectionState(state);
//         log(`Connection state: ${state}`);
//       };

//       peer.current.ontrack = (e) => {
//         log('Remote track received');
//         const remoteStream = e.streams[0];
//         if (remoteAudioRef.current) {
//           remoteAudioRef.current.srcObject = remoteStream;
//           remoteAudioRef.current.play().catch((err) => log('Audio play error: ' + err));
//         }
//       };

//       socket.current.on('debug-call-started', async ({ from }: { from: string }) => {
//         setPartnerId(from);
//         log(`Call started with ${from}`);
//         const offer = await peer.current?.createOffer();
//         await peer.current?.setLocalDescription(offer);
//         socket.current.emit('debug-offer', { to: from, offer });
//       });

//       socket.current.on('debug-offer', async ({ offer, from }: any) => {
//         setPartnerId(from);
//         await peer.current?.setRemoteDescription(new RTCSessionDescription(offer));
//         const answer = await peer.current?.createAnswer();
//         await peer.current?.setLocalDescription(answer);
//         socket.current.emit('debug-answer', { to: from, answer });
//         log('Received offer and sent answer');
//       });

//       socket.current.on('debug-answer', async ({ answer }: any) => {
//         await peer.current?.setRemoteDescription(new RTCSessionDescription(answer));
//         log('Received answer');
//       });

//       socket.current.on('debug-candidate', async ({ candidate }: any) => {
//         await peer.current?.addIceCandidate(new RTCIceCandidate(candidate));
//         log('Received ICE candidate');
//       });
//     });
//   }, []);

//   const startCall = () => {
//     socket.current.emit('debug-call', { chatRoomId: 'test-room' });
//     log('Started call signal');
//   };

//   return (
//     <div className="p-4">
//       <h1 className="text-xl font-bold">WebRTC Debug Test</h1>
//       <p className="text-sm text-gray-600 mb-2">Socket ID: {socketId}</p>
//       <p className="text-sm text-gray-600 mb-2">Connection: {connectionState}</p>
//       <button
//         onClick={startCall}
//         className="bg-blue-600 text-white px-4 py-2 rounded shadow"
//       >
//         Start Debug Call
//       </button>

//       <div className="mt-4">
//         <h2 className="font-semibold">Logs</h2>
//         <pre className="bg-gray-100 p-2 h-64 overflow-auto text-sm">{logs.join('\n')}</pre>
//       </div>

//       <audio ref={localAudioRef} controls className="mt-4" />
//       <audio ref={remoteAudioRef} controls className="mt-2" />
//     </div>
//   );
// }
