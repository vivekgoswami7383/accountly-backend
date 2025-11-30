import { MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import User from "../models/user.model.js";

export const update = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      _id: id,
      status: STATUS.ACTIVE,
    });

    if (!user) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.USER_NOT_FOUND,
      });
    }

    const response = await User.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { user: response },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
