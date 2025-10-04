import { NextFunction, Request, Response } from "express";
import { catchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import { IOrder } from "../models/orderModel";
import userModel from "../models/userModel";
import courseModel from "../models/courseModel";
import { newOrder } from "../services/order.service";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/nodemailer";
import notificationModel from "../models/notificationModel";

export const createOrder = catchAsyncErrors(async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { courseId, payment_info } = req.body as unknown as IOrder;
    const user = await userModel.findById(req.user?._id);

    const courseExistsInUser = user?.courses.some(
      (course: any) => course._id.toString() === courseId
    );
    if (courseExistsInUser)
      return next(
        new ErrorHandler("You have already purchased this course!", 400)
      );
    const course = await courseModel.findById(courseId);
    if (!course) return next(new ErrorHandler("Course not found!", 404));

    const data: any = {
      courseId: course._id,
      userId: user?._id,
      payment_info,
    };

    const mailData = {
      order: {
        _id: String(course._id).slice(0, 6),
        name: course.name,
        price: course.price,
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      },
    };
    const html = await ejs.renderFile(
      path.join(__dirname, "../mails/order-confirmation.ejs"),
      { order: mailData }
    );
    try {
      if (user)
        await sendMail({
          email: user.email,
          subject: "Order Confirmation",
          template: "order-confirmation.ejs",
          data: mailData,
        });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
    user?.courses.push(course?.id);
    await user?.save();

    await notificationModel.create({
      user: user?._id,
      title: "New Order",
      message: `You have a new Order from ${course?.name}`,
    });
    course.purchased = (course.purchased ?? 0) + 1;
    await course.save();
    newOrder(data, res, next);
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
});
