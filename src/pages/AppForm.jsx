import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useLocation } from "../context/LocationContext";
import {
  formatLocationLabel,
  getTimeOfDayGreeting,
} from "../location-utils";
import { getTokens, storageKey } from "../token-utils";
import { fetchShipPreview, getApiBaseUrl } from "../services/api";

export default function App() {
  const navigate = useNavigate();
  const { location, loading: locationLoading, error: locationError } = useLocation();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  const greeting = location?.timezone
    ? getTimeOfDayGreeting(location.timezone)
    : "Welcome";
  const locationLabel = formatLocationLabel(location);

  useEffect(() => {
    async function getCards() {
      try {
        setLoading(true);
        setError(null);

        const tokens = await getTokens();

        if (!tokens) {
          navigate("/login");
          return;
        }

        const res = await fetch("https://api.yotoplay.com/content/mine", {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        });

        if (res.ok) {
          const { cards } = await res.json();
          setCards(cards);
        } else {
          console.error(`Failed to fetch cards: ${res.status}`);
        }
      } catch (fetchError) {
        console.error("Error fetching cards:", fetchError);
        setError(fetchError.message);
      } finally {
        setLoading(false);
      }
    }

    getCards();
  }, [navigate]);

  useEffect(() => {
    async function loadPreview() {
      if (!location?.latitude || !location?.longitude) {
        return;
      }

      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const data = await fetchShipPreview({
          lat: location.latitude,
          lng: location.longitude,
          city: location.city,
          region: location.region,
          country: location.country_name,
        });
        setPreview(data);
      } catch (loadError) {
        setPreviewError(loadError.message);
      } finally {
        setPreviewLoading(false);
      }
    }

    loadPreview();
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem(storageKey);
    navigate("/login");
  };

  if (loading || locationLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>{greeting}</h1>
          <button className="danger-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <p className="error-text">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{greeting}</h1>
          <p className="subtitle">Boat Scanner admin dashboard</p>
        </div>
        <div className="header-actions">
          <button className="primary-button" onClick={() => navigate("/create-card")}>
            Create Connected Card
          </button>
          <button className="danger-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {locationLabel && (
        <p className="location-banner">
          Showing content for {locationLabel}
          {location.timezone && ` (${location.timezone})`}
        </p>
      )}
      {locationError && (
        <p className="location-error">Could not detect your location: {locationError}</p>
      )}

      <section className="panel">
        <h2>Nearby Ship Preview</h2>
        <p>
          Preview uses the backend at <code>{getApiBaseUrl()}</code> with your current
          location.
        </p>
        {previewLoading ? <p>Scanning nearby waters...</p> : null}
        {previewError ? <p className="error-text">{previewError}</p> : null}
        {preview ? (
          <div className="preview-grid">
            <div className="preview-card">
              <h3>Intro</h3>
              <p>{preview.introScript}</p>
            </div>
            {preview.ships.map((ship) => (
              <div className="preview-card" key={ship.mmsi || ship.name}>
                <h3>
                  {ship.name}
                  {ship.isFallback ? " (fallback)" : ""}
                </h3>
                <p>
                  <strong>Type:</strong> {ship.type}
                </p>
                <p>
                  <strong>Last port:</strong> {ship.lastPort}
                </p>
                <p>
                  <strong>Destination:</strong> {ship.destination}
                </p>
                <p>{ship.script}</p>
              </div>
            ))}
            <div className="preview-card">
              <h3>Outro</h3>
              <p>{preview.outroScript}</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>Your Yoto Cards</h2>
        <ul className="card-list">
          {cards.map((card) => (
            <li key={card.cardId}>
              <strong>{card.title}</strong> <span>({card.cardId})</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
