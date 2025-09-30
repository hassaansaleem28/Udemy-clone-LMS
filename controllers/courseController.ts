import { NextFunction, Request, Response } from "express";
import { catchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import cloudinary from "../utils/cloudinary";

export const uploadCourse = catchAsyncErrors(async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    let { thumbnail } = req.body;
    if (thumbnail) {
      const cloud = await cloudinary.uploader.upload(thumbnail, {
        folder: "courses",
      });
      thumbnail = {
        public_id: cloud.public_id,
        url: cloud.secure_url,
      };
    }
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
});
