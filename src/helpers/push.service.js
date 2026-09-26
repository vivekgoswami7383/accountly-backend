import webpush from "web-push";
import { env } from "../config/env.config.js";
import { logger } from "../config/logger.config.js";
import PushSubscription from "../models/push-subscription.model.js";

const GONE_STATUS_CODES = [404, 410];
const PUSH_TTL_SECONDS = 4 * 60 * 60;

export const isPushEnabled = () =>
  Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);

if (isPushEnabled()) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
} else {
  logger.warn("Web push disabled: VAPID keys are not configured");
}

const sendOne = async (subscription, body) => {
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      body,
      { TTL: PUSH_TTL_SECONDS, urgency: "high", timeout: 10000 }
    );
    return true;
  } catch (error) {
    if (GONE_STATUS_CODES.includes(error?.statusCode)) {
      await PushSubscription.deleteOne({ _id: subscription._id });
      return false;
    }
    logger.error(`Push to ${subscription._id} failed: ${error.message}`);
    return false;
  }
};

export const sendPushToUser = async (userId, payload) => {
  if (!isPushEnabled()) return 0;
  try {
    const subscriptions = await PushSubscription.find({ user_id: userId }).lean();
    const body = JSON.stringify(payload);
    const results = await Promise.all(
      subscriptions.map((subscription) => sendOne(subscription, body))
    );
    return results.filter(Boolean).length;
  } catch (error) {
    logger.error(`Push to user ${userId} failed: ${error.message}`);
    return 0;
  }
};
