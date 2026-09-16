import Joi from "joi";
import { MAX_NAME_LENGTH } from "../helpers/constants.js";

export const createBusinessSchema = Joi.object({
  business_name: Joi.string().max(MAX_NAME_LENGTH).required(),
  user: Joi.object({
    name: Joi.string().max(MAX_NAME_LENGTH).required(),
    phone: Joi.string().required(),
    password: Joi.string().min(8).required(),
  }),
});

export const updateBusinessSchema = Joi.object({
  business_name: Joi.string().max(MAX_NAME_LENGTH),
  business_type: Joi.string(),
  address: Joi.string().allow(""),
  logo: Joi.string().allow(""),
  gst_number: Joi.string().allow(""),
  currency: Joi.string().length(3).uppercase(),
}).min(1);
