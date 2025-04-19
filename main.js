import { AcneSimulation } from './simulation.js';
import { AcneVisualization } from './visualization.js';

// Acne Inflammation & Healing Simulation - Main Controller
// This file connects the simulation logic with the visualization

let simulation;
let visualization;
let animationFrameId;
let isSimulationRunning = false;
let timeLastFrame = 0;
let speedMultiplier = 1.0;
let shouldRotateModel = true;

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if global instances are already created
    simulation = window.simulation || new AcneSimulation();
    visualization = window.visualization || new AcneVisualization('canvasContainer');
    
    // Make them globally accessible if they weren't already
    window.simulation = simulation;
    window.visualization = visualization;
    
    // Setup the rest of the application
    setupEventListeners();
    connectUIControls();
    updateUIFromSimulation();
    
    // Start animation if not already started
    if (visualization && !visualization.isAnimating) {
        visualization.animate();
    }
});

// Setup event listeners for UI controls
function setupEventListeners() {
    // Play/Pause button
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', toggleSimulation);
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSimulation);
    }
    
    // Skip Stage button
    const skipStageBtn = document.getElementById('skipStageBtn');
    if (skipStageBtn) {
        skipStageBtn.addEventListener('click', skipToNextStage);
    }
    
    // Speed control
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', (e) => {
            speedMultiplier = parseFloat(e.target.value);
            speedValue.textContent = speedMultiplier.toFixed(1) + 'x';
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ') {
            // Space bar toggles simulation
            toggleSimulation();
            e.preventDefault();
        } else if (e.key === 'r') {
            // R key resets simulation
            resetSimulation();
        } else if (e.key === '1' || e.key === '2' || e.key === '3') {
            // 1, 2, 3 keys set speed
            speedMultiplier = parseInt(e.key);
            const slider = document.getElementById('speed-slider');
            const value = document.getElementById('speed-value');
            if (slider) slider.value = speedMultiplier;
            if (value) value.textContent = speedMultiplier.toFixed(1) + 'x';
        }
    });
    
    // Connect all parameter sliders
    const sliders = document.querySelectorAll('.parameter-slider');
    sliders.forEach(slider => {
        if (slider) {
            slider.addEventListener('input', handleSliderChange);
        }
    });
    
    // Window resize event
    window.addEventListener('resize', () => {
        if (visualization) {
            visualization.onWindowResize();
        }
    });
}

// Connect UI controls to simulation parameters
function connectUIControls() {
    // Helper function to safely set slider value
    const setSliderValue = (id, value) => {
        const slider = document.getElementById(id);
        if (slider) {
            slider.value = value;
        }
    };

    // Set initial slider values from simulation if they exist
    setSliderValue('sebum-slider', simulation.sebumParam);
    setSliderValue('bacteria-slider', simulation.bacteriaParam);
    setSliderValue('medication-slider', simulation.medicationParam);
    setSliderValue('inflammation-slider', simulation.inflammationParam);
    setSliderValue('healing-slider', simulation.healingParam);
    setSliderValue('temperature-slider', simulation.temperatureParam);
    setSliderValue('humidity-slider', simulation.humidityParam);
    setSliderValue('friction-slider', simulation.frictionParam);
}

// Update UI elements to reflect current simulation state
function updateUIFromSimulation() {
    // Helper function to safely update text content
    const updateTextContent = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    };

    // Update parameter displays if they exist
    updateTextContent('sebum-value', simulation.sebumParam);
    updateTextContent('bacteria-value', simulation.bacteriaParam);
    updateTextContent('medication-value', simulation.medicationParam);
    updateTextContent('inflammation-value', simulation.inflammationParam);
    updateTextContent('healing-value', simulation.healingParam);
    updateTextContent('temperature-value', simulation.temperatureParam);
    updateTextContent('humidity-value', simulation.humidityParam);
    updateTextContent('friction-value', simulation.frictionParam);
    
    // Update stage display
    const formattedStage = formatStageName(simulation.simulationStage || 'incubation');
    updateTextContent('stageDisplay', 'Current Stage: ' + formattedStage);
    
    // Update time display
    const timeInHours = Math.floor(simulation.simulationTime / 3600);
    const timeInDays = (timeInHours / 24).toFixed(1);
    updateTextContent('time-value', `${timeInHours} hours (${timeInDays} days)`);
    
    // Update derived values
    if (simulation.currentSebumLevel !== undefined) {
        updateTextContent('current-sebum', simulation.currentSebumLevel.toFixed(1));
    }
    if (simulation.currentBacteriaLevel !== undefined) {
        updateTextContent('current-bacteria', simulation.currentBacteriaLevel.toFixed(1));
    }
    if (simulation.currentInflammationLevel !== undefined) {
        updateTextContent('current-inflammation', simulation.currentInflammationLevel.toFixed(1));
    }
}

