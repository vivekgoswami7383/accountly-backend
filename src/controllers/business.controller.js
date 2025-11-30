import mongoose from "mongoose";
import {
  STATUS,
  STATUS_CODES,
  MESSAGES,
  USER_ROLES,
} from "../helpers/constants.js";
import { hashPassword } from "../helpers/functions.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const usersPermissions = JSON.parse(
  readFileSync(join(__dirname, "../data/user-permissions.json"), "utf8")
);

const User = mongoose.model("User");
const Business = mongoose.model("Business");

export const create = async (req, res) => {
  const {
    business_name,
    user: { name, phone, password },
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
      name,
      phone,
      password: hashedPassword,
      role: USER_ROLES.OWNER,
    });

    const business = await Business.create({
      user: {
        _id: createUser._id,
        name,
        phone,
      },
      business_name,
    });

    await User.updateOne(
      { _id: createUser._id },
      {
        $set: {
          business: {
            _id: business._id,
            business_name: business_name,
          },
        },
      }
    );

    const permissions = usersPermissions.find(
      (usersPermission) => usersPermission.role === USER_ROLES.OWNER
    ).permissions;

    await User.updateOne({ _id: createUser._id }, { $set: { permissions } });

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { business, user: createUser },
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
    const businesses = await Business.find({
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

    const user = await User.findOne({
      _id: business.user._id,
      status: STATUS.ACTIVE,
    }).select("-password");
    if (!user) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.USER_NOT_FOUND,
      });
    }

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { business, user },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;

    const business = await Business.findByIdAndUpdate(id, req.body, {
      new: true,
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

export const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const business = await Business.findByIdAndUpdate(
      id,
      { status: STATUS.DELETED },
      { new: true }
    );

    if (!business) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.BUSINESS_NOT_FOUND,
      });
    }

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: "Business deleted successfully",
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
