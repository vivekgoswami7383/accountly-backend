import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";
import { env } from "../config/env.config.js";
import { logger } from "../config/logger.config.js";
import Contact from "../models/contact.model.js";
import Transaction from "../models/transaction.model.js";
import BusinessStats from "../models/business-stats.model.js";
import { STATUS, TRANSACTION_TYPE_ALIASES } from "./constants.js";
import { notifyDueSettled } from "./due-notifications.js";

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

export const normalizeTransactionType = (value) => {
  return TRANSACTION_TYPE_ALIASES[String(value ?? "").toLowerCase()] || null;
};

export const balanceBucket = (balance) => ({
  get: balance < 0 ? -balance : 0,
  give: balance > 0 ? balance : 0,
});

export const adjustBusinessStats = async (businessId, delta) => {
  await BusinessStats.findOneAndUpdate(
    { business_id: businessId },
    {
      $inc: delta,
    },
    { upsert: true }
  );
};

export const recomputeContactBalance = async (
  contactId,
  { transactionCountDelta = 0 } = {}
) => {
  const contact = await Contact.findById(contactId);
  const oldBalance = contact?.balance || 0;

  const [totals] = await Transaction.aggregate([
    {
      $match: {
        "contact._id": new mongoose.Types.ObjectId(String(contactId)),
        status: { $ne: STATUS.DELETED },
      },
    },
    {
      $group: {
        _id: null,
        credit: {
          $sum: {
            $cond: [
              { $in: ["$transaction_type", ["credit", "received"]] },
              "$amount",
              0,
            ],
          },
        },
        debit: {
          $sum: {
            $cond: [
              { $in: ["$transaction_type", ["debit", "sent"]] },
              "$amount",
              0,
            ],
          },
        },
      },
    },
  ]);

  const newBalance = (totals?.credit || 0) - (totals?.debit || 0);

  await Contact.findByIdAndUpdate(contactId, {
    balance: newBalance,
    ...(newBalance === 0 ? { due_date: null } : {}),
  });

  if (newBalance === 0 && contact?.due_date) {
    await notifyDueSettled(contact, oldBalance);
  }

  if (contact?.business_id) {
    const before = balanceBucket(oldBalance);
    const after = balanceBucket(newBalance);

    await adjustBusinessStats(contact.business_id, {
      receivable: after.get - before.get,
      payable: after.give - before.give,
      total_transactions: transactionCountDelta,
    });
  }

  return newBalance;
};
