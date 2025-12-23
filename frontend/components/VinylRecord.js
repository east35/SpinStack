/**
 * Pure CSS vinyl record component
 * Recreates the record_animation sample: static disc reflections with a spinning label.
 */

export default function VinylRecord({
  className = '',
  size = 384,
  spinning = true,
  coverUrl,
}) {
  return (
    <div
      className={`vinyl-record ${spinning ? 'playing' : 'paused'} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
      }}
    >
      <div className="vinyl-album">
        <div className="vinyl-cover">
          <div className="vinyl-cover-inner">
            <div className="vinyl-cover-rotator">
              {coverUrl ? (
                <img src={coverUrl} alt="" />
              ) : (
                <div className="vinyl-cover-fallback" />
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .vinyl-album {
          position: relative;
          width: 100%;
          height: 100%;
          background-color: #111;
          border: 1px solid #111;
          border-radius: 50%;
          transform-origin: center;
          z-index: 1;
          box-shadow:
            0 0.25em 1em 0.5em rgba(0,0,0,0.15),
            inset 0 0 0 0.0625em rgba(0,0,0,0.5),
            inset 0 0 0 0.1875em rgba(255,255,255,1),
            inset 0 0 0 0.375em rgba(0,0,0,0.5),
            inset 0 0 0 0.4375em rgba(255,255,255,0.2),
            inset 0 0 0 0.5em rgba(0,0,0,0.5),
            inset 0 0 0 0.5625em rgba(255,255,255,0.3),
            inset 0 0 0 0.625em rgba(0,0,0,0.5),
            inset 0 0 0 0.6875em rgba(255,255,255,0.2),
            inset 0 0 0 0.75em rgba(0,0,0,0.5),
            inset 0 0 0 0.8125em rgba(255,255,255,0.3),
            inset 0 0 0 0.875em rgba(0,0,0,0.5),
            inset 0 0 0 0.9375em rgba(255,255,255,0.3),
            inset 0 0 0 1em rgba(0,0,0,0.5),
            inset 0 0 0 1.0625em rgba(255,255,255,0.2),
            inset 0 0 0 1.125em rgba(0,0,0,0.5),
            inset 0 0 0 1.1875em rgba(255,255,255,0.3),
            inset 0 0 0 1.25em rgba(0,0,0,0.5),
            inset 0 0 0 1.3125em rgba(255,255,255,0.2),
            inset 0 0 0 1.375em rgba(255,255,255,0.2),
            inset 0 0 0 1.4375em rgba(0,0,0,0.5),
            inset 0 0 0 1.5em rgba(255,255,255,0.3),
            inset 0 0 0 1.5625em rgba(0,0,0,0.5),
            inset 0 0 0 1.625em rgba(255,255,255,0.3),
            inset 0 0 0 1.6875em rgba(0,0,0,0.5),
            inset 0 0 0 1.75em rgba(255,255,255,0.2),
            inset 0 0 0 1.8125em rgba(0,0,0,0.5),
            inset 0 0 0 1.875em rgba(255,255,255,0.2),
            inset 0 0 0 1.9375em rgba(0,0,0,0.5),
            inset 0 0 0 2em rgba(255,255,255,0.3),
            inset 0 0 0 2.0625em rgba(0,0,0,0.5),
            inset 0 0 0 2.125em rgba(0,0,0,0.5),
            inset 0 0 0 2.1875em rgba(255,255,255,0.1),
            inset 0 0 0 2.25em rgba(0,0,0,0.5),
            inset 0 0 0 2.3125em rgba(255,255,255,0.2),
            inset 0 0 0 2.375em rgba(255,255,255,0.1),
            inset 0 0 0 2.4375em rgba(0,0,0,0.5),
            inset 0 0 0 2.5em rgba(255,255,255,0.3),
            inset 0 0 0 2.5625em rgba(0,0,0,0.5),
            inset 0 0 0 2.625em rgba(255,255,255,0.2),
            inset 0 0 0 2.6875em rgba(0,0,0,0.5),
            inset 0 0 0 2.75em rgba(255,255,255,0.2),
            inset 0 0 0 2.8125em rgba(0,0,0,0.5),
            inset 0 0 0 2.875em rgba(255,255,255,0.2),
            inset 0 0 0 2.9375em rgba(0,0,0,0.5),
            inset 0 0 0 3em rgba(255,255,255,0.3),
            inset 0 0 0 3.0625em rgba(0,0,0,0.5),
            inset 0 0 0 3.125em rgba(0,0,0,0.5),
            inset 0 0 0 3.1875em rgba(255,255,255,0.2),
            inset 0 0 0 3.25em rgba(0,0,0,0.5),
            inset 0 0 0 3.3125em rgba(255,255,255,0.2),
            inset 0 0 0 3.375em rgba(255,255,255,0.1),
            inset 0 0 0 3.4375em rgba(0,0,0,0.5),
            inset 0 0 0 3.5em rgba(255,255,255,0.3);
        }

        .vinyl-album::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 2;
          animation: none;
          background-image:
            linear-gradient(
              -45deg,
              rgba(255,255,255,0) 30%,
              rgba(255,255,255,0.125),
              rgba(255,255,255,0) 70%
            ),
            linear-gradient(
              -48deg,
              rgba(255,255,255,0) 45%,
              rgba(255,255,255,0.075),
              rgba(255,255,255,0) 55%
            ),
            linear-gradient(
              -42deg,
              rgba(255,255,255,0) 45%,
              rgba(255,255,255,0.075),
              rgba(255,255,255,0) 55%
            ),
            radial-gradient(
              circle at top left,
              rgba(0,0,0,1) 20%,
              rgba(0,0,0,0) 80%
            ),
            radial-gradient(
              circle at bottom right,
              rgba(0,0,0,1) 20%,
              rgba(0,0,0,0) 80%
            );
        }

        .vinyl-cover,
        .vinyl-cover::before,
        .vinyl-cover::after,
        .vinyl-cover-inner,
        .vinyl-cover-inner img {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          transform-origin: center;
          border-radius: 50%;
        }

        .vinyl-cover {
          width: 40%;
          height: 40%;
          z-index: 3;
        }

        .vinyl-cover-inner {
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 50%;
        }

        .vinyl-cover-rotator {
          width: 100%;
          height: 100%;
          animation: vinyl-disc-spin 4s linear infinite paused;
        }

        .vinyl-cover::before,
        .vinyl-cover::after {
          content: '';
          width: 100%;
          height: 100%;
          box-shadow: inset 0 0.0625em rgba(255,255,255,0.3);
        }

        .vinyl-cover::after {
          width: 10%;
          height: 10%;
          background-color: #353531;
          border-radius: 1.5em;
          box-shadow:
            inset 0 -0.0625em 0.0625em rgba(0,0,0,0.5),
            inset 0.0625em -0.0625em 0.125em rgba(255,255,255,0.15),
            inset -0.0625em -0.0625em 0.125em rgba(255,255,255,0.15),
            inset 0 -0.125em 0.125em rgba(0,0,0,0.8),
            0 0.0625em 0.0625em rgba(0,0,0,0.5),
            0 0.0625em 0.25em 0.0625em rgba(0,0,0,0.15),
            0 0 0.25em 0.125em rgba(0,0,0,0.15);
        }

        .vinyl-cover-inner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .vinyl-cover-rotator img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .vinyl-cover-fallback {
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 30% 30%, #f5f5f5 0%, #cfcfcf 40%, #8a8a8a 100%);
        }

        .playing .vinyl-cover-rotator {
          animation-play-state: running;
        }  

        .paused .vinyl-cover-rotator {
          animation-play-state: paused;
        }

        @keyframes vinyl-disc-spin {
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
