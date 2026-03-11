import { Router } from "express";
import multer from "multer";
import { resizeAvatarImage, uploadAvatar } from "../middleware/upload.js";

export function createUploadTestRouter() {
  const router = Router();

  router.post("/upload-test", uploadAvatar.single("avatar"), resizeAvatarImage, (req, res) => {
    return res.status(200).json({
      filename: req.file.filename
    });
  });

  router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File must be 2MB or smaller." });
    }

    if (err?.message === "Only JPEG and PNG files are allowed.") {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: "Internal server error." });
  });

  return router;
}

const uploadTestRoutes = createUploadTestRouter();

export default uploadTestRoutes;
