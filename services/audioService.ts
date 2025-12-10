
import { GameStatus } from '../types';

// Web Audio API Service for Procedural Sound Generation
// Theme: Cybernetic Void / Cinematic Dark Sci-Fi

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let delayNode: DelayNode | null = null;
let isMuted = false;

// Drone State
let droneNodes: AudioNode[] = [];
let activeDroneFilter: BiquadFilterNode | null = null;
let activeDroneLfo: OscillatorNode | null = null;

// Sequencer State
let nextNoteTime = 0;
let currentStep = 0;
let timerID: number | null = null;
const TEMPO = 55; // Slow, cinematic
const LOOKAHEAD = 25.0; // ms
const SCHEDULE_AHEAD_TIME = 0.1; // s
let currentGameStatus: GameStatus = 'betting';

// Sequence: Cinematic D Minor / Bb Major (Dark Heroic)
// "Braaam" style heavy bass hits
const SEQUENCE = [
    36.71, 0, 0, 0,  // D1 (Root)
    0, 0, 0, 0,
    36.71, 0, 0, 0,
    0, 0, 43.65, 0,  // F1 (Minor 3rd)
    
    29.14, 0, 0, 0,  // Bb0 (Dark VI)
    0, 0, 0, 0,
    32.70, 0, 0, 0,  // C1
    0, 0, 41.20, 0   // E1
];

const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Master Bus
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.4;
        
        // FX Bus: Vast Space Delay
        delayNode = audioCtx.createDelay();
        delayNode.delayTime.value = 0.5; // Syncopated echo
        
        const feedback = audioCtx.createGain();
        feedback.gain.value = 0.4; 
        
        const delayFilter = audioCtx.createBiquadFilter();
        delayFilter.type = 'lowpass';
        delayFilter.frequency.value = 1200; 

        delayNode.connect(feedback);
        feedback.connect(delayFilter);
        delayFilter.connect(delayNode);
        
        // Connect FX to Master
        delayNode.connect(masterGain);
        masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
};

export const toggleMute = (mute: boolean) => {
    isMuted = mute;
    if (masterGain && audioCtx) {
        masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.4, audioCtx.currentTime, 0.5);
    }
};

export const setBgIntensity = (status: GameStatus) => {
    currentGameStatus = status;
    if (audioCtx && activeDroneFilter && activeDroneLfo) {
        const t = audioCtx.currentTime;
        
        // Dynamic mixing based on game state
        if (status === 'dealerTurn') {
             // High Tension: Open filter, faster pulse
             activeDroneFilter.frequency.setTargetAtTime(600, t, 1); 
             activeDroneLfo.frequency.setTargetAtTime(8, t, 1); 
        } else if (status === 'playing') {
             // Focus
             activeDroneFilter.frequency.setTargetAtTime(400, t, 1);
             activeDroneLfo.frequency.setTargetAtTime(1, t, 1);
        } else {
             // Calm
             activeDroneFilter.frequency.setTargetAtTime(250, t, 2);
             activeDroneLfo.frequency.setTargetAtTime(0.2, t, 2);
        }
    }
}

// --- FM Synthesis Helper for Dangerous Sounds ---
const playFM = (
    carrierFreq: number, 
    modRatio: number, 
    modIndex: number, 
    duration: number, 
    type: OscillatorType = 'sine',
    vol = 0.5,
    when = 0
) => {
    if (!audioCtx || isMuted || !masterGain) return;
    const t = when || audioCtx.currentTime;

    const carrier = audioCtx.createOscillator();
    const modulator = audioCtx.createOscillator();
    const modGain = audioCtx.createGain();
    const env = audioCtx.createGain();

    carrier.type = type;
    carrier.frequency.value = carrierFreq;

    modulator.type = type; 
    modulator.frequency.value = carrierFreq * modRatio;

    // FM depth
    modGain.gain.value = modIndex;

    // Envelope
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.02); // Fast attack
    env.gain.exponentialRampToValueAtTime(0.001, t + duration);

    // Routing: Modulator -> ModGain -> Carrier.frequency
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    
    // Carrier -> Envelope -> Master & Delay
    carrier.connect(env);
    env.connect(masterGain);
    if (delayNode) env.connect(delayNode); 

    carrier.start(t);
    modulator.start(t);
    carrier.stop(t + duration + 0.5);
    modulator.stop(t + duration + 0.5);
};

