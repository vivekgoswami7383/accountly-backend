import Joi from "joi";

export const createCustomerSchema = Joi.object({
  business: Joi.forbidden(),
  name: Joi.string().required(),
  phone: Joi.string().required(),
  address: Joi.string().optional().allow(""),
}).unknown(true);
