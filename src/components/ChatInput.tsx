import { useState, useRef, useEffect, forwardRef, Ref } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFileUpload: (file: File) => void;
  disabled?: boolean;
}

const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  ({ onSendMessage, onFileUpload, disabled }, ref: Ref<HTMLInputElement>) => {
    const [message, setMessage] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Effect to focus the input field
    // This effect runs when disabled status changes or when the message state changes (e.g., after clearing)
    useEffect(() => {
      const inputElement = (ref as React.MutableRefObject<HTMLInputElement>)
        ?.current;
      if (inputElement && !disabled) {
        // Use a slight delay to ensure the DOM has updated and is ready to receive focus,
        // especially after a state change that might re-render.
        setTimeout(() => {
          inputElement.focus();
          // Optional: On some mobile browsers, selecting the text can also help keep keyboard open
          // inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
        }, 50); // Small delay
      }
    }, [disabled, message, ref]); // Added `message` and `ref` to dependencies

    const handleSend = () => {
      const trimmedMessage = message.trim();
      if (trimmedMessage && !disabled) {
        onSendMessage(trimmedMessage);
        setMessage(""); // <--- This line is responsible for clearing the input's state
        // The useEffect above will handle the focus due to `message` state change
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
        e.target.value = ""; // Clear the file input selection for next upload
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
              ref={ref} // *** Pass the forwarded ref here to your Input component ***
              value={message} // *** Input value is controlled by 'message' state ***
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message about invoices..."
              disabled={disabled}
              // Add inputMode for better mobile keyboard hints
              type="text" // Ensure it's text type
              inputMode="text" // Suggest a regular text keyboard
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

ChatInput.displayName = "ChatInput";
export default ChatInput;
