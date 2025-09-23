import Joi from "joi";

export const createCustomerSchema = Joi.object({
  business: Joi.object({
    _id: Joi.string().required(),
    business_name: Joi.string().required(),
  }).required(),
  name: Joi.string().required(),
  phone: Joi.string().required(),
  address: Joi.number().optional().allow(""),
});
