import Joi from "joi";
import { MAX_AMOUNT } from "../helpers/constants.js";

export const createTransactionSchema = Joi.object({
  business: Joi.forbidden(),
  contact: Joi.object({
    _id: Joi.string().required(),
    name: Joi.string().optional(),
  })
    .unknown(true)
    .required(),
  amount: Joi.number().positive().max(MAX_AMOUNT).required().messages({
    "number.max": '"amount" is too large',
  }),
  transaction_type: Joi.string()
    .required()
    .valid("debit", "credit", "sent", "received"),
  payment_mode: Joi.string().valid("cash", "upi", "bank", "other").optional(),
  description: Joi.string().optional().allow(""),
  transaction_date: Joi.date().iso().max("now").optional(),
}).unknown(true);
