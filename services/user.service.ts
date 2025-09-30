import { Response } from "express";
import { redis } from "../utils/redis";

export const getUserById = async function (id: string, res: Response) {
  try {
    const userJson = await redis.get(id);
    if (userJson) {
      const user = JSON.parse(userJson);
      res.status(200).json({ success: true, user });
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
};
