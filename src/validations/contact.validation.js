import Joi from "joi";
import { CONTACT_TYPES, MAX_NAME_LENGTH } from "../helpers/constants.js";

export const createContactSchema = Joi.object({
  business: Joi.forbidden(),
  name: Joi.string().max(MAX_NAME_LENGTH).required(),
  phone: Joi.string().required(),
  address: Joi.string().optional().allow(""),
  contact_type: Joi.string().valid(...CONTACT_TYPES).allow(null, ""),
}).unknown(true);