// Format stage name for display
function formatStageName(stage) {
    return stage
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Handle slider changes
function handleSliderChange(event) {
    const sliderId = event.target.id;
    const value = parseInt(event.target.value);
    
    // Update display value
    const valueId = sliderId.replace('-slider', '-value');
    document.getElementById(valueId).textContent = value;
    
    // Update simulation parameter
    switch (sliderId) {
        case 'sebum-slider':
            simulation.setSebumParam(value);
            break;
        case 'bacteria-slider':
            simulation.setBacteriaParam(value);
            break;
        case 'medication-slider':
            simulation.setMedicationParam(value);
            break;
        case 'inflammation-slider':
            simulation.setInflammationParam(value);
            break;
        case 'healing-slider':
            simulation.setHealingParam(value);
            break;
        case 'temperature-slider':
            simulation.setTemperatureParam(value);
            break;
        case 'humidity-slider':
            simulation.setHumidityParam(value);
            break;
        case 'friction-slider':
            simulation.setFrictionParam(value);
            break;
    }
    
    // Immediately update visualization if paused
    if (!isSimulationRunning) {
        updateVisualizationState();
    }
}

// Toggle simulation between running and paused states
function toggleSimulation() {
    if (isSimulationRunning) {
        pauseSimulation();
    } else {
        startSimulation();
    }
}

// Start simulation
function startSimulation() {
    if (!isSimulationRunning) {
        isSimulationRunning = true;
        timeLastFrame = performance.now();
        animationFrameId = requestAnimationFrame(simulationLoop);
        document.getElementById('pauseBtn').textContent = 'Pause';
        document.getElementById('simulation-status').textContent = 'Running';
    }
}

// Pause simulation
function pauseSimulation() {
    if (isSimulationRunning) {
        isSimulationRunning = false;
        cancelAnimationFrame(animationFrameId);
        document.getElementById('pauseBtn').textContent = 'Play';
        document.getElementById('simulation-status').textContent = 'Paused';
    }
}

// Reset simulation to initial state
function resetSimulation() {
    // Pause first
    pauseSimulation();
    
    // Reset simulation state
    simulation.reset();
    
    // Update UI
    updateUIFromSimulation();
    
    // Update visualization
    updateVisualizationState();
    
    console.log('Simulation reset to initial state');
}

// Main simulation loop
function simulationLoop(timestamp) {
    if (!isSimulationRunning) return;
    
    // Calculate time delta since last frame
    const deltaTime = timestamp - timeLastFrame;
    timeLastFrame = timestamp;
    
    // Apply speed multiplier to delta time
    const scaledDelta = deltaTime * speedMultiplier / 1000; // Convert to seconds
    
    // Update simulation state
    simulation.update(scaledDelta);
    
    // Update UI elements
    updateUIFromSimulation();
    
    // Update visualization
    updateVisualizationState();
    
    // Continue the loop
    animationFrameId = requestAnimationFrame(simulationLoop);
}

// Update visualization based on current simulation state
function updateVisualizationState() {
    if (!visualization) return;
    
    // Create a state object to pass to visualization
    const state = {
        sebumLevel: simulation.currentSebumLevel,
        bacteriaLevel: simulation.currentBacteriaLevel,
        inflammationLevel: simulation.currentInflammationLevel,
        neutrophilLevel: simulation.currentNeutrophilLevel,
        pusLevel: simulation.currentPusLevel,
        stage: simulation.simulationStage || 'incubation', // Provide default stage if undefined
        rotateModel: shouldRotateModel
    };
    
    // Update the UI display
    const stageIndicator = document.getElementById('stageIndicator');
    const stageDisplay = document.getElementById('stageDisplay');
    
    // Format stage name with null check
    const formattedStage = state.stage ? 
        state.stage.charAt(0).toUpperCase() + state.stage.slice(1) : 
        'Incubation';
    
    if (stageIndicator) {
        stageIndicator.textContent = `Stage: ${formattedStage}`;
    }
    
    if (stageDisplay) {
        stageDisplay.textContent = `Current Stage: ${formattedStage}`;
    }
    
    // Actually update the visualization with the simulation state
    visualization.update(state);
}

// Skip to the next stage of the simulation
function skipToNextStage() {
    simulation.advanceToNextStage();
    updateUIFromSimulation();
    updateVisualizationState();
    console.log('Manually advanced to stage: ' + simulation.simulationStage);
} 