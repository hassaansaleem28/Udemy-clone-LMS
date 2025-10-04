import { NextFunction, Response } from "express";
import { catchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import orderModel from "../models/orderModel";

export const newOrder = catchAsyncErrors(async function (
  data: any,
  res: Response,
  next: NextFunction
) {
  try {
    const newOrder = await orderModel.create(data);
    res.status(201).json({ success: true, order: newOrder });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
});
