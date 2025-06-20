// src/api/zohoService.ts

const BACKEND_BASE_URL = "http://localhost:8000";

interface CustomerPayload {
  contact_name: string;
  billing_address: {
    city: string;
    phone: string;
    address: string;
    state: string;
    zip: string;
  };
  contact_persons?: Array<{
    first_name: string;
    last_name: string;
    mobile: string;
    phone: string;
    email: string;
    salutation: string;
    is_primary_contact: boolean;
  }>;
}

interface Item {
  item_id: string;
  name: string;
  rate: number;
}

interface SelectedItem {
  item_id: string;
  quantity: number;
}

interface InvoicePayload {
  contact_id: string;
  items: SelectedItem[];
  city_cf?: string;
  code_cf?: string;
  vehicle_cf?: string;
}

// Function to send user message to the backend's /process endpoint
export const sendChatMessageToBot = async (
  messageText: string,
  sessionId: string,
  context: object
) => {
  const response = await fetch(`${BACKEND_BASE_URL}/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: messageText,
      session_id: sessionId,
      context: context,
    }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Chat API error response:", errorBody);
    throw new Error(`HTTP error! status: ${response.status} - ${errorBody}`);
  }
  return await response.json();
};

// Function to upload files (e.g., for general document storage, not specifically OCR)
export const uploadFileToBackend = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BACKEND_BASE_URL}/upload-document`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("File upload API error response:", errorBody);
    throw new Error(
      `File upload failed! status: ${response.status} - ${errorBody}`
    );
  }
  return await response.json();
};

/**
 * Uploads an image file to the backend for OCR processing.
 * This function specifically targets the /process-ocr endpoint.
 * @param file The image file to upload.
 * @returns A promise that resolves to the JSON response from the backend,
 * expected to contain the 'text' extracted by OCR.
 */
export const uploadImageForOcr = async (file: File, language) => {
  const formData = new FormData();
  formData.append("file", file); // 'file' matches the FastAPI UploadFile parameter name

  const response = await fetch(`${BACKEND_BASE_URL}/process-ocr`, {
    // Target the specific OCR endpoint
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    // Attempt to read error message from response body if available
    const errorBody = await response.text();
    console.error("OCR API error response:", errorBody);
    throw new Error(
      `Failed to upload image for OCR: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }
  return await response.json(); // Expected: { "text": "extracted text" }
};

// Function to download invoice PDF from the backend and trigger client download
export const downloadInvoicePdfFrontend = async (
  invoiceId: string,
  pdfUrl: string
) => {
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    let errorMessage = `Failed to download PDF: ${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.message) {
        errorMessage = `Failed to download PDF: ${errorJson.message}`;
      }
    } catch {
      // ignore if response is not JSON
    }
    throw new Error(errorMessage);
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice_${invoiceId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// Other direct API calls (unchanged)
export const fetchItems = async () => {
  const response = await fetch(`${BACKEND_BASE_URL}/invoice/items`);
  if (!response.ok) {
    throw new Error(`Failed to fetch items! status: ${response.status}`);
  }
  return await response.json();
};

export const createCustomer = async (customerPayload: CustomerPayload) => {
  const response = await fetch(`${BACKEND_BASE_URL}/customer/find_or_create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customerPayload),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Create customer API error response:", errorBody);
    throw new Error(
      `Failed to create/find customer! status: ${response.status} - ${errorBody}`
    );
  }
  return await response.json();
};

export const createInvoice = async (invoicePayload: InvoicePayload) => {
  const response = await fetch(`${BACKEND_BASE_URL}/invoice/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoicePayload),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Create invoice API error response:", errorBody);
    throw new Error(
      `Failed to create invoice! status: ${response.status} - ${errorBody}`
    );
  }
  return await response.json();
};
