import {WebSocket , WebSocketServer} from 'ws' ;

const wss = new WebSocketServer({ port : 8080 })

let senderSockets : WebSocket[] = [];
let receiverSockets : WebSocket[] = [];


wss.on('connection',(ws)=>{
    ws.on('error',console.error);

    ws.on('message' , (data:string)=>{
        const message = JSON.parse(data);

        if(message.type === 'add') {
            senderSockets.push(ws);
            receiverSockets.push(ws);
        }else if (message.type === 'createOffer') {
            if (!senderSockets.includes(ws)) return;
            receiverSockets.forEach((receiverSocket: WebSocket)=> {
                if(receiverSocket === ws) return;
                receiverSocket.send(JSON.stringify({ type: 'createOffer', sdp: message.sdp }));
            });
            
        }else if (message.type === 'createAnswer') {
            if(!receiverSockets.includes(ws)) return;
            senderSockets.forEach((senderSocket:WebSocket)=>{
             if(senderSocket === ws) return ;
             senderSocket.send(JSON.stringify({type:'createOffer',sdp :message.sdp}))
            })
        }else if (message.type === 'iceCandidate'){
            if (senderSockets.includes(ws)) {
                receiverSockets.forEach((receiverSocket:WebSocket)=>{
                receiverSocket?.send(JSON.stringify({ type: 'iceCandidate', candidate: message.candidate }));
                })
              } else if (receiverSockets.includes(ws)) {
                senderSockets.forEach((senderSocket:WebSocket)=>{
                senderSocket?.send(JSON.stringify({ type: 'iceCandidate', candidate: message.candidate }));
                })
              }
        }
    })
})

wss.on('listening', () => {
    console.log('WebSocket server is listening on port 8080');
});

wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
});