// --- New Drone: Cybernetic Pad ---
const startDrone = () => {
    if (!audioCtx || isMuted || droneNodes.length > 0 || !masterGain) return;
    
    // 1. Detuned Sawtooth Pad (The "Energy Field")
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    
    osc1.frequency.value = 73.42; // D2
    osc2.frequency.value = 74.00; // D2 detuned slightly
    
    const droneFilter = audioCtx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 250; 
    activeDroneFilter = droneFilter; 

    const droneGain = audioCtx.createGain();
    droneGain.gain.value = 0.08; 

    // LFO for filter cutoff (Breathing effect)
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 0.2; 
    activeDroneLfo = lfo;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 100;

    lfo.connect(lfoGain).connect(droneFilter.frequency);
    
    osc1.connect(droneFilter);
    osc2.connect(droneFilter);
    droneFilter.connect(droneGain).connect(masterGain);
    if (delayNode) droneGain.connect(delayNode); // Add space

    // 2. Sub Bass Anchor
    const sub = audioCtx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 36.71; // D1
    const subGain = audioCtx.createGain();
    subGain.gain.value = 0.15;
    
    sub.connect(subGain).connect(masterGain);

    osc1.start();
    osc2.start();
    lfo.start();
    sub.start();

    droneNodes = [osc1, osc2, droneFilter, droneGain, lfo, lfoGain, sub, subGain];
};

const stopDrone = () => {
    droneNodes.forEach(node => {
        try {
            if (node instanceof AudioScheduledSourceNode) node.stop();
            node.disconnect();
        } catch(e) {}
    });
    droneNodes = [];
    activeDroneFilter = null;
    activeDroneLfo = null;
};

// --- Sequencer Logic ---
const scheduleNote = (step: number, time: number) => {
    const freq = SEQUENCE[step];
    if (freq > 0 && audioCtx && masterGain) {
        const osc = audioCtx.createOscillator();
        const env = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.type = 'sawtooth'; // Aggressive "Braaam" sound
        osc.frequency.value = freq;

        // Filter Envelope (The "Womp")
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(100, time);
        filter.frequency.exponentialRampToValueAtTime(1500, time + 0.1); // Attack
        filter.frequency.exponentialRampToValueAtTime(100, time + 1.5);   // Decay

        // Amp Envelope
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.25, time + 0.05);
        env.gain.exponentialRampToValueAtTime(0.001, time + 2.0);

        osc.connect(filter);
        filter.connect(env);
        env.connect(masterGain);
        if (delayNode) env.connect(delayNode); 

        osc.start(time);
        osc.stop(time + 2.5);
    }
};

const scheduleRhythmClick = (time: number) => {
    if (!audioCtx || !masterGain) return;
    // Metallic ticking / Hi-hat
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.value = 800; 

    filter.type = 'highpass';
    filter.frequency.value = 3000;

    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.02, time + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(filter).connect(env).connect(masterGain);
    
    osc.start(time);
    osc.stop(time + 0.1);
};

const scheduleTensionPulse = (time: number) => {
    if (!audioCtx || !masterGain) return;
    // Sonar Ping
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, time);
    osc.frequency.exponentialRampToValueAtTime(800, time + 0.1);

    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.05, time + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(env).connect(masterGain);
    if(delayNode) env.connect(delayNode); 

    osc.start(time);
    osc.stop(time + 0.25);
}

const scheduler = () => {
    if (!audioCtx) return;
    while (nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD_TIME) {
        // Main Bass Line
        if (currentStep % 4 === 0) { // Every beat
            scheduleNote(Math.floor(currentStep / 4), nextNoteTime);
        }
        
        // --- DYNAMIC LAYERS ---
        // Metallic tick rhythm
        if (currentStep % 4 === 2) { // Off-beat
            scheduleRhythmClick(nextNoteTime);
        }

        // Add High Tension Pulse during Dealer Turn
        if (currentGameStatus === 'dealerTurn') {
             if (currentStep % 2 === 0) { 
                 scheduleTensionPulse(nextNoteTime);
             }
        }

        const secondsPerBeat = 60.0 / TEMPO;
        nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
        currentStep = (currentStep + 1) % 32; 
    }
    timerID = window.setTimeout(scheduler, LOOKAHEAD);
};

export const startSoundtrack = () => {
    initAudio();
    if (timerID !== null || isMuted) return;
    if (audioCtx) nextNoteTime = audioCtx.currentTime + 0.1;
    currentStep = 0;
    startDrone();
    scheduler();
};

export const stopSoundtrack = () => {
    if (timerID !== null) {
        clearTimeout(timerID);
        timerID = null;
    }
    stopDrone();
};

// --- UI Sounds (Retuned for "Eerie/Dangerous") ---

export const playClick = () => {
    // Hollow click
    playFM(800, 0.5, 50, 0.05, 'sine', 0.1);
};

export const playChips = () => {
    // Glassy texture
    playFM(1500, 1.5, 100, 0.05, 'sine', 0.05);
};

export const playCardFlip = () => {
    // Air displacement
    if (!audioCtx || isMuted || !masterGain) return;
    const noise = audioCtx.createBufferSource();
    const bufferSize = audioCtx.sampleRate * 0.1;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, audioCtx.currentTime);
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
    
    noise.connect(filter).connect(gain).connect(masterGain);
    noise.start();
};

