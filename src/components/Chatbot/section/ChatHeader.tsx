import { FaRobot, FaTimes, FaTrash } from 'react-icons/fa';

interface ChatHeaderProps {
    onClose: () => void;
    deleteHistory: () => void;
}

const ChatHeader = ({ onClose, deleteHistory }: ChatHeaderProps) => {


    return (
        <div className="p-4 bg-blue-600 text-white flex justify-between items-center  pt-4">
            <div className="flex items-center gap-2 justify-center">
                <FaRobot className="text-xl" />
                <h3 className="font-semibold">Virtual Assistant</h3>
            </div>
            <div className="flex items-center gap-2 justify-center">
                <button
                    onClick={deleteHistory}
                    className="p-1 hover:bg-blue-700 rounded-full transition-colors"
                >
                    <FaTrash />
                </button>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-blue-700 rounded-full transition-colors"
                >
                    <FaTimes />
                </button>
            </div>
        </div>
    );
};

export default ChatHeader;