import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface ChatMessage {
    type: 'user' | 'bot';
    content: string;
}

interface ChatMessagesProps {
    messages: ChatMessage[];
    isLoading: boolean;
}

// Helper function to render links and newlines
const renderMessageContent = (content: string) => {
    // Replace URLs with clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const contentWithLinks = content.replace(urlRegex, (url) => {
        return `<a href="${url}" rel="noopener noreferrer" class="text-blue-500 underline">${url}</a>`;
    });

    // Replace newlines with <br> tags
    const contentWithBreaks = contentWithLinks.split('\n').map((line, index) => (
        <span key={index}>
            {index > 0 && <br />}
            <span dangerouslySetInnerHTML={{ __html: line }} />
        </span>
    ));

    return contentWithBreaks;
};

const ChatMessages = ({ messages, isLoading }: ChatMessagesProps) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    return (
        <div className="h-[380px] overflow-y-auto p-4 space-y-4 scroll-smooth">
            {messages.map((message, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div
                        className={`max-w-[80%] p-3 rounded-2xl ${
                            message.type === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-none'
                        }`}
                    >
                        {renderMessageContent(message.content)}
                    </div>
                </motion.div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-2xl rounded-bl-none">
                        <div className="flex space-x-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-.3s]" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-.5s]" />
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default ChatMessages;