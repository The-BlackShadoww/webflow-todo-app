import { RequestHandler } from "express";
import siteRepository from "@/repository/site";

export const validateSite: RequestHandler = async (req, res) => {
  const { siteId } = req.query;
  if (!siteId)
    return res
      .status(400)
      .json({ valid: false, message: "siteId is required" });

  const valid = await siteRepository.hasValidSite(siteId as string);
  return res.status(200).json({ valid });
};
