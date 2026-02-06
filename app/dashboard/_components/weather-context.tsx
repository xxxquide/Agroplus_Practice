"use client";

import * as React from "react";

export type WeatherSlot = {
  time: string;
  temp: number;
  humidity: number;
  wind: number;
  precip: number;
  icon: string;
};

export type WeatherData = {
  hourly: WeatherSlot[];
  daily: {
    date: string;
    tempMax: number;
    tempMin: number;
    wind: number;
    precip: number;
    icon: string;
  }[];
  summary: {
    wind: number;
    humidity: number;
    precip: number;
  };
  risk: {
    label: string;
    tone: "success" | "warning" | "danger";
  };
  updatedAt: string;
  stale: boolean;
};

type WeatherState = {
  loading: boolean;
  error?: string;
  data?: WeatherData;
  locationLabel: string;
  coords: { lat: number; lon: number };
};

const DEFAULT_COORDS = { lat: 49.2331, lon: 28.4682 };
const DEFAULT_LABEL = "Вінниця";

const WeatherContext = React.createContext<WeatherState>({
  loading: true,
  locationLabel: DEFAULT_LABEL,
  coords: DEFAULT_COORDS
});

export function WeatherProvider({
  children,
  refreshToken
}: {
  children: React.ReactNode;
  refreshToken?: number;
}) {
  const [state, setState] = React.useState<WeatherState>({
    loading: true,
    locationLabel: DEFAULT_LABEL,
    coords: DEFAULT_COORDS
  });

  React.useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState((prev) => ({
          ...prev,
          coords: {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          },
          locationLabel: "Ваша локація"
        }));
      },
      () => {}
    );
  }, []);

  React.useEffect(() => {
    let active = true;
    let interval: NodeJS.Timeout | null = null;

    const load = async () => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const url = new URL("/api/weather", window.location.origin);
        url.searchParams.set("lat", String(state.coords.lat));
        url.searchParams.set("lon", String(state.coords.lon));

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Weather error");
        const data = (await response.json()) as WeatherData;
        if (active) {
          setState((prev) => ({ ...prev, loading: false, data, error: undefined }));
        }
      } catch {
        if (active) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: "Немає зв'язку з погодним сервісом"
          }));
        }
      }
    };

    load();
    interval = setInterval(load, 5 * 60 * 1000);

    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [refreshToken, state.coords.lat, state.coords.lon]);

  return (
    <WeatherContext.Provider value={state}>{children}</WeatherContext.Provider>
  );
}

export function useWeather() {
  return React.useContext(WeatherContext);
}
