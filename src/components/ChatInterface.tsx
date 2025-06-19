import { useState, useRef, useEffect } from "react";
// Corrected import paths to use the configured path alias '@/'
// Assuming ChatMessage.tsx and ChatInput.tsx are located directly under 'src/components/'
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { useToast } from "@/hooks/use-toast";
import {
  sendChatMessageToBot,
  // Removed direct uploadFileToBackend here as we'll use a specific OCR one
  downloadInvoicePdfFrontend, // Keep if still needed for direct download action
  uploadImageForOcr, // New import for OCR specific upload
} from "@/api/zohoService";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import React from "react";

// Define the message interface for consistent structure
interface Message {
  id: string;
  text: React.ReactNode; // Can be string or JSX for rich content
  isBot: boolean;
  timestamp: string;
}

// Define the conversation context interface for state management
interface ConversationContext {
  status?: string;
  next_field?: string;
  customer_data?: { [key: string]: string };
  invoice_data?: { [key: string]: any };
  all_available_items?: any[]; // Added for consistency with backend context
  current_item_id?: string;
  current_item_name?: string;
  invoice_collection_sub_status?: string;
  return_flow?: string;
  return_phone?: string;
  return_invoice_data?: { [key: string]: any };
  extracted_contact_info?: { [key: string]: any }; // Added for clarity on frontend context
}

