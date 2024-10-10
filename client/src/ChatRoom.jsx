/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { Copy, Send, Users, LogOut, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { HeroHighlight } from "./components/ui/hero-highlight";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "./components/ui/input-otp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { ScrollArea } from "./components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";

const socket = io("http://localhost:3000");

export default function ChatRoom() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [otp, setOtp] = useState("");
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [inRoom, setInRoom] = useState(false);
  const [countdown, setCountdown] = useState(600);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleConnect = () => {
      toast("Connected to the chat server");
    };

    const handleDisconnect = () => {
      toast("Disconnected from the chat server");
    };

    const handleRoomCreated = ({ roomId }) => {
      setRoomId(roomId);
      setInRoom(true);
      toast(`Room created with ID: ${roomId}`);
    };

    const handleUserJoined = ({ username, members }) => {
      setParticipants(members);
      toast(`${username} joined the room`);
    };

    const handleNewMessage = (messageObj) => {
      setMessages((prev) => [...prev, messageObj]);
    };

    const handleUserLeft = ({ username, members }) => {
      setParticipants(members);
      toast(`${username} left the room`);
    };

    const handleRoomDestroyed = () => {
      toast("Room has been destroyed");
      setInRoom(false);
      setRoomId("");
      setMessages([]);
      setParticipants([]);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("roomCreated", handleRoomCreated);
    socket.on("userJoined", handleUserJoined);
    socket.on("newMessage", handleNewMessage);
    socket.on("userLeft", handleUserLeft);
    socket.on("roomDestroyed", handleRoomDestroyed);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("roomCreated", handleRoomCreated);
      socket.off("userJoined", handleUserJoined);
      socket.off("newMessage", handleNewMessage);
      socket.off("userLeft", handleUserLeft);
      socket.off("roomDestroyed", handleRoomDestroyed);
    };
  }, []);

  useEffect(() => {
    let interval;
    if (inRoom) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [inRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createRoom = () => {
    if (username) {
      socket.emit("createRoom", username);
    } else {
      toast.error("Please enter a username");
    }
  };

  const joinRoom = () => {
    if (username && otp) {
      socket.emit("joinRoom", { roomId: otp, username });
      setRoomId(otp);
      setInRoom(true);
    } else {
      toast.error("Please enter both username and room code");
    }
  };

  const sendMessage = () => {
    if (currentMessage.trim() && roomId) {
      socket.emit("message", { roomId, message: currentMessage, username });
      setCurrentMessage("");
    }
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom", { roomId, username });
    setInRoom(false);
    setRoomId("");
    setMessages([]);
    setParticipants([]);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast("Room ID copied to clipboard");
  };

  if (inRoom) {
    return (
      <HeroHighlight>
        <main className="h-screen w-screen flex justify-center items-center">
          <Card className="w-[550px] h-[90vh] flex flex-col shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center">
                <CardTitle className="text-1xl">Chat Room: {roomId}</CardTitle>
                <Button size="icon" variant="ghost" onClick={copyRoomId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>
                  {Math.floor(countdown / 60)}:
                  {(countdown % 60).toString().padStart(2, "0")}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Users className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Participants</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {participants.map((participant, index) => (
                      <div key={index} className="px-2 py-1 text-sm">
                        {participant}
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" onClick={leaveRoom}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4 p-4">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        msg.username === username
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] p-2 rounded-lg ${
                          msg.username === username
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200"
                        }`}
                      >
                        <p className="font-bold text-sm">{msg.username}</p>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex-shrink-0">
              <div className="flex w-full space-x-2">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage}>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </CardFooter>
          </Card>
        </main>
      </HeroHighlight>
    );
  }

  return (
    <HeroHighlight>
      <main className="h-screen w-screen flex justify-center items-center">
        <Card className="w-[400px] shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              /terminate-d-chat
            </CardTitle>
            <CardDescription>
              Spin up a quick chat channel, auto-destruct in 10 minutes!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5 mb-4">
                  <Label htmlFor="name">Your Nickname</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    id="name"
                    placeholder="Enter your cool nickname"
                  />
                  <CardDescription className="text-sm">
                    Pick a name everyone can see
                  </CardDescription>
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="otp" className="pb-1">
                    Room Code
                  </Label>
                  <div className="flex justify-between w-full">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      className="w-4/5"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                    <Button className="w-full ml-2" onClick={joinRoom}>
                      Join
                    </Button>
                  </div>
                  <CardDescription className="text-sm">
                    Don&apos;t have a room? Make one and invite your crew
                  </CardDescription>
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button className="w-full" onClick={createRoom}>
              Create a New Room
            </Button>
            <CardDescription className="text-sm mt-3">
              Create or join a room and start chatting instantly!
            </CardDescription>
          </CardFooter>
        </Card>
      </main>
    </HeroHighlight>
  );
}
