/**
 * Extract dominant colors from an image and generate a gradient
 * Uses canvas API to sample pixels from the album art
 */

export async function extractColorsFromImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Use a smaller canvas for faster processing
        const size = 100;
        canvas.width = size;
        canvas.height = size;

        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        const pixels = imageData.data;

        // Sample colors from different regions
        const colors = [];
        const sampleSize = 10; // Sample every 10th pixel

        for (let i = 0; i < pixels.length; i += 4 * sampleSize) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          // Skip transparent or very dark/light pixels
          if (a > 200 && r + g + b > 100 && r + g + b < 600) {
            colors.push({ r, g, b });
          }
        }

        if (colors.length === 0) {
          // Fallback if no suitable colors found
          resolve({ gradient: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' });
          return;
        }

        // Get dominant colors using simple clustering
        const primary = getDominantColor(colors);
        const secondary = getDominantColor(colors.filter(c =>
          Math.abs(c.r - primary.r) + Math.abs(c.g - primary.g) + Math.abs(c.b - primary.b) > 100
        )) || primary;

        // Create gradient with darkened colors for better readability
        const primaryDark = darkenColor(primary, 0.4);
        const secondaryDark = darkenColor(secondary, 0.5);

        const gradient = `linear-gradient(135deg, rgb(${primaryDark.r}, ${primaryDark.g}, ${primaryDark.b}) 0%, rgb(${secondaryDark.r}, ${secondaryDark.g}, ${secondaryDark.b}) 100%)`;

        resolve({ gradient, primary, secondary });
      } catch (error) {
        console.error('Error extracting colors:', error);
        resolve({ gradient: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' });
      }
    };

    img.onerror = () => {
      console.error('Failed to load image for color extraction');
      resolve({ gradient: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' });
    };

    img.src = imageUrl;
  });
}

function getDominantColor(colors) {
  if (colors.length === 0) return { r: 26, g: 26, b: 26 };

  // Average all colors
  const sum = colors.reduce(
    (acc, color) => ({
      r: acc.r + color.r,
      g: acc.g + color.g,
      b: acc.b + color.b,
    }),
    { r: 0, g: 0, b: 0 }
  );

  return {
    r: Math.round(sum.r / colors.length),
    g: Math.round(sum.g / colors.length),
    b: Math.round(sum.b / colors.length),
  };
}

function darkenColor(color, factor) {
  return {
    r: Math.round(color.r * (1 - factor)),
    g: Math.round(color.g * (1 - factor)),
    b: Math.round(color.b * (1 - factor)),
  };
}
