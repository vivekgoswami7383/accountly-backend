import Joi from "joi";

export const createNoteSchema = Joi.object({
  business: Joi.forbidden(),
  business_id: Joi.forbidden(),
  user: Joi.forbidden(),
  user_id: Joi.forbidden(),
  content: Joi.string().required().trim().min(1).max(20000),
}).unknown(true);
