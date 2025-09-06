import mongoose from "mongoose";
import {
  STATUS,
  STATUS_CODES,
  MESSAGES,
  USER_ROLES,
} from "../helpers/constants.js";
import { hashPassword } from "../helpers/functions.js";
import usersPermissions from "../data/user-permissions.json" with { type: "json" };

const User = mongoose.model("User");
const Business = mongoose.model("Business");

export const create = async (req, res) => {
  const {
    business_name,
    business_type,
    address,
    user: { first_name, last_name, phone, password },
  } = req.body;

  try {
    const user = await User.findOne({
      phone,
      status: { $ne: STATUS.DELETED },
    });
    if (user) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.USER_ALREADY_EXISTS_WITH_PHONE,
      });
    }

    const hashedPassword = await hashPassword(password);

    const createUser = await User.create({
      business_id: null,
      first_name,
      last_name,
      phone,
      password: hashedPassword,
      role: USER_ROLES.OWNER,
    });

    const userId = createUser._id;

    const business = await Business.create({
      user_id: userId,
      business_name,
      business_type,
      address,
    });

    const permissions = usersPermissions.find(
      (usersPermission) => usersPermission.role === USER_ROLES.OWNER
    ).permissions;

    await User.updateOne(
      { _id: userId },
      { business_id: business._id, $set: { permissions } }
    );

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const businesses = async (req, res) => {
  try {
    const businesses = await Business.findOne({
      status: STATUS.ACTIVE,
    });
    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { businesses },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const business = async (req, res) => {
  try {
    const { id } = req.params;

    const business = await Business.findOne({
      _id: id,
      status: STATUS.ACTIVE,
    });
    if (!business) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.BUSINESS_NOT_FOUND,
      });
    }

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { business },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
