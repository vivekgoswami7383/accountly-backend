import Joi from "joi";
import { BUSINESS_TYPES } from "../helpers/constants.js";

export const createBusinessSchema = Joi.object({
  business_name: Joi.string().required(),
  business_type: Joi.string()
    .required()
    .valid(BUSINESS_TYPES.KIRANA_SHOP, BUSINESS_TYPES.PAN_SHOP),
  address: Joi.string().required(),
  user: Joi.object({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    phone: Joi.string().required(),
    password: Joi.string().min(8).required(),
  }),
});
