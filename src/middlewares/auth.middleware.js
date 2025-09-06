import passport from "passport";
import { STATUS_CODES, MESSAGES, STATUS } from "../helpers/constants.js";

export const authenticate = (req, res, next) => {
  try {
    passport.authenticate("jwt", { session: false }, (err, user, info) => {
      if (err) {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: MESSAGES.RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
        });
      }

      if (!user || user.status !== STATUS.ACTIVE) {
        return res.status(STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: MESSAGES.RESPONSE_MESSAGES.UNAUTHORIZED,
        });
      }

      req.user = user;
      next();
    })(req, res, next);
  } catch (error) {
    console.log(error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};
