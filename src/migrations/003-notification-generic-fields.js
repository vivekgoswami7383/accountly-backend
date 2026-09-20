const NAME = "003-notification-generic-fields";

const DUE_TYPES = ["due_tomorrow", "due_today", "overdue", "due_settled"];

const textFor = (doc) => {
  const data = doc.data || {};
  const name = data.contact_name || "";
  const amount = data.amount ?? 0;
  if (doc.type === "due_settled") {
    return { title: `Settled with ${name}`, body: `${amount} cleared` };
  }
  const title =
    data.direction === "receivable"
      ? `${name} owes you ${amount}`
      : `You owe ${name} ${amount}`;
  const body = {
    due_tomorrow: "Due tomorrow",
    due_today: "Due today",
    overdue: `Overdue since ${data.due_date || ""}`,
  }[doc.type];
  return { title, body: body || "" };
};

export const up = async (db, log = () => {}) => {
  const exists = (await db.listCollections({ name: "notifications" }).toArray()).length > 0;
  if (!exists) return { updated: 0 };

  const collection = db.collection("notifications");
  const cursor = collection.find({
    type: { $in: DUE_TYPES },
    category: { $exists: false },
  });

  let updated = 0;
  let operations = [];
  const flush = async () => {
    if (operations.length === 0) return;
    await collection.bulkWrite(operations, { ordered: false });
    updated += operations.length;
    operations = [];
  };

  for await (const doc of cursor) {
    const { title, body } = textFor(doc);
    operations.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            category: "payment",
            title,
            body,
            target: { kind: "contact", id: doc.data?.contact_id || null },
          },
        },
      },
    });
    if (operations.length >= 500) await flush();
  }
  await flush();

  log(`${NAME}: backfilled ${updated} notifications`);
  return { updated };
};

export default { name: NAME, up };
