import { FaMicrophone, FaPaperPlane } from 'react-icons/fa';

interface ChatInputProps {
    inputMessage: string;
    isRecording: boolean;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSendMessage: () => void;
    onStartRecording: () => void;
    onStopRecording: () => void;
}

const ChatInput = ({
    inputMessage,
    isRecording,
    onInputChange,
    onSendMessage,
    onStartRecording,
    onStopRecording,
}: ChatInputProps) => {
    return (
        <div className="p-4 border-t dark:border-gray-700">
            <div className="flex items-center gap-2">
                <button
                    onClick={isRecording ? onStopRecording : onStartRecording}
                    className={`p-2 rounded-full transition-colors ${
                        isRecording
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                    <FaMicrophone />
                </button>
                <input
                    type="text"
                    value={inputMessage}
                    onChange={onInputChange}
                    onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 p-2 rounded-xl border dark:border-gray-700 bg-gray-100 dark:bg-gray-700
                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={onSendMessage}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                >
                    <FaPaperPlane />
                </button>
            </div>
        </div>
    );
};

export default ChatInput;