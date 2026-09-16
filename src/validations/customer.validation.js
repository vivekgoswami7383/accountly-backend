import Joi from "joi";
import { MAX_NAME_LENGTH } from "../helpers/constants.js";

export const createCustomerSchema = Joi.object({
  business: Joi.forbidden(),
  name: Joi.string().max(MAX_NAME_LENGTH).required(),
  phone: Joi.string().required(),
  address: Joi.string().optional().allow(""),
}).unknown(true);
