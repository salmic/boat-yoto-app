import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchUserLocation } from "../location-utils";

const LocationContext = createContext({
  location: null,
  loading: true,
  error: null,
});

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchUserLocation()
      .then((data) => {
        if (!cancelled) {
          setLocation(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to fetch user location:", err);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LocationContext.Provider value={{ location, loading, error }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
