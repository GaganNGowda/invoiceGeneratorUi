import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFileUpload: (file: File) => void;
  disabled?: boolean;
}
const ChatInput = ({
  onSendMessage,
  onFileUpload,
  disabled,
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null); // Create a ref for the input element

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      // After sending, immediately re-focus the input if it's not disabled
      if (inputRef.current && !disabled) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent default Enter key behavior (like new line)
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  // Effect to re-focus the input when it becomes enabled
  // This is useful if the input was disabled (e.g., during bot typing) and then re-enabled.
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]); // Re-run this effect when the 'disabled' prop changes

  return (
    <div className="border-t bg-white p-3 sm:p-4 shadow-lg safe-area-inset-bottom">
      <div className="flex items-end gap-2 sm:gap-3 max-w-4xl mx-auto">
        {/* Upload Button */}
        <div className="relative flex-shrink-0">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx"
          />
          <Button
            variant="outline"
            size="icon"
            className="w-10 h-10 sm:w-12 sm:h-12 hover-scale rounded-full border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
            onClick={() => document.getElementById("file-upload")?.click()}
            disabled={disabled}
          >
            <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
          </Button>
        </div>

        {/* Input Field */}
        <div className="flex-1 relative min-w-0">
          <Input
            ref={inputRef} // Attach the ref to your Input component
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message about invoices..."
            disabled={disabled}
            className="pr-3 rounded-full border-2 border-gray-200 focus:border-purple-300 focus:ring-purple-100 py-2.5 sm:py-3 text-sm sm:text-base resize-none"
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          size="icon"
          className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 rounded-full hover-scale transition-all duration-200 flex-shrink-0",
            message.trim() && !disabled
              ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
              : "bg-gray-300"
          )}
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
