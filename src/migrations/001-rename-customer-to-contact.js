const NAME = "001-rename-customer-to-contact";

const collectionExists = async (db, name) =>
  (await db.listCollections({ name }).toArray()).length > 0;

const dropIndexIfExists = async (collection, indexName) => {
  const indexes = await collection.indexes().catch(() => []);
  if (indexes.some((index) => index.name === indexName)) {
    await collection.dropIndex(indexName);
    return true;
  }
  return false;
};

export const up = async (db, log = () => {}) => {
  const summary = {};

  const hasCustomers = await collectionExists(db, "customers");
  if (hasCustomers) {
    const contactsExist = await collectionExists(db, "contacts");
    if (contactsExist) {
      const contactCount = await db.collection("contacts").countDocuments();
      if (contactCount > 0) {
        throw new Error(
          "Both customers and non-empty contacts collections exist; resolve manually"
        );
      }
      await db.collection("contacts").drop();
    }
    await db.collection("customers").rename("contacts");
    summary.collection_renamed = true;
  }

  const transactions = db.collection("transactions");
  const renamedTransactions = await transactions.updateMany(
    { customer: { $exists: true } },
    { $rename: { customer: "contact" } }
  );
  summary.transactions_renamed = renamedTransactions.modifiedCount;
  summary.old_transaction_index_dropped = await dropIndexIfExists(
    transactions,
    "customer._id_1_status_1_created_at_1"
  );

  const links = db.collection("links");
  const renamedLinks = await links.updateMany(
    {
      $or: [
        { requester_customer_id: { $exists: true } },
        { target_customer_id: { $exists: true } },
      ],
    },
    {
      $rename: {
        requester_customer_id: "requester_contact_id",
        target_customer_id: "target_contact_id",
      },
    }
  );
  summary.links_renamed = renamedLinks.modifiedCount;

  const stats = await db
    .collection("business_stats")
    .updateMany(
      { customer_count: { $exists: true } },
      { $rename: { customer_count: "contact_count" } }
    );
  summary.stats_renamed = stats.modifiedCount;

  const labelled = await db
    .collection("contacts")
    .updateMany({ label: { $exists: false } }, { $set: { label: "customer" } });
  summary.contacts_labelled_customer = labelled.modifiedCount;

  log(`${NAME}: ${JSON.stringify(summary)}`);
  return summary;
};

export default { name: NAME, up };
