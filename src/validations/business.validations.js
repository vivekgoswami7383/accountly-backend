import Joi from "joi";

export const createBusinessSchema = Joi.object({
  business_name: Joi.string().required(),
  user: Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().required(),
    password: Joi.string().min(8).required(),
  }),
});
