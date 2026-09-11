import Joi from "joi";

export const createBusinessSchema = Joi.object({
  business_name: Joi.string().required(),
  user: Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().required(),
    password: Joi.string().min(8).required(),
  }),
});

export const updateBusinessSchema = Joi.object({
  business_name: Joi.string(),
  business_type: Joi.string(),
  address: Joi.string().allow(""),
  logo: Joi.string().allow(""),
  gst_number: Joi.string().allow(""),
  currency: Joi.string().length(3).uppercase(),
}).min(1);
