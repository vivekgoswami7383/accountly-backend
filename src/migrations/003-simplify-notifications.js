const NAME = "003-simplify-notifications";
const CATEGORY_INDEX = "user_id_1_category_1_created_at_-1";

const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const shortDate = (dateStr) =>
  dateStr
    ? new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      })
    : "";

const messageFor = (doc) => {
  if (doc.message) return doc.message;
  const data = doc.data || {};
  const name = data.contact_name || "";
  if (doc.type === "due_settled") return `Settled with ${name}. ${money(data.amount)} cleared.`;
  const lead =
    data.direction === "receivable"
      ? `${name} owes you ${money(data.amount)}`
      : `You owe ${name} ${money(data.amount)}`;
  const tail = {
    due_tomorrow: "Due tomorrow",
    due_today: "Due today",
    overdue: `Overdue since ${shortDate(data.due_date)}`,
  }[doc.type];
  return tail ? `${lead}. ${tail}.` : lead;
};

const linkFor = (doc) => {
  if (doc.link) return doc.link;
  const kind = doc.target?.kind;
  const id = doc.target?.id || doc.data?.contact_id;
  if (kind === "transaction" && id) return `/transaction/${id}`;
  if (id) return `/contact/${id}`;
  return null;
};

const simplify = (doc) => ({
  business_id: doc.business_id,
  user_id: doc.user_id,
  type: doc.type,
  message: messageFor(doc),
  link: linkFor(doc),
  dedupe_key: doc.dedupe_key,
  read_at: doc.read_at ?? null,
  expires_at: doc.expires_at,
  created_at: doc.created_at,
  updated_at: doc.updated_at || doc.read_at || doc.created_at,
});

const isSimple = (doc) =>
  Object.keys(doc).join(",") ===
  "_id,business_id,user_id,type,message,link,dedupe_key,read_at,expires_at,created_at,updated_at";

export const up = async (db, log = () => {}) => {
  const exists = (await db.listCollections({ name: "notifications" }).toArray()).length > 0;
  if (!exists) return { rewritten: 0 };

  const collection = db.collection("notifications");
  let rewritten = 0;
  let operations = [];

  const flush = async () => {
    if (operations.length === 0) return;
    await collection.bulkWrite(operations, { ordered: false });
    rewritten += operations.length;
    operations = [];
  };

  for await (const doc of collection.find({})) {
    if (isSimple(doc)) continue;
    operations.push({
      replaceOne: {
        filter: { _id: doc._id, read_at: doc.read_at ?? null },
        replacement: simplify(doc),
      },
    });
    if (operations.length >= 500) await flush();
  }
  await flush();

  const indexes = await collection.indexes().catch(() => []);
  if (indexes.some((index) => index.name === CATEGORY_INDEX)) {
    await collection.dropIndex(CATEGORY_INDEX);
  }

  log(`${NAME}: rewrote ${rewritten} notifications`);
  return { rewritten };
};

export default { name: NAME, up };
