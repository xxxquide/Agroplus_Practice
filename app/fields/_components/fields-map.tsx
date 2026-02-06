"use client";

import * as React from "react";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type { GeoJSONSource, Map as MaplibreMap, MapMouseEvent } from "maplibre-gl";
import { formatDate } from "@/lib/format";

export type FieldFeature = Feature<Geometry, GeoJsonProperties> & {
  id: string;
};

export type MachineryPoint = Feature<
  { type: "Point"; coordinates: [number, number] },
  GeoJsonProperties
> & { id: string };

type Props = {
  fields: FeatureCollection<Geometry, GeoJsonProperties>;
  machinery: FeatureCollection<
    { type: "Point"; coordinates: [number, number] },
    GeoJsonProperties
  >;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showMachinery: boolean;
  drawMode: boolean;
  onDrawChange: (geojson: Geometry | null) => void;
};

export function FieldsMap({
  fields,
  machinery,
  selectedId,
  onSelect,
  showMachinery,
  drawMode,
  onDrawChange
}: Props) {
  const mapRef = React.useRef<MaplibreMap | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const hoveredIdRef = React.useRef<string | null>(null);
  const [mapReady, setMapReady] = React.useState(false);
  const hasFitRef = React.useRef(false);
  const drawModeRef = React.useRef(drawMode);
  const fieldsRef = React.useRef(fields);
  const draftPointsRef = React.useRef<[number, number][]>([]);
  const closedRef = React.useRef(false);
  const [snapToFirst, setSnapToFirst] = React.useState(false);
  const [overlayPaths, setOverlayPaths] = React.useState<
    { id: string; key: string; d: string; properties: GeoJsonProperties }[]
  >([]);
  const [draftOverlay, setDraftOverlay] = React.useState<{
    line: string | null;
    polygon: string | null;
    points: { x: number; y: number; role: "first" | "point" }[];
  }>({ line: null, polygon: null, points: [] });
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = React.useState<{
    x: number;
    y: number;
    properties: GeoJsonProperties;
  } | null>(null);
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });

  const fitToFields = React.useCallback(
    (target: FeatureCollection<Geometry, GeoJsonProperties>) => {
      const features = target.features ?? [];
      if (!features.length) return;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      const walkCoords = (coords: unknown) => {
        if (!coords) return;
        if (
          Array.isArray(coords) &&
          typeof coords[0] === "number" &&
          typeof coords[1] === "number"
        ) {
          const [x, y] = coords as [number, number];
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          return;
        }
        if (Array.isArray(coords)) {
          coords.forEach(walkCoords);
        }
      };

      for (const feature of features) {
        const geom = feature.geometry;
        if (geom && "coordinates" in geom) {
          walkCoords(geom.coordinates);
        }
      }

      if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;
      const map = mapRef.current;
      if (!map) return;
      map.fitBounds(
        [
          [minX, minY],
          [maxX, maxY]
        ],
        { padding: 80, duration: 0, maxZoom: 12 }
      );
    },
    []
  );

  const polygonContainsPoint = React.useCallback((point: [number, number], geometry: Geometry) => {
    const isPointInRing = (ring: [number, number][]) => {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0];
        const yi = ring[i][1];
        const xj = ring[j][0];
        const yj = ring[j][1];
        const intersect =
          yi > point[1] !== yj > point[1] &&
          point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi + Number.EPSILON) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const isPointInPolygon = (rings: [number, number][][]) => {
      if (!rings.length) return false;
      if (!isPointInRing(rings[0])) return false;
      for (let i = 1; i < rings.length; i += 1) {
        if (isPointInRing(rings[i])) return false;
      }
      return true;
    };

    if (geometry.type === "Polygon") {
      return isPointInPolygon(geometry.coordinates as [number, number][][]);
    }
    if (geometry.type === "MultiPolygon") {
      return (geometry.coordinates as [number, number][][][]).some((rings) =>
        isPointInPolygon(rings)
      );
    }
    return false;
  }, []);

  const updateOverlayPaths = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const paths: { id: string; key: string; d: string; properties: GeoJsonProperties }[] = [];

    fieldsRef.current.features?.forEach((feature, featureIndex) => {
      const geometry = feature.geometry;
      if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return;
      const id =
        (feature.properties?.id as string | undefined) ??
        (feature.id as string | number | undefined)?.toString() ??
        `field-${featureIndex}`;
      const polygons =
        geometry.type === "Polygon"
          ? [geometry.coordinates as [number, number][][]]
          : (geometry.coordinates as [number, number][][][]);

      polygons.forEach((rings, ringIndex) => {
        const pathSegments = rings
          .map((ring) => {
            if (!ring.length) return "";
            const projected = ring.map((coord) => map.project({ lng: coord[0], lat: coord[1] }));
            const [first, ...rest] = projected;
            return `M ${first.x} ${first.y} ${rest
              .map((point) => `L ${point.x} ${point.y}`)
              .join(" ")} Z`;
          })
          .filter(Boolean)
          .join(" ");

        if (pathSegments) {
          paths.push({
            id,
            key: `${id}-${ringIndex}`,
            d: pathSegments,
            properties: feature.properties ?? {}
          });
        }
      });
    });

    setOverlayPaths(paths);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateDraftOverlay = React.useCallback(() => {
    const map = mapRef.current;
    const points = draftPointsRef.current;
    if (!map) return;
    if (!points.length) {
      setDraftOverlay({ line: null, polygon: null, points: [] });
      return;
    }
    const projected = points.map((coord) => map.project({ lng: coord[0], lat: coord[1] }));
    const line = projected.length
      ? `M ${projected[0].x} ${projected[0].y} ${projected
        .slice(1)
        .map((p) => `L ${p.x} ${p.y}`)
        .join(" ")}`
      : null;
    const polygon =
      projected.length >= 3
        ? `M ${projected[0].x} ${projected[0].y} ${projected
          .slice(1)
          .map((p) => `L ${p.x} ${p.y}`)
          .join(" ")} Z`
        : null;
    const pointsSvg = projected.map((point, index) => ({
      x: point.x,
      y: point.y,
      role: (index === 0 ? "first" : "point") as "first" | "point"
    }));
    setDraftOverlay({ line, polygon, points: pointsSvg });
  }, []);

  const updateDraftSource = React.useCallback((points: [number, number][]) => {
    const map = mapRef.current;
    if (!map || !map.getSource("draft")) return;
    const features: Feature<Geometry, GeoJsonProperties>[] = [];

    points.forEach((coord, index) => {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: coord },
        properties: { role: index === 0 ? "first" : "point" }
      });
    });

    if (points.length >= 2) {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: points },
        properties: {}
      });
    }

    if (points.length >= 3) {
      const closed = [...points, points[0]];
      features.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [closed] },
        properties: {}
      });
    }

    const source = map.getSource("draft") as GeoJSONSource;
    source.setData({ type: "FeatureCollection", features });
  }, []);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const updateSize = () =>
      setContainerSize({ width: node.clientWidth, height: node.clientHeight });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    drawModeRef.current = drawMode;
  }, [drawMode]);

  React.useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  React.useEffect(() => {
    let mounted = true;

    const init = async () => {
      const maplibregl = await import("maplibre-gl");
      if (!containerRef.current || !mounted) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256
            }
          },
          glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
              paint: { "raster-opacity": 0.9 }
            }
          ]
        },
        center: [28.4682, 49.2331],
        zoom: 9
      });

      mapRef.current = map;

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

      map.on("load", () => {
        setMapReady(true);
        map.addSource("fields", { type: "geojson", data: fields });
        map.addLayer({
          id: "fields-fill",
          type: "fill",
          source: "fields",
          paint: {
            "fill-color": "#FDE68A",
            "fill-opacity": 0.65,
            "fill-outline-color": "#F97316"
          }
        });
        map.addLayer({
          id: "fields-outline",
          type: "line",
          source: "fields",
          paint: {
            "line-color": "#F97316",
            "line-width": 4,
            "line-opacity": 0.95,
            "line-blur": 0.3
          }
        });
        map.addLayer({
          id: "fields-hover",
          type: "fill",
          source: "fields",
          filter: ["==", "id", ""],
          paint: {
            "fill-color": "#94D2BD",
            "fill-opacity": 0.65
          }
        });
        map.addLayer({
          id: "fields-selected",
          type: "fill",
          source: "fields",
          filter: ["==", "id", ""],
          paint: {
            "fill-color": "#FFB703",
            "fill-opacity": 0.5
          }
        });
        map.addLayer({
          id: "fields-selected-outline",
          type: "line",
          source: "fields",
          filter: ["==", "id", ""],
          paint: {
            "line-color": "#FFB703",
            "line-width": 3.6,
            "line-blur": 2.2,
            "line-opacity": 0.95
          }
        });
        map.addLayer({
          id: "fields-label",
          type: "symbol",
          source: "fields",
          layout: {
            "text-field": ["concat", "Поле ", ["get", "code"]],
            "text-size": 12,
            "text-font": ["Open Sans Regular"],
            "text-allow-overlap": true
          },
          paint: {
            "text-color": "#1D3557",
            "text-halo-color": "rgba(255,255,255,0.7)",
            "text-halo-width": 1
          }
        });

        map.addSource("machinery", { type: "geojson", data: machinery });
        map.addLayer({
          id: "machinery",
          type: "circle",
          source: "machinery",
          paint: {
            "circle-radius": 5,
            "circle-color": "#005F73",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff"
          },
          layout: {
            visibility: showMachinery ? "visible" : "none"
          }
        });

        map.addSource("draft", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] }
        });
        map.addLayer({
          id: "draft-fill",
          type: "fill",
          source: "draft",
          filter: ["==", "$type", "Polygon"],
          paint: {
            "fill-color": "#FFEDD5",
            "fill-opacity": 0.6,
            "fill-outline-color": "#F97316"
          }
        });
        map.addLayer({
          id: "draft-line",
          type: "line",
          source: "draft",
          filter: ["==", "$type", "LineString"],
          paint: {
            "line-color": "#F97316",
            "line-width": 2.6,
            "line-opacity": 0.9
          }
        });
        map.addLayer({
          id: "draft-first-point",
          type: "circle",
          source: "draft",
          filter: ["all", ["==", "$type", "Point"], ["==", "role", "first"]],
          paint: {
            "circle-radius": 8,
            "circle-color": "#FDBA74",
            "circle-stroke-width": 3,
            "circle-stroke-color": "#F97316",
            "circle-opacity": 0.9
          }
        });
        map.addLayer({
          id: "draft-points",
          type: "circle",
          source: "draft",
          filter: ["all", ["==", "$type", "Point"], ["!=", "role", "first"]],
          paint: {
            "circle-radius": 5,
            "circle-color": "#F97316",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff"
          }
        });

        const handleHover = (event: MapMouseEvent) => {
          if (drawModeRef.current) {
            if (draftPointsRef.current.length) {
              const first = map.project({
                lng: draftPointsRef.current[0][0],
                lat: draftPointsRef.current[0][1]
              });
              const dist = Math.hypot(event.point.x - first.x, event.point.y - first.y);
              setSnapToFirst(dist < 24);
            } else {
              setSnapToFirst(false);
            }
            return;
          }
          const point: [number, number] = [event.lngLat.lng, event.lngLat.lat];
          const features = fieldsRef.current.features ?? [];
          const found = features.find(
            (feature) => feature.geometry && polygonContainsPoint(point, feature.geometry)
          );
          if (!found) {
            hoveredIdRef.current = null;
            setHoveredId(null);
            setHoverInfo(null);
            map.getCanvas().style.cursor = "";
            if (map.getLayer("fields-hover")) {
              map.setFilter("fields-hover", ["==", "id", ""]);
            }
            return;
          }

          const id =
            (found.properties?.id as string | undefined) ??
            (found.id as string | number | undefined)?.toString() ??
            null;
          if (!id) return;
          hoveredIdRef.current = id;
          setHoveredId(id);
          setHoverInfo({
            x: event.point.x,
            y: event.point.y,
            properties: found.properties ?? {}
          });
          map.getCanvas().style.cursor = "pointer";
          if (map.getLayer("fields-hover")) {
            map.setFilter("fields-hover", ["==", "id", id]);
          }
        };

        const handleClick = (event: MapMouseEvent) => {
          if (drawModeRef.current) {
            if (closedRef.current) return;
            const nextPoint: [number, number] = [event.lngLat.lng, event.lngLat.lat];
            const points = [...draftPointsRef.current];
            if (points.length >= 3) {
              const first = map.project({ lng: points[0][0], lat: points[0][1] });
              const dist = Math.hypot(event.point.x - first.x, event.point.y - first.y);
              if (dist < 24) {
                const closed = [...points, points[0]];
                onDrawChange({ type: "Polygon", coordinates: [closed] });
                updateDraftSource(points);
                closedRef.current = true;
                setSnapToFirst(false);
                updateDraftOverlay();
                return;
              }
            }
            points.push(nextPoint);
            draftPointsRef.current = points;
            updateDraftSource(points);
            updateDraftOverlay();
            return;
          }

          const point: [number, number] = [event.lngLat.lng, event.lngLat.lat];
          const features = fieldsRef.current.features ?? [];
          const found = features.find(
            (feature) => feature.geometry && polygonContainsPoint(point, feature.geometry)
          );
          const id =
            (found?.properties?.id as string | undefined) ??
            (found?.id as string | number | undefined)?.toString() ??
            null;
          if (id) onSelect(id);
        };

        map.on("mousemove", handleHover);
        map.on("click", handleClick);

        if (!hasFitRef.current) {
          fitToFields(fields);
          hasFitRef.current = true;
        }
      });
    };

    init();

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("fields")) return;
    const source = map.getSource("fields") as GeoJSONSource;
    source.setData(fields);
    if (mapReady && !hasFitRef.current) {
      fitToFields(fields);
      hasFitRef.current = true;
    }
    if (mapReady) {
      updateOverlayPaths();
    }
  }, [fields, mapReady, fitToFields, updateOverlayPaths]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    updateOverlayPaths();
    updateDraftOverlay();
    map.on("move", updateOverlayPaths);
    map.on("zoom", updateOverlayPaths);
    map.on("resize", updateOverlayPaths);
    map.on("move", updateDraftOverlay);
    map.on("zoom", updateDraftOverlay);
    map.on("resize", updateDraftOverlay);
    return () => {
      map.off("move", updateOverlayPaths);
      map.off("zoom", updateOverlayPaths);
      map.off("resize", updateOverlayPaths);
      map.off("move", updateDraftOverlay);
      map.off("zoom", updateDraftOverlay);
      map.off("resize", updateDraftOverlay);
    };
  }, [mapReady, updateOverlayPaths, updateDraftOverlay]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("machinery")) return;
    const source = map.getSource("machinery") as GeoJSONSource;
    source.setData(machinery);
  }, [machinery]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("machinery")) return;
    map.setLayoutProperty("machinery", "visibility", showMachinery ? "visible" : "none");
  }, [showMachinery]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (map.getLayer("fields-selected") && map.getLayer("fields-selected-outline")) {
      const filterValue = selectedId ?? "";
      map.setFilter("fields-selected", ["==", "id", filterValue]);
      map.setFilter("fields-selected-outline", ["==", "id", filterValue]);
    }
  }, [selectedId, mapReady]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (drawMode) {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
      draftPointsRef.current = [];
      closedRef.current = false;
      setSnapToFirst(false);
      updateDraftSource([]);
      updateDraftOverlay();
    }
    return () => { };
  }, [drawMode, mapReady, updateDraftSource, updateDraftOverlay]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const handleStart = async () => {
      draftPointsRef.current = [];
      closedRef.current = false;
      setSnapToFirst(false);
      updateDraftSource([]);
      updateDraftOverlay();
    };

    const handleFinish = () => {
      const points = draftPointsRef.current;
      if (points.length < 3) {
        onDrawChange(null);
        return;
      }
      const closed = [...points, points[0]];
      onDrawChange({ type: "Polygon", coordinates: [closed] });
      closedRef.current = true;
      setSnapToFirst(false);
      updateDraftOverlay();
    };

    const handleClear = () => {
      draftPointsRef.current = [];
      closedRef.current = false;
      setSnapToFirst(false);
      updateDraftSource([]);
      updateDraftOverlay();
      onDrawChange(null);
    };

    window.addEventListener("fields:draw-start", handleStart);
    window.addEventListener("fields:draw-finish", handleFinish);
    window.addEventListener("fields:draw-clear", handleClear);
    return () => {
      window.removeEventListener("fields:draw-start", handleStart);
      window.removeEventListener("fields:draw-finish", handleFinish);
      window.removeEventListener("fields:draw-clear", handleClear);
    };
  }, [mapReady, onDrawChange, updateDraftSource, updateDraftOverlay]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.resize();
  }, [selectedId, showMachinery]);

  const tooltipWidth = 220;
  const tooltipHeight = 190;
  const maxLeft = containerSize.width
    ? Math.max(12, containerSize.width - tooltipWidth - 12)
    : (hoverInfo?.x ?? 0) + 12;
  const maxTop = containerSize.height
    ? Math.max(12, containerSize.height - tooltipHeight - 12)
    : (hoverInfo?.y ?? 0) + 12;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <svg className="pointer-events-none absolute inset-0 z-[2] h-full w-full">
        {overlayPaths.map((path) => {
          const isSelected = selectedId === path.id;
          const isHovered = hoveredId === path.id;
          const fill = isSelected ? "#F9C74F" : isHovered ? "#B7E4C7" : "#FDE68A";
          const stroke = isSelected ? "#F59E0B" : "#F97316";
          const opacity = isSelected ? 0.5 : isHovered ? 0.45 : 0.35;
          return (
            <path
              key={path.key}
              d={path.d}
              fill={fill}
              fillOpacity={opacity}
              stroke={stroke}
              strokeWidth={isSelected ? 2.8 : 1.8}
              strokeOpacity={0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
        {drawMode && draftOverlay.polygon && (
          <path
            d={draftOverlay.polygon}
            fill="#FDBA74"
            fillOpacity={0.25}
            stroke="#F97316"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        )}
        {drawMode && draftOverlay.line && (
          <path d={draftOverlay.line} fill="none" stroke="#F97316" strokeWidth={2.4} />
        )}
        {drawMode &&
          draftOverlay.points.map((point, index) => {
            const isFirst = point.role === "first";
            const highlight = isFirst && snapToFirst && draftOverlay.points.length >= 3;
            return (
              <circle
                key={`draft-point-${index}`}
                cx={point.x}
                cy={point.y}
                r={highlight ? 8 : isFirst ? 6 : 5}
                fill={isFirst ? "#FDBA74" : "#F97316"}
                stroke={highlight ? "#F59E0B" : "#ffffff"}
                strokeWidth={highlight ? 3 : 2}
                fillOpacity={highlight ? 0.9 : 0.85}
              />
            );
          })}
      </svg>
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-white/70 bg-white/85 px-3 py-1 text-[11px] font-medium text-ink/70 shadow-glass backdrop-blur">
        Полів: {fields.features?.length ?? 0}
      </div>
      {hoverInfo && (
        <div
          className="pointer-events-none absolute z-10 w-[220px] rounded-card border border-white/80 bg-white/95 p-3 text-xs text-ink shadow-glass backdrop-blur-2xl"
          style={{
            left: Math.min(hoverInfo.x + 12, maxLeft),
            top: Math.min(hoverInfo.y + 12, maxTop)
          }}
        >
          <p className="text-sm font-semibold text-ink">
            Поле {hoverInfo.properties?.code ?? ""}
          </p>
          <div className="mt-2 space-y-1">
            <p>Культура: {hoverInfo.properties?.cropType ?? "—"}</p>
            <p>
              Посів:{" "}
              {hoverInfo.properties?.sowingDate
                ? formatDate(hoverInfo.properties.sowingDate as string)
                : "—"}
            </p>
            <p>Прогноз врожаю: {hoverInfo.properties?.yieldForecastTons ?? "—"} т</p>
            <p>Площа: {hoverInfo.properties?.areaHa ?? "—"} га</p>
            <p>Вологість ґрунту: {hoverInfo.properties?.soilMoisturePct ?? "—"}%</p>
            <p>
              Останній огляд:{" "}
              {hoverInfo.properties?.lastInspectionAt
                ? formatDate(hoverInfo.properties.lastInspectionAt as string)
                : "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
