import Joi from "joi";

export const createTransactionSchema = Joi.object({
  business: Joi.forbidden(),
  customer: Joi.object({
    _id: Joi.string().required(),
    name: Joi.string().optional(),
  })
    .unknown(true)
    .required(),
  amount: Joi.number().positive().required(),
  transaction_type: Joi.string()
    .required()
    .valid("debit", "credit", "sent", "received"),
  payment_mode: Joi.string().valid("cash", "upi", "bank", "other").optional(),
  description: Joi.string().optional().allow(""),
}).unknown(true);
