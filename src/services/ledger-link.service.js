import mongoose from "mongoose";
import { STATUS, TRANSACTION_TYPES } from "../helpers/constants.js";
import { recomputeContactBalance } from "../helpers/functions.js";
import { logger } from "../config/logger.config.js";
import Contact from "../models/contact.model.js";
import Transaction from "../models/transaction.model.js";
import Link, { LINK_STATUS } from "../models/link.model.js";

const invertType = (type) =>
  type === TRANSACTION_TYPES.DEBIT
    ? TRANSACTION_TYPES.CREDIT
    : TRANSACTION_TYPES.DEBIT;

export const buildPairKey = (businessA, businessB) =>
  [String(businessA), String(businessB)].sort().join(":");

const counterpartOf = (link, contactId) => {
  const isRequesterSide =
    String(link.requester_contact_id) === String(contactId);
  return isRequesterSide
    ? {
        businessId: link.target_business_id,
        contactId: link.target_contact_id,
      }
    : {
        businessId: link.requester_business_id,
        contactId: link.requester_contact_id,
      };
};

const getActiveLink = async (contact) => {
  if (!contact?.link_id || contact.link_status !== LINK_STATUS.ACTIVE) {
    return null;
  }
  const link = await Link.findById(contact.link_id);
  return link?.status === LINK_STATUS.ACTIVE ? link : null;
};

export const clearContactLink = async (contactIds) => {
  const ids = contactIds.filter(Boolean);
  if (!ids.length) return;
  await Contact.updateMany(
    { _id: { $in: ids } },
    { $set: { link_id: null, link_status: null } }
  );
};

export const endLink = async (link, nextStatus, extra = {}) => {
  await Link.updateOne(
    { _id: link._id },
    { $set: { status: nextStatus, ...extra } }
  );
  await clearContactLink([link.requester_contact_id, link.target_contact_id]);
};

export const mirrorTransactionCreate = async (origin, contact) => {
  try {
    if (origin.mirror_of) return null;
    const link = await getActiveLink(contact);
    if (!link) return null;

    const other = counterpartOf(link, contact._id);
    const otherContact = await Contact.findOne({
      _id: other.contactId,
      business_id: other.businessId,
      status: STATUS.ACTIVE,
    });
    if (!otherContact) return null;

    const mirror = await Transaction.create({
      business_id: other.businessId,
      contact: { _id: otherContact._id, name: otherContact.name },
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
    await recomputeContactBalance(otherContact._id, {
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
    if (mirror) await recomputeContactBalance(mirror.contact._id);
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
      await recomputeContactBalance(mirror.contact._id, {
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
  const sides = [link.requester_contact_id, link.target_contact_id];
  let created = 0;

  for (const contactId of sides) {
    const contact = await Contact.findById(contactId);
    if (!contact) continue;

    const missing = await Transaction.find({
      "contact._id": contact._id,
      status: STATUS.ACTIVE,
      mirror_of: null,
      mirrored_transaction_id: null,
      _id: { $gte: since },
    }).limit(1000);

    for (const transaction of missing) {
      if (await mirrorTransactionCreate(transaction, contact)) created += 1;
    }
  }
  return created;
};

const IMPORT_BATCH_SIZE = 500;
const IMPORT_STALE_MS = 5 * 60 * 1000;

export const shareableHistoryFilter = (contactId) => ({
  "contact._id": contactId,
  status: STATUS.ACTIVE,
  mirror_of: null,
  mirrored_transaction_id: null,
});

export const importLinkHistory = async (linkId) => {
  const claimed = await Link.findOneAndUpdate(
    {
      _id: linkId,
      status: LINK_STATUS.ACTIVE,
      share_history: true,
      $or: [
        { import_status: { $ne: "running" } },
        { updated_at: { $lt: new Date(Date.now() - IMPORT_STALE_MS) } },
      ],
    },
    { $set: { import_status: "running", import_done: 0 } },
    { new: true }
  );
  if (!claimed) return false;

  const link = claimed;
  try {
    const target = await Contact.findById(link.target_contact_id);
    if (!target) throw new Error("Target contact missing");

    const baseFilter = shareableHistoryFilter(link.requester_contact_id);
    const total = await Transaction.countDocuments(baseFilter);
    await Link.updateOne({ _id: link._id }, { $set: { import_total: total } });

    let lastId = null;
    let processed = 0;
    let inserted = 0;

    for (;;) {
      const origins = await Transaction.find({
        ...baseFilter,
        ...(lastId ? { _id: { $gt: lastId } } : {}),
      })
        .sort({ _id: 1 })
        .limit(IMPORT_BATCH_SIZE)
        .lean();
      if (!origins.length) break;

      const generated = new Set();
      const docs = origins.map((origin) => {
        const _id = new mongoose.Types.ObjectId();
        generated.add(String(_id));
        return {
          _id,
          business_id: link.target_business_id,
          contact: { _id: target._id, name: target.name },
          amount: origin.amount,
          transaction_type: invertType(origin.transaction_type),
          payment_mode: origin.payment_mode,
          description: origin.description || "",
          attachment_key: null,
          status: STATUS.ACTIVE,
          link_id: link._id,
          mirror_of: origin._id,
          mirrored_transaction_id: null,
          created_at: origin.created_at,
          updated_at: origin.created_at,
        };
      });

      try {
        await Transaction.collection.insertMany(docs, { ordered: false });
      } catch (error) {
        const onlyDuplicates =
          Array.isArray(error?.writeErrors) &&
          error.writeErrors.every((writeError) => writeError.code === 11000);
        if (!onlyDuplicates) throw error;
      }

      const mirrors = await Transaction.find({
        mirror_of: { $in: origins.map((origin) => origin._id) },
      })
        .select("_id mirror_of")
        .lean();

      inserted += mirrors.filter((mirror) =>
        generated.has(String(mirror._id))
      ).length;

      await Transaction.bulkWrite(
        mirrors.map((mirror) => ({
          updateOne: {
            filter: { _id: mirror.mirror_of },
            update: {
              $set: { mirrored_transaction_id: mirror._id, link_id: link._id },
            },
          },
        })),
        { timestamps: false }
      );

      processed += origins.length;
      lastId = origins[origins.length - 1]._id;
      await Link.updateOne(
        { _id: link._id },
        { $set: { import_done: processed } }
      );
    }

    await recomputeContactBalance(target._id, {
      transactionCountDelta: inserted,
    });
    await Link.updateOne(
      { _id: link._id },
      { $set: { import_status: "done", imported_at: new Date() } }
    );
    return true;
  } catch (error) {
    logger.error(`History import failed for link ${linkId}: ${error.message}`);
    await Link.updateOne(
      { _id: linkId },
      { $set: { import_status: "failed" } }
    );
    return false;
  }
};

export const startHistoryImport = (linkId) => {
  setImmediate(() => {
    importLinkHistory(linkId).catch((error) =>
      logger.error(`History import crashed for link ${linkId}: ${error.message}`)
    );
  });
};

export const resumeStalledImports = async () => {
  const stalled = await Link.find({
    status: LINK_STATUS.ACTIVE,
    share_history: true,
    import_status: "running",
  })
    .select("_id")
    .lean();
  for (const link of stalled) {
    await Link.updateOne(
      { _id: link._id },
      { $set: { import_status: "failed" } }
    );
    startHistoryImport(link._id);
  }
  return stalled.length;
};
