import { STATUS_CODES } from "../helpers/constants.js";
import Notification from "../models/notification.model.js";

const respondError = (res, error) =>
  res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: error.message,
  });

export const notifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 20));

    const filter = { user_id: userId };
    if (typeof req.query.category === "string" && req.query.category) {
      filter.category = req.query.category;
    }

    const [items, unread_count] = await Promise.all([
      Notification.find(filter)
        .sort({ created_at: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit + 1)
        .lean(),
      Notification.countDocuments({ user_id: userId, read_at: null }),
    ]);

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        notifications: items.slice(0, limit),
        has_more: items.length > limit,
        unread_count,
      },
    });
  } catch (error) {
    return respondError(res, error);
  }
};

export const unreadCount = async (req, res) => {
  try {
    const unread_count = await Notification.countDocuments({
      user_id: req.user._id,
      read_at: null,
    });
    return res
      .status(STATUS_CODES.SUCCESS)
      .json({ success: true, data: { unread_count } });
  } catch (error) {
    return respondError(res, error);
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.user._id, read_at: null },
      { read_at: new Date() }
    );
    return res
      .status(STATUS_CODES.SUCCESS)
      .json({ success: true, data: { unread_count: 0 } });
  } catch (error) {
    return respondError(res, error);
  }
};

export const markRead = async (req, res) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, user_id: req.user._id, read_at: null },
      { read_at: new Date() }
    );
    const unread_count = await Notification.countDocuments({
      user_id: req.user._id,
      read_at: null,
    });
    return res
      .status(STATUS_CODES.SUCCESS)
      .json({ success: true, data: { unread_count } });
  } catch (error) {
    return respondError(res, error);
  }
};
