import Joi from "joi";
import { EXPENSE_CATEGORIES, MAX_AMOUNT } from "../helpers/constants.js";

export const createExpenseSchema = Joi.object({
  business: Joi.forbidden(),
  business_id: Joi.forbidden(),
  user: Joi.forbidden(),
  user_id: Joi.forbidden(),
  amount: Joi.number().positive().max(MAX_AMOUNT).required().messages({
    "number.max": '"amount" is too large',
  }),
  category: Joi.string()
    .required()
    .valid(...Object.values(EXPENSE_CATEGORIES)),
  note: Joi.string().optional().allow(""),
  expense_date: Joi.date().iso().max("now").optional(),
}).unknown(true);
