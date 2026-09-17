import mongoose from "mongoose";
import { STATUS_CODES, MESSAGES, STATUS } from "../helpers/constants.js";
import { comparePassword, generateToken } from "../helpers/functions.js";
import { getSignedUrlFor } from "../utils/s3.js";

const User = mongoose.model("User");
const Business = mongoose.model("Business");

export const login = async (req, res) => {
  const { phone, password } = req.body;

  try {
    const user = await User.findOne({
      phone,
      status: { $eq: STATUS.ACTIVE },
    }).select({ password: 1, business_id: 1, role: 1 });

    if (!user) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.USER_NOT_FOUND,
      });
    }

    const comparePasswordResponse = await comparePassword(
      password,
      user.password
    );
    if (!comparePasswordResponse) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.INVALID_PASSWORD,
      });
    }

    const token = await generateToken(user._id, user.role);

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      token,
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const me = async (req, res) => {
  const requestUser = req.user;

  try {
    const user = await User.findOne({
      _id: requestUser._id,
      status: { $eq: STATUS.ACTIVE },
    }).select("-password");

    if (!user) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.USER_NOT_FOUND,
      });
    }

    const business = await Business.findOne({
      _id: user.business_id,
    }).lean();

    const userObj = user.toObject ? user.toObject() : user;

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        user: { ...userObj, avatar_url: await getSignedUrlFor(userObj.avatar_key) },
        business: business ? { ...business, logo_url: await getSignedUrlFor(business.logo) } : business,
      },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
