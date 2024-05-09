"use client"
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const[socket,setSocket] =useState<WebSocket|null>(null);
  const videoRef = useRef<HTMLVideoElement>(null)
  const peerVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080');
    setSocket(socket);
    socket.onopen = () => {
        socket.send(JSON.stringify({
            type: 'add'
        }));
    }
}, []);

  const initiateConn = async () => {
      if (!socket) {
        alert("Socket not found");
        return;
      }
      const sendPc = new RTCPeerConnection();
      const receivePc = new RTCPeerConnection();
      sendPc.onicecandidate = (event) =>{
        if (event.candidate) {
          socket?.send(JSON.stringify({
              type: 'iceCandidate',
              candidate: event.candidate
          }));
      }
    }
      sendPc.onnegotiationneeded = async () => {
        const offer = await sendPc.createOffer();
        const answer = await receivePc.createAnswer()
        await sendPc.setLocalDescription(offer);
        await receivePc.setLocalDescription(answer);
        socket?.send(JSON.stringify({
          type: 'createOffer',
          sdp: sendPc.localDescription
      }));
      socket?.send(JSON.stringify({
        type: 'createAnswer',
        sdp: receivePc.localDescription
      }));
      }

      socket.onmessage =async (event) => {
        const message =JSON.parse(event.data)
        if(message.type ==='createAnswer') {
          await sendPc.setRemoteDescription(message.sdp)
          startReceiving(receivePc);
        }else if(message.type ==='createOffer'){
          await receivePc.setRemoteDescription(message.sdp)
        }else if (message.type === 'iceCandidate') {
          sendPc.addIceCandidate(message.candidate);
          receivePc.addIceCandidate(message.candidate)
      }
      }
      getCameraStreamAndSend(sendPc);
    }
    const getCameraStreamAndSend = async (sendPc:RTCPeerConnection) => {
      const stream = await navigator.mediaDevices.getUserMedia({video:true});
      if(videoRef.current){
        videoRef.current.srcObject =stream
      }
      stream.getTracks().forEach((track) => {
        sendPc?.addTrack(track);
    });

    }
    const startReceiving = (receivePc:RTCPeerConnection) => {
      receivePc.ontrack = (event) =>{
        if(peerVideoRef.current){
          peerVideoRef.current.srcObject = new MediaStream ([event.track])
        }
      }
    }
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
      <video ref={peerVideoRef} className="w-full max-w-xl" autoPlay/>
    </div>
  );
}
