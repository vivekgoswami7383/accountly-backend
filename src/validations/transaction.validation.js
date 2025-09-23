import Joi from "joi";

export const createTransactionSchema = Joi.object({
  business: Joi.object({
    _id: Joi.string().required(),
    business_name: Joi.string().required(),
  }).required(),
  customer: Joi.object({
    _id: Joi.string().required(),
    name: Joi.string().required(),
  }).required(),
  amount: Joi.number().required(),
  transaction_type: Joi.string().required().valid("sent", "received"),
  description: Joi.string().optional().allow(""),
});
