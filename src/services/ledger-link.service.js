import mongoose from "mongoose";
import { STATUS, TRANSACTION_TYPES } from "../helpers/constants.js";
import { recomputeCustomerBalance } from "../helpers/functions.js";
import { logger } from "../config/logger.config.js";
import Customer from "../models/customer.model.js";
import Transaction from "../models/transaction.model.js";
import Link, { LINK_STATUS } from "../models/link.model.js";

const invertType = (type) =>
  type === TRANSACTION_TYPES.DEBIT
    ? TRANSACTION_TYPES.CREDIT
    : TRANSACTION_TYPES.DEBIT;

export const buildPairKey = (businessA, businessB) =>
  [String(businessA), String(businessB)].sort().join(":");

const counterpartOf = (link, customerId) => {
  const isRequesterSide =
    String(link.requester_customer_id) === String(customerId);
  return isRequesterSide
    ? {
        businessId: link.target_business_id,
        customerId: link.target_customer_id,
      }
    : {
        businessId: link.requester_business_id,
        customerId: link.requester_customer_id,
      };
};

const getActiveLink = async (customer) => {
  if (!customer?.link_id || customer.link_status !== LINK_STATUS.ACTIVE) {
    return null;
  }
  const link = await Link.findById(customer.link_id);
  return link?.status === LINK_STATUS.ACTIVE ? link : null;
};

export const clearCustomerLink = async (customerIds) => {
  const ids = customerIds.filter(Boolean);
  if (!ids.length) return;
  await Customer.updateMany(
    { _id: { $in: ids } },
    { $set: { link_id: null, link_status: null } }
  );
};

export const endLink = async (link, nextStatus, extra = {}) => {
  await Link.updateOne(
    { _id: link._id },
    { $set: { status: nextStatus, ...extra } }
  );
  await clearCustomerLink([link.requester_customer_id, link.target_customer_id]);
};

export const mirrorTransactionCreate = async (origin, customer) => {
  try {
    if (origin.mirror_of) return null;
    const link = await getActiveLink(customer);
    if (!link) return null;

    const other = counterpartOf(link, customer._id);
    const otherCustomer = await Customer.findOne({
      _id: other.customerId,
      business_id: other.businessId,
      status: STATUS.ACTIVE,
    });
    if (!otherCustomer) return null;

    const mirror = await Transaction.create({
      business_id: other.businessId,
      customer: { _id: otherCustomer._id, name: otherCustomer.name },
      amount: origin.amount,
      transaction_type: invertType(origin.transaction_type),
      payment_mode: origin.payment_mode,
      description: origin.description || "",
      created_at: origin.created_at,
      link_id: link._id,
      mirror_of: origin._id,
    });

    await Transaction.updateOne(
      { _id: origin._id },
      { $set: { mirrored_transaction_id: mirror._id, link_id: link._id } },
      { timestamps: false }
    );
    await recomputeCustomerBalance(otherCustomer._id, {
      transactionCountDelta: 1,
    });
    return mirror;
  } catch (error) {
    if (error?.code !== 11000) {
      logger.error(`Mirror create failed for ${origin?._id}: ${error.message}`);
    }
    return null;
  }
};

export const mirrorTransactionUpdate = async (origin) => {
  try {
    if (!origin?.mirrored_transaction_id) return null;

    const mirror = await Transaction.findOneAndUpdate(
      { _id: origin.mirrored_transaction_id, status: { $ne: STATUS.DELETED } },
      {
        amount: origin.amount,
        transaction_type: invertType(origin.transaction_type),
        payment_mode: origin.payment_mode,
        description: origin.description || "",
        created_at: origin.created_at,
        updated_at: new Date(),
      },
      { new: true, timestamps: false, overwriteImmutable: true }
    );
    if (mirror) await recomputeCustomerBalance(mirror.customer._id);
    return mirror;
  } catch (error) {
    logger.error(`Mirror update failed for ${origin?._id}: ${error.message}`);
    return null;
  }
};

export const mirrorTransactionDelete = async (origin) => {
  try {
    if (!origin?.mirrored_transaction_id) return null;

    const mirror = await Transaction.findOneAndUpdate(
      { _id: origin.mirrored_transaction_id, status: { $ne: STATUS.DELETED } },
      { status: STATUS.DELETED },
      { new: true }
    );
    if (mirror) {
      await recomputeCustomerBalance(mirror.customer._id, {
        transactionCountDelta: -1,
      });
    }
    return mirror;
  } catch (error) {
    logger.error(`Mirror delete failed for ${origin?._id}: ${error.message}`);
    return null;
  }
};

export const resyncLink = async (link) => {
  const since = mongoose.Types.ObjectId.createFromTime(
    Math.floor(new Date(link.accepted_at).getTime() / 1000)
  );
  const sides = [link.requester_customer_id, link.target_customer_id];
  let created = 0;

  for (const customerId of sides) {
    const customer = await Customer.findById(customerId);
    if (!customer) continue;

    const missing = await Transaction.find({
      "customer._id": customer._id,
      status: STATUS.ACTIVE,
      mirror_of: null,
      mirrored_transaction_id: null,
      _id: { $gte: since },
    }).limit(1000);

    for (const transaction of missing) {
      if (await mirrorTransactionCreate(transaction, customer)) created += 1;
    }
  }
  return created;
};
