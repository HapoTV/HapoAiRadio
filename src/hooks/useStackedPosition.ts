import React from 'react';
import { useState, useEffect } from 'react';

interface StackedPositionOptions {
  bottomOffset?: number;
  zIndex?: number;
}

export function useStackedPosition(options: StackedPositionOptions = {}) {
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    bottom: options.bottomOffset || 0,
    left: 0,
    right: 0,
    zIndex: options.zIndex || 50,
  });

  useEffect(() => {
    const updatePosition = () => {
      const fixedElements = Array.from(document.querySelectorAll('*')).filter(
        (element) => {
          const style = window.getComputedStyle(element);
          return (
            (style.position === 'fixed' || style.position === 'sticky') &&
            element.getBoundingClientRect().bottom > window.innerHeight - 200
          );
        }
      );

      const maxBottom = Math.max(
        options.bottomOffset || 0,
        ...fixedElements.map(
          (element) =>
            window.innerHeight - element.getBoundingClientRect().top + 16
        )
      );

      setStyle((prev) => ({
        ...prev,
        bottom: maxBottom,
      }));
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [options.bottomOffset]);

  return style;
}