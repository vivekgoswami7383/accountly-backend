const NAME = "004-normalize-notification-order";

const FIELD_ORDER = [
  "_id",
  "user_id",
  "business_id",
  "type",
  "category",
  "title",
  "body",
  "data",
  "target",
  "dedupe_key",
  "read_at",
  "expires_at",
  "created_at",
];

const REMOVED_FIELDS = ["actor_id"];

const normalise = (doc) => {
  const ordered = {};
  FIELD_ORDER.forEach((key) => {
    if (key in doc) ordered[key] = doc[key];
  });
  Object.keys(doc).forEach((key) => {
    if (!(key in ordered) && !REMOVED_FIELDS.includes(key)) ordered[key] = doc[key];
  });
  if (ordered.target && typeof ordered.target === "object") {
    ordered.target = { kind: ordered.target.kind, id: ordered.target.id };
  }
  return ordered;
};

const sameOrder = (doc, ordered) =>
  Object.keys(doc).join(",") === Object.keys(ordered).join(",");

export const up = async (db, log = () => {}) => {
  const exists = (await db.listCollections({ name: "notifications" }).toArray()).length > 0;
  if (!exists) return { reordered: 0 };

  const collection = db.collection("notifications");
  let reordered = 0;
  let operations = [];

  const flush = async () => {
    if (operations.length === 0) return;
    await collection.bulkWrite(operations, { ordered: false });
    reordered += operations.length;
    operations = [];
  };

  for await (const doc of collection.find({})) {
    const ordered = normalise(doc);
    if (sameOrder(doc, ordered)) continue;
    operations.push({
      replaceOne: { filter: { _id: doc._id, read_at: doc.read_at }, replacement: ordered },
    });
    if (operations.length >= 500) await flush();
  }
  await flush();

  log(`${NAME}: reordered ${reordered} notifications`);
  return { reordered };
};

export default { name: NAME, up };
