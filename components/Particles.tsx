import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface ParticlesProps {
  color: string;
  count?: number;
}

const Particles: React.FC<ParticlesProps> = ({ color, count = 40 }) => {
  // Generate random particles with stable initial values
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      initialTop: Math.random() * 100 + 100, // Start below screen
      size: Math.random() * 6 + 2,
      duration: Math.random() * 15 + 10, // 10-25s duration
      delay: Math.random() * -20, // Negative delay to start mid-animation
      xOffset: Math.random() * 100 - 50, // Drift left/right
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full mix-blend-screen"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: color,
            boxShadow: `0 0 ${p.size * 4}px ${color}`,
          }}
          initial={{ y: "110vh", opacity: 0 }}
          animate={{
            y: ["110vh", "-20vh"], // Move from bottom to top
            x: [0, p.xOffset],
            opacity: [0, 0.4, 0.8, 0.4, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
};

export default Particles;