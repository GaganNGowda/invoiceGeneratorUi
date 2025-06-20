import { useState, useRef, useEffect } from "react";
// Corrected import paths to use the configured path alias '@/'
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput"; // Ensure this is the updated ChatInput
import { useToast } from "@/hooks/use-toast";
import {
  sendChatMessageToBot,
  // downloadInvoicePdfFrontend, // Not directly used in this component's logic, but kept for import consistency if needed elsewhere
  uploadImageForOcr,
} from "@/api/zohoService";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import React from "react";

// Define the message interface for consistent structure
interface Message {
  id: string;
  text: React.ReactNode;
  isBot: boolean;
  timestamp: string;
}

// Define the conversation context interface for state management
interface ConversationContext {
  status?: string;
  next_field?: string;
  customer_data?: { [key: string]: string };
  invoice_data?: { [key: string]: any };
  all_available_items?: any[];
  current_item_id?: string;
  current_item_name?: string;
  invoice_collection_sub_status?: string;
  return_flow?: string;
  return_phone?: string;
  return_invoice_data?: { [key: string]: any };
  extracted_contact_info?: { [key: string]: any };
  language?: "en" | "kn";
}

// Function to get the initial bot message based on language
const getInitialBotMessage = (lang: "en" | "kn"): Message => {
  const messages = {
    en: "Hello! I'm your Invoice Generator AI assistant. How can I assist you today?",
    kn: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಇನ್‌ವಾಯ್ಸ್ ಜನರೇಟರ್ AI ಸಹಾಯಕ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
  };
  return {
    id: "1",
    text: messages[lang],
    isBot: true,
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const ChatInterface = () => {
  const [language, setLanguage] = useState<"en" | "kn">("kn");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [conversationContext, setConversationContext] =
    useState<ConversationContext>({ language: language });
  const SESSION_ID = "my_unique_chat_session";

  // Controls the visibility of the ChatInput
  const [showChatInput, setShowChatInput] = useState(false);

  // Ref for the ChatInput's internal <input> element
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Helper function to reset the chat to its initial state
  const resetChat = () => {
    setMessages([getInitialBotMessage(language)]);
    setConversationContext({ language: language });
    setShowChatInput(false); // Hide chat input on reset

    // Send a reset command to the backend to clear its session state
    sendChatMessageToBot("reset_conversation_command", SESSION_ID, {
      language: language,
    })
      .then(() => {
        // Optional: toast({ title: "Chat Reset", description: "Conversation successfully reset." });
      })
      .catch((error) => {
        console.error("Error sending reset command to backend:", error);
        // Optional: toast({ title: "Reset Error", description: "Failed to reset backend session. Please try again.", variant: "destructive" });
      });
  };

  // Effect to initialize/reset messages and context on mount and language change
  useEffect(() => {
    resetChat(); // Call resetChat on mount and language change
  }, [language]);

  // Effect to scroll to the bottom of the chat when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Effect to manage focus on the input field for mobile keypad
  useEffect(() => {
    // Only attempt to focus if the input should be visible AND the bot is not typing
    if (showChatInput && !isTyping) {
      // Add a small delay to ensure the DOM element is fully rendered and ready for focus.
      // This is often crucial for mobile browsers.
      setTimeout(() => {
        // console.log("Attempting to focus input:", chatInputRef.current); // Good for debugging
        if (chatInputRef.current) {
          // Ensure ref has a value before calling focus
          chatInputRef.current.focus();
        }
      }, 200); // Increased delay slightly for mobile reliability, adjust if needed (e.g., 300ms, 500ms)
    }
  }, [showChatInput, isTyping, messages.length]); // Dependencies: re-run when input visibility changes, typing stops, or a new message is added

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

    const initialCommands = [
      "create invoice",
      "create customer",
      "show items",
      "list items",
      "what items",
    ];
    if (initialCommands.includes(messageText.toLowerCase().trim())) {
      setShowChatInput(true); // Show the chat input if an initial command is clicked/typed
    }

    setIsTyping(true); // Show typing indicator

    try {
      const backendResponse = await sendChatMessageToBot(
        messageText,
        SESSION_ID,
        { ...conversationContext, language: language }
      );

      // Update conversation context based on backend's response
      if (backendResponse.context) {
        setConversationContext((prev) => ({
          ...backendResponse.context,
          language: prev.language,
        }));
      } else {
        // If context is not returned, clear it for specific actions indicating flow completion,
        // but always keep the language.
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
          setConversationContext({ language: language }); // Clear context but keep the current language
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
        case "request_invoice_info":
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
          // A full reset (including hiding input) is handled by the main resetChat/useEffect
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
      setConversationContext({ language: language });
    } finally {
      setIsTyping(false); // This will trigger the focus useEffect
    }
  };

  const handleFileUpload = async (file: File) => {
    addMessage({
      id: Date.now().toString(),
      text: `📎 Uploading and processing: ${file.name}...`,
      isBot: false,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    setIsTyping(true);

    try {
      const ocrResult = await uploadImageForOcr(file, { language: language });

      if (ocrResult.text) {
        setShowChatInput(true); // Show input if OCR extracts text, triggering focus useEffect

        addMessage({
          id: (Date.now() + 1).toString(),
          text: `🤖 Extracted from image: "${ocrResult.text}"`,
          isBot: true,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });

        setTimeout(() => {
          handleSendMessage(ocrResult.text);
        }, 100);
      } else {
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
      setIsTyping(false); // This will trigger the focus useEffect
    }
  };

  const handleResetChat = async () => {
    setIsTyping(true);
    resetChat(); // Calls the consolidated reset function
    setIsTyping(false);
  };

  // Approximate height of ChatInput area including its padding.
  // Adjust this value if your ChatInput's height changes due to styling.
  const INPUT_AREA_HEIGHT_PX = 80;

  return (
    <div className="flex flex-col h-screen relative">
      {" "}
      {/* Make parent relative for fixed children */}
      {/* Header - Fixed to top, z-index to stay above content */}
      <div className="bg-white border-b shadow-sm px-3 py-3 sm:px-4 sm:py-4 z-20">
        {" "}
        {/* Increased z-index to ensure it's always on top */}
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
          {/* Language Selector */}
          <div className="flex-shrink-0">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "en" | "kn")}
              className="px-2 py-1 sm:px-3 sm:py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Select Language"
              disabled={isTyping}
            >
              <option value="en">English</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
            </select>
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
      {/* Chat Messages Area */}
      {/* Add padding-bottom to ensure messages don't get hidden under the fixed input */}
      <div
        className={`flex-1 overflow-y-auto px-2 py-3 sm:px-4 sm:py-4 transition-all duration-300 ${
          showChatInput ? `pb-[${INPUT_AREA_HEIGHT_PX}px]` : ""
        }`}
        // Using style prop for dynamic pixel values is often more reliable with Tailwind
        style={{
          paddingBottom: showChatInput
            ? `${INPUT_AREA_HEIGHT_PX}px`
            : undefined,
        }}
      >
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
      {/* Conditional Action Buttons or Chat Input */}
      {!showChatInput && (
        // flex-grow and justify-center will center these buttons in the middle
        // of the available vertical space if messages are short.
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 max-w-sm w-full">
            <Button
              variant="outline"
              className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              onClick={() => handleSendMessage("create invoice")}
              disabled={isTyping}
            >
              Create Invoice
            </Button>
            <Button
              variant="outline"
              className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              onClick={() => handleSendMessage("create customer")}
              disabled={isTyping}
            >
              Create Customer
            </Button>
          </div>
        </div>
      )}
      {/* Chat Input - Fixed at bottom, only shown if showChatInput is true */}
      {showChatInput && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20"
          // Consider adding padding for iOS safe area (notch, gesture bar)
          // style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <ChatInput
            ref={chatInputRef}
            onSendMessage={handleSendMessage}
            onFileUpload={handleFileUpload}
            disabled={isTyping}
          />
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
