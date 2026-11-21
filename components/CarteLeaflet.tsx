"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bien, prixAffiche } from "@/lib/mock-data";
import { coordonnees } from "@/lib/annonces";

const DISTANCE_GROUPE = 70;

type Groupe = { membres: Bien[]; position: [number, number] };

// Regroupe les biens dont les étiquettes se recouvriraient au zoom courant ; le bien sélectionné reste toujours visible seul.
function regrouper(carte: L.Map, biens: Bien[], selection: string | null): Groupe[] {
  const zoom = carte.getZoom();
  const groupes: (Groupe & { px: L.Point })[] = [];
  for (const b of biens) {
    const position = coordonnees(b);
    const px = carte.project(position, zoom);
    const proche = b.id === selection ? undefined : groupes.find((g) => g.membres[0].id !== selection && g.px.distanceTo(px) < DISTANCE_GROUPE);
    if (proche) proche.membres.push(b);
    else groupes.push({ membres: [b], position, px });
  }
  return groupes;
}

function pastille(fond: string, texte: string, contenu: string, forme: string) {
  return L.divIcon({
    className: "",
    iconSize: undefined,
    html: `<div style="transform:translate(-50%,-50%);width:max-content;background:${fond};color:${texte};font:700 11px Inter,sans-serif;${forme}box-shadow:0 1px 4px rgba(0,0,0,.35);border:2px solid #fff;">${contenu}</div>`,
  });
}

export default function CarteLeaflet({
  biens,
  selection,
  onSelection,
  onZone,
}: {
  biens: Bien[];
  selection: string | null;
  onSelection: (id: string) => void;
  onZone?: (zone: L.LatLngBounds) => void;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<L.Map | null>(null);
  const calque = useRef<L.LayerGroup | null>(null);
  const [zoom, setZoom] = useState(0);

  useEffect(() => {
    if (!conteneur.current || carte.current) return;
    const m = L.map(conteneur.current).setView([14.75, -16.9], 8);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(m);
    calque.current = L.layerGroup().addTo(m);
    carte.current = m;
    setZoom(m.getZoom());
    m.on("zoomend", () => setZoom(m.getZoom()));
    return () => {
      m.remove();
      carte.current = null;
    };
  }, []);

  useEffect(() => {
    const m = carte.current;
    if (!m || !onZone) return;
    const signaler = () => onZone(m.getBounds());
    signaler();
    m.on("moveend", signaler);
    return () => {
      m.off("moveend", signaler);
    };
  }, [onZone]);

  useEffect(() => {
    const m = carte.current;
    if (!calque.current || !m) return;
    calque.current.clearLayers();
    for (const g of regrouper(m, biens, selection)) {
      if (g.membres.length > 1) {
        L.marker(g.position, {
          icon: pastille("#F0A500", "#1B2A4A", String(g.membres.length), "padding:6px 11px;border-radius:999px;"),
          title: `${g.membres.length} biens : cliquer pour zoomer`,
          alt: `${g.membres.length} biens`,
        })
          .on("click", () => m.fitBounds(L.latLngBounds(g.membres.map(coordonnees)), { padding: [80, 80], maxZoom: 15 }))
          .addTo(calque.current);
        continue;
      }
      const b = g.membres[0];
      const actif = b.id === selection;
      // Le prix sert d'étiquette : le texte est échappé car il peut venir d'une annonce utilisateur.
      const span = document.createElement("span");
      span.textContent = prixAffiche(b, true);
      L.marker(g.position, {
        icon: pastille(actif ? "#F0A500" : "#1B4F72", actif ? "#1B2A4A" : "#fff", span.innerHTML, "padding:4px 8px;border-radius:999px;"),
        zIndexOffset: actif ? 1000 : 0,
        title: b.titre,
        alt: b.titre,
      })
        .on("click", () => onSelection(b.id))
        .addTo(calque.current);
    }
  }, [biens, selection, onSelection, zoom]);

  useEffect(() => {
    const b = biens.find((x) => x.id === selection);
    // Zoom à l'échelle du quartier : à l'échelle du pays, les étiquettes de Dakar se recouvrent.
    if (b && carte.current) carte.current.setView(coordonnees(b), Math.max(carte.current.getZoom(), 13));
  }, [selection, biens]);

  return <div ref={conteneur} className="h-full w-full relative z-0" />;
}
