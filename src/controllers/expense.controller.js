import mongoose from "mongoose";
import { EXPENSE_CATEGORIES, MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import { getSearchFilterQuery } from "../helpers/functions.js";
import Expense from "../models/expense.model.js";

export const create = async (req, res) => {
  try {
    const { _id: user_id, business_id } = req.user;
    const { amount, category, note, expense_date } = req.body;

    if (!(Number(amount) > 0)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.INVALID_AMOUNT,
      });
    }

    if (!Object.values(EXPENSE_CATEGORIES).includes(category)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.INVALID_EXPENSE_CATEGORY,
      });
    }

    const expense = await Expense.create({
      user_id,
      business_id,
      amount,
      category,
      note: note || "",
      ...(expense_date ? { expense_date: new Date(expense_date) } : {}),
    });

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { expense },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const expenses = async (req, res) => {
  const { _id: user_id } = req.user;
  const { page, limit } = req.query;

  const { query: filter, sort } = getSearchFilterQuery(req.query.filter);

  filter.$and.push({ user_id: { $eq: user_id } });

  try {
    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));

      const [expenseDocs, total] = await Promise.all([
        Expense.find(filter)
          .sort(sort)
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum),
        Expense.countDocuments(filter),
      ]);

      return res.status(STATUS_CODES.SUCCESS).json({
        success: true,
        data: {
          expenses: expenseDocs,
          total,
          has_more: (pageNum - 1) * limitNum + expenseDocs.length < total,
        },
      });
    }

    const expenseDocs = await Expense.find(filter).sort(sort);

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        expenses: expenseDocs,
      },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const summary = async (req, res) => {
  try {
    const { _id: user_id } = req.user;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = startOfToday.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [result] = await Expense.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(String(user_id)),
          status: STATUS.ACTIVE,
        },
      },
      {
        $facet: {
          today: [
            { $match: { expense_date: { $gte: startOfToday } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ],
          week: [
            { $match: { expense_date: { $gte: startOfWeek } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ],
          month: [
            { $match: { expense_date: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
          ],
          byCategory: [
            { $match: { expense_date: { $gte: startOfMonth } } },
            { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
          ],
        },
      },
    ]);

    const categoryTotals = (result?.byCategory || []).map((c) => ({
      category: c._id,
      total: c.total,
      count: c.count,
    }));

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        today_total: result?.today?.[0]?.total || 0,
        week_total: result?.week?.[0]?.total || 0,
        month_total: result?.month?.[0]?.total || 0,
        month_count: result?.month?.[0]?.count || 0,
        category_totals: categoryTotals,
      },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const expense = async (req, res) => {
  try {
    const { _id: user_id } = req.user;
    const { id } = req.params;

    const expenseDoc = await Expense.findOne({
      _id: id,
      user_id,
      status: STATUS.ACTIVE,
    });
    if (!expenseDoc) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.EXPENSE_NOT_FOUND,
      });
    }

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { expense: expenseDoc },
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

    const existing = await Expense.findOne({
      _id: id,
      user_id,
      status: STATUS.ACTIVE,
    });

    if (!existing) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.EXPENSE_NOT_FOUND,
      });
    }

    const patch = {};

    if (req.body.amount != null) {
      if (!(Number(req.body.amount) > 0)) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.ERROR_MESSAGES.INVALID_AMOUNT,
        });
      }
      patch.amount = req.body.amount;
    }

    if (req.body.category != null) {
      if (!Object.values(EXPENSE_CATEGORIES).includes(req.body.category)) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.ERROR_MESSAGES.INVALID_EXPENSE_CATEGORY,
        });
      }
      patch.category = req.body.category;
    }

    if (req.body.note != null) patch.note = req.body.note;

    if (req.body.expense_date != null) {
      const parsedDate = new Date(req.body.expense_date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.ERROR_MESSAGES.INVALID_EXPENSE_DATE,
        });
      }
      patch.expense_date = parsedDate;
    }

    const updated = await Expense.findByIdAndUpdate(id, patch, { new: true });

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { expense: updated },
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

    const expenseDoc = await Expense.findOne({
      _id: id,
      user_id,
      status: STATUS.ACTIVE,
    });
    if (!expenseDoc) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.EXPENSE_NOT_FOUND,
      });
    }

    await Expense.findByIdAndUpdate(id, { status: STATUS.DELETED });

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
