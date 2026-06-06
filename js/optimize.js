const OptimizeModule = {
    spacingChart: null,
    thresholdChart: null,

    init() {
        this.loadRecommendations();
        this.setupArrayControls();
        this.drawArray();
        this.initCharts();
    },

    loadRecommendations() {
        var rec = SimData.getRecommendations();
        document.getElementById('recommendedSpacing').textContent = rec.spacing + ' m';
        document.getElementById('spacingConfidence').textContent = rec.spacingConfidence;
        document.getElementById('recommendedThreshold').textContent = rec.threshold + ' N_pe';
        document.getElementById('thresholdConfidence').textContent = rec.thresholdConfidence;
        document.getElementById('recommendedLayout').textContent = rec.layout;
        document.getElementById('coverageRate').textContent = rec.coverage;
        document.getElementById('expectedResolution').textContent = rec.expectedResolution + '%';
        document.getElementById('improvementRate').textContent = rec.improvement;

        document.getElementById('detectorSpacing').value = rec.spacing;
        document.getElementById('triggerThreshold').value = rec.threshold;
    },

    setupArrayControls() {
        var self = this;
        document.getElementById('updateArrayBtn').addEventListener('click', function() {
            self.drawArray();
            self.updateCharts();
        });

        document.getElementById('applyRecommendationBtn').addEventListener('click', function() {
            var rec = SimData.getRecommendations();
            document.getElementById('detectorSpacing').value = rec.spacing;
            document.getElementById('triggerThreshold').value = rec.threshold;
            self.drawArray();
            self.updateCharts();
            StateManager.showToast('已应用推荐配置', 'success');
        });
    },

    drawArray() {
        var canvas = document.getElementById('arrayCanvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        
        var type = document.getElementById('arrayType').value;
        var spacing = parseFloat(document.getElementById('detectorSpacing').value) || 100;
        var count = parseInt(document.getElementById('detectorCount').value) || 37;
        
        var w = canvas.width;
        var h = canvas.height;
        var cx = w / 2;
        var cy = h / 2;
        var scale = Math.min(w, h) / 600;
        
        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(100, 181, 246, 0.1)';
        ctx.lineWidth = 1;
        for (var i = 0; i <= 10; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, i * 25 * scale, 0, Math.PI * 2);
            ctx.stroke();
        }

        for (var i = 0; i < 4; i++) {
            var angle = (i / 4) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * 250 * scale, cy + Math.sin(angle) * 250 * scale);
            ctx.stroke();
        }

        var positions = this.generatePositions(type, count, spacing);
        
        positions.forEach(function(pos, idx) {
            var x = cx + pos.x * scale;
            var y = cy + pos.y * scale;
            
            var dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
            if (dist < 50) {
                ctx.fillStyle = '#ffb74d';
            } else if (dist < 150) {
                ctx.fillStyle = '#64b5f6';
            } else {
                ctx.fillStyle = '#4caf50';
            }
            
            ctx.beginPath();
            ctx.arc(x, y, 6 * scale, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        ctx.fillStyle = '#ff5252';
        ctx.beginPath();
        ctx.arc(cx, cy, 10 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + (12 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('核心', cx, cy + 4 * scale);

        var legendY = 20;
        ctx.fillStyle = '#ff5252';
        ctx.beginPath();
        ctx.arc(15, legendY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b0bec5';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('簇射核心', 25, legendY + 4);

        ctx.fillStyle = '#ffb74d';
        ctx.beginPath();
        ctx.arc(15, legendY + 20, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b0bec5';
        ctx.fillText('密集区探测器', 25, legendY + 24);

        ctx.fillStyle = '#64b5f6';
        ctx.beginPath();
        ctx.arc(15, legendY + 40, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b0bec5';
        ctx.fillText('过渡区探测器', 25, legendY + 44);

        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.arc(15, legendY + 60, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b0bec5';
        ctx.fillText('外围探测器', 25, legendY + 64);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('探测器数量: ' + count + ' | 间距: ' + spacing + 'm', w - 15, 25);
    },

    generatePositions(type, count, spacing) {
        var positions = [];
        var scale = spacing / 2;
        
        if (type === 'triangle') {
            var ring = 0;
            while (positions.length < count) {
                if (ring === 0) {
                    positions.push({ x: 0, y: 0 });
                } else {
                    for (var i = 0; i < 6; i++) {
                        var angle1 = (i / 6) * Math.PI * 2;
                        var angle2 = ((i + 1) / 6) * Math.PI * 2;
                        for (var j = 0; j < ring; j++) {
                            var t = j / ring;
                            var x = (Math.cos(angle1) * (1 - t) + Math.cos(angle2) * t) * ring * spacing * 0.9;
                            var y = (Math.sin(angle1) * (1 - t) + Math.sin(angle2) * t) * ring * spacing * 0.9;
                            positions.push({ x: x, y: y });
                        }
                    }
                }
                ring++;
            }
        } else if (type === 'square') {
            var side = Math.ceil(Math.sqrt(count));
            var half = (side - 1) / 2;
            for (var ix = 0; ix < side; ix++) {
                for (var iy = 0; iy < side; iy++) {
                    if (positions.length < count) {
                        positions.push({ x: (ix - half) * spacing * 0.9, y: (iy - half) * spacing * 0.9 });
                    }
                }
            }
        } else if (type === 'hexagonal') {
            var ringH = 0;
            while (positions.length < count) {
                if (ringH === 0) {
                    positions.push({ x: 0, y: 0 });
                } else {
                    for (var k = 0; k < 6 * ringH; k++) {
                        if (positions.length < count) {
                            var angle = (k / (6 * ringH)) * Math.PI * 2;
                            var r = ringH * spacing * 0.8;
                            positions.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
                        }
                    }
                }
                ringH++;
            }
        } else {
            for (var r = 0; r < count; r++) {
                var randAngle = Math.random() * Math.PI * 2;
                var randR = Math.sqrt(Math.random()) * 5 * spacing;
                positions.push({ x: Math.cos(randAngle) * randR, y: Math.sin(randAngle) * randR });
            }
        }
        
        return positions.slice(0, count);
    },

    initCharts() {
        var chartDefaults = {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#b0bec5', font: { size: 11 } } }
            },
            scales: {
                x: { ticks: { color: '#78909c', font: { size: 10 } }, grid: { color: 'rgba(55, 64, 133, 0.3)' } },
                y: { ticks: { color: '#78909c', font: { size: 10 } }, grid: { color: 'rgba(55, 64, 133, 0.3)' } }
            }
        };

        var spacingCtx = document.getElementById('spacingChart');
        if (spacingCtx) {
            var spacingData = [];
            var labels = [];
            for (var s = 50; s <= 300; s += 25) {
                labels.push(s + 'm');
                spacingData.push(5 + 20 * Math.exp(-s / 80) + (Math.random() - 0.5) * 2);
            }
            this.spacingChart = new Chart(spacingCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '能量分辨率 (%)',
                        data: spacingData,
                        borderColor: '#64b5f6',
                        backgroundColor: 'rgba(100, 181, 246, 0.2)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 4
                    }]
                },
                options: Object.assign({}, chartDefaults, {
                    scales: {
                        x: Object.assign({}, chartDefaults.scales.x, { title: { display: true, text: '探测器间距', color: '#b0bec5' } }),
                        y: Object.assign({}, chartDefaults.scales.y, { title: { display: true, text: '分辨率 (%)', color: '#b0bec5' } })
                    }
                })
            });
        }

        var thresholdCtx = document.getElementById('thresholdChart');
        if (thresholdCtx) {
            var threshData = [];
            var threshLabels = [];
            for (var tr = 10; tr <= 200; tr += 10) {
                threshLabels.push(tr);
                threshData.push(100 - 90 * Math.pow(tr / 200, 0.5) + (Math.random() - 0.5) * 3);
            }
            this.thresholdChart = new Chart(thresholdCtx, {
                type: 'line',
                data: {
                    labels: threshLabels,
                    datasets: [{
                        label: '触发效率 (%)',
                        data: threshData,
                        borderColor: '#ffb74d',
                        backgroundColor: 'rgba(255, 183, 77, 0.2)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 4
                    }]
                },
                options: Object.assign({}, chartDefaults, {
                    scales: {
                        x: Object.assign({}, chartDefaults.scales.x, { title: { display: true, text: '触发阈值 (N_pe)', color: '#b0bec5' } }),
                        y: Object.assign({}, chartDefaults.scales.y, { title: { display: true, text: '触发效率 (%)', color: '#b0bec5' }, min: 0, max: 100 })
                    }
                })
            });
        }
    },

    updateCharts() {
        if (this.spacingChart) this.spacingChart.update();
        if (this.thresholdChart) this.thresholdChart.update();
    }
};
