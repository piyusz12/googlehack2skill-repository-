/* ============================================
   VenueFlow — Crowd Simulation Engine
   ============================================ */

const CrowdSimulator = (() => {
  // --- Event Phases ---
  const PHASES = [
    { id: 'pre-game',    label: 'Pre-Game',    duration: 30,  minuteStart: -30 },
    { id: 'first-half',  label: '1st Half',    duration: 45,  minuteStart: 0 },
    { id: 'halftime',    label: 'Halftime',    duration: 15,  minuteStart: 45 },
    { id: 'second-half', label: '2nd Half',    duration: 45,  minuteStart: 60 },
    { id: 'post-game',   label: 'Post-Game',   duration: 30,  minuteStart: 105 }
  ];

  // --- Zone Definitions ---
  const ZONES = [
    // Seating Sections
    { id: 'section-A', name: 'Section A', type: 'seating', capacity: 4000, x: 300, y: 80 },
    { id: 'section-B', name: 'Section B', type: 'seating', capacity: 3500, x: 420, y: 60 },
    { id: 'section-C', name: 'Section C', type: 'seating', capacity: 3500, x: 540, y: 80 },
    { id: 'section-D', name: 'Section D', type: 'seating', capacity: 4000, x: 620, y: 140 },
    { id: 'section-E', name: 'Section E', type: 'seating', capacity: 3800, x: 640, y: 230 },
    { id: 'section-F', name: 'Section F', type: 'seating', capacity: 4000, x: 620, y: 320 },
    { id: 'section-G', name: 'Section G', type: 'seating', capacity: 3500, x: 540, y: 380 },
    { id: 'section-H', name: 'Section H', type: 'seating', capacity: 3500, x: 420, y: 400 },
    { id: 'section-I', name: 'Section I', type: 'seating', capacity: 4000, x: 300, y: 380 },
    { id: 'section-J', name: 'Section J', type: 'seating', capacity: 3800, x: 220, y: 320 },
    { id: 'section-K', name: 'Section K', type: 'seating', capacity: 3800, x: 200, y: 230 },
    { id: 'section-L', name: 'Section L', type: 'seating', capacity: 4000, x: 220, y: 140 },
    { id: 'section-M', name: 'Section M', type: 'seating', capacity: 5000, x: 350, y: 170 },
    { id: 'section-N', name: 'Section N', type: 'seating', capacity: 5000, x: 490, y: 290 },

    // Concourses
    { id: 'concourse-N', name: 'North Concourse', type: 'concourse', capacity: 3000, x: 420, y: 30 },
    { id: 'concourse-S', name: 'South Concourse', type: 'concourse', capacity: 3000, x: 420, y: 430 },
    { id: 'concourse-E', name: 'East Concourse',  type: 'concourse', capacity: 2500, x: 670, y: 230 },
    { id: 'concourse-W', name: 'West Concourse',  type: 'concourse', capacity: 2500, x: 170, y: 230 },

    // Gates
    { id: 'gate-1', name: 'Gate 1', type: 'gate', capacity: 800, x: 300, y: 20 },
    { id: 'gate-2', name: 'Gate 2', type: 'gate', capacity: 800, x: 540, y: 20 },
    { id: 'gate-3', name: 'Gate 3', type: 'gate', capacity: 800, x: 700, y: 140 },
    { id: 'gate-4', name: 'Gate 4', type: 'gate', capacity: 800, x: 700, y: 320 },
    { id: 'gate-5', name: 'Gate 5', type: 'gate', capacity: 800, x: 540, y: 440 },
    { id: 'gate-6', name: 'Gate 6', type: 'gate', capacity: 800, x: 300, y: 440 },
    { id: 'gate-7', name: 'Gate 7', type: 'gate', capacity: 800, x: 140, y: 320 },
    { id: 'gate-8', name: 'Gate 8', type: 'gate', capacity: 800, x: 140, y: 140 },

    // Concession Stands
    { id: 'food-1',  name: 'Burger Barn',      type: 'food', capacity: 60, x: 250, y: 50 },
    { id: 'food-2',  name: 'Pizza Palace',     type: 'food', capacity: 50, x: 590, y: 50 },
    { id: 'food-3',  name: 'Hot Dog Haven',    type: 'food', capacity: 55, x: 680, y: 180 },
    { id: 'food-4',  name: 'Taco Town',        type: 'food', capacity: 50, x: 680, y: 280 },
    { id: 'food-5',  name: 'Chicken Coop',     type: 'food', capacity: 60, x: 590, y: 410 },
    { id: 'food-6',  name: 'Snack Shack',      type: 'food', capacity: 45, x: 250, y: 410 },
    { id: 'food-7',  name: 'Nacho Stand',      type: 'food', capacity: 40, x: 160, y: 280 },
    { id: 'food-8',  name: 'Fry Factory',      type: 'food', capacity: 50, x: 160, y: 180 },
    { id: 'food-9',  name: 'Grill House',      type: 'food', capacity: 55, x: 350, y: 30 },
    { id: 'food-10', name: 'Wrap Station',     type: 'food', capacity: 45, x: 490, y: 30 },
    { id: 'food-11', name: 'Smoothie Bar',     type: 'food', capacity: 35, x: 350, y: 430 },
    { id: 'food-12', name: 'Pretzel Point',    type: 'food', capacity: 40, x: 490, y: 430 },

    // Restrooms
    { id: 'restroom-1', name: 'Restroom N1', type: 'restroom', capacity: 30, x: 330, y: 40 },
    { id: 'restroom-2', name: 'Restroom N2', type: 'restroom', capacity: 30, x: 510, y: 40 },
    { id: 'restroom-3', name: 'Restroom E1', type: 'restroom', capacity: 25, x: 690, y: 200 },
    { id: 'restroom-4', name: 'Restroom E2', type: 'restroom', capacity: 25, x: 690, y: 260 },
    { id: 'restroom-5', name: 'Restroom S1', type: 'restroom', capacity: 30, x: 330, y: 420 },
    { id: 'restroom-6', name: 'Restroom S2', type: 'restroom', capacity: 30, x: 510, y: 420 },
    { id: 'restroom-7', name: 'Restroom W1', type: 'restroom', capacity: 25, x: 150, y: 200 },
    { id: 'restroom-8', name: 'Restroom W2', type: 'restroom', capacity: 25, x: 150, y: 260 },

    // Merchandise
    { id: 'merch-1', name: 'Team Store N', type: 'merchandise', capacity: 80, x: 420, y: 15 },
    { id: 'merch-2', name: 'Team Store E', type: 'merchandise', capacity: 60, x: 710, y: 230 },
    { id: 'merch-3', name: 'Team Store S', type: 'merchandise', capacity: 80, x: 420, y: 445 },
    { id: 'merch-4', name: 'Team Store W', type: 'merchandise', capacity: 60, x: 130, y: 230 },
  ];

  let currentPhaseIndex = 0;
  let phaseElapsed = 0; // seconds elapsed in current phase
  let matchMinute = -30;
  let simulationInterval = null;
  let zoneData = {};
  let previousDensities = {};

  // --- Phase-based density profiles ---
  function getBaselineDensity(zone, phase) {
    const profiles = {
      'pre-game': {
        seating: () => Utils.randomBetween(5, 35),
        concourse: () => Utils.randomBetween(40, 75),
        gate: () => Utils.randomBetween(50, 90),
        food: () => Utils.randomBetween(20, 45),
        restroom: () => Utils.randomBetween(15, 35),
        merchandise: () => Utils.randomBetween(30, 65),
      },
      'first-half': {
        seating: () => Utils.randomBetween(70, 95),
        concourse: () => Utils.randomBetween(10, 30),
        gate: () => Utils.randomBetween(5, 20),
        food: () => Utils.randomBetween(15, 40),
        restroom: () => Utils.randomBetween(20, 40),
        merchandise: () => Utils.randomBetween(10, 25),
      },
      'halftime': {
        seating: () => Utils.randomBetween(40, 65),
        concourse: () => Utils.randomBetween(65, 95),
        gate: () => Utils.randomBetween(10, 25),
        food: () => Utils.randomBetween(70, 98),
        restroom: () => Utils.randomBetween(70, 95),
        merchandise: () => Utils.randomBetween(45, 75),
      },
      'second-half': {
        seating: () => Utils.randomBetween(60, 90),
        concourse: () => Utils.randomBetween(15, 35),
        gate: () => Utils.randomBetween(10, 30),
        food: () => Utils.randomBetween(20, 45),
        restroom: () => Utils.randomBetween(25, 45),
        merchandise: () => Utils.randomBetween(10, 30),
      },
      'post-game': {
        seating: () => Utils.randomBetween(10, 40),
        concourse: () => Utils.randomBetween(60, 90),
        gate: () => Utils.randomBetween(70, 98),
        food: () => Utils.randomBetween(10, 30),
        restroom: () => Utils.randomBetween(30, 55),
        merchandise: () => Utils.randomBetween(20, 50),
      }
    };

    const phaseProfile = profiles[phase];
    if (phaseProfile && phaseProfile[zone.type]) {
      return phaseProfile[zone.type]();
    }
    return Utils.randomBetween(20, 60);
  }

  function initZones() {
    const phase = PHASES[currentPhaseIndex].id;
    ZONES.forEach(zone => {
      const density = getBaselineDensity(zone, phase);
      zoneData[zone.id] = {
        ...zone,
        density: density,
        targetDensity: density,
        occupancy: Math.round((density / 100) * zone.capacity),
        trend: 0,
        waitTime: zone.type === 'food' || zone.type === 'restroom' || zone.type === 'merchandise'
          ? calculateWaitTime(zone.type, density) : 0,
      };
      previousDensities[zone.id] = density;
    });
  }

  function calculateWaitTime(type, density) {
    const baseWait = { food: 12, restroom: 8, merchandise: 6 };
    const base = baseWait[type] || 5;
    return Math.max(1, Math.round(base * (density / 100) * Utils.randomBetween(0.7, 1.3)));
  }

  function tick() {
    const phase = PHASES[currentPhaseIndex];
    phaseElapsed += 3;

    // Advance match minute
    matchMinute = phase.minuteStart + Math.floor((phaseElapsed / (phase.duration * 60)) * phase.duration);

    // Check phase transition
    if (phaseElapsed >= phase.duration * 60 && currentPhaseIndex < PHASES.length - 1) {
      currentPhaseIndex++;
      phaseElapsed = 0;
      Utils.emit('phaseChange', PHASES[currentPhaseIndex]);
    }

    // Update each zone
    const currentPhase = PHASES[currentPhaseIndex].id;
    ZONES.forEach(zone => {
      const data = zoneData[zone.id];
      const prev = previousDensities[zone.id];

      // Generate new target occasionally
      if (Math.random() < 0.3) {
        data.targetDensity = getBaselineDensity(zone, currentPhase);
      }

      // Smooth interpolation toward target
      data.density = Utils.lerp(data.density, data.targetDensity, 0.15);

      // Add small random noise
      data.density = Utils.clamp(data.density + Utils.randomBetween(-3, 3), 0, 100);

      // Calculate trend
      data.trend = data.density - prev;
      previousDensities[zone.id] = data.density;

      // Update occupancy
      data.occupancy = Math.round((data.density / 100) * zone.capacity);

      // Update wait time for facilities
      if (['food', 'restroom', 'merchandise'].includes(zone.type)) {
        data.waitTime = calculateWaitTime(zone.type, data.density);
      }
    });

    // Emit updates
    Utils.emit('crowdUpdate', {
      zones: zoneData,
      phase: PHASES[currentPhaseIndex],
      phaseIndex: currentPhaseIndex,
      matchMinute: matchMinute,
      phaseProgress: phaseElapsed / (PHASES[currentPhaseIndex].duration * 60),
    });
  }

  function start() {
    initZones();
    tick();
    simulationInterval = setInterval(tick, 3000);
  }

  function stop() {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
  }

  function getZones() { return ZONES; }
  function getZoneData() { return zoneData; }
  function getCurrentPhase() { return PHASES[currentPhaseIndex]; }
  function getPhases() { return PHASES; }
  function getMatchMinute() { return matchMinute; }

  function getStats() {
    const allDensities = Object.values(zoneData).map(z => z.density);
    const totalAttendees = Object.values(zoneData)
      .filter(z => z.type === 'seating')
      .reduce((sum, z) => sum + z.occupancy, 0);
    const avgDensity = allDensities.reduce((a, b) => a + b, 0) / allDensities.length;
    const hotSpots = Object.values(zoneData).filter(z => z.density > 80).length;
    const avgWait = Object.values(zoneData)
      .filter(z => z.waitTime > 0)
      .reduce((sum, z, _, arr) => sum + z.waitTime / arr.length, 0);

    return {
      totalAttendees: Math.round(totalAttendees),
      avgDensity: Math.round(avgDensity),
      hotSpots,
      avgWait: Math.round(avgWait),
    };
  }

  return {
    start, stop, getZones, getZoneData, getCurrentPhase, getPhases,
    getMatchMinute, getStats, PHASES, ZONES,
  };
})();
