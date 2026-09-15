import mongoose from "mongoose";
import { MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import { USER_ROLES } from "../helpers/constants.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const usersPermissions = JSON.parse(
  readFileSync(join(__dirname, "../data/user-permissions.json"), "utf8")
);

const User = mongoose.model("User");

export const userHasAnyPermission = async (requestUser, routes) => {
  const allowedRoutes = Array.isArray(routes) ? routes : [routes];

  const user = await User.findOne({
    _id: requestUser?._id,
    status: STATUS.ACTIVE,
  }).lean();

  if (!user) return { found: false, allowed: false };

  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return { found: true, allowed: true };
  }

  const userPermissions = usersPermissions.find(
    (permission) => permission.role === user.role
  )?.permissions;

  const allowed = allowedRoutes.some((route) =>
    userPermissions?.includes(route)
  );

  return { found: true, allowed };
};

export const checkPermissions = (routes) => {
  return async function (req, res, next) {
    try {
      const { found, allowed } = await userHasAnyPermission(
        req.user,
        routes
      );

      if (!found) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: MESSAGES.ERROR_MESSAGES.USER_NOT_FOUND,
        });
      }

      if (!allowed) {
        return res.status(STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: MESSAGES.RESPONSE_MESSAGES.FORBIDDEN,
        });
      }

      next();
    } catch (error) {
      return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  };
};
