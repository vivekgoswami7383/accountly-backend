import { STATUS_CODES, MESSAGES } from "../helpers/constants.js";

export const validate = (schema) => {
  return (req, res, next) => {
    if (!req.body) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.RESPONSE_MESSAGES.INVALID_REQUEST,
      });
    }

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: error.details[0].message,
      });
    }
    next();
  };
};
