import express from "express";
import {
  addQuestion,
  addReply,
  editCourse,
  getAllCourses,
  getCourseContentByUser,
  getSingleCourse,
  uploadCourse,
} from "../controllers/courseController";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";

const courseRouter = express.Router();

courseRouter.post(
  "/create-course",
  isAuthenticated,
  authorizeRoles("admin"),
  uploadCourse
);
courseRouter.put(
  "/edit-course/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  editCourse
);
courseRouter.get("/get-single-course/:id", getSingleCourse);
courseRouter.get("/get-all-courses", getAllCourses);
courseRouter.get(
  "/get-course-by-user/:id",
  isAuthenticated,
  getCourseContentByUser
);
courseRouter.put("/add-question", isAuthenticated, addQuestion);
courseRouter.put("/add-reply", isAuthenticated, addReply);

export default courseRouter;
