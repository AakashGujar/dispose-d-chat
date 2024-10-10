import express from "express";
import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "https://dispose-d-chat.vercel.app",
        methods: ["GET", "POST"],
        credentials: true,
    }
});

app.use(cors({
    origin: process.env.FRONTEND_URL || "https://dispose-d-chat.vercel.app",
    credentials: true
}));

// Store active rooms and their timers
const activeRooms = new Map();
const roomTimers = new Map();

io.on('connection', (socket) => {
    socket.on('createRoom', (username) => {
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Create new room
        activeRooms.set(roomId, {
            members: new Set([username]),
            messages: []
        });
        
        socket.join(roomId);
        
        // Set room destruction timer (10 minutes)
        const timer = setTimeout(() => {
            if (activeRooms.has(roomId)) {
                io.to(roomId).emit('roomDestroyed');
                io.in(roomId).socketsLeave(roomId);
                activeRooms.delete(roomId);
                roomTimers.delete(roomId);
            }
        }, 10 * 60 * 1000);
        
        roomTimers.set(roomId, timer);
        
        socket.emit('roomCreated', { roomId });
    });

    socket.on('joinRoom', ({ roomId, username }) => {
        const room = activeRooms.get(roomId);
        
        if (room) {
            socket.join(roomId);
            room.members.add(username);
            
            io.to(roomId).emit('userJoined', {
                username,
                members: Array.from(room.members)
            });
            
            // Send recent messages to the joining user
            socket.emit('messageHistory', room.messages);
        } else {
            socket.emit('error', { message: 'Invalid room code' });
        }
    });

    socket.on('message', ({ roomId, message, username }) => {
        const room = activeRooms.get(roomId);
        if (room) {
            const messageObj = {
                username,
                message,
                timestamp: Date.now()
            };
            
            room.messages.push(messageObj);
            
            // Keep only last 100 messages
            if (room.messages.length > 100) {
                room.messages.shift();
            }
            
            io.to(roomId).emit('newMessage', messageObj);
        }
    });

    socket.on('leaveRoom', ({ roomId, username }) => {
        const room = activeRooms.get(roomId);
        if (room) {
            room.members.delete(username);
            socket.leave(roomId);
            
            // If room is empty, clean it up
            if (room.members.size === 0) {
                const timer = roomTimers.get(roomId);
                if (timer) clearTimeout(timer);
                roomTimers.delete(roomId);
                activeRooms.delete(roomId);
            } else {
                io.to(roomId).emit('userLeft', {
                    username,
                    members: Array.from(room.members)
                });
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});