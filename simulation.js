// Acne Inflammation & Healing Simulation - Core Logic
// This file contains the main simulation model for acne development

export class AcneSimulation {
    constructor() {
        // Simulation state variables
        this.simulationTime = 0; // in simulated hours
        this.timeScale = 1; // 1 second real time = 1 hour simulated time
        this.simulationStage = "incubation"; // stages: incubation, comedone, papule, pustule, rupture, healing, resolved
        
        // Parameter values (0-1000 scale)
        this.sebumValue = 500;
        this.bacteriaValue = 200;
        this.medicationValue = 0;
        this.inflammationValue = 500;
        this.healingValue = 500;
        this.temperatureValue = 500;
        this.humidityValue = 500;
        this.frictionValue = 0;
        
        // Derived biological values
        this.sebumRate = 0.05; // increased from 0.02 to make simulation advance faster
        this.bacteriaGrowthRate = 0.05; // base exponential growth rate per hour
        this.currentSebumLevel = 20; // start with some sebum already accumulated
        this.currentBacteriaLevel = 0; // current bacteria population
        this.currentInflammationLevel = 0; // current inflammation (0-100)
        this.currentNeutrophilLevel = 0; // current neutrophil count
        this.currentPusLevel = 0; // current pus level (0-100)
        this.currentMedicationLevel = 0; // Starting with no medication
        
        // Thresholds for stage transitions
        this.SEBUM_THRESHOLD = 70; // sebum level to form a comedone
        this.BACTERIA_THRESHOLD = 60; // bacteria to trigger inflammation
        this.INFLAMMATION_THRESHOLD = 40; // inflammation to form papule
        this.PUS_THRESHOLD = 70; // inflammation level to form pustule
        this.RUPTURE_THRESHOLD = 90; // pus level to trigger rupture
        this.HEALING_THRESHOLD = 30; // healing progress to enter healing stage
        this.RESOLVED_THRESHOLD = 80; // healing progress to consider resolved
        
        // Progression accelerator (used to make simulation advance faster)
        this.progressionAccelerator = 1.0;
        
        // Healing progress tracking
        this.healingProgress = 0;
    }
    
    // Update derived rates based on slider values
    updateDerivedRates() {
        // Sebum production rate affected by temperature
        this.sebumRate = 0.05 * (1 + 0.002 * (this.temperatureValue - 500)) * this.progressionAccelerator;
        
        // Bacterial growth rate affected by temperature and medication
        this.bacteriaGrowthRate = 0.05 * (1 + 0.001 * (this.temperatureValue - 500)) * 
                              (1 - this.medicationValue / 2000) * this.progressionAccelerator;
        
        // Friction affects baseline inflammation
        this.baselineInflammation = 0;
        if (this.frictionValue > 300) {
            this.baselineInflammation = (this.frictionValue - 300) / 1400; // Max 0.5 at friction 1000
        }
        
        // Humidity affects sebum blockage
        this.humidityEffect = 1;
        if (this.humidityValue > 600) {
            this.humidityEffect = 1 + (this.humidityValue - 600) / 800; // Up to 1.5x at max humidity
        }
        
        // Update medication level based on current medication param
        this.currentMedicationLevel = this.currentMedicationLevel * 0.99 + this.medicationValue * 0.01;
    }
    
