import renameCustomerToContact from "./001-rename-customer-to-contact.js";

const MIGRATIONS = [renameCustomerToContact];

export const runMigrations = async (db, log = () => {}) => {
  const applied = db.collection("migrations");
  for (const migration of MIGRATIONS) {
    if (await applied.findOne({ name: migration.name })) continue;

    const summary = await migration.up(db, log);
    await applied.insertOne({
      name: migration.name,
      applied_at: new Date(),
      summary,
    });
    log(`Applied migration ${migration.name}`);
  }
};
