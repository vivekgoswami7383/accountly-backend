import Joi from "joi";

export const createCustomerSchema = Joi.object({
  business_id: Joi.string().required(),
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  phone: Joi.string().required(),
  balance: Joi.number().required(),
});
