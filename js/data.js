const PhysicsModels = {
    ATMOSPHERE_MODELS: {
        US76: {
            name: 'US Standard Atmosphere 1976',
            h0: 6.3e5,
            h: [0, 11, 20, 32, 47, 51, 71, 85],
            rho: [1.225, 0.364, 0.088, 0.014, 0.002, 0.001, 0.0004, 0.00008],
            t: [288.15, 216.65, 216.65, 228.65, 270.65, 270.65, 214.65, 186.87]
        },
        Linsley: {
            name: 'Linsley Atmosphere',
            h0: 6.8e5,
            h: [0, 5, 10, 15, 20, 25, 30, 40, 50],
            rho: [1.225, 0.736, 0.414, 0.194, 0.089, 0.040, 0.018, 0.004, 0.001],
            t: [288.15, 255.65, 223.25, 203.65, 216.65, 221.55, 226.51, 250.35, 270.65]
        },
        MSIS: {
            name: 'MSIS-E-90',
            h0: 7.0e5,
            h: [0, 10, 20, 30, 40, 50, 60, 70, 80, 100],
            rho: [1.225, 0.413, 0.088, 0.018, 0.004, 0.001, 0.0003, 0.00008, 0.00002, 0.0000005],
            t: [288.15, 223.25, 216.65, 226.51, 250.35, 270.65, 247.02, 219.59, 198.64, 210.65]
        }
    },

    PARTICLE_PARAMS: {
        proton: { mass: 0.938, charge: 1, lambda: 106.5, A: 1, name: 'Proton' },
        gamma: { mass: 0, charge: 0, lambda: 97.8, A: 0, name: 'Gamma' },
        helium: { mass: 3.727, charge: 2, lambda: 94.9, A: 4, name: 'Helium' },
        iron: { mass: 52.103, charge: 26, lambda: 83.0, A: 56, name: 'Iron' }
    },

    MOLIERE_RADIUS: 79.0,

    altitudeToDepth(altitude_m, modelKey) {
        const model = this.ATMOSPHERE_MODELS[modelKey] || this.ATMOSPHERE_MODELS.US76;
        const h_km = altitude_m / 1000;
        let totalDepth = 0;
        for (let i = 0; i < model.h.length - 1; i++) {
            const h1 = model.h[i];
            const h2 = model.h[i + 1];
            if (h_km <= h1) break;
            const segEnd = Math.min(h_km, h2);
            const rho1 = model.rho[i];
            const rho2 = model.rho[i + 1];
            const avgRho = (rho1 + rho2) / 2;
            totalDepth += avgRho * (segEnd - h1) * 1e5;
        }
        if (h_km > model.h[model.h.length - 1]) {
            const lastRho = model.rho[model.rho.length - 1];
            totalDepth += lastRho * (h_km - model.h[model.h.length - 1]) * 1e5;
        }
        return Math.max(0, totalDepth);
    },

    gaisserHillas(X, E0, primaryType, zenithAngle_deg, observationAltitude, modelKey) {
        const X0 = this.altitudeToDepth(observationAltitude || 1400, modelKey);
        const zenithRad = (zenithAngle_deg || 0) * Math.PI / 180;
        const secZenith = Math.cos(zenithRad) > 0 ? 1 / Math.cos(zenithRad) : 1;
        
        const params = this.PARTICLE_PARAMS[primaryType] || this.PARTICLE_PARAMS.proton;
        const lnE = Math.log(E0 / 1e9);

        let Xmax_mean, lambda, X0_param;
        
        if (primaryType === 'gamma') {
            Xmax_mean = 400 + 88 * lnE;
            lambda = 68.5;
            X0_param = 0;
        } else if (primaryType === 'proton') {
            Xmax_mean = 790 + 54 * lnE;
            lambda = 62.5;
            X0_param = -5;
        } else if (primaryType === 'helium') {
            Xmax_mean = 680 + 54 * lnE;
            lambda = 58.8;
            X0_param = -3;
        } else {
            Xmax_mean = 550 + 54 * lnE;
            lambda = 54.0;
            X0_param = -1;
        }

        Xmax_mean *= secZenith;
        const Xmax = Xmax_mean;

        const Nmax = E0 * 1e9 / (lambda * 1.6);
        
        const r = (X - X0_param) / (Xmax - X0_param);
        const exponent = Xmax > X0_param ? (Xmax - X0_param) / lambda : 1;
        
        let dNdX;
        if (X < 0) {
            dNdX = 0;
        } else if (Math.abs(X - Xmax) < 1e-6) {
            dNdX = Nmax;
        } else {
            const term1 = Math.pow(r, exponent);
            const term2 = Math.exp(exponent * (1 - r));
            dNdX = Nmax * term1 * term2;
        }

        if (isNaN(dNdX) || !isFinite(dNdX)) dNdX = 0;

        return {
            dNdX: Math.max(0, dNdX),
            Xmax: Xmax,
            Nmax: Math.max(0, Nmax),
            lambda: lambda,
            X0: X0_param,
            secZenith: secZenith
        };
    },

    computeLongitudinalDevelopment(E0, primaryType, zenithAngle, observationAltitude, modelKey) {
        const result = {
            depth: [], particles: [], gamma: [], muons: [], electrons: [],
            Xmax: 0, Nmax: 0, totalParticles: 0,
            muonFraction: 0, emFraction: 0
        };

        const params = this.PARTICLE_PARAMS[primaryType] || this.PARTICLE_PARAMS.proton;
        const nPoints = 80;
        let maxVal = 0;
        let maxIdx = 0;

        for (let i = 0; i < nPoints; i++) {
            const X = 0 + (i / (nPoints - 1)) * 1400;
            const gh = this.gaisserHillas(X, E0, primaryType, zenithAngle, observationAltitude, modelKey);
            
            result.depth.push(X);
            
            let n_gamma, n_e, n_mu;
            if (primaryType === 'gamma') {
                n_gamma = gh.dNdX * 0.85;
                n_e = gh.dNdX * 0.14;
                n_mu = gh.dNdX * 0.01;
            } else if (primaryType === 'proton') {
                n_gamma = gh.dNdX * 0.5;
                n_e = gh.dNdX * 0.2;
                n_mu = gh.dNdX * 0.3;
            } else if (primaryType === 'helium') {
                n_gamma = gh.dNdX * 0.45;
                n_e = gh.dNdX * 0.18;
                n_mu = gh.dNdX * 0.37;
            } else {
                n_gamma = gh.dNdX * 0.35;
                n_e = gh.dNdX * 0.15;
                n_mu = gh.dNdX * 0.50;
            }

            result.particles.push(Math.floor(gh.dNdX));
            result.gamma.push(Math.floor(n_gamma));
            result.muons.push(Math.floor(n_mu));
            result.electrons.push(Math.floor(n_e));

            if (gh.dNdX > maxVal) {
                maxVal = gh.dNdX;
                maxIdx = i;
            }
        }

        result.Xmax = gh_result_Xmax(E0, primaryType, zenithAngle, observationAltitude, modelKey);
        result.Nmax = Math.floor(maxVal);
        
        const obsDepth = this.altitudeToDepth(observationAltitude, modelKey);
        let groundParticles = 0;
        for (let i = 0; i < result.depth.length; i++) {
            if (result.depth[i] >= obsDepth - 10 && result.depth[i] <= obsDepth + 10) {
                groundParticles += result.particles[i];
            }
        }
        if (groundParticles === 0) {
            groundParticles = result.particles[Math.min(result.particles.length - 1, Math.floor(obsDepth / 1400 * nPoints))];
        }
        result.totalParticles = Math.max(1000, Math.floor(groundParticles));

        const totalAtGround = result.gamma[maxIdx] + result.muons[maxIdx] + result.electrons[maxIdx] || 1;
        result.muonFraction = Math.min(80, Math.max(1, (result.muons[maxIdx] / totalAtGround * 100)));
        result.emFraction = Math.min(98, Math.max(10, ((result.gamma[maxIdx] + result.electrons[maxIdx]) / totalAtGround * 100)));

        return result;
    },

    nkgLateralDistribution(r_m, E0, primaryType, zenithAngle, observationAltitude, modelKey) {
        const r_M = this.MOLIERE_RADIUS;
        const ageParam = this.computeShowerAge(E0, primaryType, observationAltitude, modelKey);
        
        const s = Math.max(0.5, Math.min(2.0, ageParam));
        const r = r_m / r_M;
        
        const C_s = (Math.log(570) / Math.log(350)) * 
                    Math.pow(0.0835 * Math.log(200), s) /
                    (Math.pow(Math.log(200), 0.18));
        
        let rho;
        if (r <= 0) {
            rho = Infinity;
        } else {
            rho = C_s * Math.pow(r, s - 2) * Math.pow(1 + r, s - 4.5);
        }
        
        if (isNaN(rho) || !isFinite(rho)) rho = 0;
        
        return rho;
    },

    computeShowerAge(E0, primaryType, zenithAngle, observationAltitude, modelKey) {
        const X_obs = this.altitudeToDepth(observationAltitude || 1400, modelKey);
        const Xmax = gh_result_Xmax(E0, primaryType, zenithAngle || 0, observationAltitude, modelKey);
        const lambda = this.PARTICLE_PARAMS[primaryType] ? 
            (primaryType === 'gamma' ? 68.5 : 62.5) : 62.5;
        return 3.0 * X_obs / (X_obs + 2 * Xmax);
    },

    computeLateralDistribution(E0, primaryType, zenithAngle, observationAltitude, modelKey, totalParticles) {
        const result = { radius: [], density: [] };
        const nPoints = 40;
        const maxRadius = 1000;
        
        let totalInt = 0;
        const tempDensities = [];
        
        for (let i = 0; i < nPoints; i++) {
            const r = (i / (nPoints - 1)) * maxRadius;
            const rho = this.nkgLateralDistribution(r, E0, primaryType, zenithAngle, observationAltitude, modelKey);
            tempDensities.push({ r, rho });
            if (r > 0) totalInt += rho * 2 * Math.PI * r * (maxRadius / nPoints);
        }
        
        const normFactor = totalParticles / Math.max(1, totalInt);
        
        for (let i = 0; i < nPoints; i++) {
            result.radius.push(tempDensities[i].r);
            const density = tempDensities[i].rho * normFactor;
            result.density.push(isFinite(density) ? Math.floor(density) : 0);
        }
        
        return result;
    },

    cherenkovThreshold(particleMass_GeV, altitude_m, modelKey) {
        const model = this.ATMOSPHERE_MODELS[modelKey] || this.ATMOSPHERE_MODELS.US76;
        const h_km = altitude_m / 1000;
        
        let rho = 0;
        for (let i = 0; i < model.h.length - 1; i++) {
            if (h_km >= model.h[i] && h_km <= model.h[i + 1]) {
                const t = (h_km - model.h[i]) / (model.h[i + 1] - model.h[i]);
                rho = model.rho[i] * (1 - t) + model.rho[i + 1] * t;
                break;
            }
        }
        if (rho === 0) rho = model.rho[model.rho.length - 1];
        
        const n = 1 + 2.93e-4 * (rho / 1.225);
        const beta_min = 1 / n;
        const gamma_min = 1 / Math.sqrt(1 - beta_min * beta_min);
        const E_threshold = particleMass_GeV * gamma_min;
        
        return { n_refractive: n, beta_min, gamma_min, E_threshold_GeV: E_threshold, rho };
    },

    cherenkovAngle(particleEnergy_GeV, particleMass_GeV, altitude_m, modelKey) {
        const ct = this.cherenkovThreshold(particleMass_GeV, altitude_m, modelKey);
        if (particleEnergy_GeV < ct.E_threshold_GeV) {
            return { angle_rad: 0, angle_deg: 0, yield_per_m: 0, ...ct };
        }
        const gamma = particleEnergy_GeV / particleMass_GeV;
        const beta = Math.sqrt(1 - 1 / (gamma * gamma));
        const cosTheta = 1 / (beta * ct.n_refractive);
        
        if (cosTheta > 1 || cosTheta < -1) {
            return { angle_rad: 0, angle_deg: 0, yield_per_m: 0, ...ct };
        }
        
        const theta = Math.acos(cosTheta);
        const yield_per_m = 370 * Math.sin(theta) * Math.sin(theta);
        
        return {
            angle_rad: theta,
            angle_deg: theta * 180 / Math.PI,
            yield_per_m: yield_per_m,
            ...ct
        };
    },

    computeCherenkovDistribution(E0, primaryType, zenithAngle, observationAltitude, modelKey, Xmax, totalParticles) {
        const time = [];
        const photons = [];
        const radius = [];
        const intensity = [];
        
        const zenithRad = zenithAngle * Math.PI / 180;
        const ct_obs = this.cherenkovThreshold(0.000511, observationAltitude, modelKey);
        
        const c = 3e8;
        const nT = 50;
        for (let i = 0; i < nT; i++) {
            const t_ns = i * 1.5;
            const r_core = c * 1e-9 * t_ns * Math.sin(ct_obs.angle_rad || 0.02);
            
            const t_peak = 25;
            const sigma = 18;
            const gaussian = Math.exp(-Math.pow((t_ns - t_peak) / sigma, 2));
            
            const E_vis = Math.log10(E0);
            const n_photons = Math.floor(totalParticles * 20 * gaussian * (1 + 0.01 * E_vis));
            
            time.push(t_ns);
            photons.push(Math.max(0, n_photons));
        }

        const nR = 30;
        const maxR = 600;
        for (let i = 0; i < nR; i++) {
            const r = (i / (nR - 1)) * maxR;
            
            const r0 = 120;
            const lateral = Math.exp(-r / r0) * (1 + 0.05 * r / r0);
            const n_pe = Math.floor(totalParticles * 0.5 * lateral);
            
            radius.push(r);
            intensity.push(Math.max(0, n_pe));
        }

        return { time, photons, radius, intensity };
    }
};

