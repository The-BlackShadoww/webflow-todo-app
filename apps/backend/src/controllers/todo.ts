import { RequestHandler } from "express";
import { getTodoSettings, upsertTodoSettings } from "@/repository/todoSettings";

export const getSettings: RequestHandler = async (req, res) => {
  const { siteId } = req.params;
  if (!siteId) return res.status(400).json({ message: "siteId is required" });

  const settings = await getTodoSettings(siteId);
  return res.status(200).json({ data: settings });
};

export const saveSettings: RequestHandler = async (req, res) => {
  const { siteId, settings } = req.body;
  if (!siteId) return res.status(400).json({ message: "siteId is required" });

  const saved = await upsertTodoSettings({
    siteId,
    allowAdd: settings?.allowAdd ?? true,
    allowEdit: settings?.allowEdit ?? true,
    allowDelete: settings?.allowDelete ?? true,
    showCompleted: settings?.showCompleted ?? true,
    persistInBrowser: settings?.persistInBrowser ?? true,
    theme: settings?.theme ?? "system",
  });

  return res.status(200).json({ success: true, data: saved });
};