export const playHit = () => {
    // Futuristic "Data Swipe" / "Air Card"
    // High frequency, clean sine sweep, very short
    if (!audioCtx || isMuted || !masterGain) return;
    const t = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain).connect(masterGain);
    if(delayNode) gain.connect(delayNode);
    osc.start(t);
    osc.stop(t + 0.15);
};

export const playStand = () => {
    // "Shield Lock" / "Gravity Anchor"
    // Deep, resonant, solid
    if (!audioCtx || isMuted || !masterGain) return;
    const t = audioCtx.currentTime;

    // Sub thump
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    // Metallic chirp overlay
    const metal = audioCtx.createOscillator();
    const metalGain = audioCtx.createGain();
    metal.type = 'square';
    metal.frequency.setValueAtTime(400, t);
    metalGain.gain.setValueAtTime(0.05, t);
    metalGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain).connect(masterGain);
    metal.connect(metalGain).connect(masterGain);
    
    osc.start(t);
    osc.stop(t + 0.35);
    metal.start(t);
    metal.stop(t + 0.1);
};

export const playWin = () => {
    // "Ascension"
    // Slow swell, consonant but eerie (Minor 9th with high sustain)
    if (!audioCtx || isMuted || !masterGain) return;
    const t = audioCtx.currentTime;
    
    // Notes: D3, F3, A3, E4 (D Minor 9)
    const freqs = [146.83, 174.61, 220.00, 329.63]; 
    
    freqs.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.5 + (i*0.1)); // Staggered entry
        gain.gain.exponentialRampToValueAtTime(0.001, t + 4.0); // Long tail
        
        osc.connect(gain).connect(masterGain!);
        if (delayNode) gain.connect(delayNode);
        
        osc.start(t);
        osc.stop(t + 4.5);
    });
};

export const playLose = () => {
    // "Power Failure"
    // Slow pitch drop sine wave
    if (!audioCtx || isMuted || !masterGain) return;
    const t = audioCtx.currentTime;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 1.5);
    
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0, t + 1.5);
    
    osc.connect(gain).connect(masterGain);
    osc.start(t);
    osc.stop(t + 1.5);
};

export const playPowerReady = () => {
    // Energy build up - Alien
    const now = audioCtx?.currentTime || 0;
    playFM(110, 2.01, 300, 1.0, 'sine', 0.3, now);
    playFM(220, 2.01, 500, 1.0, 'sine', 0.3, now + 0.1);
};

// --- Dangerous Theme Powers (FM Synthesis) ---
// Increased distortion and modulation for "Dangerous" feel

export const playThemePower = (themeId: string) => {
    if (!audioCtx || isMuted) return;

    switch (themeId) {
        case 'crimson': // Vipers: Rattlesnake / Metallic
            // Noisy FM
            playFM(1000, 0.23, 2000, 0.8, 'sawtooth', 0.4);
            break;

        case 'sapphire': // Sentinel: Shattering Ice
            playFM(3000, 1.45, 1000, 0.5, 'sine', 0.3);
            playFM(4000, 1.8, 1500, 0.3, 'sine', 0.2, audioCtx.currentTime + 0.05);
            break;

        case 'emerald': // Greed: Heavy Register
            playFM(880, 2, 50, 0.2, 'square', 0.3);
            playFM(1760, 2, 50, 0.2, 'square', 0.2, audioCtx.currentTime + 0.1);
            break;
        
        case 'neon': // Drifters: Time Glitch
             playFM(400, 0.5, 2000, 0.4, 'sawtooth', 0.4);
             setTimeout(() => playFM(300, 0.5, 2000, 0.4, 'sawtooth', 0.4), 100);
            break;

        case 'void': // Void: Black Hole Roar
            playFM(40, 0.99, 500, 3.0, 'sawtooth', 0.6); // Deep vibrating bass
            break;

        case 'amber': // Time: Reverse Suction
            if (audioCtx && masterGain) {
                const osc = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(100, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 1.0);
                
                g.gain.setValueAtTime(0, audioCtx.currentTime);
                g.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.8);
                g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.0);

                osc.connect(g).connect(masterGain);
                if (delayNode) g.connect(delayNode);
                osc.start();
                osc.stop(audioCtx.currentTime + 1.0);
            }
            break;
            
        case 'solar': // Oracle: Alien Data Stream
            const now = audioCtx.currentTime;
            for(let i=0; i<8; i++) {
                playFM(1200 + (Math.random()*500), 1, 300, 0.03, 'sine', 0.15, now + (i*0.06));
            }
            break;

        default:
            playFM(220, 1, 100, 1.0);
    }
};
