import Joi from "joi";

export const loginSchema = Joi.object({
  phone: Joi.string().required(),
  password: Joi.string().required(),
});
