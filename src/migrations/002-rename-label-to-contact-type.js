const NAME = "002-rename-label-to-contact-type";

export const up = async (db, log = () => {}) => {
  const renamed = await db
    .collection("contacts")
    .updateMany(
      { label: { $exists: true }, contact_type: { $exists: false } },
      { $rename: { label: "contact_type" } }
    );
  const summary = { contacts_renamed: renamed.modifiedCount };
  log(`${NAME}: ${JSON.stringify(summary)}`);
  return summary;
};

export default { name: NAME, up };
