import { Router } from "express";
import { startNewPlaySession } from "../services/scan-session.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const overrides = {
      latitude: req.query.lat,
      longitude: req.query.lng,
      city: req.query.city,
      region: req.query.region,
      country_name: req.query.country,
    };

    const session = await startNewPlaySession(req, overrides);
    res.json(session.preview);
  } catch (error) {
    console.error("Preview failed:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
