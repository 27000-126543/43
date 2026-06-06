const SimData = {
    simulationTasks: [],
    notifications: [],
    historicalSimulations: [],
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
            const energy = 1e14 + Math.random() * 1e17;
            const status = i < 2 ? 'completed' : (i < 4 ? statuses[Math.floor(Math.random() * 5)] : statuses[Math.floor(Math.random() * 7)]);
            const zenith = Math.random() * 60;
            
            this.simulationTasks.push({
                id: 'TASK-' + String(1000 + i),
                name: '模拟任务 #' + (i + 1),
                primaryParticle: particles[Math.floor(Math.random() * particles.length)],
                energy: energy,
                zenithAngle: zenith,
                azimuthAngle: Math.random() * 360,
                atmosphereModel: atmospheres[Math.floor(Math.random() * atmospheres.length)],
                observationAltitude: 1200 + Math.random() * 600,
                status: status,
                progress: status === 'completed' ? 100 : Math.floor(Math.random() * 90) + 10,
                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                xmax: 400 + Math.random() * 400,
                totalParticles: Math.floor(1e5 + Math.random() * 1e7),
                muonFraction: 10 + Math.random() * 30,
                emFraction: 60 + Math.random() * 30,
                physicistApproved: status === 'completed',
                engineerApproved: status === 'completed',
                pushedToOptimization: status === 'completed' && Math.random() > 0.3,
                reconstructedEnergy: energy * (0.9 + Math.random() * 0.2),
                triggerEfficiency: 85 + Math.random() * 15,
                reconstructionResolution: 5 + Math.random() * 15,
                deviationAlert: false
            });
        }

        for (let i = 0; i < 8; i++) {
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

    generateShowerData(task) {
        const nPoints = 50;
        const xmax = task.xmax || 600;
        const maxParticles = task.totalParticles || 1e6;
        
        const longitudinal = {
            depth: [],
            particles: [],
            gamma: [],
            muons: [],
            electrons: []
        };
        
        for (let i = 0; i < nPoints; i++) {
            const depth = 100 + (i / (nPoints - 1)) * 1000;
            const gauss = Math.exp(-Math.pow((depth - xmax) / 150, 2));
            longitudinal.depth.push(depth);
            longitudinal.particles.push(Math.floor(maxParticles * gauss));
            longitudinal.gamma.push(Math.floor(maxParticles * gauss * 0.6));
            longitudinal.muons.push(Math.floor(maxParticles * gauss * (task.muonFraction || 20) / 100));
            longitudinal.electrons.push(Math.floor(maxParticles * gauss * (task.emFraction || 70) / 100));
        }

        const lateral = {
            radius: [],
            density: []
        };
        for (let i = 0; i < 30; i++) {
            const r = i * 20;
            lateral.radius.push(r);
            lateral.density.push(Math.floor(maxParticles * Math.exp(-r / 80) / (r + 10)));
        }

        const cherenkov = {
            time: [],
            photons: [],
            radius: [],
            intensity: []
        };
        for (let i = 0; i < 40; i++) {
            const t = i * 2;
            cherenkov.time.push(t);
            cherenkov.photons.push(Math.floor(1e6 * Math.exp(-Math.pow((t - 20) / 15, 2))));
        }
        for (let i = 0; i < 20; i++) {
            const r = i * 25;
            cherenkov.radius.push(r);
            cherenkov.intensity.push(Math.floor(1e5 * Math.exp(-r / 120)));
        }

        return { longitudinal, lateral, cherenkov };
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
        const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        return {
            labels: days,
            completed: [8, 12, 15, 10, 18, 6, 4],
            total: [10, 14, 17, 12, 20, 8, 5],
            alerts: [2, 1, 3, 0, 2, 1, 0]
        };
    },

    getEnergyDistribution() {
        return {
            labels: ['10^14-10^15', '10^15-10^16', '10^16-10^17', '10^17-10^18', '>10^18'],
            data: [25, 35, 20, 15, 5]
        };
    },

    getStatusDistribution() {
        const counts = {
            pending: 0, validating: 0, simulating: 0,
            detecting: 0, reconstructing: 0, completed: 0, rollback: 0
        };
        this.simulationTasks.forEach(t => {
            if (counts[t.status] !== undefined) {
                counts[t.status]++;
            }
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
                if (recent.every(d => d > 10)) {
                    return true;
                }
            }
        }
        return false;
    },

    getRecommendations() {
        return {
            spacing: 120,
            spacingConfidence: 92,
            threshold: 75,
            thresholdConfidence: 88,
            layout: '正三角形',
            coverage: 94,
            expectedResolution: 8.5,
            improvement: 15
        };
    }
};
