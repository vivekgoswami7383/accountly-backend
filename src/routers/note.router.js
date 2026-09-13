import express from "express";
import { create, notes, note, update, remove } from "../controllers/note.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { checkPermissions } from "../middlewares/check-permission.js";
import { validate } from "../middlewares/validate.js";
import { createNoteSchema } from "../validations/note.validation.js";

const router = express.Router();

router.post("/", authenticate, validate(createNoteSchema), checkPermissions(["note.create"]), create);
router.get("/", authenticate, checkPermissions(["notes.get"]), notes);
router.get("/:id", authenticate, checkPermissions(["notes.get"]), note);
router.put("/:id", authenticate, checkPermissions(["note.update"]), update);
router.delete("/:id", authenticate, checkPermissions(["note.delete"]), remove);

export default router;
