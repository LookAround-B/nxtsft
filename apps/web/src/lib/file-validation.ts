// Strict file validation for uploads
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_CSV_MIME = ["text/csv", "text/plain"];
const ALLOWED_EXCEL_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];

export interface FileValidationError {
  code: "INVALID_SIZE" | "INVALID_TYPE" | "INVALID_NAME" | "INVALID_EXTENSION";
  message: string;
}

// Validate file size
export function validateFileSize(file: File, maxBytes: number = MAX_FILE_SIZE): FileValidationError | null {
  if (file.size > maxBytes) {
    return {
      code: "INVALID_SIZE",
      message: `File size exceeds ${maxBytes / 1024 / 1024}MB limit`,
    };
  }
  return null;
}

// Validate file extension by name
export function validateFileExtension(
  filename: string,
  allowedExtensions: string[]
): FileValidationError | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext || !allowedExtensions.includes(ext)) {
    return {
      code: "INVALID_EXTENSION",
      message: `File type .${ext} not allowed. Allowed: ${allowedExtensions.join(", ")}`,
    };
  }
  return null;
}

// Safe filename sanitization
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  const name = filename.replace(/[\/\\:*?"<>|]/g, "_");
  // Limit length
  return name.substring(0, 255);
}

// Validate CSV/Excel file for bulk import
export function validateBulkImportFile(file: File): FileValidationError | null {
  // Size check
  const sizeErr = validateFileSize(file);
  if (sizeErr) return sizeErr;

  // Extension check
  const isCsv = file.name.toLowerCase().endsWith(".csv");
  const isExcel = file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");

  if (!isCsv && !isExcel) {
    return {
      code: "INVALID_EXTENSION",
      message: "File must be CSV or Excel (.xlsx, .xls)",
    };
  }

  // MIME type check
  const isValidCsv = ALLOWED_CSV_MIME.includes(file.type) || isCsv;
  const isValidExcel = ALLOWED_EXCEL_MIME.includes(file.type) || isExcel;

  if (!isValidCsv && !isValidExcel) {
    return {
      code: "INVALID_TYPE",
      message: "Invalid file type. Use CSV or Excel files.",
    };
  }

  return null;
}

// Validate image file for upload
export function validateImageFile(file: File): FileValidationError | null {
  // Size check
  const sizeErr = validateFileSize(file, 5 * 1024 * 1024); // 5MB for images
  if (sizeErr) return sizeErr;

  // Extension check
  const extErr = validateFileExtension(file.name, ["jpg", "jpeg", "png", "webp"]);
  if (extErr) return extErr;

  // MIME type check
  if (!ALLOWED_IMAGE_MIME.includes(file.type)) {
    return {
      code: "INVALID_TYPE",
      message: "Invalid image type. Use JPEG, PNG, or WebP.",
    };
  }

  return null;
}

// Validate URL to prevent SSRF attacks
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Prevent local file access and internal IPs
    const protocol = parsed.protocol;
    const hostname = parsed.hostname;

    if (!["http:", "https:"].includes(protocol)) {
      return false;
    }

    // Block internal IPs
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
