import { Router } from "express";
import { hashContent, getOrCreateMp3 } from "../services/cache.js";
import { config } from "../config.js";
import { getScanSession, getShipFromSession } from "../services/scan-session.js";
import {
  buildIntroScript,
  buildTransitionScript,
  buildOutroScript,
  buildShipScript,
} from "../services/narration.js";
import {
  synthesizeMp3,
  estimateDurationSeconds,
  estimateFileSize,
} from "../services/tts.js";

const router = Router();

async function streamScript(req, res, script) {
  const cacheKey = hashContent(`${config.ttsVoice}:${script}`);
  const buffer = await getOrCreateMp3({
    cacheKey,
    generator: () => synthesizeMp3(script),
  });

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(buffer);
}

router.get("/intro", async (req, res) => {
  try {
    const session = await getScanSession(req);
    await streamScript(req, res, buildIntroScript(session.location));
  } catch (error) {
    console.error("Intro audio failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/ship/:index", async (req, res) => {
  try {
    const shipIndex = Number(req.params.index);
    if (!Number.isInteger(shipIndex) || shipIndex < 1) {
      return res.status(400).json({ error: "Invalid ship index" });
    }

    const session = await getScanSession(req);
    const ship = getShipFromSession(session, shipIndex);
    if (!ship) {
      return res.status(404).json({ error: "Ship not found for this scan" });
    }

    await streamScript(req, res, buildShipScript(ship));
  } catch (error) {
    console.error("Ship audio failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/transition/:index", async (req, res) => {
  try {
    const transitionIndex = Number(req.params.index);
    if (!Number.isInteger(transitionIndex) || transitionIndex < 1) {
      return res.status(400).json({ error: "Invalid transition index" });
    }

    await getScanSession(req);
    await streamScript(req, res, buildTransitionScript(transitionIndex));
  } catch (error) {
    console.error("Transition audio failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/outro", async (req, res) => {
  try {
    await getScanSession(req);
    await streamScript(req, res, buildOutroScript());
  } catch (error) {
    console.error("Outro audio failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/metadata", async (req, res) => {
  try {
    const session = await getScanSession(req);
    const tracks = [
      {
        id: "intro",
        title: "Scanning the Waters",
        script: buildIntroScript(session.location),
        duration: estimateDurationSeconds(buildIntroScript(session.location)),
      },
      ...session.ships.flatMap((ship, index) => {
        const shipScript = buildShipScript(ship);
        const tracks = [
          {
            id: `ship-${index + 1}`,
            title: index === 0 ? "A Ship" : index === 1 ? "Another Ship" : "And Another Ship",
            script: shipScript,
            duration: estimateDurationSeconds(shipScript),
          },
        ];

        if (index < session.ships.length - 1) {
          const transitionScript = buildTransitionScript(index + 1);
          tracks.push({
            id: `transition-${index + 1}`,
            title: "Listening...",
            script: transitionScript,
            duration: estimateDurationSeconds(transitionScript),
          });
        }

        return tracks;
      }),
      {
        id: "outro",
        title: "Over and Out",
        script: buildOutroScript(),
        duration: estimateDurationSeconds(buildOutroScript()),
      },
    ].map((track) => ({
      ...track,
      fileSize: estimateFileSize(track.duration),
    }));

    res.json({ location: session.location, tracks });
  } catch (error) {
    console.error("Metadata failed:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