    // Update biological state variables
    updateBiologicalState(dt) {
        // Update sebum level
        const scaledSebumRate = this.sebumRate * (this.sebumValue / 500) * dt;
        this.currentSebumLevel = Math.min(100, this.currentSebumLevel + scaledSebumRate);
        
        // If comedone formed, update bacteria
        if (this.simulationStage !== "incubation") {
            const baseBacteriaGrowth = this.currentBacteriaLevel > 0 ? 
                this.currentBacteriaLevel * this.bacteriaGrowthRate * dt : 
                this.bacteriaValue / 100 * dt * 2.0; // Double initial bacteria growth rate
                
            this.currentBacteriaLevel = Math.min(100, this.currentBacteriaLevel + baseBacteriaGrowth);
            
            // Apply medication effect
            if (this.medicationValue > 0) {
                this.currentBacteriaLevel = Math.max(0, this.currentBacteriaLevel - (this.medicationValue / 10000) * dt);
            }
        }
        
        // Update inflammation based on bacteria and sensitivity
        if (this.currentBacteriaLevel > this.BACTERIA_THRESHOLD || 
            (this.simulationStage === "comedone" || this.simulationStage === "papule")) {
            
            const inflammationRate = ((Math.max(this.currentBacteriaLevel, 30) - 30) / 40) * 
                                      (this.inflammationValue / 500) * dt * this.progressionAccelerator;
            this.currentInflammationLevel = Math.min(100, this.currentInflammationLevel + inflammationRate);
            
            // Increase neutrophil count with inflammation
            if (this.currentInflammationLevel > this.INFLAMMATION_THRESHOLD / 2) {
                this.currentNeutrophilLevel = Math.min(100, this.currentNeutrophilLevel + inflammationRate * 2.0);
            }
        }
        
        // Update pus level based on neutrophils
        if (this.currentNeutrophilLevel > 10 && 
            (this.simulationStage === "papule" || this.simulationStage === "pustule")) {
            this.currentPusLevel = Math.min(100, this.currentPusLevel + (this.currentNeutrophilLevel / 80) * dt * this.progressionAccelerator);
        }
        
        // Handle healing phase
        if (this.simulationStage === "healing" || this.simulationStage === "resolved") {
            const healingRate = (this.healingValue / 500) * dt;
            
            this.currentInflammationLevel = Math.max(0, this.currentInflammationLevel - healingRate);
            this.currentNeutrophilLevel = Math.max(0, this.currentNeutrophilLevel - healingRate * 1.2);
            this.currentPusLevel = Math.max(0, this.currentPusLevel - healingRate * 0.8);
            
            if (this.simulationStage === "healing" && 
                this.currentInflammationLevel < 10 && this.currentPusLevel < 5) {
                this.simulationStage = "resolved";
            }
            
            // Increase healing progress
            this.healingProgress += healingRate;
            this.healingProgress = Math.min(this.healingProgress, 100);
        }
        
        // Log the current state periodically 
        if (Math.floor(this.simulationTime) % 10 === 0 && Math.floor(this.simulationTime / 10) !== this.lastLogTime) {
            this.lastLogTime = Math.floor(this.simulationTime / 10);
            console.log(`Simulation time: ${Math.floor(this.simulationTime)}h, Stage: ${this.simulationStage}, Sebum: ${this.currentSebumLevel.toFixed(1)}, Bacteria: ${this.currentBacteriaLevel.toFixed(1)}, Inflammation: ${this.currentInflammationLevel.toFixed(1)}, Neutrophils: ${this.currentNeutrophilLevel.toFixed(1)}, Pus: ${this.currentPusLevel.toFixed(1)}`);
        }
    }
    
    // Check for stage transitions
    checkStageTransitions() {
        console.log("Checking stage transitions...");
        
        switch (this.simulationStage) {
            case "incubation":
                // Transition to comedone when bacteria and inflammation reach thresholds
                if (this.currentBacteriaLevel > this.BACTERIA_THRESHOLD && 
                    this.currentInflammationLevel > this.INFLAMMATION_THRESHOLD) {
                    console.log("Transitioning from incubation to comedone");
                    this.simulationStage = "comedone";
                    this.updateStageVisuals();
                }
                break;
                
            case "comedone":
                // Transition to papule when inflammation increases significantly
                if (this.currentInflammationLevel > this.INFLAMMATION_THRESHOLD) {
                    console.log("Transitioning from comedone to papule");
                    this.simulationStage = "papule";
                    this.updateStageVisuals();
                }
                break;
                
            case "papule":
                // Transition to pustule when pus formation begins
                if (this.currentPusLevel > this.PUS_THRESHOLD) {
                    console.log("Transitioning from papule to pustule");
                    this.simulationStage = "pustule";
                    this.updateStageVisuals();
                }
                break;
                
            case "pustule":
                // Transition to rupture when pressure builds up
                if (this.currentPusLevel > this.RUPTURE_THRESHOLD) {
                    console.log("Transitioning from pustule to rupture");
                    this.simulationStage = "rupture";
                    this.updateStageVisuals();
                }
                break;
                
            case "rupture":
                // Check if healing is successful or if condition worsens
                if (this.healingProgress > this.HEALING_THRESHOLD) {
                    console.log("Healing successful, transitioning to healing stage");
                    this.simulationStage = "healing";
                    this.updateStageVisuals();
                } else if (this.currentBacteriaLevel > this.BACTERIA_THRESHOLD || 
                          this.currentInflammationLevel > this.BACTERIA_THRESHOLD) {
                    console.log("Healing unsuccessful, condition worsening");
                    this.simulationStage = "worsening";
                    this.updateStageVisuals();
                }
                break;
                
            case "healing":
                // Transition to resolved when healing is complete
                if (this.healingProgress >= this.RESOLVED_THRESHOLD) {
                    console.log("Healing complete, transitioning to resolved");
                    this.simulationStage = "resolved";
                    this.updateStageVisuals();
                }
                break;
                
            case "worsening":
                // Stay in worsening stage until manually reset
                console.log("Remaining in worsening stage");
                break;
                
            case "resolved":
                // Stay in resolved stage until manually reset
                console.log("Remaining in resolved stage");
                break;
        }
    }
    
