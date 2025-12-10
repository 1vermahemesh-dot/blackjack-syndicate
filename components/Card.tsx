
import React, { useMemo } from 'react';
import { motion, Variants } from 'framer-motion';
import { Card as CardType, Theme } from '../types';

interface CardProps {
  card: CardType;
  index: number;
  theme: Theme;
  isDealer?: boolean;
}

const suitIcons: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const Card: React.FC<CardProps> = ({ card, index, theme, isDealer }) => {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  
  // Memoize random rotation so it doesn't change on re-renders/hovers
  const randomRotate = useMemo(() => Math.random() * 6 - 3, []);

  // Outer variants: Position, Scale, and Entrance Path
  const variants: Variants = {
    initial: { 
      opacity: 0, 
      y: -600, // Start from top (off-screen deck area)
      x: 200,  // Start from right
      rotateZ: 45, // Angled throw
      scale: 0.5,
    },
    enter: (i: number) => ({
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      rotateZ: randomRotate,
      transition: {
        delay: i * 0.15, // Distinct deal rhythm
        type: "spring",
        stiffness: 160,
        damping: 22,
        mass: 1
      }
    }),
    hover: {
      scale: 1.15,
      y: -40,
      rotateX: 10, // 3D Tilt up (Outer wrapper tilts)
      rotateZ: 0,  // Straighten up
      zIndex: 100,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 20 
      }
    }
  };

  // Inner variants: Rotation (Flip), Shadow, and Visuals
  // Moving rotateY here ensures it rotates WITHIN the 3D perspective of the parent
  const innerVariants: Variants = {
    initial: {
        rotateY: 180, // Start face down
        boxShadow: '0 0 0 0 rgba(0,0,0,0)'
    },
    enter: {
        rotateY: card.isHidden ? 180 : 0, // Resolve final state (180=Hidden, 0=Visible)
        boxShadow: card.isHidden 
            ? '0 2px 10px -2px rgba(0,0,0,0.5)' 
            : `0 5px 15px -5px ${theme.primaryColor}80`,
        transition: { 
            duration: 0.6,
            type: "spring",
            stiffness: 160,
            damping: 22,
        }
    },
    hover: {
        boxShadow: `0 25px 40px -10px ${theme.primaryColor}`,
        transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div
      className="relative w-24 h-36 md:w-32 md:h-48 perspective-1000 mx-[-15px] md:mx-[-20px] first:ml-0"
      custom={index}
      initial="initial"
      animate="enter"
      whileHover={!card.isHidden ? "hover" : undefined}
      variants={variants}
      style={{ zIndex: index }}
    >
      <motion.div 
        className="w-full h-full relative preserve-3d transition-all duration-500 rounded-xl"
        variants={innerVariants}
      >
        {/* Front of Card */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-xl bg-gray-900 overflow-hidden border border-opacity-50"
             style={{ borderColor: theme.primaryColor }}>
          
          {/* Background Glass/Sheen */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none z-10" />
          
          {/* Giant Rotating Transparent Emoji */}
          <motion.div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            <span 
                className="text-8xl md:text-9xl opacity-10 select-none blur-sm"
                style={{ color: theme.primaryColor }}
            >
                {suitIcons[card.suit]}
            </span>
          </motion.div>

          <div className="relative z-20 flex flex-col h-full justify-between p-2 select-none">
            <div className={`text-xl md:text-3xl font-bold font-mono ${isRed ? 'text-red-500' : 'text-white'}`} style={{ textShadow: `0 0 10px ${isRed ? 'red' : 'white'}` }}>
              {card.rank}
              <span className="block text-sm md:text-xl">{suitIcons[card.suit]}</span>
            </div>
            
            <div className={`text-xl md:text-3xl font-bold font-mono transform rotate-180 self-end ${isRed ? 'text-red-500' : 'text-white'}`} style={{ textShadow: `0 0 10px ${isRed ? 'red' : 'white'}` }}>
              {card.rank}
              <span className="block text-sm md:text-xl">{suitIcons[card.suit]}</span>
            </div>
          </div>
          
          {/* Holographic Border Overlay */}
          <div className="absolute inset-0 rounded-xl border border-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] z-30"></div>
        </div>

        {/* Back of Card */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl flex items-center justify-center overflow-hidden bg-black shadow-2xl"
          style={{ 
            border: `2px solid ${theme.primaryColor}`
          }}
        >
          {/* Solid blocking layer to prevent bleed through */}
          <div className="absolute inset-0 bg-black z-0"></div>

          {/* Animated Back Pattern */}
          <div className="absolute inset-0 opacity-50 z-10"
             style={{ 
                backgroundImage: `radial-gradient(${theme.primaryColor} 1.5px, transparent 1.5px)`, 
                backgroundSize: '12px 12px' 
             }} 
          />
          
          {/* Logo/Icon on back */}
          <motion.div 
            className="relative z-20 text-4xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
             <span style={{ color: theme.primaryColor }}>✦</span>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Card;
