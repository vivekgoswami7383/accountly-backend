import { STATUS_CODES } from "../helpers/constants.js";
import { env } from "../config/env.config.js";
import { isPushEnabled } from "../helpers/push.service.js";
import PushSubscription from "../models/push-subscription.model.js";

const respondError = (res, error) =>
  res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: error.message,
  });

export const publicKey = async (req, res) =>
  res.status(STATUS_CODES.SUCCESS).json({
    success: true,
    data: {
      enabled: isPushEnabled(),
      public_key: isPushEnabled() ? env.VAPID_PUBLIC_KEY : null,
    },
  });

export const subscribe = async (req, res) => {
  try {
    const { _id: user_id, business_id } = req.user;
    const { endpoint, keys } = req.body;

    await PushSubscription.updateOne(
      { endpoint },
      {
        $set: {
          user_id,
          business_id,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
          user_agent: String(req.get("user-agent") || "").slice(0, 300),
        },
      },
      { upsert: true }
    );

    return res.status(STATUS_CODES.SUCCESS).json({ success: true, data: {} });
  } catch (error) {
    return respondError(res, error);
  }
};

export const unsubscribe = async (req, res) => {
  try {
    await PushSubscription.deleteOne({
      endpoint: req.body.endpoint,
      user_id: req.user._id,
    });
    return res.status(STATUS_CODES.SUCCESS).json({ success: true, data: {} });
  } catch (error) {
    return respondError(res, error);
  }
};
