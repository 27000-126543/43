const MonitorModule = {
    currentTaskId: null,
    charts: {},
    autoRefreshInterval: null,

    init() {
        const select = document.getElementById('monitorTaskSelect');
        const autoRefresh = document.getElementById('autoRefresh');
        
        if (select) {
            select.addEventListener('change', function(e) {
                this.currentTaskId = e.target.value;
                this.refreshAll();
            }.bind(this));
        }

        if (autoRefresh) {
            autoRefresh.addEventListener('change', function(e) {
                if (e.target.checked) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            }.bind(this));
        }

        document.querySelectorAll('.alert-dismiss').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var alertType = btn.getAttribute('data-alert');
                var el = document.getElementById(alertType + 'Alert');
                if (el) el.classList.add('hidden');
            });
        });

        this.initCharts();
        this.refreshAll();
        this.startAutoRefresh();
    },

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.autoRefreshInterval = setInterval(function() {
            var checkbox = document.getElementById('autoRefresh');
            if (checkbox && checkbox.checked) {
                MonitorModule.updateMetrics();
                MonitorModule.updateCharts();
                MonitorModule.updateAlerts();
            }
        }, 2000);
    },

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    },

    refreshAll() {
        this.updateMetrics();
        this.updateCharts();
        this.updateAlerts();
    },

    getCurrentTask() {
        if (this.currentTaskId) {
            var t = SimData.getTaskById(this.currentTaskId);
            if (t) return t;
        }
        var simulating = SimData.simulationTasks.find(function(t) { return t.status === 'simulating'; });
        if (simulating) return simulating;
        var active = SimData.simulationTasks.find(function(t) { return t.status !== 'pending' && t.status !== 'completed'; });
        if (active) return active;
        return SimData.simulationTasks[0] || null;
    },

    updateMetrics() {
        var task = this.getCurrentTask();
        if (!task) return;

        var xmaxVal = document.getElementById('xmaxValue');
        var xmaxBar = document.getElementById('xmaxBar');
        var xmaxThresholdLine = document.getElementById('xmaxThresholdLine');
        var xmaxThreshold = parseFloat(document.getElementById('xmaxThreshold')?.value) || 800;
        
        if (xmaxVal && task.xmax) {
            xmaxVal.textContent = task.xmax.toFixed(1);
            var pct = Math.min(100, (task.xmax / 1200) * 100);
            xmaxBar.style.width = pct + '%';
            var thresholdPct = (xmaxThreshold / 1200) * 100;
            xmaxThresholdLine.style.left = thresholdPct + '%';
        }

        var particlesEl = document.getElementById('totalParticles');
        var particleBar = document.getElementById('particleBar');
        if (particlesEl && task.totalParticles) {
            particlesEl.textContent = task.totalParticles.toExponential(2);
            particleBar.style.width = Math.min(100, Math.log10(task.totalParticles) / 8 * 100) + '%';
        }

        var muonEl = document.getElementById('muonFraction');
        var muonBar = document.getElementById('muonBar');
        if (muonEl && task.muonFraction) {
            muonEl.textContent = task.muonFraction.toFixed(1);
            muonBar.style.width = Math.min(100, task.muonFraction * 2) + '%';
        }

        var emEl = document.getElementById('emFraction');
        var emBar = document.getElementById('emBar');
        if (emEl && task.emFraction) {
            emEl.textContent = task.emFraction.toFixed(1);
            emBar.style.width = Math.min(100, task.emFraction) + '%';
        }
    },

    initCharts() {
        var chartDefaults = {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: '#b0bec5', font: { size: 11 } }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#78909c', font: { size: 10 } },
                    grid: { color: 'rgba(55, 64, 133, 0.3)' }
                },
                y: {
                    ticks: { color: '#78909c', font: { size: 10 } },
                    grid: { color: 'rgba(55, 64, 133, 0.3)' }
                }
            }
        };

        var longitudinalCtx = document.getElementById('longitudinalChart');
        if (longitudinalCtx) {
            this.charts.longitudinal = new Chart(longitudinalCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        { label: '总粒子数', data: [], borderColor: '#64b5f6', backgroundColor: 'rgba(100, 181, 246, 0.1)', fill: true, tension: 0.4, borderWidth: 2 },
                        { label: 'γ 射线', data: [], borderColor: '#ba68c8', backgroundColor: 'rgba(186, 104, 200, 0.1)', fill: true, tension: 0.4, borderWidth: 2 },
                        { label: 'μ 子', data: [], borderColor: '#ffb74d', backgroundColor: 'rgba(255, 183, 77, 0.1)', fill: true, tension: 0.4, borderWidth: 2 },
                        { label: '电子', data: [], borderColor: '#81c784', backgroundColor: 'rgba(129, 199, 132, 0.1)', fill: true, tension: 0.4, borderWidth: 2 }
                    ]
                },
                options: Object.assign({}, chartDefaults, {
                    scales: {
                        x: Object.assign({}, chartDefaults.scales.x, { title: { display: true, text: '大气深度 (g/cm²)', color: '#b0bec5' } }),
                        y: Object.assign({}, chartDefaults.scales.y, { title: { display: true, text: '粒子数', color: '#b0bec5' }, type: 'logarithmic' })
                    }
                })
            });
        }

        var lateralCtx = document.getElementById('lateralChart');
        if (lateralCtx) {
            this.charts.lateral = new Chart(lateralCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        { label: '粒子密度', data: [], borderColor: '#ff8f00', backgroundColor: 'rgba(255, 143, 0, 0.2)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3 }
                    ]
                },
                options: Object.assign({}, chartDefaults, {
                    scales: {
                        x: Object.assign({}, chartDefaults.scales.x, { title: { display: true, text: '距簇射核心距离 (m)', color: '#b0bec5' } }),
                        y: Object.assign({}, chartDefaults.scales.y, { title: { display: true, text: '粒子密度', color: '#b0bec5' }, type: 'logarithmic' })
                    }
                })
            });
        }

        var cherenkovCtx = document.getElementById('cherenkovChart');
        if (cherenkovCtx) {
            this.charts.cherenkov = new Chart(cherenkovCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [
                        { label: '光子数 (时间分布)', data: [], backgroundColor: 'rgba(100, 181, 246, 0.6)', borderColor: '#64b5f6', borderWidth: 1, yAxisID: 'y' },
                        { label: '光子强度 (空间分布)', data: [], type: 'line', borderColor: '#ffb74d', backgroundColor: 'rgba(255, 183, 77, 0.1)', fill: true, tension: 0.4, borderWidth: 2, yAxisID: 'y1' }
                    ]
                },
                options: Object.assign({}, chartDefaults, {
                    scales: {
                        x: Object.assign({}, chartDefaults.scales.x, { title: { display: true, text: '时间 (ns) / 距离 (m)', color: '#b0bec5' } }),
                        y: Object.assign({}, chartDefaults.scales.y, { position: 'left', title: { display: true, text: '光子数', color: '#64b5f6' } }),
                        y1: Object.assign({}, chartDefaults.scales.y, { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: '强度', color: '#ffb74d' } })
                    }
                })
            });
        }
    },

    updateCharts() {
        var task = this.getCurrentTask();
        if (!task || !task.totalParticles) return;

        var data;
        if (task.showerData && task.showerData.longitudinal) {
            data = task.showerData;
        } else {
            data = SimData.generateShowerData(task);
        }

        if (this.charts.longitudinal) {
            this.charts.longitudinal.data.labels = data.longitudinal.depth.map(function(d) { return d.toFixed(0); });
            this.charts.longitudinal.data.datasets[0].data = data.longitudinal.particles;
            this.charts.longitudinal.data.datasets[1].data = data.longitudinal.gamma;
            this.charts.longitudinal.data.datasets[2].data = data.longitudinal.muons;
            this.charts.longitudinal.data.datasets[3].data = data.longitudinal.electrons;
            this.charts.longitudinal.update('none');
        }

        if (this.charts.lateral) {
            this.charts.lateral.data.labels = data.lateral.radius;
            this.charts.lateral.data.datasets[0].data = data.lateral.density;
            this.charts.lateral.update('none');
        }

        if (this.charts.cherenkov) {
            this.charts.cherenkov.data.labels = data.cherenkov.time.map(function(t, i) {
                return 't:' + t + '/r:' + (data.cherenkov.radius[i] || '');
            });
            this.charts.cherenkov.data.datasets[0].data = data.cherenkov.photons;
            this.charts.cherenkov.data.datasets[1].data = data.cherenkov.intensity;
            this.charts.cherenkov.update('none');
        }
    },

    updateAlerts() {
        var task = this.getCurrentTask();
        var xmaxThreshold = parseFloat(document.getElementById('xmaxThreshold')?.value) || 800;
        var particleThreshold = parseFloat(document.getElementById('particleThreshold')?.value) || 1000;

        var xmaxAlert = document.getElementById('xmaxAlert');
        var particleAlert = document.getElementById('particleAlert');
        var deviationAlert = document.getElementById('deviationAlert');

        if (task && task.xmax > xmaxThreshold) {
            xmaxAlert.classList.remove('hidden');
        }
        if (task && task.totalParticles && (task.totalParticles < particleThreshold || task.totalParticles > particleThreshold * 100)) {
            particleAlert.classList.remove('hidden');
        }
        if (SimData.checkDeviationAlert()) {
            deviationAlert.classList.remove('hidden');
        }

        var count = document.getElementById('notificationCount');
        if (count) {
            count.textContent = SimData.notifications.length;
        }
    }
};
