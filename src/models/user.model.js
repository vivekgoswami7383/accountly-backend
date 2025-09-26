import mongoose from "mongoose";
import { STATUS, USER_ROLES } from "../helpers/constants.js";

const UserSchema = new mongoose.Schema(
  {
    business: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
        default: null,
      },
      business_name: {
        type: String,
        default: null,
      },
    },
    name: {
      type: String,
      trim: true,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    password: String,
    role: {
      type: String,
      enum: [
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.OWNER,
        USER_ROLES.ADMIN,
        USER_ROLES.STAFF,
      ],
      default: USER_ROLES.STAFF,
    },
    permissions: [String],
    status: {
      type: Number,
      enum: [STATUS.ACTIVE, STATUS.INACTIVE, STATUS.DELETED],
      default: STATUS.ACTIVE,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

const User = mongoose.model("User", UserSchema);

export default User;
