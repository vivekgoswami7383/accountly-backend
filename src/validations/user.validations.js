import Joi from "joi";

export const updateUserSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().required(),
  theme: Joi.string().valid("light", "dark").required(),
  language: Joi.string().valid("en", "hi", "gu", "hi-latn", "gu-latn").required(),
});
