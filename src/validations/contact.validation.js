import Joi from "joi";
import { CONTACT_LABELS, MAX_NAME_LENGTH } from "../helpers/constants.js";

export const createContactSchema = Joi.object({
  business: Joi.forbidden(),
  name: Joi.string().max(MAX_NAME_LENGTH).required(),
  phone: Joi.string().required(),
  address: Joi.string().optional().allow(""),
  label: Joi.string().valid(...CONTACT_LABELS).allow(null, ""),
}).unknown(true);
