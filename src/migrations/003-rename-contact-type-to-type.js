const NAME = "003-rename-contact-type-to-type";

export const up = async (db, log = () => {}) => {
  const renamed = await db
    .collection("contacts")
    .updateMany(
      { contact_type: { $exists: true }, type: { $exists: false } },
      { $rename: { contact_type: "type" } }
    );
  const summary = { contacts_renamed: renamed.modifiedCount };
  log(`${NAME}: ${JSON.stringify(summary)}`);
  return summary;
};

export default { name: NAME, up };
