import express from "express";
import { summarizeCrisisGptOss } from "../controller/news.controller.js";

const NewsRouter = express.Router();

NewsRouter.post("/summary", summarizeCrisisGptOss);

export default NewsRouter;