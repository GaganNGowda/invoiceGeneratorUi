import { useState, useRef, useEffect, forwardRef, Ref } from "react"; // Import forwardRef and Ref
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFileUpload: (file: File) => void;
  disabled?: boolean;
}

// Convert to a functional component that forwards a ref
const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  ({ onSendMessage, onFileUpload, disabled }, ref: Ref<HTMLInputElement>) => {
    // Accept the forwarded ref
    const [message, setMessage] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the hidden file input

    // Effect to focus the input field
    // This will run when the component mounts, when `disabled` state changes,
    // or when `message` is cleared (after send).
    useEffect(() => {
      // Ensure the input exists and is not disabled before attempting to focus
      if (
        ref &&
        (ref as React.MutableRefObject<HTMLInputElement>).current &&
        !disabled
      ) {
        (ref as React.MutableRefObject<HTMLInputElement>).current.focus();
      }
    }, [disabled, message, ref]); // Add `message` and `ref` to dependencies

    const handleSend = () => {
      if (message.trim() && !disabled) {
        onSendMessage(message.trim());
        setMessage(""); // Clear the message input
        // The useEffect above will handle focusing after `setMessage("")` causes a re-render.
        // No explicit focus call needed here if useEffect handles it.
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
        e.target.value = ""; // Clear the file input selection
      }
    };

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
              ref={fileInputRef} // Assign ref to the hidden file input
            />
            <Button
              variant="outline"
              size="icon"
              className="w-10 h-10 sm:w-12 sm:h-12 hover-scale rounded-full border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
              onClick={() => fileInputRef.current?.click()} // Use ref.current?.click()
              disabled={disabled}
            >
              <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            </Button>
          </div>

          {/* Input Field */}
          <div className="flex-1 relative min-w-0">
            <Input
              ref={ref} // *** This is the key: attach the forwarded ref to your Input component ***
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
  }
);

ChatInput.displayName = "ChatInput"; // Good for React DevTools
export default ChatInput;
