import React from 'react';
import { getSportImage } from '../utils/sportImages';

interface SportImageProps {
  sportName: string;
  explicitImage?: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
  showGradient?: boolean;
  lazy?: boolean;
}

const getSportEmoji = (name: string = '') => {
  const s = name.toLowerCase();
  if (s.includes('cricket')) return '🏏';
  if (s.includes('football')) return '⚽';
  if (s.includes('volleyball')) return '🏐';
  if (s.includes('basketball')) return '🏀';
  if (s.includes('badminton')) return '🏸';
  if (s.includes('kabaddi')) return '🤼';
  if (s.includes('boxing')) return '🥊';
  if (s.includes('chess')) return '♟️';
  if (s.includes('carrom')) return '🎯';
  if (s.includes('table tennis') || s.includes('tennis')) return '🎾';
  if (s.includes('running') || s.includes('athletics') || s.includes('relay')) return '🏃';
  if (s.includes('jump')) return '🦘';
  if (s.includes('shot put') || s.includes('throw')) return '☄️';
  if (s.includes('hockey')) return '🏑';
  if (s.includes('handball')) return '🤾';
  return '🏅';
};

/**
 * SportImage — Reusable component that shows the CORRECT sport image.
 * Sources: C:\Users\ELCOT\Pictures\website photo (copied to public/images/sports/)
 * Never shows wrong sport image. Never random.
 */
export const SportImage: React.FC<SportImageProps> = ({
  sportName,
  explicitImage,
  alt,
  className = 'w-full h-full object-cover object-center',
  containerClassName = 'w-full h-full relative overflow-hidden bg-[#32145F]',
  showGradient = true,
  lazy = true
}) => {
  const imgSrc = getSportImage(sportName, explicitImage);
  const imgAlt = alt || sportName;

  return (
    <div className={containerClassName}>
      <img
        src={imgSrc}
        alt={imgAlt}
        loading={lazy ? 'lazy' : 'eager'}
        className={className}
        onError={(e) => {
          // Never fall back to another sport's image — use neutral running fallback
          e.currentTarget.src = '/images/sports/running.png';
        }}
      />
      {showGradient && (
        <div className="absolute inset-0 bg-gradient-to-t from-[#32145F]/70 via-transparent to-transparent" />
      )}
      {/* Emoji badge for quick identification */}
      <span className="absolute bottom-2 right-2 text-lg select-none">
        {getSportEmoji(sportName)}
      </span>
    </div>
  );
};

export default SportImage;
