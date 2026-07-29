const DEFAULT_ICON = "yoto:#ZuVmuvnoFiI4el6pBPvq0ofcgQ18HjrCmdPEE7GCnP8";

const CARD_TITLE = "Boat Scanner";
const CARD_DESCRIPTION =
  "A connected ship scanner that finds vessels near your Yoto player and teaches you about them.";

function buildStreamTrack({
  key,
  title,
  trackUrl,
  uid,
  overlayLabel,
  duration = 45,
  fileSize = 720000,
}) {
  return {
    key,
    title,
    trackUrl,
    uid,
    overlayLabel,
    type: "stream",
    format: "mp3",
    duration,
    fileSize,
    channels: "mono",
    display: {
      icon16x16: DEFAULT_ICON,
    },
  };
}

function buildChapter({ key, title, overlayLabel, track }) {
  return {
    key,
    title,
    overlayLabel,
    defaultTrackDisplay: "icon",
    defaultTrackAmbient: "none",
    tracks: [track],
    display: {
      icon16x16: DEFAULT_ICON,
    },
  };
}

export function buildBoatScannerPlaylist(baseUrl, metadataTracks = []) {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const metadataById = Object.fromEntries(
    metadataTracks.map((track) => [track.id, track])
  );

  const trackDefinitions = [
    {
      chapterKey: "01",
      chapterTitle: "Scanning the Waters",
      overlayLabel: "1",
      trackKey: "01",
      trackTitle: "Scanning the Waters",
      trackUid: "intro",
      path: "/audio/intro",
      metadataId: "intro",
    },
    {
      chapterKey: "02",
      chapterTitle: "A Ship",
      overlayLabel: "2",
      trackKey: "01",
      trackTitle: "A Ship",
      trackUid: "ship-1",
      path: "/audio/ship/1",
      metadataId: "ship-1",
    },
    {
      chapterKey: "03",
      chapterTitle: "Listening...",
      overlayLabel: "3",
      trackKey: "01",
      trackTitle: "Listening...",
      trackUid: "transition-1",
      path: "/audio/transition/1",
      metadataId: "transition-1",
    },
    {
      chapterKey: "04",
      chapterTitle: "Another Ship",
      overlayLabel: "4",
      trackKey: "01",
      trackTitle: "Another Ship",
      trackUid: "ship-2",
      path: "/audio/ship/2",
      metadataId: "ship-2",
    },
    {
      chapterKey: "05",
      chapterTitle: "Listening...",
      overlayLabel: "5",
      trackKey: "01",
      trackTitle: "Listening...",
      trackUid: "transition-2",
      path: "/audio/transition/2",
      metadataId: "transition-2",
    },
    {
      chapterKey: "06",
      chapterTitle: "And Another Ship",
      overlayLabel: "6",
      trackKey: "01",
      trackTitle: "And Another Ship",
      trackUid: "ship-3",
      path: "/audio/ship/3",
      metadataId: "ship-3",
    },
    {
      chapterKey: "07",
      chapterTitle: "Over and Out",
      overlayLabel: "7",
      trackKey: "01",
      trackTitle: "Over and Out",
      trackUid: "outro",
      path: "/audio/outro",
      metadataId: "outro",
    },
  ];

  const chapters = trackDefinitions.map((definition) => {
    const metadata = metadataById[definition.metadataId];
    const track = buildStreamTrack({
      key: definition.trackKey,
      title: definition.trackTitle,
      trackUrl: `${normalizedBase}${definition.path}`,
      uid: definition.trackUid,
      overlayLabel: definition.overlayLabel,
      duration: metadata?.duration || 45,
      fileSize: metadata?.fileSize || 720000,
    });

    return buildChapter({
      key: definition.chapterKey,
      title: definition.chapterTitle,
      overlayLabel: definition.overlayLabel,
      track,
    });
  });

  const totalDuration = chapters.reduce(
    (sum, chapter) => sum + (chapter.tracks[0]?.duration || 0),
    0
  );
  const totalFileSize = chapters.reduce(
    (sum, chapter) => sum + (chapter.tracks[0]?.fileSize || 0),
    0
  );

  return {
    title: CARD_TITLE,
    content: {
      chapters,
      config: {
        onlineOnly: true,
        autoadvance: "next",
      },
    },
    metadata: {
      description: CARD_DESCRIPTION,
      category: "activities",
      media: {
        duration: totalDuration,
        fileSize: totalFileSize,
      },
    },
  };
}

export async function fetchTrackMetadata(apiBaseUrl) {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/audio/metadata`);
  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.tracks || [];
}

export async function createBoatScannerCard({
  accessToken,
  apiBaseUrl,
  cardId = null,
}) {
  const metadataTracks = await fetchTrackMetadata(apiBaseUrl);
  const payload = buildBoatScannerPlaylist(apiBaseUrl, metadataTracks);

  if (cardId) {
    payload.cardId = cardId;
  }

  const response = await fetch("https://api.yotoplay.com/content", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create card: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function getMyCards(accessToken) {
  const response = await fetch("https://api.yotoplay.com/content/mine", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch cards: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.cards || [];
}

export function findBoatScannerCard(cards) {
  return cards.find((card) => card.title === CARD_TITLE) || null;
}
