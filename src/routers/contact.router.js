import express from "express";
import {
  create,
  contacts,
  update,
  remove,
  contact,
  dueContacts,
} from "../controllers/contact.controller.js";
import { checkPermissions } from "../middlewares/check-permission.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { createContactSchema } from "../validations/contact.validation.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  checkPermissions(["contact.create"]),
  validate(createContactSchema),
  create
);

router.get("/", authenticate, checkPermissions(["contacts.get"]), contacts);

router.get("/due", authenticate, checkPermissions(["contacts.get"]), dueContacts);

router.get("/:id", authenticate, checkPermissions(["contacts.get"]), contact);

router.put("/:id", authenticate, checkPermissions(["contact.update"]), update);

router.delete(
  "/:id",
  authenticate,
  checkPermissions(["contact.delete"]),
  remove
);

export default router;
