import Joi from "joi";

export const subscribeSchema = Joi.object({
  endpoint: Joi.string().uri({ scheme: ["https"] }).max(2048).required(),
  expirationTime: Joi.any(),
  keys: Joi.object({
    p256dh: Joi.string().max(256).required(),
    auth: Joi.string().max(256).required(),
  })
    .required()
    .unknown(true),
});

export const unsubscribeSchema = Joi.object({
  endpoint: Joi.string().max(2048).required(),
});
