import { cn } from "@/lib/utils";
import React from "react"; // Import React

interface ChatMessageProps {
  message: React.ReactNode; // Changed from 'string' to 'React.ReactNode'
  isBot: boolean;
  timestamp?: string;
}

const ChatMessage = ({ message, isBot, timestamp }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex w-full mb-3 sm:mb-4 animate-fade-in px-1 sm:px-0",
        isBot ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[80%] md:max-w-[75%] lg:max-w-[70%] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm break-words",
          isBot
            ? "bg-gray-100 text-gray-800 rounded-bl-sm"
            : "bg-blue-500 text-white rounded-br-sm"
        )}
      >
        {isBot && (
          <div className="flex items-center gap-2 mb-1 min-w-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">AI</span>
            </div>
            <span className="text-xs font-medium text-gray-600 truncate">
              Invoice Generator
            </span>
          </div>
        )}
        {/* Render message directly, now it can be a string or JSX */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
        {timestamp && (
          <p
            className={cn(
              "text-xs mt-2 opacity-70",
              isBot ? "text-gray-500" : "text-blue-100"
            )}
          >
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
