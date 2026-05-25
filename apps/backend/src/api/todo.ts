import { Router } from "express";
import { getSettings, saveSettings } from "@/controllers/todo";
import {
  createTask,
  deleteTask,
  getTasks,
  replaceTasks,
  updateTask,
} from "@/controllers/todoTasks";

const router = Router();

router.get("/settings/:siteId", getSettings);
router.post("/settings", saveSettings);

router.get("/tasks", getTasks);
router.put("/tasks", replaceTasks);
router.post("/tasks", createTask);
router.patch("/tasks/:taskId", updateTask);
router.delete("/tasks/:taskId", deleteTask);

export default router;
