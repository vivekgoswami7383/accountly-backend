export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  OWNER: "owner",
  ADMIN: "admin",
  STAFF: "staff",
};

export const STATUS = {
  DELETED: 0,
  ACTIVE: 1,
  INACTIVE: 2,
};

export const NOTIFICATION_TYPES = {
  DUE_TOMORROW: "due_tomorrow",
  DUE_TODAY: "due_today",
  OVERDUE: "overdue",
  DUE_SETTLED: "due_settled",
};

export const NOTIFICATION_TTL_DAYS = 30;
export const NOTIFICATION_TIMEZONE = "Asia/Kolkata";
export const OVERDUE_LOOKBACK_DAYS = 7;

export const DUE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isValidDueDate = (value) => {
  if (typeof value !== "string" || !DUE_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const TRANSACTION_TYPES = {
  DEBIT: "debit",
  CREDIT: "credit",
};

export const TRANSACTION_TYPE_ALIASES = {
  debit: "debit",
  credit: "credit",
  sent: "debit",
  received: "credit",
};

export const EXPENSE_CATEGORIES = {
  FOOD: "food",
  TRAVEL: "travel",
  RENT: "rent",
  UTILITIES: "utilities",
  SHOPPING: "shopping",
  OTHER: "other",
};

export const CONTACT_TYPES = [
  "customer",
  "supplier",
  "business",
  "friend",
  "family",
];

export const MAX_AMOUNT = 999999999999;
export const MAX_NAME_LENGTH = 60;

export const STATUS_CODES = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

export const MESSAGES = {
  RESPONSE_MESSAGES: {
    INVALID_REQUEST: "Invalid request",
    UNAUTHORIZED: "Unauthorized",
    FORBIDDEN: "Forbidden",
    NOT_FOUND: "Not found",
    INTERNAL_SERVER_ERROR: "Internal server error",
  },
  ERROR_MESSAGES: {
    USER_ALREADY_EXISTS_WITH_PHONE: "User already exists with this phone",
    USER_NOT_FOUND: "User not found",
    INVALID_PASSWORD: "Invalid password",
    BUSINESS_NOT_FOUND: "Business not found",
    CONTACT_ALREADY_EXISTS: "Contact already exists with this phone number",
    CONTACT_NOT_FOUND: "Contact not found",
    TRANSACTION_NOT_FOUND: "Transaction not found",
    INVALID_TRANSACTION_TYPE: "Transaction type must be debit or credit",
    INVALID_AMOUNT: "Amount must be greater than zero",
    AMOUNT_TOO_LARGE: "Amount is too large",
    NAME_TOO_LONG: "Name is too long",
    INVALID_TRANSACTION_DATE: "Transaction date is invalid",
    EXPENSE_NOT_FOUND: "Expense not found",
    INVALID_EXPENSE_CATEGORY: "Category must be one of the allowed expense categories",
    INVALID_EXPENSE_DATE: "Expense date is invalid",
    NOTE_NOT_FOUND: "Note not found",
    INVALID_CONTACT_TYPE:
      "Contact type must be customer, supplier, business, friend or family",
    INVALID_DUE_DATE: "Due date must be a valid date (YYYY-MM-DD)",
    DUE_DATE_NOT_ALLOWED: "A due date can only be set while there is a pending balance",
  },
};

export const BUSINESS_TYPES = {
  KIRANA_SHOP: "kirana_shop",
  PAN_SHOP: "pan_shop",
};