const ChatInterface = () => {
  // Initial message displayed when the chat starts or is reset
  const initialBotMessage: Message = {
    id: "1",
    text: "Hello! I'm your Invoice Generator AI assistant. I can help you create, analyze, and manage invoices. How can I assist you today?",
    isBot: true,
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  // State to manage chat messages
  const [messages, setMessages] = useState<Message[]>([initialBotMessage]);
  // State to indicate if the bot is "typing" (processing a response)
  const [isTyping, setIsTyping] = useState(false);
  // Ref for scrolling messages into view
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Toast hook for notifications
  const { toast } = useToast();

  // State to maintain conversation context (e.g., current step in a multi-turn flow)
  const [conversationContext, setConversationContext] =
    useState<ConversationContext>({});
  // Unique session ID for the conversation (can be dynamic for multi-user apps)
  const SESSION_ID = "my_unique_chat_session";

  // Effect to scroll to the bottom of the chat when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper function to scroll to the bottom of the chat window
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Helper function to add a new message to the chat state
  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  // Handles sending user text messages to the backend
  const handleSendMessage = async (messageText: string) => {
    // Add user's message to the chat
    addMessage({
      id: Date.now().toString(),
      text: messageText,
      isBot: false,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    setIsTyping(true); // Show typing indicator

    try {
      // Send message to the backend's main conversational endpoint
      const backendResponse = await sendChatMessageToBot(
        messageText,
        SESSION_ID,
        conversationContext // Pass current conversation context
      );

      // Update conversation context based on backend's response
      if (backendResponse.context) {
        setConversationContext(backendResponse.context);
      } else {
        // If context is not returned, clear it for specific actions indicating flow completion
        if (
          backendResponse.action === "customer_created" ||
          backendResponse.action === "customer_exists" ||
          backendResponse.action === "customer_creation_failed" ||
          backendResponse.action === "reset_success" ||
          backendResponse.action === "invoice_created" ||
          backendResponse.action === "invoice_creation_failed" ||
          backendResponse.action === "invoice_creation_error" ||
          backendResponse.action === "list_items" // Clearing context after listing items
        ) {
          setConversationContext({}); // Clear context to start fresh
        }
      }

      let botResponseText: React.ReactNode =
        "I'm not sure how to respond to that.";

      // Handle different actions from the backend
      switch (backendResponse.action) {
        case "general_response":
          botResponseText = backendResponse.message;
          break;
        case "list_items":
          botResponseText = backendResponse.message;
          break;
        case "ask_question":
          botResponseText = backendResponse.message;
          break;
        case "request_invoice_info": // This action might not be explicitly returned by the backend logic, but keep for robustness
          botResponseText = backendResponse.message;
          break;
        case "customer_created":
          botResponseText =
            backendResponse.message ||
            `Customer created with ID: ${backendResponse.contact_id}`;
          toast({
            title: "Customer Created!",
            description: `ID: ${backendResponse.contact_id}`,
          });
          break;
        case "customer_exists":
          botResponseText =
            backendResponse.message ||
            `Customer already exists with ID: ${backendResponse.contact_id}`;
          toast({
            title: "Customer Found!",
            description: `ID: ${backendResponse.contact_id}`,
          });
          break;
        case "customer_creation_failed":
        case "customer_creation_error":
          botResponseText =
            backendResponse.message || "Failed to complete customer creation.";
          toast({
            title: "Customer Creation Failed",
            description: backendResponse.message,
            variant: "destructive",
          });
          break;
        case "invoice_created":
          // Construct message with clickable link for PDF download
          if (backendResponse.invoice_id && backendResponse.pdf_url) {
            botResponseText = (
              <>
                {backendResponse.message}&nbsp;
                <a
                  href={backendResponse.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`invoice_${backendResponse.invoice_id}.pdf`}
                  className="text-blue-500 hover:text-blue-700 underline cursor-pointer"
                  onClick={(e) => {
                    // This onClick is for user feedback, actual download is by href+download
                    toast({
                      title: "Initiating Download",
                      description: `Invoice PDF for ${backendResponse.invoice_id} should start downloading.`,
                    });
                  }}
                >
                  Download PDF
                </a>
              </>
            );
          } else {
            botResponseText =
              backendResponse.message ||
              `Invoice created successfully with ID: ${backendResponse.invoice_id}. PDF processed on backend.`;
          }
          toast({
            title: "Invoice Created!",
            description: `ID: ${backendResponse.invoice_id}`,
          });
          break;
        case "invoice_creation_failed":
        case "invoice_creation_error":
          botResponseText =
            backendResponse.message || "Failed to complete invoice creation.";
          toast({
            title: "Invoice Creation Failed",
            description: backendResponse.message,
            variant: "destructive",
          });
          break;
        case "reset_success":
          botResponseText = backendResponse.message || "Chat has been reset.";
          setMessages([initialBotMessage]); // Clear all messages and show initial bot message
          break;
        case "file_uploaded": // This action is typically from /upload-document, not /process-ocr
          // This case might be less relevant now if all image uploads go through OCR
          botResponseText =
            backendResponse.message || `File uploaded successfully.`;
          if (backendResponse.extracted_data) {
            botResponseText += `\nExtracted data: \n\`\`\`json\n${JSON.stringify(
              backendResponse.extracted_data,
              null,
              2
            )}\n\`\`\``;
          }
          toast({
            title: "File Uploaded",
            description: `File processed.`,
          });
          break;
        case "error":
        case "customer_lookup_error":
          botResponseText = `❌ Error: ${
            backendResponse.message || "An unknown error occurred."
          }`;
          toast({
            title: "API Error",
            description: botResponseText,
            variant: "destructive",
          });
          break;
        default:
          botResponseText = `Backend response received, but action '${
            backendResponse.action
          }' is unhandled. Message: ${
            backendResponse.message || JSON.stringify(backendResponse)
          }`;
      }

      // Add bot's response to the chat
      addMessage({
        id: (Date.now() + 1).toString(),
        text: botResponseText,
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    } catch (error: any) {
      console.error("Error communicating with backend:", error);
      addMessage({
        id: Date.now().toString(),
        text: `❌ Failed to connect to backend or process request: ${
          error.message || "Unknown error"
        }. Please check console for details.`,
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      setConversationContext({}); // Clear context on communication error
    } finally {
      setIsTyping(false); // Hide typing indicator
    }
  };

  // Handles file uploads, specifically for OCR processing
  const handleFileUpload = async (file: File) => {
    // Add user's "uploading" message to chat
    addMessage({
      id: Date.now().toString(),
      text: `📎 Uploading and processing: ${file.name}...`,
      isBot: false,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    setIsTyping(true); // Show typing indicator

    try {
      // Call the new OCR specific upload function
      const ocrResult = await uploadImageForOcr(file);

      if (ocrResult.text) {
        // Step 1: Add the extracted text as a "bot" message initially,
        // then immediately process it as if the user sent it.
        // This gives feedback that text was extracted.
        addMessage({
          id: (Date.now() + 1).toString(),
          text: `🤖 Extracted from image: "${ocrResult.text}"`,
          isBot: true, // Display as bot message
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });

        // Step 2: Now, "send" this extracted text as if the user typed it.
        // This will trigger the main conversational flow in handleSendMessage.
        // Pass the extracted text to handleSendMessage.
        // We need to delay this slightly to ensure the "extracted from image" message renders first.
        // A direct call might process too fast.
        setTimeout(() => {
          handleSendMessage(ocrResult.text);
        }, 100); // Small delay to allow UI to update
      } else {
        // If no text was extracted, inform the user
        addMessage({
          id: (Date.now() + 1).toString(),
          text: `❌ No text could be extracted from "${file.name}". Please try another image or type your request.`,
          isBot: true,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      }
    } catch (error: any) {
      console.error("Error processing OCR:", error);
      addMessage({
        id: (Date.now() + 1).toString(),
        text: `❌ Failed to perform OCR on "${file.name}": ${
          error.message || "Unknown error"
        }. Please ensure Tesseract/Poppler are installed on the backend.`,
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    } finally {
      setIsTyping(false); // Hide typing indicator
    }
  };

  // Handles resetting the chat conversation
  const handleResetChat = async () => {
    setIsTyping(true); // Show typing indicator
    try {
      // Send a special command to the backend to reset its session state
      const backendResponse = await sendChatMessageToBot(
        "reset_conversation_command",
        SESSION_ID,
        {} // No context needed for reset command
      );

      // Check if backend confirmed reset
      if (backendResponse.action === "reset_success") {
        setMessages([initialBotMessage]); // Clear all messages except initial bot message
        setConversationContext({}); // Clear frontend context
        toast({
          title: "Chat Reset",
          description:
            backendResponse.message || "Conversation successfully reset.",
        });
      } else {
        // If backend reset failed, still clear frontend for a fresh start
        toast({
          title: "Reset Failed",
          description:
            backendResponse.message ||
            "Failed to reset conversation on the backend. Clearing local chat.",
          variant: "destructive",
        });
        setMessages([initialBotMessage]);
        setConversationContext({});
      }
    } catch (error: any) {
      // Handle network or other errors during reset attempt
      console.error("Error resetting chat with backend:", error);
      toast({
        title: "Reset Error",
        description:
          "Could not communicate with backend to reset. Local chat cleared.",
        variant: "destructive",
      });
      setMessages([initialBotMessage]); // Clear local chat
      setConversationContext({}); // Clear local context
    } finally {
      setIsTyping(false); // Hide typing indicator
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header - Responsive */}
      <div className="bg-white border-b shadow-sm px-3 py-3 sm:px-4 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-white font-bold text-xs sm:text-sm">AI</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">
              Invoice Generator
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              AI-powered invoice assistant
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200 flex-shrink-0"
            onClick={handleResetChat}
            disabled={isTyping}
            title="Start New Chat"
          >
            <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
          </Button>
          <div className="flex-shrink-0">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full animate-pulse shadow-sm"></div>
          </div>
        </div>
      </div>

      {/* Chat Messages - Responsive scrolling */}
      <div className="flex-1 overflow-y-auto px-2 py-3 sm:px-4 sm:py-4">
        <div className="max-w-4xl mx-auto">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message.text}
              isBot={message.isBot}
              timestamp={message.timestamp}
            />
          ))}

          {isTyping && (
            <div className="flex justify-start mb-3 sm:mb-4">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm max-w-[85%] sm:max-w-[80%]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">AI</span>
                  </div>
                  <span className="text-xs font-medium text-gray-600 truncate">
                    Invoice Generator
                  </span>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input - Fixed at bottom */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload} // Ensure ChatInput passes the file directly
        disabled={isTyping}
      />
    </div>
  );
};

export default ChatInterface;
