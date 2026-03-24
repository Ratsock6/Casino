import { useState, useEffect } from 'react';

export const useCountUp = (target: number, duration = 1000, active = false) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setValue(target);
        clearInterval(interval);
      } else {
        setValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [target, active]);

  return value;
};