    // Set the progression accelerator (useful for advancing through stages quicker)
    setProgressionAccelerator(value) {
        this.progressionAccelerator = Math.max(0.1, Math.min(10.0, value));
        console.log(`Progression accelerator set to: ${this.progressionAccelerator.toFixed(1)}x`);
    }
    
    // Force advance to next stage manually
    advanceToNextStage() {
        switch (this.simulationStage) {
            case "incubation":
                this.simulationStage = "comedone";
                this.currentSebumLevel = this.SEBUM_THRESHOLD;
                console.log("MANUAL ADVANCE: Incubation → Comedone");
                break;
                
            case "comedone":
                this.simulationStage = "papule";
                this.currentInflammationLevel = this.INFLAMMATION_THRESHOLD;
                this.currentBacteriaLevel = Math.max(this.currentBacteriaLevel, this.BACTERIA_THRESHOLD + 5);
                console.log("MANUAL ADVANCE: Comedone → Papule");
                break;
                
            case "papule":
                this.simulationStage = "pustule";
                this.currentPusLevel = this.PUS_THRESHOLD;
                console.log("MANUAL ADVANCE: Papule → Pustule");
                break;
                
            case "pustule":
                this.simulationStage = "rupture";
                this.currentPusLevel = this.RUPTURE_THRESHOLD;
                this.healingProgress = 0; // Reset healing progress
                console.log("MANUAL ADVANCE: Pustule → Rupture");
                break;
                
            case "rupture":
                this.simulationStage = "healing";
                this.healingProgress = this.HEALING_THRESHOLD;
                console.log("MANUAL ADVANCE: Rupture → Healing");
                break;
                
            case "healing":
                this.simulationStage = "resolved";
                this.healingProgress = this.RESOLVED_THRESHOLD;
                this.currentInflammationLevel = 0;
                this.currentPusLevel = 0;
                console.log("MANUAL ADVANCE: Healing → Resolved");
                break;
                
            case "resolved":
                // Reset the simulation to start again
                this.simulationStage = "incubation";
                this.currentSebumLevel = 20;
                this.currentBacteriaLevel = 0;
                this.currentInflammationLevel = 0;
                this.currentNeutrophilLevel = 0;
                this.currentPusLevel = 0;
                this.healingProgress = 0;
                console.log("MANUAL ADVANCE: Resolved → Incubation (Reset)");
                break;
        }
    }
    
    // Main update function called each frame
    update() {
        // Update simulation parameters based on current stage
        this.updateParameters();
        
        // Check for stage transitions
        this.checkStageTransitions();
        
        // Update visualization
        this.updateVisualization();
        
        // Update progress bar
        this.updateProgressBar();
        
        // Update UI elements
        this.updateUI();
    }

    // Set a specific stage directly
    setStage(stage) {
        console.log(`Setting stage to: ${stage}`);
        
        // Validate the stage
        const validStages = [
            "incubation", "comedone", "papule", "pustule", 
            "rupture", "healing", "worsening", "resolved"
        ];
        
        if (!validStages.includes(stage)) {
            console.error(`Invalid stage: ${stage}`);
            return;
        }
        
        // Set the stage
        this.simulationStage = stage;
        
        // Reset progress for the new stage
        this.resetStageProgress();
        
        // Update visuals through the visualization instance
        if (window.visualization) {
            window.visualization.updateStageVisuals(stage);
        }
        
        // Update UI
        const stageDisplay = document.getElementById('stageDisplay');
        const stageIndicator = document.getElementById('stageIndicator');
        
        if (stageDisplay) {
            stageDisplay.textContent = `Current Stage: ${stage.charAt(0).toUpperCase() + stage.slice(1)}`;
        }
        if (stageIndicator) {
            stageIndicator.textContent = `Stage: ${stage.charAt(0).toUpperCase() + stage.slice(1)}`;
        }
        
        // Update progress bar
        this.updateProgressBar();
    }
    
