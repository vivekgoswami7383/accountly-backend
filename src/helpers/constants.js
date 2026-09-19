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

export const CONTACT_LABELS = ["customer", "supplier", "friend", "family"];

export const INVERSE_CONTACT_LABEL = {
  customer: "supplier",
  supplier: "customer",
  friend: "friend",
  family: "family",
};

export const MAX_AMOUNT = 999999999999;
export const MAX_NAME_LENGTH = 60;

export const STATUS_CODES = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
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
    INVALID_CONTACT_LABEL: "Label must be customer, supplier, friend or family",
    LINK_NOT_FOUND: "Link request not found",
    LINK_CONTACT_NOT_ON_APP: "This contact is not on Accountly yet",
    LINK_ALREADY_EXISTS: "A link with this contact already exists or is pending",
    LINK_UNAVAILABLE: "Unable to send a link request to this contact",
    LINK_BLOCKED_BY_YOU: "You blocked this business. Unblock it from Link requests to link again",
    LINK_INVALID_STATE: "This link request can no longer be changed",
    LINK_PHONE_LOCKED: "Unlink this contact before changing the phone number",
    MIRRORED_READ_ONLY: "This entry was added by the linked business and cannot be changed here",
    TOO_MANY_REQUESTS: "Too many requests, please try again later",
  },
};

export const BUSINESS_TYPES = {
  KIRANA_SHOP: "kirana_shop",
  PAN_SHOP: "pan_shop",
};
