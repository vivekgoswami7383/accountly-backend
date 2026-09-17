import { MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import { getSignedUrlFor } from "../utils/s3.js";
import User from "../models/user.model.js";

const withAvatarUrl = async (user) => {
  const obj = user.toObject ? user.toObject() : user;
  return { ...obj, avatar_url: await getSignedUrlFor(obj.avatar_key) };
};

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
    if (req.body.language != null) patch.language = req.body.language;
    if (req.body.avatar_key != null) patch.avatar_key = req.body.avatar_key;

    const response = await User.findByIdAndUpdate(id, patch, {
      new: true,
    }).select("-password");

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { user: await withAvatarUrl(response) },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