    // Reset progress for the current stage
    resetStageProgress() {
        switch (this.simulationStage) {
            case "incubation":
                this.currentBacteriaLevel = 0;
                this.currentInflammationLevel = 0;
                break;
            case "comedone":
                this.currentBacteriaLevel = this.BACTERIA_THRESHOLD * 0.8;
                this.currentInflammationLevel = this.INFLAMMATION_THRESHOLD * 0.8;
                break;
            case "papule":
                this.currentInflammationLevel = this.INFLAMMATION_THRESHOLD * 0.8;
                this.currentPusLevel = 0;
                break;
            case "pustule":
                this.currentPusLevel = this.PUS_THRESHOLD * 0.8;
                break;
            case "rupture":
                this.currentPusLevel = this.RUPTURE_THRESHOLD * 0.8;
                this.healingProgress = 0;
                break;
            case "healing":
                this.healingProgress = this.HEALING_THRESHOLD * 0.8;
                break;
            case "worsening":
                this.currentBacteriaLevel = this.BACTERIA_THRESHOLD * 0.8;
                this.currentInflammationLevel = this.INFLAMMATION_THRESHOLD * 0.8;
                break;
            case "resolved":
                this.healingProgress = 100;
                break;
        }
    }
    
    // Update the progress bar in the UI
    updateProgressBar() {
        const progressBar = document.getElementById('stageProgress');
        const progressText = document.getElementById('progressText');
        
        if (!progressBar || !progressText) return;
        
        let progress = 0;
        
        switch (this.simulationStage) {
            case "incubation":
                progress = Math.max(
                    (this.currentBacteriaLevel / this.BACTERIA_THRESHOLD) * 100,
                    (this.currentInflammationLevel / this.INFLAMMATION_THRESHOLD) * 100
                );
                break;
            case "comedone":
                progress = (this.currentInflammationLevel / this.INFLAMMATION_THRESHOLD) * 100;
                break;
            case "papule":
                progress = (this.currentPusLevel / this.PUS_THRESHOLD) * 100;
                break;
            case "pustule":
                progress = (this.currentPusLevel / this.RUPTURE_THRESHOLD) * 100;
                break;
            case "rupture":
                // For rupture, we show both healing progress and worsening risk
                const healingPercent = (this.healingProgress / this.HEALING_THRESHOLD) * 100;
                const bacteriaPercent = (this.currentBacteriaLevel / this.BACTERIA_THRESHOLD) * 100;
                const inflammationPercent = (this.currentInflammationLevel / this.BACTERIA_THRESHOLD) * 100;
                
                // Show the higher of healing progress or worsening risk
                progress = Math.max(healingPercent, Math.max(bacteriaPercent, inflammationPercent));
                break;
            case "healing":
                progress = (this.healingProgress / this.RESOLVED_THRESHOLD) * 100;
                break;
            case "worsening":
                // For worsening, show how severe the condition is
                progress = Math.min(
                    (this.currentBacteriaLevel / this.BACTERIA_THRESHOLD) * 100,
                    (this.currentInflammationLevel / this.INFLAMMATION_THRESHOLD) * 100
                );
                break;
            case "resolved":
                progress = 100;
                break;
        }
        
        // Update the UI
        progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }

