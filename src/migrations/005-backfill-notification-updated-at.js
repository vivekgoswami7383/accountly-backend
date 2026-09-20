const NAME = "005-backfill-notification-updated-at";

export const up = async (db, log = () => {}) => {
  const exists = (await db.listCollections({ name: "notifications" }).toArray()).length > 0;
  if (!exists) return { updated: 0 };

  const result = await db.collection("notifications").updateMany(
    { updated_at: { $exists: false } },
    [{ $set: { updated_at: { $ifNull: ["$read_at", "$created_at"] } } }]
  );

  log(`${NAME}: set updated_at on ${result.modifiedCount} notifications`);
  return { updated: result.modifiedCount };
};

export default { name: NAME, up };
