'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../../../config';
import ChatHeader from './section/ChatHeader';
import ChatMessages from './section/ChatMessages';
import ChatInput from './section/ChatInput';
import ChatToggleButton from './section/ChatToggleButton';

interface ChatMessage {
    type: 'user' | 'bot';
    content: string;
}

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null); // Separate ref for the stream
    const timeoutRef = useRef<NodeJS.Timeout | null>(null); // For setTimeout cleanup

    // Get email safely with SSR check
    const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;

    // Memoized scroll function
    const scrollToBottom = useCallback(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, []);

    // Auto-scroll with cleanup
    useEffect(() => {
        timeoutRef.current = setTimeout(scrollToBottom, 100);
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [messages, isOpen, scrollToBottom]);

    // Fetch chat history with cleanup
    const fetchChatHistory = useCallback(async (signal?: AbortSignal) => {
        if (!email) return;
        
        try {
            setIsLoading(true);
            const response = await axios.get(`${API_URL}/chatbot/chats?email=${email}`, {
                signal
            });
            
            if (!signal?.aborted) {
                const chats = response.data;
                const chatMessages = chats.flatMap((chat: { message: string; response: string }) => [
                    { type: 'user' as const, content: chat.message },
                    { type: 'bot' as const, content: chat.response },
                ]);
                setMessages(chatMessages);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error('Error fetching chat history:', error);
            }
        } finally {
            if (!signal?.aborted) {
                setIsLoading(false);
            }
        }
    }, [email]);

    // Load chat history when opened
    useEffect(() => {
        if (!isOpen || !email) return;

        const controller = new AbortController();
        fetchChatHistory(controller.signal);

        return () => {
            controller.abort();
        };
    }, [isOpen, email, fetchChatHistory]);

    // Handle sending messages with cleanup
    const handleSendMessage = useCallback(async () => {
        if (!inputMessage.trim()) return;

        const newMessage = { type: 'user' as const, content: inputMessage };
        setMessages(prev => [...prev, newMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_URL}/chatbot/query`, {
                message: inputMessage,
                email: email || 'guest@example.com',
            });

            setMessages(prev => [...prev, { type: 'bot', content: response.data.response }]);
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error('Error sending message:', error);
                setMessages(prev => [...prev, { 
                    type: 'bot', 
                    content: 'Sorry, I encountered an error. Please try again.' 
                }]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [inputMessage, email]);

    // Voice recording handlers with proper cleanup
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream; // Store stream separately
            
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            const audioChunks: BlobPart[] = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                try {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    const formData = new FormData();
                    formData.append('audio', audioBlob);

                    const response = await axios.post(`${API_URL}/chatbot/voice`, formData);
                    setInputMessage(response.data.text);
                } catch (error) {
                    if (!axios.isCancel(error)) {
                        console.error('Error processing voice:', error);
                    }
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            setIsRecording(false);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        // Stop all tracks in the stream to release microphone
        streamRef.current?.getTracks().forEach(track => track.stop());
        setIsRecording(false);
    }, []);

    // Cleanup all resources on unmount
    useEffect(() => {
        return () => {
            // Clean up any active recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            
            // Release media stream
            streamRef.current?.getTracks().forEach(track => track.stop());
            
            // Clear any pending timeouts
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Delete chat history
    const deleteHistory = useCallback(async () => {
        try {
            await axios.delete(`${API_URL}/chatbot/chats?email=${email}`);
            setMessages([]);
        } catch (error) {
            console.error('Error deleting chat history:', error);
        }
    }, [email]);

    // Sync logout between V-Tickets and Chatbot
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'userEmail' && event.newValue === null) {
                setMessages([]);
                setIsOpen(false);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="absolute bottom-20 right-0 w-[380px] h-[510px] bg-white dark:bg-gray-800 
                                     rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
                    >
                        <ChatHeader onClose={() => setIsOpen(false)} deleteHistory={deleteHistory} />
                        <ChatMessages messages={messages} isLoading={isLoading} />
                        <ChatInput
                            inputMessage={inputMessage}
                            isRecording={isRecording}
                            onInputChange={(e) => setInputMessage(e.target.value)}
                            onSendMessage={handleSendMessage}
                            onStartRecording={startRecording}
                            onStopRecording={stopRecording}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <ChatToggleButton onClick={() => setIsOpen(!isOpen)} />
        </div>
    );
};

export default ChatBot;