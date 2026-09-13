import Joi from "joi";
import { EXPENSE_CATEGORIES } from "../helpers/constants.js";

export const createExpenseSchema = Joi.object({
  business: Joi.forbidden(),
  business_id: Joi.forbidden(),
  user: Joi.forbidden(),
  user_id: Joi.forbidden(),
  amount: Joi.number().positive().required(),
  category: Joi.string()
    .required()
    .valid(...Object.values(EXPENSE_CATEGORIES)),
  note: Joi.string().optional().allow(""),
  expense_date: Joi.date().iso().max("now").optional(),
}).unknown(true);
