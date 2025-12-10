
import React from 'react';
import { motion } from 'framer-motion';

interface ChargeMeterProps {
  current: number;
  max?: number;
  color: string;
}

const ChargeMeter: React.FC<ChargeMeterProps> = ({ current, max = 10, color }) => {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div 
            key={i}
            className="w-1.5 h-4 md:w-2 md:h-6 bg-gray-800 rounded-sm overflow-hidden relative"
          >
             <motion.div 
               className="absolute bottom-0 left-0 right-0 bg-white"
               initial={{ height: "0%" }}
               animate={{ 
                   height: i < current ? "100%" : "0%",
                   backgroundColor: i < current ? color : '#1f2937'
               }}
               transition={{ 
                   type: "spring", 
                   stiffness: 300, 
                   damping: 20, 
                   delay: i * 0.05 
               }}
             />
             {/* Glow effect for active bars */}
             {i < current && (
                <motion.div 
                    className="absolute inset-0 opacity-50"
                    style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}` }}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
             )}
          </div>
        ))}
      </div>
      <div className="text-[9px] font-mono uppercase tracking-widest text-gray-500">
         PWR CHARGE
      </div>
    </div>
  );
};

export default ChargeMeter;
