import { NextFunction, Request, Response } from "express";
import { catchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import cloudinary from "../utils/cloudinary";
import { createCourse } from "../services/course.service";
import courseModel from "../models/courseModel";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/nodemailer";

export const uploadCourse = catchAsyncErrors(async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = req.body;
    if (data.thumbnail) {
      const cloud = await cloudinary.uploader.upload(data.thumbnail, {
        folder: "courses",
      });
      data.thumbnail = {
        public_id: cloud.public_id,
        url: cloud.secure_url,
      };
    }
    createCourse(data, res, next);
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
});

export const editCourse = catchAsyncErrors(async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = req.body;
    const courseId = req.params.id;
    const thumbnail = data.thumbnail;

    if (thumbnail) {
      await cloudinary.uploader.destroy(thumbnail.public_id);
      const cloud = await cloudinary.uploader.upload(thumbnail, {
        folder: "courses",
      });
      data.thumbnail = {
        public_id: cloud.public_id,
        url: cloud.secure_url,
      };
    }
    const course = await courseModel.findByIdAndUpdate(
      courseId,
      {
        $set: data,
      },
      { new: true }
    );
    res.status(201).json({ success: true, course });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
});

export const getSingleCourse = catchAsyncErrors(async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const courseId = req.params.id;
    const isCacheExists = await redis.get(courseId);
    if (isCacheExists) {
      const course = JSON.parse(isCacheExists);
      res.status(200).json({ success: true, course });
    } else {
      const course = await courseModel
        .findById(req.params.id)
        .select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        );
      await redis.set(courseId, JSON.stringify(course));
      res.status(200).json({ success: true, course });
    }
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
});

export const getAllCourses = catchAsyncErrors(async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const isCacheExists = await redis.get("allCourses");
    if (isCacheExists) {
      const courses = JSON.parse(isCacheExists);
      res.status(200).json({ success: true, courses });
    } else {
      const allCourses = await courseModel
        .find()
        .select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        );
      await redis.set("allCourses", JSON.stringify(allCourses));
      res.status(200).json({ success: true, allCourses });
    }
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
});

export const getCourseContentByUser = catchAsyncErrors(async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userCourseList = req.user?.courses;
    const courseId = req.params.id;

    const courseExists = userCourseList?.find(
      (course: any) => course._id.toString() === courseId
    );
    if (!courseExists)
      return next(
        new ErrorHandler("You aren't eligible to access this course!", 404)
      );
    const course = await courseModel.findById(courseId);
    const content = course?.courseData;
    res.status(201).json({ success: true, content });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
});

interface IAddQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}

export const addQuestion = catchAsyncErrors(async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { question, courseId, contentId }: IAddQuestionData = req.body;
    const course = await courseModel.findById(courseId);

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return next(new ErrorHandler("Invalid Content!", 400));
    }
    const courseContent = course?.courseData.find((item: any) =>
      item._id.equals(contentId)
    );
    if (!courseContent)
      return next(new ErrorHandler("Invalid Content Id!", 400));

    // create a new question object
    const newQuestion: any = {
      user: req.user,
      question,
      questionReplies: [],
    };
    // add this question to our Course Content
    courseContent.questions.push(newQuestion);
    // save the updated course
    await course?.save();
    res.status(200).json({ success: true, course });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
});

interface IAddReplyBody {
  reply: string;
  courseId: string;
  contentId: string;
  questionId: string;
}

export const addReply = catchAsyncErrors(async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { reply, courseId, contentId, questionId }: IAddReplyBody = req.body;
    const course = await courseModel.findById(courseId);

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return next(new ErrorHandler("Invalid Content!", 400));
    }
    const courseContent = course?.courseData.find((item: any) =>
      item._id.equals(contentId)
    );
    if (!courseContent)
      return next(new ErrorHandler("Invalid Content Id!", 400));

    const question = courseContent.questions.find((item: any) =>
      item._id.equals(questionId)
    );
    if (!question) return next(new ErrorHandler("Invalid question Id", 400));

    // create new answer object...

    const newReply: any = {
      user: req.user,
      reply,
    };

    question.questionReplies?.push(newReply);
    await course?.save();

    if (req.user?._id === question.user._id) {
      // res.send("REACHED!");
    } else {
      const data = {
        name: question.user.name,
        title: courseContent.title,
      };
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/question-reply.ejs"),
        data
      );
      try {
        await sendMail({
          email: question.user.email,
          subject: "Question Reply",
          template: "question-reply.ejs",
          data,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    }
    res.status(200).json({ success: true, course });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
});
