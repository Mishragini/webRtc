"use client"
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [sendPc, setSendPC] = useState<RTCPeerConnection | null>(null);
  const [receivePc, setReceivePC] = useState<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const initSocket = new WebSocket('ws://localhost:8080');
    initSocket.onopen = () => {
      console.log("websocket conn stablished")
      initSocket.send(JSON.stringify({ type: 'add' }));
    };

    setSocket(initSocket);

    return () => {
      // initSocket.close(); // Close the socket on component unmount
    };
  }, []);

  useEffect(() => {
    if (!socket || !receivePc || !sendPc) return;
    socket.onmessage = async (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      if (message.type === 'createAnswer') {
        console.log("create Answer")
        await sendPc.setRemoteDescription(message.sdp);
      } else if (message.type === 'createOffer') {
        console.log("createOffer message")
        console.log("receivePc", receivePc)
        await receivePc.setRemoteDescription(message.sdp)
        const answer = await receivePc.createAnswer();
        await receivePc.setLocalDescription(answer);
        socket.send(JSON.stringify({
          type: 'createAnswer',
          sdp: receivePc.localDescription
        }));
      } else if (message.type === 'iceCandidate') {
        if(sendPc.remoteDescription)
        sendPc.addIceCandidate(message.candidate);
        if(receivePc.remoteDescription)
        receivePc.addIceCandidate(message.candidate);
      }
    };
  }, [socket, sendPc, receivePc])

  const initiateConn = async () => {
    if (!socket) {
      alert("Socket not found");
      return;
    }
    const newSendPc = new RTCPeerConnection();
    newSendPc.addTransceiver('video', { 'direction': 'sendrecv' });
    setSendPC(newSendPc);

    const newReceivePc = new RTCPeerConnection();
    newReceivePc.addTransceiver('video', { 'direction': 'sendrecv' });
    setReceivePC(newReceivePc);

    newSendPc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      console.log("sendPc ice candidate")
      if (event.candidate) {
        socket.send(JSON.stringify({
          type: 'iceCandidate',
          candidate: event.candidate
        }));
      }
    };

    newReceivePc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        socket.send(JSON.stringify({
          type: 'iceCandidate',
          candidate: event.candidate
        }));
      }
    };

    newSendPc.onnegotiationneeded = async () => {
      console.log("inside on negotiation needed")
      const offer = await newSendPc.createOffer();
      console.log("offer created")
      await newSendPc.setLocalDescription(offer);
      console.log("send pc local desc", newSendPc.localDescription)
      socket.send(JSON.stringify({
        type: 'createOffer',
        sdp: newSendPc.localDescription
      }));
      getCameraStreamAndSend(newSendPc)
    };

  };

  const getCameraStreamAndSend = async (sendPc: RTCPeerConnection) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((track) => {
        sendPc.addTrack(track, stream);
      });
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const startReceiving = (receivePc: RTCPeerConnection) => {
    // Setup to receive tracks
    receivePc.ontrack = (event: RTCTrackEvent) => {
      if (peerVideoRef.current && event.streams[0]) {
        peerVideoRef.current.srcObject = event.streams[0];
      }
    };
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="text-2xl font-bold mb-4">My Video</div>
      <video ref={videoRef} autoPlay className="w-full max-w-xl mb-4" />
      <button
        onClick={initiateConn}
        className="bg-blue-500 text-white px-4 py-2 rounded-md mb-4"
      >
        Start video streaming
      </button>
      <div className="text-2xl font-bold mb-4">Peer's Video</div>
      <video ref={peerVideoRef} className="w-full max-w-xl" autoPlay />
    </div>
  );
}