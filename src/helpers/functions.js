import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";
import { env } from "../config/env.config.js";
import { logger } from "../config/logger.config.js";
import Customer from "../models/customer.model.js";
import Business from "../models/business.model.js";

export const hashPassword = async (password) => {
  const hash = await bcrypt.hash(password, 10);
  return hash;
};

export const comparePassword = async (password, hashedPassword) => {
  const result = await bcrypt.compare(password, hashedPassword);
  return result;
};

export const generateToken = async (userId, role) => {
  const token = jsonwebtoken.sign(
    {
      user_id: userId,
      role: role,
    },
    env.APP_SECRET
  );
  return token;
};

export const getSearchFilterQuery = (filter) => {
  const filters = [{ status: { $ne: 0 } }];
  let sort = { created_at: -1 };

  if (!filter) return { query: { $and: filters }, sort };

  try {
    const parsed = JSON.parse(filter);

    if (parsed?.sort) {
      sort = parsed.sort;
    }

    if (parsed?.search?.length) {
      for (const group of parsed.search) {
        for (const { field_name, operator, field_value, field_type } of group) {
          if (
            !field_value ||
            (Array.isArray(field_value) && field_value.length === 0)
          )
            continue;

          switch (operator) {
            case "in":
              filters.push({
                $or: field_value.map((val) => ({
                  [field_name]: { $regex: `.*${val}.*`, $options: "i" },
                })),
              });
              break;
            case "not_in":
              filters.push({ [field_name]: { $nin: field_value } });
              break;
            case "exactmatch":
              filters.push({ [field_name]: field_value });
              break;
            case "contains":
              filters.push({
                [field_name]: { $regex: `.*${field_value}.*`, $options: "i" },
              });
              break;
            case "=":
              filters.push({ [field_name]: { $eq: field_value } });
              break;
            case ">":
            case "gt":
              filters.push({
                [field_name]: {
                  $gt:
                    field_name === "created_at"
                      ? new Date(field_value)
                      : field_value,
                },
              });
              break;
            case ">=":
            case "gte":
              filters.push({
                [field_name]: {
                  $gte:
                    field_name === "created_at"
                      ? new Date(field_value)
                      : field_value,
                },
              });
              break;
            case "<":
            case "lt":
              filters.push({
                [field_name]: {
                  $lt:
                    field_name === "created_at"
                      ? new Date(field_value)
                      : field_value,
                },
              });
              break;
            case "<=":
            case "lte":
              filters.push({
                [field_name]: {
                  $lte:
                    field_name === "created_at"
                      ? new Date(field_value)
                      : field_value,
                },
              });
              break;
            case "between":
              filters.push({
                [field_name]: {
                  $gte: new Date(field_value[0]),
                  $lte: new Date(field_value[1]),
                },
              });
              break;
          }
        }
      }
    }
  } catch (e) {
    logger.error("Filter parsing error:", e);
  }
  return { query: { $and: filters }, sort };
};

export const updateCustomerBalance = async (
  customerId,
  amount,
  transactionType,
  operation = "add"
) => {
  const multiplier = operation === "add" ? 1 : -1;
  const balanceChange =
    transactionType === "sent" ? -amount * multiplier : amount * multiplier;

  await Customer.findByIdAndUpdate(customerId, {
    $inc: { balance: balanceChange },
  });
};

export const updateBusinessStats = async (
  businessId,
  amount,
  transactionType,
  operation = "add"
) => {
  const multiplier = operation === "add" ? 1 : -1;
  const updates = {
    "transaction_stats.total_transactions": multiplier * 1,
  };

  if (transactionType === "sent") {
    updates["transaction_stats.total_sent"] = multiplier * amount;
  } else if (transactionType === "received") {
    updates["transaction_stats.total_received"] = multiplier * amount;
  }

  await Business.findByIdAndUpdate(businessId, {
    $inc: updates,
  });
};
