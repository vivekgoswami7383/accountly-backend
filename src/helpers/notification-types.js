export const NOTIFICATION_CATEGORIES = {
  PAYMENT: "payment",
  ACCOUNT: "account",
  LINK: "link",
  SYSTEM: "system",
};

export const NOTIFICATION_TARGETS = {
  CONTACT: "contact",
  TRANSACTION: "transaction",
  NONE: "none",
};

export const NOTIFICATION_TYPES = {
  DUE_TOMORROW: "due_tomorrow",
  DUE_TODAY: "due_today",
  OVERDUE: "overdue",
  DUE_SETTLED: "due_settled",
};

export const DEFAULT_NOTIFICATION_TTL_DAYS = 30;

export const NOTIFICATION_TYPE_CONFIG = {
  [NOTIFICATION_TYPES.DUE_TOMORROW]: {
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    ttlDays: 30,
  },
  [NOTIFICATION_TYPES.DUE_TODAY]: {
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    ttlDays: 30,
  },
  [NOTIFICATION_TYPES.OVERDUE]: {
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    ttlDays: 30,
  },
  [NOTIFICATION_TYPES.DUE_SETTLED]: {
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    ttlDays: 30,
  },
};
