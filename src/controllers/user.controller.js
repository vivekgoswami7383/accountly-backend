import { MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import User from "../models/user.model.js";

export const update = async (req, res) => {
  try {
    const { id } = req.params;

    if (String(req.user._id) !== String(id)) {
      return res.status(STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: MESSAGES.RESPONSE_MESSAGES.FORBIDDEN,
      });
    }

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

    const patch = {};
    if (req.body.name != null) patch.name = req.body.name;
    if (req.body.phone != null) patch.phone = req.body.phone;
    if (req.body.theme != null) patch.theme = req.body.theme;

    const response = await User.findByIdAndUpdate(id, patch, {
      new: true,
    }).select("-password");

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
