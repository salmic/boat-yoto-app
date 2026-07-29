import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useLocation } from "../context/LocationContext";
import { formatLocationLabel } from "../location-utils";
import { getTokens } from "../token-utils";
import {
  createBoatScannerCard,
  findBoatScannerCard,
  getMyCards,
} from "../services/yoto-content";
import { fetchHealth, getApiBaseUrl } from "../services/api";

export default function CreateCard() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [existingCard, setExistingCard] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    async function loadExistingCard() {
      const tokens = await getTokens();
      if (!tokens) {
        navigate("/login");
        return;
      }

      try {
        const cards = await getMyCards(tokens.accessToken);
        setExistingCard(findBoatScannerCard(cards));
      } catch (loadError) {
        console.error(loadError);
      }
    }

    async function loadHealth() {
      try {
        setHealth(await fetchHealth());
      } catch (healthError) {
        setHealth({ status: "offline", error: healthError.message });
      }
    }

    loadExistingCard();
    loadHealth();
  }, [navigate]);

  const handleCreateCard = async () => {
    setStatus("creating");
    setError(null);

    try {
      const tokens = await getTokens();
      if (!tokens) {
        navigate("/login");
        return;
      }

      const card = await createBoatScannerCard({
        accessToken: tokens.accessToken,
        apiBaseUrl: apiBaseUrl,
        cardId: existingCard?.cardId || null,
      });

      setResult(card);
      setExistingCard(card);
      setStatus("success");
    } catch (createError) {
      setError(createError.message);
      setStatus("error");
    }
  };

  const locationLabel = formatLocationLabel(location);
  const apiBaseUrl = getApiBaseUrl();
  const isLocalhost =
    apiBaseUrl.includes("localhost") || apiBaseUrl.includes("127.0.0.1");

  const testTracks = [
    { label: "Intro", path: "/audio/intro" },
    { label: "Ship 1", path: "/audio/ship/1" },
    { label: "Ship 2", path: "/audio/ship/2" },
    { label: "Outro", path: "/audio/outro" },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Create Boat Scanner Card</h1>
          <p className="subtitle">
            Publish a connected Yoto card that streams live ship narrations from{" "}
            {apiBaseUrl}
          </p>
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={() => navigate("/app")}>
            Back to Dashboard
          </button>
        </div>
      </div>

      <section className="panel">
        <h2>API Status</h2>
        {health?.status === "ok" ? (
          <p className="success-text">
            Backend is online
            {health.hasVesselApiKey ? " with VesselAPI configured." : " (using fallback ship data)."}
          </p>
        ) : (
          <p className="error-text">
            Backend unavailable. Start the server with <code>npm run start:server</code>.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Test Audio Locally</h2>
        <p>
          With the backend running, open these links in your browser. The first
          play of each track takes 10–20 seconds while speech is generated, then
          the MP3 plays.
        </p>
        <ul className="card-list">
          {testTracks.map((track) => (
            <li key={track.path}>
              <a href={`${apiBaseUrl}${track.path}`} target="_blank" rel="noreferrer">
                {track.label}
              </a>
            </li>
          ))}
        </ul>
        {isLocalhost ? (
          <p className="warning-text">
            Your card uses <code>{apiBaseUrl}</code>. The Yoto app and Yoto player
            cannot reach localhost on your computer, so the card will be silent until
            you deploy the backend to a public HTTPS URL and recreate the card.
          </p>
        ) : null}
      </section>

      <section className="panel">
        <h2>Connected Card</h2>
        <p>
          This creates a 7-chapter streaming playlist like Dreaming of a Jet Plane:
          intro, three ship tracks, two transitions, and an outro. Each track pulls
          fresh audio when played on a Wi-Fi connected Yoto player.
        </p>
        {locationLabel ? (
          <p>
            Preview location: <strong>{locationLabel}</strong>
          </p>
        ) : null}
        {existingCard ? (
          <p>
            Existing card found: <strong>{existingCard.title}</strong> (
            {existingCard.cardId}). Creating again will update this card.
          </p>
        ) : (
          <p>No Boat Scanner card found yet. This will create a new one.</p>
        )}

        <button
          className="primary-button"
          onClick={handleCreateCard}
          disabled={status === "creating"}
        >
          {status === "creating"
            ? "Creating card..."
            : existingCard
              ? "Update Connected Card"
              : "Create Connected Card"}
        </button>

        {error ? <p className="error-text">Error: {error}</p> : null}
        {result ? (
          <div className="result-box">
            <p className="success-text">Card ready in your Yoto library.</p>
            <p>
              Card ID: <code>{result.cardId}</code>
            </p>
            <p>
              Title: <strong>{result.title}</strong>
            </p>
            <ol>
              <li>Open the Yoto app on your phone.</li>
              <li>Find the new playlist in your library.</li>
              <li>Link it to a Make Your Own card.</li>
              <li>Insert the card in your Yoto player while connected to Wi-Fi.</li>
            </ol>
          </div>
        ) : null}
      </section>
    </div>
  );
}
