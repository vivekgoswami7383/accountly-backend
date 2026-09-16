import Joi from "joi";
import { MAX_NAME_LENGTH } from "../helpers/constants.js";

export const updateUserSchema = Joi.object({
  name: Joi.string().max(MAX_NAME_LENGTH).required(),
  phone: Joi.string().required(),
  theme: Joi.string().valid("light", "dark").required(),
  language: Joi.string().valid("en", "hi", "gu", "hi-latn", "gu-latn").required(),
});
