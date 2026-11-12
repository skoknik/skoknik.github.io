import React, { useId } from 'react';
import { FILAMENT_COLORS, SilhouetteType } from '../data/catalog';

interface ParametricRenderProps {
  silhouette: SilhouetteType;
  colorId: string;
  twistDeg?: number;
  className?: string;
}

export const ParametricRender: React.FC<ParametricRenderProps> = ({
  silhouette,
  colorId,
  twistDeg = 35,
  className = '',
}) => {
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const color = FILAMENT_COLORS.find((c) => c.id === colorId) || FILAMENT_COLORS[0];
  const uid = `${silhouette}-${color.id}-${instanceId}`;
  const isLightFilament = color.id === 'milk-travertine';

  const ribIndices = [-3, -2, -1, 0, 1, 2, 3];
  const twistOffset = (twistDeg / 90) * 26;

  return (
    <div
      className={`parametric-stage ${className}`}
      style={
        {
          '--filament-main': color.cssColor,
          '--filament-hi': color.accentHighlight,
          '--filament-sh': color.shadowColor,
        } as React.CSSProperties
      }
    >
      <svg
        viewBox="0 0 320 260"
        role="img"
        aria-label={`Изделие в оттенке ${color.name}`}
        className="parametric-svg"
      >
        <defs>
          <radialGradient id={`bg-${uid}`} cx="35%" cy="25%" r="75%">
            <stop offset="0%" stopColor="oklch(0.985 0.006 80)" />
            <stop offset="65%" stopColor="oklch(0.95 0.008 286)" />
            <stop offset="100%" stopColor="oklch(0.915 0.01 286)" />
          </radialGradient>

          <linearGradient id={`body-${uid}`} x1="12%" y1="15%" x2="88%" y2="85%">
            <stop offset="0%" stopColor={color.accentHighlight} />
            <stop offset="42%" stopColor={color.cssColor} />
            <stop offset="100%" stopColor={color.shadowColor} />
          </linearGradient>

          <linearGradient id={`inner-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color.shadowColor} />
            <stop offset="100%" stopColor={color.accentHighlight} />
          </linearGradient>

          <radialGradient id={`glow-${uid}`} cx="50%" cy="48%" r="52%">
            <stop offset="0%" stopColor="oklch(0.95 0.14 82)" stopOpacity="0.95" />
            <stop offset="55%" stopColor="oklch(0.82 0.18 60)" stopOpacity="0.55" />
            <stop offset="100%" stopColor={color.cssColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="320" height="260" rx="14" fill={`url(#bg-${uid})`} />

        {/* Architectural table surface */}
        <path d="M0 214 L320 214 L320 260 L0 260 Z" fill="oklch(0.925 0.007 286 / 0.65)" />
        <line
          x1="24"
          y1="214"
          x2="296"
          y2="214"
          stroke="oklch(0.84 0.01 286)"
          strokeWidth="1"
        />

        {/* Soft ambient shadow */}
        <ellipse
          cx="160"
          cy="223"
          rx={silhouette === 'organizer-wave' || silhouette === 'horeca-stand' ? 74 : 54}
          ry="10"
          fill="oklch(0.18 0.01 286 / 0.16)"
        />
        <ellipse
          cx="164"
          cy="223"
          rx={silhouette === 'organizer-wave' || silhouette === 'horeca-stand' ? 48 : 36}
          ry="5.5"
          fill="oklch(0.18 0.01 286 / 0.22)"
        />

        {/* Botanical stems for twisted vase */}
        {silhouette === 'vase-twisted' && (
          <g strokeLinecap="round" fill="none">
            <path
              d="M158 68 Q142 30 126 14"
              stroke="oklch(0.55 0.04 75)"
              strokeWidth="2.2"
            />
            <ellipse
              cx="124"
              cy="14"
              rx="5.5"
              ry="12"
              transform="rotate(-28 124 14)"
              fill="oklch(0.84 0.06 78)"
            />
            <path
              d="M164 68 Q178 28 192 18"
              stroke="oklch(0.52 0.05 148)"
              strokeWidth="2"
            />
            <circle cx="182" cy="31" r="5.5" fill="oklch(0.68 0.07 150)" />
            <circle cx="193" cy="19" r="4.5" fill="oklch(0.72 0.07 150)" />
          </g>
        )}

        {/* Green leaves for planter */}
        {silhouette === 'planter-ribbed' && (
          <g>
            <path
              d="M160 102 C130 74, 108 48, 128 34 C146 22, 162 60, 160 102 Z"
              fill="oklch(0.54 0.11 148)"
            />
            <path
              d="M162 100 C188 68, 214 50, 198 32 C182 18, 158 56, 162 100 Z"
              fill="oklch(0.61 0.12 150)"
            />
            <path
              d="M160 104 C152 64, 168 30, 160 20 C150 30, 148 66, 160 104 Z"
              fill="oklch(0.48 0.09 146)"
            />
          </g>
        )}

        {silhouette === 'vase-twisted' && (
          <g>
            <path
              d="M126 60 C142 56, 178 56, 194 60 C206 94, 224 136, 206 184 C198 208, 188 221, 160 222 C132 221, 122 208, 114 184 C96 136, 114 94, 126 60 Z"
              fill={`url(#body-${uid})`}
              stroke={isLightFilament ? 'oklch(0.78 0.02 80)' : 'none'}
              strokeWidth="0.8"
            />
            <ellipse cx="160" cy="60" rx="34" ry="7" fill={`url(#inner-${uid})`} />
            {ribIndices.map((idx) => {
              const topX = 160 + idx * 9;
              const midX = 160 + idx * 14 + twistOffset * 0.6;
              const botX = 160 + idx * 9 - twistOffset * 0.35;
              return (
                <path
                  key={idx}
                  d={`M${topX} 65 C${midX} 116, ${midX - twistOffset * 0.5} 170, ${botX} 220`}
                  fill="none"
                  stroke={idx < 0 ? color.accentHighlight : color.shadowColor}
                  strokeOpacity={isLightFilament ? 0.55 : 0.45}
                  strokeWidth="1.6"
                />
              );
            })}
          </g>
        )}

        {silhouette === 'lamp-pleated' && (
          <g>
            <path
              d="M128 176 L192 176 L200 220 C180 225, 140 225, 120 220 Z"
              fill="oklch(0.26 0.01 286)"
            />
            <circle cx="160" cy="118" r="72" fill={`url(#glow-${uid})`} />
            <path
              d="M116 58 C136 50, 184 50, 204 58 C230 98, 232 148, 204 180 C178 186, 142 186, 116 180 C88 148, 90 98, 116 58 Z"
              fill={`url(#body-${uid})`}
            />
            <circle cx="160" cy="118" r="42" fill={`url(#glow-${uid})`} />
            {ribIndices.map((idx) => (
              <path
                key={idx}
                d={`M${160 + idx * 11} 56 C${160 + idx * 18 + twistOffset * 0.3} 108, ${
                  160 + idx * 18 - twistOffset * 0.2
                } 146, ${160 + idx * 12} 181`}
                fill="none"
                stroke="oklch(0.98 0.05 85 / 0.5)"
                strokeWidth="1.5"
              />
            ))}
          </g>
        )}

        {silhouette === 'planter-ribbed' && (
          <g>
            <path
              d="M104 202 L216 202 L210 221 C184 226, 136 226, 110 221 Z"
              fill="oklch(0.28 0.01 286)"
            />
            <path
              d="M98 94 C132 88, 188 88, 222 94 L212 202 C182 208, 138 208, 108 202 Z"
              fill={`url(#body-${uid})`}
            />
            <ellipse cx="160" cy="94" rx="62" ry="9" fill={`url(#inner-${uid})`} />
            {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((idx) => (
              <line
                key={idx}
                x1={160 + idx * 12.5}
                y1={101}
                x2={160 + idx * 11}
                y2={202}
                stroke={idx <= 0 ? color.accentHighlight : color.shadowColor}
                strokeOpacity="0.5"
                strokeWidth="2.2"
              />
            ))}
          </g>
        )}

        {silhouette === 'vase-arch' && (
          <g>
            <path
              fillRule="evenodd"
              d="M106 112 C106 62, 214 62, 214 112 L214 220 C186 225, 134 225, 106 220 Z M142 126 C142 104, 178 104, 178 126 L178 194 C178 202, 142 202, 142 194 Z"
              fill={`url(#body-${uid})`}
            />
            <rect x="148" y="52" width="24" height="22" rx="5" fill={`url(#body-${uid})`} />
            <ellipse cx="160" cy="53" rx="12" ry="3.5" fill={`url(#inner-${uid})`} />
          </g>
        )}

        {silhouette === 'organizer-wave' && (
          <g>
            <path
              d="M92 102 C118 88, 156 92, 182 106 L182 216 L92 216 Z"
              fill={color.shadowColor}
            />
            <path
              d="M114 126 C146 112, 188 118, 218 130 L218 220 L114 220 Z"
              fill={`url(#body-${uid})`}
            />
            <path
              d="M84 166 C126 154, 194 156, 236 168 L230 222 C190 227, 130 227, 90 222 Z"
              fill={`url(#body-${uid})`}
              stroke={color.accentHighlight}
              strokeWidth="1"
            />
          </g>
        )}

        {silhouette === 'horeca-stand' && (
          <g>
            <rect
              x="104"
              y="58"
              width="74"
              height="118"
              rx="6"
              fill="oklch(0.98 0.005 85)"
              stroke="oklch(0.82 0.01 286)"
            />
            <rect x="116" y="92" width="26" height="26" rx="3" fill="oklch(0.22 0.01 286)" />
            <line x1="116" y1="128" x2="164" y2="128" stroke="oklch(0.75 0.01 286)" strokeWidth="2" />
            <path
              d="M88 146 C124 140, 196 140, 232 146 L226 220 C192 226, 128 226, 94 220 Z"
              fill={`url(#body-${uid})`}
            />
            <path
              d="M190 102 C202 99, 218 99, 228 102 L226 214 L190 214 Z"
              fill={`url(#body-${uid})`}
              stroke={color.accentHighlight}
              strokeWidth="0.8"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
