const NAME = "002-drop-business-due-date-index";
const INDEX = "business_id_1_status_1_due_date_1";

export const up = async (db, log = () => {}) => {
  const collections = await db.listCollections({ name: "contacts" }).toArray();
  if (collections.length === 0) return { dropped: false };

  const indexes = await db.collection("contacts").indexes().catch(() => []);
  if (!indexes.some((index) => index.name === INDEX)) return { dropped: false };

  await db.collection("contacts").dropIndex(INDEX);
  log(`${NAME}: dropped ${INDEX}`);
  return { dropped: true };
};

export default { name: NAME, up };
