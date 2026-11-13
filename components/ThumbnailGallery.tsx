"use client";
import Image from "next/image";

export default function ThumbnailGallery({
  photos,
  actif,
  onChange,
}: {
  photos: string[];
  actif: number;
  onChange: (index: number) => void;
}) {
  // Une annonce sans galerie n'a qu'une photo : inutile d'afficher une miniature identique.
  if (photos.length < 2) return <div className="mb-6" />;

  return (
    <div className="flex gap-2 flex-wrap mb-6">
      {photos.map((src, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`relative h-16 w-24 rounded-lg overflow-hidden bg-gray-200 cursor-pointer ${
            i === actif ? "ring-2 ring-navy" : "opacity-60 hover:opacity-100"
          }`}
          aria-label={`Photo ${i + 1}`}
          aria-current={i === actif}
        >
          <Image src={src} alt="" fill className="object-cover" unoptimized={src.startsWith("data:")} />
        </button>
      ))}
    </div>
  );
}
