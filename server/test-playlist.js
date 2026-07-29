import { buildBoatScannerPlaylist } from "../src/services/yoto-content.js";

const playlist = buildBoatScannerPlaylist("http://localhost:3001", [
  { id: "intro", duration: 12, fileSize: 96000 },
  { id: "ship-1", duration: 45, fileSize: 720000 },
  { id: "transition-1", duration: 8, fileSize: 64000 },
  { id: "ship-2", duration: 45, fileSize: 720000 },
  { id: "transition-2", duration: 8, fileSize: 64000 },
  { id: "ship-3", duration: 45, fileSize: 720000 },
  { id: "outro", duration: 10, fileSize: 80000 },
]);

if (playlist.content.chapters.length !== 7) {
  throw new Error(`Expected 7 chapters, got ${playlist.content.chapters.length}`);
}

const streamTracks = playlist.content.chapters.flatMap((chapter) => chapter.tracks);
if (streamTracks.some((track) => track.type !== "stream")) {
  throw new Error("All tracks must be stream tracks");
}

if (!playlist.content.config.onlineOnly) {
  throw new Error("Connected card must be onlineOnly");
}

console.log("Playlist tests passed");
