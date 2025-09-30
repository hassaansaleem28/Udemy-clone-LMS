import { Request, Response, NextFunction } from "express";
import { catchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import courseModel from "../models/courseModel";

export const createCourse = catchAsyncErrors(async function (
  data: any,
  res: Response,
  next: NextFunction
) {
  try {
    const course = await courseModel.create(data);
    res.status(201).json({ success: true, course });
  } catch (error: any) {
    next(new ErrorHandler(error.message, 400));
  }
});