function gh_result_Xmax(E0, primaryType, zenithAngle, observationAltitude, modelKey) {
    const zenithRad = (zenithAngle || 0) * Math.PI / 180;
    const secZenith = Math.cos(zenithRad) > 0 ? 1 / Math.cos(zenithRad) : 1;
    const lnE = Math.log(E0 / 1e9);
    let Xmax_mean;
    if (primaryType === 'gamma') Xmax_mean = 400 + 88 * lnE;
    else if (primaryType === 'proton') Xmax_mean = 790 + 54 * lnE;
    else if (primaryType === 'helium') Xmax_mean = 680 + 54 * lnE;
    else Xmax_mean = 550 + 54 * lnE;
    return Xmax_mean * secZenith;
}

const SimData = {
    simulationTasks: [],
    notifications: [],
    reports: [],
    
    init() {
        this.loadFromStorage();
        if (this.simulationTasks.length === 0) {
            this.generateMockData();
        }
    },

    loadFromStorage() {
        try {
            const tasks = localStorage.getItem('cosmicRayTasks');
            const notifs = localStorage.getItem('cosmicRayNotifications');
            const reports = localStorage.getItem('cosmicRayReports');
            if (tasks) this.simulationTasks = JSON.parse(tasks);
            if (notifs) this.notifications = JSON.parse(notifs);
            if (reports) this.reports = JSON.parse(reports);
        } catch (e) {
            console.error('加载数据失败:', e);
        }
    },

    saveToStorage() {
        localStorage.setItem('cosmicRayTasks', JSON.stringify(this.simulationTasks));
        localStorage.setItem('cosmicRayNotifications', JSON.stringify(this.notifications));
        localStorage.setItem('cosmicRayReports', JSON.stringify(this.reports));
    },

    generateMockData() {
        const particles = ['proton', 'gamma', 'iron', 'helium'];
        const statuses = ['pending', 'validating', 'simulating', 'detecting', 'reconstructing', 'completed', 'rollback'];
        const atmospheres = ['US76', 'Linsley', 'MSIS'];
        
        for (let i = 0; i < 12; i++) {
            const energy = Math.pow(10, 14 + Math.random() * 4);
            const status = i < 2 ? 'completed' : (i < 4 ? statuses[Math.floor(Math.random() * 5)] : statuses[Math.floor(Math.random() * 7)]);
            const zenith = Math.random() * 60;
            const primary = particles[Math.floor(Math.random() * particles.length)];
            const atmo = atmospheres[Math.floor(Math.random() * atmospheres.length)];
            const altitude = 1200 + Math.random() * 600;
            
            const longitudinal = PhysicsModels.computeLongitudinalDevelopment(energy, primary, zenith, altitude, atmo);
            const lateral = PhysicsModels.computeLateralDistribution(energy, primary, zenith, altitude, atmo, longitudinal.totalParticles);
            const cherenkov = PhysicsModels.computeCherenkovDistribution(energy, primary, zenith, altitude, atmo, longitudinal.Xmax, longitudinal.totalParticles);
            
            const reconstructed = energy * (0.9 + Math.random() * 0.2);
            
            this.simulationTasks.push({
                id: 'TASK-' + String(1000 + i),
                name: '模拟任务 #' + (i + 1),
                primaryParticle: primary,
                energy: energy,
                zenithAngle: zenith,
                azimuthAngle: Math.random() * 360,
                atmosphereModel: atmo,
                observationAltitude: altitude,
                status: status,
                progress: status === 'completed' ? 100 : Math.floor(Math.random() * 90) + 10,
                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                xmax: longitudinal.Xmax,
                totalParticles: longitudinal.totalParticles,
                muonFraction: longitudinal.muonFraction,
                emFraction: longitudinal.emFraction,
                physicistApproved: status === 'completed',
                engineerApproved: status === 'completed',
                pushedToOptimization: status === 'completed' && Math.random() > 0.3,
                reconstructedEnergy: reconstructed,
                reconstructionResolution: Math.abs(energy - reconstructed) / energy * 100,
                triggerEfficiency: 85 + Math.random() * 15,
                deviationAlert: false,
                showerData: { longitudinal, lateral, cherenkov }
            });
        }

        for (let i = 0; i < 5; i++) {
            const types = ['纵向发展报告', '横向分布报告', '综合分析报告', '切伦科夫光报告'];
            this.reports.push({
                id: 'REPORT-' + String(2000 + i),
                title: types[i % types.length] + ' #' + (i + 1),
                taskId: 'TASK-' + String(1000 + (i % 10)),
                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                type: ['comprehensive', 'longitudinal', 'lateral', 'cherenkov'][i % 4],
                fileSize: (Math.random() * 5 + 1).toFixed(2) + ' MB'
            });
        }

        this.saveToStorage();
    },

    addTask(task) {
        this.simulationTasks.unshift(task);
        this.saveToStorage();
    },

    updateTask(taskId, updates) {
        const idx = this.simulationTasks.findIndex(t => t.id === taskId);
        if (idx !== -1) {
            this.simulationTasks[idx] = Object.assign({}, this.simulationTasks[idx], updates);
            this.saveToStorage();
            return this.simulationTasks[idx];
        }
        return null;
    },

    getTaskById(taskId) {
        return this.simulationTasks.find(t => t.id === taskId);
    },

    addNotification(notification) {
        this.notifications.unshift(Object.assign({
            id: 'NOTIF-' + Date.now(),
            timestamp: new Date().toISOString()
        }, notification));
        this.saveToStorage();
    },

    addReport(report) {
        this.reports.unshift(report);
        this.saveToStorage();
    },

    runFullSimulation(params) {
        const { energy, primaryParticle, zenithAngle, azimuthAngle, atmosphereModel, observationAltitude } = params;
        
        const longitudinal = PhysicsModels.computeLongitudinalDevelopment(
            energy, primaryParticle, zenithAngle, observationAltitude, atmosphereModel
        );
        
        const lateral = PhysicsModels.computeLateralDistribution(
            energy, primaryParticle, zenithAngle, observationAltitude, atmosphereModel, longitudinal.totalParticles
        );
        
        const cherenkov = PhysicsModels.computeCherenkovDistribution(
            energy, primaryParticle, zenithAngle, observationAltitude, atmosphereModel, 
            longitudinal.Xmax, longitudinal.totalParticles
        );
        
        const recoFactor = 0.92 + Math.random() * 0.16;
        const reconstructedEnergy = energy * recoFactor;
        
        return {
            xmax: longitudinal.Xmax,
            totalParticles: longitudinal.totalParticles,
            muonFraction: longitudinal.muonFraction,
            emFraction: longitudinal.emFraction,
            reconstructedEnergy: reconstructedEnergy,
            reconstructionResolution: Math.abs(1 - recoFactor) * 100,
            triggerEfficiency: 82 + Math.random() * 16,
            showerData: { longitudinal, lateral, cherenkov }
        };
    },

    getDailyStats() {
        const completed = this.simulationTasks.filter(t => t.status === 'completed').length;
        const total = this.simulationTasks.length;
        const reconstructedTasks = this.simulationTasks.filter(t => t.reconstructionResolution);
        const triggeredTasks = this.simulationTasks.filter(t => t.triggerEfficiency);
        
        const avgResolution = reconstructedTasks.length > 0
            ? reconstructedTasks.reduce((sum, t) => sum + (100 - t.reconstructionResolution), 0) / reconstructedTasks.length
            : 0;
        
        const avgTriggerEff = triggeredTasks.length > 0
            ? triggeredTasks.reduce((sum, t) => sum + t.triggerEfficiency, 0) / triggeredTasks.length
            : 0;

        return {
            totalTasks: total,
            completionRate: total > 0 ? Math.round(completed / total * 100) : 0,
            resolution: Math.round(avgResolution),
            triggerEfficiency: Math.round(avgTriggerEff),
            alertCount: this.notifications.filter(n => n.level !== 'info').length,
            pendingApproval: this.simulationTasks.filter(t => 
                t.status === 'completed' && (!t.physicistApproved || !t.engineerApproved)
            ).length
        };
    },

    getTrendData() {
        return {
            labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
            completed: [8, 12, 15, 10, 18, 6, 4],
            total: [10, 14, 17, 12, 20, 8, 5],
            alerts: [2, 1, 3, 0, 2, 1, 0]
        };
    },

    getEnergyDistribution() {
        const bins = { '14-15': 0, '15-16': 0, '16-17': 0, '17-18': 0, '>18': 0 };
        this.simulationTasks.forEach(t => {
            const logE = Math.log10(t.energy);
            if (logE >= 14 && logE < 15) bins['14-15']++;
            else if (logE >= 15 && logE < 16) bins['15-16']++;
            else if (logE >= 16 && logE < 17) bins['16-17']++;
            else if (logE >= 17 && logE < 18) bins['17-18']++;
            else if (logE >= 18) bins['>18']++;
        });
        return {
            labels: ['10^14-10^15', '10^15-10^16', '10^16-10^17', '10^17-10^18', '>10^18'],
            data: Object.values(bins)
        };
    },

    getStatusDistribution() {
        const counts = {
            pending: 0, validating: 0, simulating: 0,
            detecting: 0, reconstructing: 0, completed: 0, rollback: 0
        };
        this.simulationTasks.forEach(t => {
            if (counts[t.status] !== undefined) counts[t.status]++;
        });
        return counts;
    },

    checkDeviationAlert() {
        const energyBins = {};
        this.simulationTasks.forEach(t => {
            if (t.energy && t.reconstructedEnergy && t.status === 'completed') {
                const bin = Math.floor(Math.log10(t.energy));
                if (!energyBins[bin]) energyBins[bin] = [];
                const deviation = Math.abs(t.energy - t.reconstructedEnergy) / t.energy * 100;
                energyBins[bin].push(deviation);
            }
        });
        for (const bin in energyBins) {
            const deviations = energyBins[bin];
            if (deviations.length >= 3) {
                const recent = deviations.slice(-3);
                if (recent.every(d => d > 10)) return true;
            }
        }
        return false;
    },

    getRecommendations() {
        let avgSpacing = 120;
        let avgThresh = 75;
        let count = 0;
        this.simulationTasks.forEach(t => {
            if (t.status === 'completed' && t.triggerEfficiency) {
                const effWeight = t.triggerEfficiency / 100;
                const optimalSpacing = 80 + (1 - effWeight) * 80;
                const optimalThresh = 50 + effWeight * 50;
                avgSpacing += optimalSpacing;
                avgThresh += optimalThresh;
                count++;
            }
        });
        if (count > 0) {
            avgSpacing = avgSpacing / (count + 1);
            avgThresh = avgThresh / (count + 1);
        }
        return {
            spacing: Math.round(avgSpacing),
            spacingConfidence: 85 + Math.round(Math.random() * 10),
            threshold: Math.round(avgThresh),
            thresholdConfidence: 82 + Math.round(Math.random() * 10),
            layout: '正三角形',
            coverage: 90 + Math.round(Math.random() * 8),
            expectedResolution: (6 + Math.random() * 4).toFixed(1),
            improvement: Math.round(8 + Math.random() * 12)
        };
    }
};
