const PDFCharts = {
    drawLineChart(canvas, title, xData, ySeries, options) {
        options = options || {};
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const padding = { top: 50, right: 30, bottom: 60, left: 80 };
        const chartW = W - padding.left - padding.right;
        const chartH = H - padding.top - padding.bottom;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = '#1a237e';
        ctx.lineWidth = 2;
        ctx.strokeRect(padding.left, padding.top, chartW, chartH);

        ctx.fillStyle = '#1a237e';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, W / 2, 30);

        let allY = [];
        ySeries.forEach(function(ys) { allY = allY.concat(ys.data); });
        allY = allY.filter(function(v) { return isFinite(v) && v > 0; });

        let yMin, yMax;
        if (options.logY) {
            yMin = Math.max(1, Math.min.apply(null, allY));
            yMax = Math.max.apply(null, allY);
            yMin = Math.pow(10, Math.floor(Math.log10(yMin)));
            yMax = Math.pow(10, Math.ceil(Math.log10(yMax)));
        } else {
            yMin = 0;
            yMax = Math.max.apply(null, allY) * 1.1;
        }

        const xMin = Math.min.apply(null, xData);
        const xMax = Math.max.apply(null, xData);

        ctx.strokeStyle = '#dddddd';
        ctx.lineWidth = 0.5;
        const yTicks = options.logY ? 5 : 5;
        for (let i = 0; i <= yTicks; i++) {
            let yVal;
            if (options.logY) {
                yVal = yMin * Math.pow(yMax / yMin, i / yTicks);
            } else {
                yVal = yMin + (yMax - yMin) * i / yTicks;
            }
            const y = padding.top + chartH - (options.logY ? 
                (Math.log10(yVal) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin)) : 
                (yVal - yMin) / (yMax - yMin)) * chartH;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartW, y);
            ctx.stroke();

            ctx.fillStyle = '#333333';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(options.logY ? yVal.toExponential(0) : yVal.toFixed(0), padding.left - 8, y + 4);
        }

        const xTicks = Math.min(8, xData.length);
        for (let i = 0; i <= xTicks; i++) {
            const frac = i / xTicks;
            const xVal = xMin + (xMax - xMin) * frac;
            const x = padding.left + frac * chartW;
            
            ctx.strokeStyle = '#dddddd';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + chartH);
            ctx.stroke();

            ctx.fillStyle = '#333333';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(xVal.toFixed(0), x, padding.top + chartH + 20);
        }

        ctx.fillStyle = '#333333';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        if (options.xLabel) ctx.fillText(options.xLabel, W / 2, H - 10);

        ctx.save();
        ctx.translate(18, H / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.font = '13px sans-serif';
        if (options.yLabel) ctx.fillText(options.yLabel, 0, 0);
        ctx.restore();

        ySeries.forEach(function(series, idx) {
            const color = series.color || ['#1976d2', '#9c27b0', '#ff9800', '#4caf50', '#f44336'][idx % 5];
            ctx.strokeStyle = color;
            ctx.lineWidth = series.lineWidth || 2;
            ctx.beginPath();
            xData.forEach(function(xv, i) {
                if (!isFinite(series.data[i]) || series.data[i] <= 0) return;
                const x = padding.left + (xv - xMin) / (xMax - xMin) * chartW;
                let y;
                if (options.logY) {
                    y = padding.top + chartH - (Math.log10(series.data[i]) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin)) * chartH;
                } else {
                    y = padding.top + chartH - (series.data[i] - yMin) / (yMax - yMin) * chartH;
                }
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            if (series.fillArea) {
                ctx.lineTo(padding.left + chartW, padding.top + chartH);
                ctx.lineTo(padding.left, padding.top + chartH);
                ctx.closePath();
                ctx.fillStyle = color + '22';
                ctx.fill();
            }
        });

        if (ySeries.length > 1) {
            let legendX = padding.left + 10;
            const legendY = padding.top + 10;
            ySeries.forEach(function(series, idx) {
                const color = series.color || ['#1976d2', '#9c27b0', '#ff9800', '#4caf50', '#f44336'][idx % 5];
                ctx.fillStyle = color;
                ctx.fillRect(legendX, legendY, 14, 10);
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(legendX, legendY, 14, 10);
                ctx.fillStyle = '#333';
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(series.label || ('Series ' + (idx + 1)), legendX + 20, legendY + 9);
                legendX += ctx.measureText(series.label || ('Series ' + (idx + 1))).width + 40;
            });
        }
    },

    drawBarAndLineChart(canvas, title, xLabels, barData, lineData, options) {
        options = options || {};
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const padding = { top: 50, right: 60, bottom: 60, left: 70 };
        const chartW = W - padding.left - padding.right;
        const chartH = H - padding.top - padding.bottom;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#1a237e';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, W / 2, 30);

        const n = xLabels.length;
        const barWidth = Math.max(4, chartW / n * 0.6);
        const barGap = chartW / n * 0.4;

        let barMax = Math.max.apply(null, barData) * 1.15;
        let lineMax = Math.max.apply(null, lineData) * 1.15;
        if (!isFinite(barMax)) barMax = 1;
        if (!isFinite(lineMax)) lineMax = 1;

        ctx.strokeStyle = '#dddddd';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + chartH - i / 5 * chartH;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartW, y);
            ctx.stroke();

            ctx.fillStyle = '#1976d2';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText((barMax * i / 5).toExponential(0), padding.left - 6, y + 4);

            ctx.fillStyle = '#ff9800';
            ctx.textAlign = 'left';
            ctx.fillText((lineMax * i / 5).toExponential(0), padding.left + chartW + 6, y + 4);
        }

        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(padding.left + chartW, padding.top);
        ctx.lineTo(padding.left + chartW, padding.top + chartH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartH);
        ctx.lineTo(padding.left + chartW, padding.top + chartH);
        ctx.stroke();

        barData.forEach(function(v, i) {
            const bh = (v / barMax) * chartH;
            const x = padding.left + i * (barWidth + barGap) + barGap / 2;
            const y = padding.top + chartH - bh;
            const grad = ctx.createLinearGradient(0, y, 0, y + bh);
            grad.addColorStop(0, '#64b5f6');
            grad.addColorStop(1, '#1976d2');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barWidth, bh);
            ctx.strokeStyle = '#0d47a1';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x, y, barWidth, bh);

            if (i % 4 === 0) {
                ctx.fillStyle = '#333';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(xLabels[i], x + barWidth / 2, padding.top + chartH + 18);
            }
        });

        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        lineData.forEach(function(v, i) {
            const x = padding.left + i * (barWidth + barGap) + barGap / 2 + barWidth / 2;
            const y = padding.top + chartH - (v / lineMax) * chartH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.fillStyle = '#ff9800';
        lineData.forEach(function(v, i) {
            const x = padding.left + i * (barWidth + barGap) + barGap / 2 + barWidth / 2;
            const y = padding.top + chartH - (v / lineMax) * chartH;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        const legendX = padding.left + 10;
        ctx.fillStyle = '#1976d2';
        ctx.fillRect(legendX, padding.top + 10, 14, 10);
        ctx.fillStyle = '#333';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(options.barLabel || 'Photons (Time)', legendX + 20, padding.top + 19);

        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(legendX + 160, padding.top + 15);
        ctx.lineTo(legendX + 180, padding.top + 15);
        ctx.stroke();
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.arc(legendX + 170, padding.top + 15, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillText(options.lineLabel || 'Intensity (Space)', legendX + 188, padding.top + 19);

        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        if (options.xLabel) ctx.fillText(options.xLabel, W / 2, H - 10);
    }
};

const ReportsModule = {
    init() {
        this.renderReportsList();
        this.setupExportButtons();
    },

    renderReportsList() {
        var listEl = document.getElementById('reportsList');
        if (!listEl) return;

        if (SimData.reports.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;padding:48px;color:#78909c;grid-column:1/-1;">暂无报告</div>';
            return;
        }

        var self = this;
        var typeIcons = {
            comprehensive: '📊',
            longitudinal: '📈',
            lateral: '📍',
            cherenkov: '💫'
        };

        listEl.innerHTML = SimData.reports.map(function(r) {
            return '<div class="report-card" data-report-id="' + r.id + '">' +
                '<div class="report-icon">' + (typeIcons[r.type] || '📄') + '</div>' +
                '<div class="report-title">' + r.title + '</div>' +
                '<div class="report-meta">' +
                    r.taskId + '<br>' +
                    StateManager.formatDate(r.createdAt) + ' · ' + r.fileSize +
                '</div>' +
                '<div class="report-actions">' +
                    '<button class="btn-secondary" data-action="view">查看</button>' +
                    '<button class="btn-primary" data-action="download">下载</button>' +
                '</div>' +
            '</div>';
        }).join('');

        listEl.querySelectorAll('.report-card').forEach(function(card) {
            card.querySelectorAll('button').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var reportId = card.getAttribute('data-report-id');
                    var action = btn.getAttribute('data-action');
                    if (action === 'download') {
                        self.downloadReport(reportId);
                    } else {
                        StateManager.showToast('正在打开报告预览...', 'info');
                    }
                });
            });
        });
    },

    setupExportButtons() {
        var self = this;
        document.getElementById('exportCsvBtn').addEventListener('click', function() { self.exportData('csv'); });
        document.getElementById('exportJsonBtn').addEventListener('click', function() { self.exportData('json'); });
        document.getElementById('generateReportBtn').addEventListener('click', function() { self.generatePDFReport(); });
    },

    getFilteredTasks() {
        var energyMin = parseFloat(document.getElementById('energyMin').value) || 0;
        var energyMax = parseFloat(document.getElementById('energyMax').value) || Infinity;
        var zenithMin = parseFloat(document.getElementById('zenithMin').value) || 0;
        var zenithMax = parseFloat(document.getElementById('zenithMax').value) || 90;
        var atmosphere = document.getElementById('atmosphereFilter').value;

        return SimData.simulationTasks.filter(function(t) {
            if (t.energy < energyMin || t.energy > energyMax) return false;
            if (t.zenithAngle < zenithMin || t.zenithAngle > zenithMax) return false;
            if (atmosphere !== 'all' && t.atmosphereModel !== atmosphere) return false;
            return true;
        });
    },

    exportData(format) {
        var tasks = this.getFilteredTasks();
        if (tasks.length === 0) {
            StateManager.showToast('没有符合条件的数据可导出', 'warning');
            return;
        }

        if (format === 'csv') {
            this.exportCSV(tasks);
        } else {
            this.exportJSON(tasks);
        }
    },

    exportCSV(tasks) {
        var headers = ['任务ID', '名称', '初级粒子', '能量(eV)', '天顶角(°)', '方位角(°)',
            '大气模型', '观测高度(m)', '状态', 'X_max(g/cm²)', '总粒子数',
            '重建能量(eV)', '触发效率(%)', '重建分辨率(%)', '创建时间'];
        
        var rows = tasks.map(function(t) {
            return [
                t.id, t.name, t.primaryParticle, t.energy, t.zenithAngle.toFixed(2),
                t.azimuthAngle.toFixed(2), t.atmosphereModel, t.observationAltitude.toFixed(0),
                StateManager.STATUS_LABELS[t.status], t.xmax ? t.xmax.toFixed(2) : '',
                t.totalParticles || '', t.reconstructedEnergy || '',
                t.triggerEfficiency ? t.triggerEfficiency.toFixed(2) : '',
                t.reconstructionResolution ? t.reconstructionResolution.toFixed(2) : '',
                t.createdAt
            ].join(',');
        });

        var csv = '\ufeff' + headers.join(',') + '\n' + rows.join('\n');
        this.downloadFile(csv, 'cosmic_ray_simulation_data.csv', 'text/csv');
        StateManager.showToast('CSV 导出成功，共 ' + tasks.length + ' 条记录', 'success');
    },

    exportJSON(tasks) {
        var data = {
            exportTime: new Date().toISOString(),
            filters: {
                energyMin: document.getElementById('energyMin').value,
                energyMax: document.getElementById('energyMax').value,
                zenithMin: document.getElementById('zenithMin').value,
                zenithMax: document.getElementById('zenithMax').value,
                atmosphere: document.getElementById('atmosphereFilter').value
            },
            count: tasks.length,
            tasks: tasks.map(function(t) {
                return {
                    id: t.id,
                    name: t.name,
                    primaryParticle: t.primaryParticle,
                    energy_eV: t.energy,
                    zenithAngle_deg: t.zenithAngle,
                    azimuthAngle_deg: t.azimuthAngle,
                    atmosphereModel: t.atmosphereModel,
                    observationAltitude_m: t.observationAltitude,
                    status: t.status,
                    xmax_gcm2: t.xmax,
                    totalParticles: t.totalParticles,
                    muonFraction_pct: t.muonFraction,
                    emFraction_pct: t.emFraction,
                    reconstructedEnergy_eV: t.reconstructedEnergy,
                    triggerEfficiency_pct: t.triggerEfficiency,
                    reconstructionResolution_pct: t.reconstructionResolution,
                    showerData: t.showerData
                };
            })
        };
        this.downloadFile(JSON.stringify(data, null, 2), 'cosmic_ray_simulation_data.json', 'application/json');
        StateManager.showToast('JSON 导出成功，共 ' + tasks.length + ' 条记录（含完整簇射数据）', 'success');
    },

    downloadFile(content, filename, mimeType) {
        var blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    generatePDFReport() {
        if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
            StateManager.showToast('PDF 生成库加载中，请稍后重试', 'warning');
            return;
        }

        var tasks = this.getFilteredTasks().filter(function(t) { return t.status === 'completed' && t.showerData; });
        if (tasks.length === 0) {
            StateManager.showToast('没有已完成的模拟任务可生成报告（需要含真实物理数据）', 'warning');
            return;
        }

        StateManager.showToast('正在绘制物理曲线并生成 PDF...', 'info');

        var self = this;
        try {
            var sampleTask = tasks[0];
            var shower = sampleTask.showerData;

            if (!shower || !shower.longitudinal) {
                shower = SimData.runFullSimulation({
                    energy: sampleTask.energy,
                    primaryParticle: sampleTask.primaryParticle,
                    zenithAngle: sampleTask.zenithAngle,
                    observationAltitude: sampleTask.observationAltitude,
                    atmosphereModel: sampleTask.atmosphereModel
                }).showerData;
            }

            var longCanvas = document.getElementById('pdfLongitudinalCanvas');
            var latCanvas = document.getElementById('pdfLateralCanvas');
            var cherenkovCanvas = document.getElementById('pdfCherenkovCanvas');

            PDFCharts.drawLineChart(longCanvas,
                'Figure 1: Longitudinal Development (Gaisser-Hillas)',
                shower.longitudinal.depth,
                [
                    { label: 'Charged Particles', data: shower.longitudinal.particles, color: '#1976d2', lineWidth: 2.5, fillArea: true },
                    { label: 'Gamma', data: shower.longitudinal.gamma, color: '#9c27b0', lineWidth: 2 },
                    { label: 'Muons', data: shower.longitudinal.muons, color: '#ff9800', lineWidth: 2 },
                    { label: 'Electrons', data: shower.longitudinal.electrons, color: '#4caf50', lineWidth: 2 }
                ],
                { logY: true, xLabel: 'Atmospheric Depth X (g/cm²)', yLabel: 'dN/dX (particles / g·cm⁻²)' }
            );

            PDFCharts.drawLineChart(latCanvas,
                'Figure 2: Lateral Distribution (NKG Formula)',
                shower.lateral.radius,
                [{ label: 'Particle Density ρ(r)', data: shower.lateral.density, color: '#e65100', lineWidth: 2.5, fillArea: true }],
                { logY: true, xLabel: 'Distance from Core r (m)', yLabel: 'ρ(r) (particles / m²)' }
            );

            PDFCharts.drawBarAndLineChart(cherenkovCanvas,
                'Figure 3: Cherenkov Light Distribution',
                shower.cherenkov.time.map(function(t) { return t + ' ns'; }),
                shower.cherenkov.photons,
                shower.cherenkov.intensity,
                { barLabel: 'Photons (Time Distribution)', lineLabel: 'Intensity (Spatial Distribution)', xLabel: 'Time since First Photon (ns) / Radius (m)' }
            );

            var longImg = longCanvas.toDataURL('image/png', 1.0);
            var latImg = latCanvas.toDataURL('image/png', 1.0);
            var cherenkovImg = cherenkovCanvas.toDataURL('image/png', 1.0);

            var { jsPDF } = jspdf;
            var doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
            var pageW = doc.internal.pageSize.getWidth();
            var pageH = doc.internal.pageSize.getHeight();

            doc.setFillColor(26, 35, 126);
            doc.rect(0, 0, pageW, 32, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Cosmic Ray Air Shower Simulation Report', pageW / 2, 13, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('Comprehensive Physics Analysis with Gaisser-Hillas / NKG / Cherenkov Models', pageW / 2, 20, { align: 'center' });
            doc.text('Generated: ' + new Date().toLocaleString(), pageW / 2, 27, { align: 'center' });

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('1. Simulation Parameters', 14, 42);

            doc.setFontSize(9.5);
            doc.setFont('helvetica', 'normal');
            var pLabel = StateManager.PARTICLE_LABELS[sampleTask.primaryParticle] || sampleTask.primaryParticle;
            doc.text('Task ID:           ' + sampleTask.id, 14, 50);
            doc.text('Primary Particle:  ' + pLabel + ' (' + sampleTask.primaryParticle + ')', 14, 56);
            doc.text('Initial Energy:    ' + StateManager.formatEnergy(sampleTask.energy) + '  (' + sampleTask.energy.toExponential(4) + ' eV)', 14, 62);
            doc.text('Zenith Angle:      ' + sampleTask.zenithAngle.toFixed(2) + ' deg', 14, 68);
            doc.text('Azimuth Angle:     ' + sampleTask.azimuthAngle.toFixed(2) + ' deg', 14, 74);
            doc.text('Atmosphere Model:  ' + sampleTask.atmosphereModel, 105, 50);
            doc.text('Altitude:          ' + sampleTask.observationAltitude.toFixed(0) + ' m a.s.l.', 105, 56);
            doc.text('X_max (predicted): ' + sampleTask.xmax.toFixed(1) + ' g/cm²', 105, 62);
            doc.text('N_charged (ground): ' + sampleTask.totalParticles.toExponential(3), 105, 68);
            doc.text('Muon fraction:     ' + sampleTask.muonFraction.toFixed(1) + ' %', 105, 74);
            doc.text('EM fraction:       ' + sampleTask.emFraction.toFixed(1) + ' %', 105, 80);

            doc.setDrawColor(26, 35, 126);
            doc.setLineWidth(0.3);
            doc.line(14, 88, pageW - 14, 88);

            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('2. Physics Models Summary', 14, 96);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('- Longitudinal development:  Gaisser-Hillas 3-param function  dN/dX = Nmax * ((X-X0)/(Xmax-X0))^((Xmax-X0)/lambda) * exp((Xmax-X0)/lambda * (1-(X-X0)/(Xmax-X0)))', 14, 103);
            doc.text('- Lateral distribution:     NKG (Nishimura-Kamata-Greisen) formula with Moliere radius R_M = ' + PhysicsModels.MOLIERE_RADIUS + ' m', 14, 109);
            doc.text('- Cherenkov radiation:      Threshold condition cos(theta_c) = 1/(beta*n) ; yield = 370 sin^2(theta_c) photons/m', 14, 115);

            doc.addImage(longImg, 'PNG', 8, 122, pageW - 16, 80);

            doc.addPage();

            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('3. Lateral Distribution (NKG)', 14, 18);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('Particle density as a function of distance from shower core. Age parameter s = ' +
                PhysicsModels.computeShowerAge(
                    sampleTask.energy, sampleTask.primaryParticle,
                    sampleTask.zenithAngle, sampleTask.observationAltitude, sampleTask.atmosphereModel
                ).toFixed(3), 14, 25);
            doc.addImage(latImg, 'PNG', 8, 32, pageW - 16, 80);

            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('4. Cherenkov Light Distribution', 14, 122);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            var chAngle = PhysicsModels.cherenkovAngle(sampleTask.energy / 1e9, 0.000511, sampleTask.observationAltitude, sampleTask.atmosphereModel);
            doc.text('Cherenkov angle at observation level: ' + chAngle.angle_deg.toFixed(3) + ' deg, n = ' + chAngle.n_refractive.toFixed(6), 14, 129);
            doc.text('Photon yield per meter: ' + chAngle.yield_per_m.toFixed(1) + ' photons/m (for electrons above threshold)', 14, 135);
            doc.addImage(cherenkovImg, 'PNG', 8, 142, pageW - 16, 80);

            doc.addPage();

            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('5. Reconstruction & Detector Response', 14, 18);
            doc.setFontSize(9.5);
            doc.setFont('helvetica', 'normal');
            doc.text('Reconstructed Energy:   ' + StateManager.formatEnergy(sampleTask.reconstructedEnergy) +
                '   (input: ' + StateManager.formatEnergy(sampleTask.energy) + ')', 14, 28);
            doc.text('Energy Bias:            ' +
                ((sampleTask.reconstructedEnergy - sampleTask.energy) / sampleTask.energy * 100).toFixed(2) + ' %', 14, 34);
            doc.text('Reconstruction Resolution: ' + sampleTask.reconstructionResolution.toFixed(2) + ' %', 14, 40);
            doc.text('Array Trigger Efficiency:  ' + sampleTask.triggerEfficiency.toFixed(2) + ' %', 14, 46);

            var tableData = tasks.slice(0, 12).map(function(t) {
                return [
                    t.id,
                    StateManager.PARTICLE_LABELS[t.primaryParticle] || t.primaryParticle,
                    StateManager.formatEnergy(t.energy),
                    t.zenithAngle.toFixed(1),
                    t.xmax ? t.xmax.toFixed(0) : '-',
                    t.triggerEfficiency ? t.triggerEfficiency.toFixed(1) + '%' : '-'
                ];
            });

            if (typeof doc.autoTable === 'function') {
                doc.autoTable({
                    startY: 56,
                    head: [['Task ID', 'Primary', 'Energy', 'Zenith (deg)', 'X_max (g/cm²)', 'Efficiency']],
                    body: tableData,
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [26, 35, 126], textColor: 255, fontSize: 9, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [240, 243, 255] },
                    margin: { left: 14, right: 14 }
                });
            }

            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            var finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 130;
            doc.text('6. Daily Performance Summary', 14, finalY + 10);

            var stats = SimData.getDailyStats();
            doc.setFontSize(9.5);
            doc.setFont('helvetica', 'normal');
            doc.text('Total Tasks Analyzed:    ' + stats.totalTasks, 14, finalY + 18);
            doc.text('Completion Rate:         ' + stats.completionRate + ' %', 14, finalY + 24);
            doc.text('Avg. Resolution:         ' + stats.resolution + ' %', 14, finalY + 30);
            doc.text('Avg. Trigger Efficiency: ' + stats.triggerEfficiency + ' %', 14, finalY + 36);
            doc.text('Pending Approval:        ' + stats.pendingApproval + ' tasks', 14, finalY + 42);
            doc.text('Active Alerts:           ' + stats.alertCount, 14, finalY + 48);

            doc.setFillColor(26, 35, 126);
            doc.rect(0, pageH - 12, pageW, 12, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text('Cosmic Ray Air Shower Simulation Platform  |  Physics Models: Gaisser-Hillas + NKG + Cherenkov  |  Page ' +
                doc.internal.getNumberOfPages(), pageW / 2, pageH - 4, { align: 'center' });

            var filename = 'Cosmic_Ray_Shower_Physics_Report_' + Date.now() + '.pdf';
            doc.save(filename);

            SimData.addReport({
                id: 'REPORT-' + Date.now(),
                title: '物理综合报告 ' + new Date().toLocaleDateString('zh-CN'),
                taskId: sampleTask.id,
                createdAt: new Date().toISOString(),
                type: 'comprehensive',
                fileSize: (Math.random() * 3 + 2).toFixed(2) + ' MB'
            });

            self.renderReportsList();
            StateManager.showToast('物理综合 PDF 报告生成成功！（含真实物理曲线图）', 'success');
        } catch (e) {
            console.error('PDF生成错误:', e);
            StateManager.showToast('PDF 生成失败: ' + e.message, 'error');
        }
    },

    downloadReport(reportId) {
        var report = SimData.reports.find(function(r) { return r.id === reportId; });
        if (!report) return;

        var task = SimData.getTaskById(report.taskId);
        if (task && typeof jspdf !== 'undefined' && jspdf.jsPDF) {
            this.generatePDFReport();
        } else {
            StateManager.showToast('正在下载报告...', 'info');
            var content = 'Report: ' + report.title + '\nTask: ' + report.taskId + '\nCreated: ' + report.createdAt;
            this.downloadFile(content, report.title.replace(/\s+/g, '_') + '.txt', 'text/plain');
        }
    }
};
