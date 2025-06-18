import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { useToast } from "@/hooks/use-toast";
import {
  sendChatMessageToBot,
  uploadFileToBackend,
  downloadInvoicePdfFrontend,
} from "@/api/zohoService";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import React from "react";

interface Message {
  id: string;
  text: React.ReactNode;
  isBot: boolean;
  timestamp: string;
}

interface ConversationContext {
  status?: string;
  next_field?: string;
  customer_data?: { [key: string]: string };
  invoice_data?: { [key: string]: any };
}

const ChatInterface = () => {
  const initialBotMessage: Message = {
    id: "1",
    text: "Hello! I'm your Invoice Generator AI assistant. I can help you create, analyze, and manage invoices. How can I assist you today?",
    isBot: true,
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  const [messages, setMessages] = useState<Message[]>([initialBotMessage]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [conversationContext, setConversationContext] =
    useState<ConversationContext>({});
  const SESSION_ID = "my_unique_chat_session";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleSendMessage = async (messageText: string) => {
    addMessage({
      id: Date.now().toString(),
      text: messageText,
      isBot: false,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    setIsTyping(true);

    try {
      const backendResponse = await sendChatMessageToBot(
        messageText,
        SESSION_ID,
        conversationContext
      );

      if (backendResponse.context) {
        setConversationContext(backendResponse.context);
      } else {
        if (
          backendResponse.action === "customer_created" ||
          backendResponse.action === "customer_exists" ||
          backendResponse.action === "customer_creation_failed" ||
          backendResponse.action === "reset_success" ||
          backendResponse.action === "invoice_created" ||
          backendResponse.action === "invoice_creation_failed" ||
          backendResponse.action === "invoice_creation_error"
        ) {
          setConversationContext({});
        }
      }

      let botResponseText: React.ReactNode =
        "I'm not sure how to respond to that.";

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
          // Construct message with clickable link for download
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
                    // This onClick will primarily serve to show the toast,
                    // the href+download attribute will handle the actual download.
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
          setMessages([initialBotMessage]);
          break;
        case "file_uploaded":
          botResponseText =
            backendResponse.message || `File uploaded successfully.`;
          if (backendResponse.extracted_data) {
            botResponseText += `\nExtracted data: ${JSON.stringify(
              backendResponse.extracted_data,
              null,
              2
            )}`;
          }
          toast({
            title: "File Uploaded",
            description: `File '${
              messageText.split("📎 Uploaded: ")[1] || "document"
            }' processed.`,
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

      addMessage({
        id: (Date.now() + 1).toString(),
        text: botResponseText,
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    } catch (error) {
      console.error("Error communicating with backend:", error);
      addMessage({
        id: Date.now().toString(),
        text: "❌ Failed to connect to backend or process request. Please check console for details.",
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      setConversationContext({});
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    addMessage({
      id: Date.now().toString(),
      text: `📎 Uploaded: ${file.name}`,
      isBot: false,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    setIsTyping(true);

    try {
      const uploadResult = await uploadFileToBackend(file);

      let botResponseText = "";
      if (uploadResult.status === "success") {
        botResponseText = `I've received your file "${
          file.name
        }"! Backend says: ${uploadResult.message || "Processing complete."}`;
        if (uploadResult.extracted_data) {
          botResponseText += `\nExtracted data: \n\`\`\`json\n${JSON.stringify(
            uploadResult.extracted_data,
            null,
            2
          )}\n\`\`\``;
        }
        toast({
          title: "File Uploaded",
          description: `${file.name} successfully uploaded.`,
        });
      } else {
        botResponseText = `❌ Failed to process file "${file.name}": ${
          uploadResult.message || "Unknown error."
        }`;
        toast({
          title: "File Upload Failed",
          description: botResponseText,
          variant: "destructive",
        });
      }

      addMessage({
        id: (Date.now() + 1).toString(),
        text: botResponseText,
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    } catch (error) {
      console.error("Error uploading file to backend:", error);
      addMessage({
        id: Date.now().toString(),
        text: "❌ Failed to upload file to backend. Please try again or check console.",
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetChat = async () => {
    setIsTyping(true);
    try {
      const backendResponse = await sendChatMessageToBot(
        "reset_conversation_command",
        SESSION_ID,
        {}
      );

      if (backendResponse.action === "reset_success") {
        setMessages([initialBotMessage]);
        setConversationContext({});
        toast({
          title: "Chat Reset",
          description:
            backendResponse.message || "Conversation successfully reset.",
        });
      } else {
        toast({
          title: "Reset Failed",
          description:
            backendResponse.message ||
            "Failed to reset conversation on the backend.",
          variant: "destructive",
        });
        setMessages([initialBotMessage]);
        setConversationContext({});
      }
    } catch (error) {
      console.error("Error resetting chat with backend:", error);
      toast({
        title: "Reset Error",
        description:
          "Could not communicate with backend to reset. Local chat cleared.",
        variant: "destructive",
      });
      setMessages([initialBotMessage]);
      setConversationContext({});
    } finally {
      setIsTyping(false);
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
        onFileUpload={handleFileUpload}
        disabled={isTyping}
      />
    </div>
  );
};

export default ChatInterface;
