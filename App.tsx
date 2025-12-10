import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { THEMES } from './constants';
import { Theme } from './types';
import { useBlackjack } from './hooks/useBlackjack';
import Card from './components/Card';
import Particles from './components/Particles';
import ChargeMeter from './components/ChargeMeter';
import { getBlackjackAdvice, generateFactionImage } from './services/geminiService';
import * as Audio from './services/audioService';

const App: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);
  const {
    playerHand, dealerHand, status, bet, balance, message, powerUpUsed, winner, charges,
    setBalance, initGame, placeBet, hit, stand, swapCard, revealDealerCard, undoHit, mulliganHand, setPowerUpUsed, setWinner, setMessage, spendCharge
  } = useBlackjack();
  
  const [oracleAdvice, setOracleAdvice] = useState<string>('');
  const [isGettingAdvice, setIsGettingAdvice] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [powerUpSplash, setPowerUpSplash] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // New state for AI Generated Assets
  const [factionImage, setFactionImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Track previous charges to detect when we hit max
  const prevCharges = useRef(charges);

  // Mouse Parallax Logic
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Calculate parallax movement for background layers
  const bgX = useTransform(mouseX, [-0.5, 0.5], [30, -30]);
  const bgY = useTransform(mouseY, [-0.5, 0.5], [30, -30]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    // Normalize mouse position from -0.5 to 0.5
    mouseX.set((clientX / innerWidth) - 0.5);
    mouseY.set((clientY / innerHeight) - 0.5);
  };

  // --- AUDIO TRIGGERS ---
  
  // Sync Audio Intensity with Game Status
  useEffect(() => {
    Audio.setBgIntensity(status);
  }, [status]);

  // Trigger screen shake & Sound on bust/loss
  useEffect(() => {
    if (status === 'gameOver') {
       if (winner === 'dealer') {
         setScreenShake(true);
         setTimeout(() => setScreenShake(false), 500);
         Audio.playLose();
       } else if (winner === 'player') {
         Audio.playWin();
       }
    }
  }, [status, winner]);

  // Card Flip Sound
  useEffect(() => {
    if (playerHand.length > 0 || dealerHand.length > 0) {
        Audio.playCardFlip();
    }
  }, [playerHand.length, dealerHand.length]);

  // Power Charge Sound & Effect
  useEffect(() => {
    if (currentTheme) {
      const isCharged = charges >= currentTheme.chargeCost;
      const wasCharged = prevCharges.current >= currentTheme.chargeCost;

      // Play sound only when we *just* crossed the threshold
      if (isCharged && !wasCharged) {
         Audio.playPowerReady();
      }
    }
    prevCharges.current = charges;
  }, [charges, currentTheme]);

  const toggleMute = () => {
      const newVal = !isMuted;
      setIsMuted(newVal);
      Audio.toggleMute(newVal);
  };

  const handleThemeSelect = async (theme: Theme) => {
    Audio.startSoundtrack(); // Start BGM on first interaction
    Audio.playClick();
    setCurrentTheme(theme);
    initGame();
    
    // Start generating faction image
    setFactionImage(null);
    setIsGeneratingImage(true);
    const imgUrl = await generateFactionImage(theme.name, theme.primaryColor, theme.icon);
    if (imgUrl) {
        setFactionImage(imgUrl);
    }
    setIsGeneratingImage(false);
  };

  const handleBet = (amount: number) => {
      Audio.playChips();
      placeBet(amount);
  };

  const handlePowerUp = async () => {
    if (powerUpUsed || !currentTheme) return;

    // Check Cost
    if (charges < currentTheme.chargeCost) {
        setMessage(`Need ${currentTheme.chargeCost} Charges!`);
        return;
    }

    // Deduct Cost
    const paid = spendCharge(currentTheme.chargeCost);
    if (!paid) return;

    // 1. Visual Effect & Sound
    setPowerUpSplash(true);
    Audio.playThemePower(currentTheme.id);
    
    // Hide splash after animation
    setTimeout(() => {
      setPowerUpSplash(false);
    }, 2500);

    // 2. Logic execution
    if (currentTheme.powerUpId === 'swap') {
      swapCard();
    } else if (currentTheme.powerUpId === 'vision') {
      revealDealerCard();
    } else if (currentTheme.powerUpId === 'undo') {
      const success = undoHit();
      if (!success) {
         setMessage("Cannot rewind further!");
      }
    } else if (currentTheme.powerUpId === 'mulligan') {
        mulliganHand();
    } else if (currentTheme.powerUpId === 'oracle') {
      setIsGettingAdvice(true);
      const score = playerHand.reduce((acc, c) => acc + c.value, 0); 
      const advice = await getBlackjackAdvice(
        playerHand.map(c => `${c.rank}${c.suit}`),
        `${dealerHand[0].rank}${dealerHand[0].suit}`,
        score
      );
      setOracleAdvice(advice);
      setIsGettingAdvice(false);
      setPowerUpUsed(true);
    } else {
      // Passive powerups (Shield, Greed, Shadow) set flag for end game logic
      setPowerUpUsed(true); 
      setMessage(`${currentTheme.powerUpName} Activated!`);
    }
  };

  // Handle Passive Powerups at Game Over
  useEffect(() => {
    if (status === 'gameOver' && currentTheme && winner) {
      if (winner === 'dealer' && currentTheme.powerUpId === 'shield' && powerUpUsed) {
        setBalance(prev => prev + (bet * 0.5));
        setMessage(prev => prev + " (Ice Shield: 50% Saved!)");
      }
      if (winner === 'player' && currentTheme.powerUpId === 'greed' && powerUpUsed) {
        setBalance(prev => prev + bet); // Extra bet payout (Total 2x profit)
        setMessage(prev => prev + " (Greed: 2x Payout!)");
      }
      if (winner === 'dealer' && currentTheme.powerUpId === 'shadow' && powerUpUsed) {
        let score = 0;
        playerHand.forEach(c => score += c.value, 0);
        if (score === 22) {
          setWinner('push');
          setBalance(prev => prev + bet); // Refund
          setMessage("Shadow Step: 22 Bust -> Push!");
        }
      }
    }
  }, [status, winner, powerUpUsed]);

  const getVisualScore = (hand: any[]) => {
      let s = 0; let a = 0;
      hand.forEach(c => { if(!c.isHidden) { s += c.value; if(c.rank === 'A') a++; } });
      while(s > 21 && a > 0) { s -= 10; a--; }
      return s;
  }

  // Define ambient colors based on theme or default
  const ambientColor = currentTheme ? currentTheme.primaryColor : '#ffffff'; 
  const secondaryAmbient = currentTheme ? currentTheme.secondaryColor : '#000000';
  const isPowerCharged = currentTheme && charges >= currentTheme.chargeCost;

  // --- Theme Selection Screen ---
  if (!currentTheme) {
    return (
      <div 
        className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 overflow-hidden relative"
        onMouseMove={handleMouseMove}
      >
        {/* Interactive Background */}
        <motion.div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ x: bgX, y: bgY }}>
            <div className="absolute inset-0 bg-black">
                {/* Black Hole Background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] md:w-[50vw] md:h-[50vw] rounded-full opacity-30"
                     style={{
                        background: `radial-gradient(circle, #000 40%, #333 45%, transparent 70%)`,
                        boxShadow: `0 0 100px 50px rgba(255,255,255,0.05)`
                     }}
                ></div>
            </div>
            <Particles color="#ffffff" count={30} />
        </motion.div>

        <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="z-10 text-center"
        >
            <h1 className="text-5xl md:text-8xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-400 to-gray-600 brand-font tracking-tighter" style={{ textShadow: '0 0 30px rgba(255,255,255,0.3)' }}>
            BLACKJACK SYNDICATE
            </h1>
            <p className="text-xl text-gray-400 mb-12 tracking-[0.5em] uppercase font-light">Choose Your Allegiance</p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl w-full z-10 px-4 pb-20 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {THEMES.map((theme, i) => (
            <motion.button
              key={theme.id}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
              whileHover={{ scale: 1.02, backgroundColor: "rgba(0,0,0,0.8)" }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={() => Audio.playClick()}
              onClick={() => handleThemeSelect(theme)}
              className={`group relative overflow-hidden rounded-xl p-6 border text-left transition-all duration-300 ${theme.borderColor} border-opacity-30 hover:border-opacity-100 bg-black/40 backdrop-blur-md`}
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${theme.gradient}`} />
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className={`text-xl font-bold brand-font ${theme.textColor} group-hover:text-white transition-colors`}>{theme.name}</h3>
                        <div className={`text-2xl filter drop-shadow-[0_0_10px_currentColor] ${theme.textColor}`}>
                            {theme.icon}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 group-hover:text-gray-300 leading-relaxed mb-4 min-h-[40px]">{theme.powerUpDescription}</p>
                </div>
                <div className="flex items-center gap-2 mt-2 justify-between">
                  <span className={`text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 uppercase tracking-wider font-mono group-hover:bg-white/20`}>
                    Power: {theme.powerUpName}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                     COST: {theme.chargeCost}⚡
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
        
        <div className="fixed bottom-4 right-6 text-[10px] text-gray-700 brand-font">
          SYSTEM: ONLINE // DEV: DEMONIC ALCHEMIST
        </div>
      </div>
    );
  }

  // --- Main Game Screen ---
  return (
    <motion.div 
        className={`min-h-screen w-full flex flex-col items-center justify-between overflow-hidden relative transition-colors duration-1000 bg-black`}
        animate={screenShake ? { x: [-5, 5, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
        onMouseMove={handleMouseMove}
    >
      
      {/* Interactive Background Layer: Black Hole Effect */}
      <motion.div className="absolute inset-0 pointer-events-none z-0" style={{ x: bgX, y: bgY }}>
         
         {/* Accretion Disk (Rotating Gradient) */}
         <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vh] h-[120vh]"
            animate={{ rotate: 360 }}
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
            style={{
                background: `conic-gradient(from 0deg, transparent 0%, ${ambientColor}20 10%, transparent 20%, ${ambientColor}10 40%, transparent 60%, ${secondaryAmbient}40 80%, transparent 100%)`,
                borderRadius: '50%',
                filter: 'blur(40px)',
            }}
         />
         
         {/* Event Horizon (Pure Black Void) */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vh] h-[40vh] bg-black rounded-full shadow-[0_0_50px_10px_rgba(0,0,0,1)] z-0">
             {/* Photon Ring */}
             <div className="absolute inset-0 rounded-full border-2 border-white/10 blur-sm"></div>
         </div>

         {/* Particles sucked into void */}
         <Particles color={ambientColor} count={60} />
      </motion.div>

      {/* Audio Toggle */}
      <button 
        onClick={toggleMute}
        className="fixed top-4 right-4 z-50 p-2 rounded-full bg-black/50 border border-white/10 hover:bg-white/10 transition-colors"
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      {/* POWER UP SPLASH OVERLAY */}
      <AnimatePresence>
        {powerUpSplash && (
          <motion.div 
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
             <motion.div
               className="relative"
               initial={{ scale: 0, rotate: -180 }}
               animate={{ scale: [1.5, 1], rotate: 0 }}
               transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
             >
                {/* Image or Icon */}
                <div className="w-64 h-64 md:w-80 md:h-80 rounded-full flex items-center justify-center relative overflow-hidden border-4 bg-black"
                    style={{ borderColor: ambientColor, boxShadow: `0 0 100px ${ambientColor}60` }}
                >
                    {factionImage ? (
                        <motion.img 
                            src={factionImage} 
                            alt="Power Up"
                            className="w-full h-full object-cover"
                            initial={{ scale: 1.2, filter: 'brightness(2)' }}
                            animate={{ scale: 1, filter: 'brightness(1)' }}
                            transition={{ duration: 1 }}
                        />
                    ) : (
                        <div className={`text-9xl filter drop-shadow-[0_0_50px_${ambientColor}]`}>
                            {currentTheme.icon}
                        </div>
                    )}
                    
                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"></div>
                </div>

                {/* Shockwave ring */}
                <motion.div 
                   className="absolute inset-0 rounded-full border-4"
                   style={{ borderColor: ambientColor }}
                   initial={{ scale: 1, opacity: 1 }}
                   animate={{ scale: 3, opacity: 0 }}
                   transition={{ duration: 1.5, repeat: Infinity }}
                />
             </motion.div>
             
             <motion.h1 
                className={`mt-12 text-5xl md:text-7xl font-black brand-font uppercase text-center tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400`}
                style={{ textShadow: `0 0 30px ${ambientColor}` }}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
             >
               {currentTheme.name}
             </motion.h1>
             
             <motion.p
                className={`text-xl md:text-2xl font-mono tracking-[0.5em] uppercase mt-4 ${currentTheme.textColor}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
             >
                // POWER ACTIVATED //
             </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD */}
      <div className="w-full max-w-7xl mx-auto p-4 flex justify-between items-center z-20 backdrop-blur-md bg-black/30 border-b border-white/5 shadow-lg">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => { Audio.playClick(); setCurrentTheme(null); }}
            className="group flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span> BACK
          </button>
          <div className="h-8 w-[1px] bg-white/10"></div>
          <div>
            <h2 className={`text-2xl font-black brand-font leading-none ${currentTheme.textColor}`} style={{ textShadow: `0 0 15px ${ambientColor}40` }}>
                {currentTheme.name}
            </h2>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse`} style={{ backgroundColor: ambientColor }}></div>
                <span className="text-[10px] text-gray-400 tracking-wider">ABILITY: {currentTheme.powerUpName}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-8 items-end">
           <ChargeMeter current={charges} max={10} color={ambientColor} />
           
           <div className="text-right">
             <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Credits</div>
             <div className="text-3xl font-mono text-white leading-none">${balance}</div>
           </div>
           <div className="text-right">
             <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Bet</div>
             <div className="text-3xl font-mono text-white leading-none">${bet}</div>
           </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 w-full max-w-6xl flex flex-col justify-center items-center relative z-10 py-8">
        
        {status === 'betting' ? (
           <motion.div 
             initial={{ scale: 0.8, opacity: 0, rotateX: 20 }}
             animate={{ scale: 1, opacity: 1, rotateX: 0 }}
             className="bg-black/60 backdrop-blur-2xl p-10 rounded-3xl border border-white/10 text-center w-full max-w-lg shadow-2xl relative overflow-hidden"
             style={{ boxShadow: `0 0 80px -20px ${ambientColor}40` }}
           >
             {/* Decorative lines */}
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
             
             <h2 className="text-4xl font-bold text-white mb-8 brand-font">INITIATE WAGER</h2>
             <div className="grid grid-cols-3 gap-4 mb-8">
               {[10, 50, 100, 250, 500].map((val) => (
                 <button
                   key={val}
                   onMouseEnter={() => Audio.playClick()}
                   onClick={() => handleBet(val)}
                   className={`py-4 rounded-xl font-bold font-mono text-lg transition-all border border-white/10 hover:border-${currentTheme.primaryColor} hover:bg-${currentTheme.primaryColor} hover:text-black text-white relative overflow-hidden group`}
                   style={{ borderColor: ambientColor }}
                 >
                   <span className="relative z-10">${val}</span>
                   <div className={`absolute inset-0 bg-${currentTheme.primaryColor} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                 </button>
               ))}
               <button
                   onMouseEnter={() => Audio.playClick()}
                   onClick={() => handleBet(balance)}
                   className={`py-4 rounded-xl font-bold font-mono text-lg transition-all border border-white/10 bg-red-900/20 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-600`}
                 >
                   ALL IN
               </button>
             </div>
             <div className="text-center text-[10px] text-gray-500 font-mono tracking-widest">
                MIN: $10 // MAX: $5000
             </div>
           </motion.div>
        ) : (
          <div className="w-full h-full flex flex-col justify-between items-center">
            
            {/* Dealer Hand */}
            <div className="w-full flex flex-col items-center">
              <div className="flex justify-center items-center relative h-[220px]">
                <AnimatePresence>
                  {dealerHand.map((card, i) => (
                    <Card key={card.id} card={card} index={i} theme={currentTheme} isDealer={true} />
                  ))}
                </AnimatePresence>
              </div>
              <div className="mt-2 px-4 py-1 rounded-full bg-black/50 backdrop-blur border border-white/5 text-gray-400 text-xs font-mono tracking-widest">
                 DEALER // {dealerHand.some(c => c.isHidden) ? "??" : getVisualScore(dealerHand)}
              </div>
            </div>

            {/* Status / Message Area */}
            <div className="relative h-24 flex items-center justify-center w-full">
               <AnimatePresence mode="wait">
                 {message && (
                    <motion.div
                      key={message}
                      initial={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }}
                      className={`text-3xl md:text-5xl font-black brand-font text-center px-8 py-2 ${currentTheme.textColor}`}
                      style={{ 
                          textShadow: `0 0 20px ${ambientColor}`,
                          WebkitTextStroke: '1px rgba(255,255,255,0.1)'
                      }}
                    >
                      {message}
                    </motion.div>
                 )}
               </AnimatePresence>
            </div>

            {/* Oracle Advice Box */}
            <AnimatePresence>
              {oracleAdvice && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-1/2 left-4 md:left-10 w-64 p-4 rounded-xl backdrop-blur-xl border border-yellow-500/30 bg-black/60 shadow-[0_0_30px_rgba(234,179,8,0.2)]"
                >
                  <div className="text-yellow-500 font-bold text-xs mb-2 flex items-center gap-2">
                    <span className="animate-pulse">●</span> AI PREDICTION
                  </div>
                  <div className="text-white text-sm leading-relaxed font-mono">
                    {oracleAdvice}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Player Hand */}
            <div className="w-full flex flex-col items-center">
               <div className="mb-4 px-4 py-1 rounded-full bg-black/50 backdrop-blur border border-white/5 text-gray-400 text-xs font-mono tracking-widest">
                 PLAYER // {getVisualScore(playerHand)}
              </div>
              <div className="flex justify-center items-center relative h-[220px]">
                <AnimatePresence>
                  {playerHand.map((card, i) => (
                    <Card key={card.id} card={card} index={i} theme={currentTheme} />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Controls */}
            <div className="w-full flex justify-center pb-8 pt-4">
              {status === 'playing' ? (
                 <div className="flex gap-4 md:gap-8 items-center">
                    <motion.button
                      whileHover={{ scale: 1.1, boxShadow: "0 0 20px rgba(255,255,255,0.4)" }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { Audio.playHit(); hit(); }}
                      className="w-20 h-20 rounded-full bg-white text-black font-black text-xl shadow-xl flex items-center justify-center border-4 border-gray-200"
                    >
                      HIT
                    </motion.button>
                    
                    {/* POWER BUTTON WITH GENERATED IMAGE & EFFECTS */}
                    <div className="relative">
                        <motion.button
                        whileHover={!powerUpUsed && isPowerCharged ? { scale: 1.1, boxShadow: `0 0 30px ${ambientColor}` } : {}}
                        whileTap={!powerUpUsed && isPowerCharged ? { scale: 0.9 } : {}}
                        onClick={handlePowerUp}
                        disabled={powerUpUsed || isGettingAdvice || !isPowerCharged}
                        className={`w-24 h-24 rounded-full flex items-center justify-center relative shadow-lg border-2 transition-all overflow-hidden 
                            ${(powerUpUsed || !isPowerCharged) ? 'opacity-80 grayscale cursor-not-allowed border-gray-600' : 'opacity-100 border-white/20'}`}
                        style={{ 
                            background: factionImage ? `url(${factionImage}) center/cover no-repeat` : `linear-gradient(135deg, ${ambientColor}, ${secondaryAmbient})` 
                        }}
                        >
                        {/* Power Ready Glow Pulse */}
                        {!powerUpUsed && isPowerCharged && (
                            <motion.div 
                                className="absolute inset-0 z-0"
                                initial={{ opacity: 0.5 }}
                                animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.05, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                style={{ boxShadow: `inset 0 0 30px ${ambientColor}`, background: `${ambientColor}20` }}
                            />
                        )}

                        {/* Loading State for Image Generation */}
                        {isGeneratingImage && !factionImage && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20">
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="w-8 h-8 border-2 border-t-transparent rounded-full"
                                    style={{ borderColor: `${ambientColor} transparent ${ambientColor} ${ambientColor}` }}
                                />
                            </div>
                        )}

                        {/* Overlay Gradient for Text Readability if Image exists */}
                        {factionImage && <div className="absolute inset-0 bg-black/30 z-10" />}

                        {/* Icon/Text */}
                        <div className="relative z-20 flex flex-col items-center">
                            <span className="text-3xl filter drop-shadow-md">
                                    {isGettingAdvice ? '...' : currentTheme.icon}
                            </span>
                            {factionImage && <span className="text-[8px] uppercase font-bold tracking-widest text-white mt-1">Power</span>}
                        </div>
                        </motion.button>
                        
                        {/* Cost Badge */}
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-black border border-white/20 px-2 py-0.5 rounded text-[10px] font-mono text-white z-30 whitespace-nowrap">
                            COST: {currentTheme.chargeCost}⚡
                        </div>
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.1, boxShadow: "0 0 20px rgba(255,255,255,0.2)" }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { Audio.playStand(); stand(); }}
                      className="w-20 h-20 rounded-full bg-black text-white font-black text-xl shadow-xl flex items-center justify-center border-4 border-white/20"
                    >
                      STND
                    </motion.button>
                 </div>
              ) : (
                status === 'gameOver' && (
                    <motion.button
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { Audio.playClick(); initGame(); setOracleAdvice(''); }}
                      className={`px-12 py-4 rounded-full font-black text-xl text-black shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-shadow`}
                      style={{ background: 'white' }}
                    >
                      REMATCH
                    </motion.button>
                )
              )}
            </div>

          </div>
        )}
      </div>

      {/* Footer */}
      <div className="w-full px-6 py-4 flex justify-between items-end z-10 opacity-40 hover:opacity-100 transition-opacity">
         <div className="text-[10px] font-mono text-white/50">
            ID: {Math.random().toString(36).slice(-6).toUpperCase()}
         </div>
         <div className="text-[10px] font-mono text-white/50 tracking-widest">
            MADE BY DEMONIC ALCHEMIST
         </div>
      </div>

    </motion.div>
  );
};

export default App;