import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Movie } from '../types';

interface TrailerModalProps {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
}

export const TrailerModal: React.FC<TrailerModalProps> = ({ movie, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl overflow-hidden rounded-2xl glass-surface border border-white/20 shadow-2xl shadow-black/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-white tracking-wide truncate max-w-[280px]">
              {movie.title} • Official Trailer
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close trailer"
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Frame */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${movie.trailerYoutubeId}?autoplay=1&rel=0&modestbranding=1`}
            title={`${movie.title} Trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>

        {/* Footer info */}
        <div className="p-4 bg-neutral-950/70 flex items-center justify-between text-xs text-neutral-400">
          <div>
            <span className="text-white font-medium">{movie.title}</span> ({movie.year}) • {movie.runtime}
          </div>
          <a
            href={`https://www.youtube.com/watch?v=${movie.trailerYoutubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors"
          >
            <span>Open in YouTube</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
