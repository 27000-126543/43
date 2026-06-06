const DashboardModule = {
    charts: {},

    init() {
        this.updateStats();
        this.initCharts();
        this.renderNotifications();
    },

    updateStats() {
        var stats = SimData.getDailyStats();
        document.getElementById('totalTasks').textContent = stats.totalTasks;
        document.getElementById('completionRate').textContent = stats.completionRate + '%';
        document.getElementById('resolution').textContent = stats.resolution + '%';
        document.getElementById('triggerEfficiency').textContent = stats.triggerEfficiency + '%';
        document.getElementById('alertCount').textContent = stats.alertCount;
        document.getElementById('pendingApproval').textContent = stats.pendingApproval;

        document.getElementById('currentDate').textContent = new Date().toLocaleDateString('zh-CN', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        });
    },

    initCharts() {
        var chartDefaults = {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#b0bec5', font: { size: 11 }, padding: 15 }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#78909c', font: { size: 11 } },
                    grid: { color: 'rgba(55, 64, 133, 0.3)' }
                },
                y: {
                    ticks: { color: '#78909c', font: { size: 11 } },
                    grid: { color: 'rgba(55, 64, 133, 0.3)' },
                    beginAtZero: true
                }
            }
        };

        var trendCtx = document.getElementById('trendChart');
        if (trendCtx) {
            var trendData = SimData.getTrendData();
            this.charts.trend = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: trendData.labels,
                    datasets: [
                        {
                            label: '完成任务数',
                            data: trendData.completed,
                            borderColor: '#64b5f6',
                            backgroundColor: 'rgba(100, 181, 246, 0.2)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 3,
                            pointRadius: 5,
                            pointBackgroundColor: '#64b5f6'
                        },
                        {
                            label: '总任务数',
                            data: trendData.total,
                            borderColor: '#ffb74d',
                            backgroundColor: 'rgba(255, 183, 77, 0.1)',
                            fill: false,
                            tension: 0.4,
                            borderWidth: 2,
                            borderDash: [5, 5],
                            pointRadius: 4,
                            pointBackgroundColor: '#ffb74d'
                        },
                        {
                            label: '预警数',
                            data: trendData.alerts,
                            borderColor: '#ef5350',
                            backgroundColor: 'rgba(239, 83, 80, 0.2)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2,
                            pointRadius: 4,
                            pointBackgroundColor: '#ef5350'
                        }
                    ]
                },
                options: chartDefaults
            });
        }

        var energyCtx = document.getElementById('energyChart');
        if (energyCtx) {
            var energyDist = SimData.getEnergyDistribution();
            this.charts.energy = new Chart(energyCtx, {
                type: 'doughnut',
                data: {
                    labels: energyDist.labels,
                    datasets: [{
                        data: energyDist.data,
                        backgroundColor: [
                            'rgba(100, 181, 246, 0.8)',
                            'rgba(129, 199, 132, 0.8)',
                            'rgba(255, 183, 77, 0.8)',
                            'rgba(186, 104, 200, 0.8)',
                            'rgba(77, 208, 225, 0.8)'
                        ],
                        borderColor: '#1e2550',
                        borderWidth: 2
                    }]
                },
                options: Object.assign({}, chartDefaults, {
                    cutout: '60%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { color: '#b0bec5', font: { size: 10 }, padding: 10 }
                        }
                    }
                })
            });
        }

        var statusCtx = document.getElementById('statusChart');
        if (statusCtx) {
            var statusDist = SimData.getStatusDistribution();
            var statusLabels = Object.keys(statusDist).map(function(k) { return StateManager.STATUS_LABELS[k]; });
            var statusData = Object.values(statusDist);
            
            this.charts.status = new Chart(statusCtx, {
                type: 'bar',
                data: {
                    labels: statusLabels,
                    datasets: [{
                        label: '任务数量',
                        data: statusData,
                        backgroundColor: [
                            'rgba(158, 158, 158, 0.7)',
                            'rgba(100, 181, 246, 0.7)',
                            'rgba(186, 104, 200, 0.7)',
                            'rgba(77, 208, 225, 0.7)',
                            'rgba(255, 183, 77, 0.7)',
                            'rgba(129, 199, 132, 0.7)',
                            'rgba(239, 83, 80, 0.7)'
                        ],
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: Object.assign({}, chartDefaults, {
                    indexAxis: 'y',
                    plugins: { legend: { display: false } }
                })
            });
        }
    },

    renderNotifications() {
        var bell = document.getElementById('notificationBell');
        var panel = document.getElementById('notificationPanel');
        var listEl = document.getElementById('notificationList');
        var closeBtn = document.getElementById('closeNotifications');
        var countEl = document.getElementById('notificationCount');

        if (bell) {
            bell.addEventListener('click', function() {
                panel.classList.toggle('show');
                DashboardModule.updateNotificationList();
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                panel.classList.remove('show');
            });
        }

        this.updateNotificationList();
    },

    updateNotificationList() {
        var listEl = document.getElementById('notificationList');
        var countEl = document.getElementById('notificationCount');
        
        if (!listEl) return;

        if (SimData.notifications.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;padding:24px;color:#78909c;">暂无通知</div>';
        } else {
            var iconMap = {
                info: 'ℹ️',
                warning: '⚠️',
                danger: '🚨',
                critical: '🔴',
                success: '✅'
            };
            
            listEl.innerHTML = SimData.notifications.slice(0, 15).map(function(n) {
                return '<div class="notification-item ' + (n.level || 'info') + '">' +
                    '<span class="notification-icon">' + (iconMap[n.level] || 'ℹ️') + '</span>' +
                    '<div class="notification-content">' +
                        '<div class="notification-title">' + n.title + '</div>' +
                        '<div class="notification-desc">' + (n.description || '') + '</div>' +
                        '<div class="notification-time">' + StateManager.formatDate(n.timestamp) + '</div>' +
                    '</div>' +
                '</div>';
            }).join('');
        }

        if (countEl) {
            countEl.textContent = SimData.notifications.length;
            countEl.style.display = SimData.notifications.length > 0 ? 'flex' : 'none';
        }
    },

    refresh() {
        this.updateStats();
        if (this.charts.trend) this.charts.trend.update();
        if (this.charts.energy) this.charts.energy.update();
        if (this.charts.status) this.charts.status.update();
        this.updateNotificationList();
    }
};
