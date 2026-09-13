import { MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import { getSearchFilterQuery } from "../helpers/functions.js";
import Note from "../models/note.model.js";

const deriveTitle = (content) => {
  const firstLine = String(content || "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) return "New Note";
  return firstLine.slice(0, 100);
};

export const create = async (req, res) => {
  try {
    const { _id: user_id, business_id } = req.user;
    const { content } = req.body;

    const note = await Note.create({
      user_id,
      business_id,
      content,
      title: deriveTitle(content),
    });

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { note },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const notes = async (req, res) => {
  const { _id: user_id } = req.user;
  const { page, limit } = req.query;

  const { query: filter, sort } = getSearchFilterQuery(req.query.filter);

  filter.$and.push({ user_id: { $eq: user_id } });

  try {
    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));

      const [noteDocs, total] = await Promise.all([
        Note.find(filter)
          .sort(sort)
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum),
        Note.countDocuments(filter),
      ]);

      return res.status(STATUS_CODES.SUCCESS).json({
        success: true,
        data: {
          notes: noteDocs,
          total,
          has_more: (pageNum - 1) * limitNum + noteDocs.length < total,
        },
      });
    }

    const noteDocs = await Note.find(filter).sort(sort);

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        notes: noteDocs,
      },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const note = async (req, res) => {
  try {
    const { _id: user_id } = req.user;
    const { id } = req.params;

    const noteDoc = await Note.findOne({
      _id: id,
      user_id,
      status: STATUS.ACTIVE,
    });
    if (!noteDoc) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.NOTE_NOT_FOUND,
      });
    }

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { note: noteDoc },
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
    const { _id: user_id } = req.user;
    const { id } = req.params;

    const existing = await Note.findOne({
      _id: id,
      user_id,
      status: STATUS.ACTIVE,
    });

    if (!existing) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.NOTE_NOT_FOUND,
      });
    }

    const patch = {};

    if (req.body.content != null) {
      patch.content = req.body.content;
      patch.title = deriveTitle(req.body.content);
    }

    const updated = await Note.findByIdAndUpdate(id, patch, { new: true });

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { note: updated },
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
    const { _id: user_id } = req.user;
    const { id } = req.params;

    const noteDoc = await Note.findOne({
      _id: id,
      user_id,
      status: STATUS.ACTIVE,
    });
    if (!noteDoc) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.NOTE_NOT_FOUND,
      });
    }

    await Note.findByIdAndUpdate(id, { status: STATUS.DELETED });

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {},
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