    // Add method to skip to the next stage
    skipToNextStage() {
        switch (this.simulationStage) {
            case "incubation":
                // Microcomedone formation - starts deep in follicle
                this.currentSebumLevel = this.SEBUM_THRESHOLD + 0.1;
                this.currentBacteriaLevel = 15; // Low initial bacteria in follicle
                this.currentInflammationLevel = 5; // Minimal inflammation
                this.simulationStage = "comedone";
                break;
                
            case "comedone":
                // Visible comedone at surface - whitehead/blackhead forms
                this.currentSebumLevel = 85; // High sebum causing visible plug
                this.currentBacteriaLevel = this.BACTERIA_THRESHOLD + 0.1;
                this.currentInflammationLevel = this.INFLAMMATION_THRESHOLD + 0.1;
                this.currentNeutrophilLevel = 20; // Initial immune response
                // Sebum plug now visible at follicle opening
                this.simulationStage = "papule";
                break;
                
            case "papule":
                // Red inflammatory papule - starts at surface and extends deeper
                this.currentSebumLevel = 90;
                this.currentBacteriaLevel = 75;
                this.currentInflammationLevel = 70; // Significant inflammation
                this.currentNeutrophilLevel = 60; // Strong neutrophil presence
                this.currentPusLevel = this.PUS_THRESHOLD + 0.1; // Pus begins forming
                // Inflammation extends from surface into dermis
                this.simulationStage = "pustule";
                break;
                
            case "pustule":
                // White/yellow pustule head visible at surface
                this.currentSebumLevel = 85;
                this.currentBacteriaLevel = 85;
                this.currentInflammationLevel = 85;
                this.currentNeutrophilLevel = 90; // Peak neutrophil activity
                this.currentPusLevel = this.RUPTURE_THRESHOLD + 0.1;
                // Visible white pustule at surface with deep inflammation
                this.simulationStage = "rupture";
                break;
                
            case "rupture":
                // Follicle wall breaks - contents spread into dermis
                this.currentSebumLevel = 40; // Sebum releases into dermis
                this.currentBacteriaLevel = 95; // Bacteria spread in dermis
                this.currentInflammationLevel = 100; // Maximum inflammation
                this.currentNeutrophilLevel = 100; // Maximum immune response
                this.currentPusLevel = 60; // Pus spreads into surrounding tissue
                this.healingProgress = this.HEALING_THRESHOLD + 0.1;
                // Deep inflammatory response in dermis
                this.simulationStage = "healing";
                break;
                
            case "healing":
                // Inflammation subsides from deep to surface
                this.currentSebumLevel = 30;
                this.currentBacteriaLevel = 30;
                this.currentInflammationLevel = 40;
                this.currentNeutrophilLevel = 30;
                this.currentPusLevel = 10;
                this.healingProgress = this.RESOLVED_THRESHOLD + 0.1;
                // Gradual reduction of inflammation from dermis upward
                this.simulationStage = "resolved";
                break;
                
            case "resolved":
                // Post-inflammatory changes and potential scarring
                this.currentSebumLevel = 20;
                this.currentBacteriaLevel = 10;
                this.currentInflammationLevel = 15;
                this.currentNeutrophilLevel = 5;
                this.currentPusLevel = 0;
                this.healingProgress = 100;
                // Surface changes (pigmentation) and possible dermal scarring
                break;
        }
        
        // Trigger visualization update with anatomical position info
        if (this.onStageChange) {
            const stageInfo = {
                stage: this.simulationStage,
                // Add anatomical position data
                isDeep: ["rupture", "healing"].includes(this.simulationStage),
                isSurface: ["comedone", "papule", "pustule"].includes(this.simulationStage),
                hasVisibleHead: ["comedone", "pustule"].includes(this.simulationStage),
                hasDeepInflammation: ["papule", "pustule", "rupture"].includes(this.simulationStage)
            };
            this.onStageChange(stageInfo);
        }
    }

    // Update simulation parameters based on current stage
    updateParameters() {
        // Advance simulation time
        this.simulationTime += 1/60; // Assuming 60fps
        
        // Calculate derived rates based on slider values
        this.updateDerivedRates();
        
        // Update biological elements based on current state
        this.updateBiologicalState(1/60);
    }
    
    // Update visualization based on current state
    updateVisualization() {
        // Pass current state to visualization
        if (this.visualization) {
            this.visualization.update({
                stage: this.simulationStage,
                bacteriaLevel: this.currentBacteriaLevel,
                inflammationLevel: this.currentInflammationLevel,
                pusLevel: this.currentPusLevel,
                healingProgress: this.healingProgress,
                rotateModel: this.shouldRotateModel
            });
        }
    }
    
    // Update UI elements
    updateUI() {
        // Update parameter displays
        this.updateParameterDisplays();
        
        // Update stage indicator
        if (window.updateCurrentStageDisplay) {
            window.updateCurrentStageDisplay(this.simulationStage);
        }
    }
    
    // Update parameter displays in the UI
    updateParameterDisplays() {
        // Update bacteria level display
        const bacteriaDisplay = document.getElementById('bacteriaLevel');
        if (bacteriaDisplay) {
            bacteriaDisplay.textContent = Math.round(this.currentBacteriaLevel);
        }
        
        // Update inflammation level display
        const inflammationDisplay = document.getElementById('inflammationLevel');
        if (inflammationDisplay) {
            inflammationDisplay.textContent = Math.round(this.currentInflammationLevel);
        }
        
        // Update pus level display
        const pusDisplay = document.getElementById('pusLevel');
        if (pusDisplay) {
            pusDisplay.textContent = Math.round(this.currentPusLevel);
        }
        
        // Update healing progress display
        const healingDisplay = document.getElementById('healingProgress');
        if (healingDisplay) {
            healingDisplay.textContent = Math.round(this.healingProgress);
        }
    }
} 