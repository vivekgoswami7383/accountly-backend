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
    CUSTOMER_ALREADY_EXISTS: "Customer already exists with this phone number",
    CUSTOMER_NOT_FOUND: "Customer not found",
    TRANSACTION_NOT_FOUND: "Transaction not found",
    INVALID_TRANSACTION_TYPE: "Transaction type must be debit or credit",
    INVALID_AMOUNT: "Amount must be greater than zero",
    INVALID_TRANSACTION_DATE: "Transaction date is invalid",
  },
};

export const BUSINESS_TYPES = {
  KIRANA_SHOP: "kirana_shop",
  PAN_SHOP: "pan_shop",
};
