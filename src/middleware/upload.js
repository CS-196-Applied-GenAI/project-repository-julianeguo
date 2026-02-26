import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import sharp from "sharp";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads/profiles");
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function getExtensionFromMime(mimetype) {
  if (mimetype === "image/jpeg") {
    return ".jpg";
  }
  if (mimetype === "image/png") {
    return ".png";
  }
  return "";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const extension = getExtensionFromMime(file.mimetype);
    cb(null, `${randomUUID()}${extension}`);
  }
});

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPEG and PNG files are allowed."));
    }
    return cb(null, true);
  }
});

export function avatarUploadMiddleware(req, res, next) {
  uploadAvatar.single("avatar")(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File must be 2MB or smaller." });
    }

    if (err?.message === "Only JPEG and PNG files are allowed.") {
      return res.status(400).json({ message: err.message });
    }

    return next(err);
  });
}

export async function resizeAvatarImage(req, res, next) {
  try {
    if (!req.file?.path) {
      return res.status(400).json({ message: "Avatar file is required." });
    }

    await sharp(req.file.path).resize(400, 400, { fit: "cover" }).toFile(`${req.file.path}.tmp`);
    fs.renameSync(`${req.file.path}.tmp`, req.file.path);

    return next();
  } catch (error) {
    return next(error);
  }
}

export { MAX_FILE_SIZE_BYTES, UPLOAD_DIR };
